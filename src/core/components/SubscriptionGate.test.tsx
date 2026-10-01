// @vitest-environment jsdom
//
// Abonament wygasa w trakcie sesji: 403 SUBSCRIPTION_INACTIVE (zdarzenie z apiClient)
// odświeża status, a bramka pokazuje okno odnowienia - bez przeładowania strony.
// Okno ma jedno wypełnienie (było: karta pakietu w gradiencie + przycisk) i blokuje
// przewijanie tła przez acquireScrollLock.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SubscriptionGate } from './SubscriptionGate';
import { SUBSCRIPTION_INACTIVE_EVENT } from '../forbidden';
import { subscriptionApi, type SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';
import { newSubscriptionApi } from '@/modules/subscription/api/subscriptionApi';
import type { MyPlanResponse } from '@/modules/subscription/types';

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ isLoading: false, user: { role: 'OWNER', permissions: null } }),
}));

const permissions = vi.hoisted(() => ({ isOwner: true }));

vi.mock('../permissions/usePermissions', () => ({
    usePermissions: () => ({ isOwner: permissions.isOwner, can: () => true, defaultRoute: '/' }),
}));

const logout = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/modules/auth', () => ({
    useLogout: () => ({ mutate: logout.mutate, isPending: false }),
}));

vi.mock('@/modules/settings/api/subscriptionApi', () => ({
    subscriptionApi: { getStatus: vi.fn() },
}));

vi.mock('@/modules/subscription/api/subscriptionApi', () => ({
    newSubscriptionApi: {
        getMyPlan: vi.fn(),
        getEntitlements: vi.fn(),
        getPaymentHistory: vi.fn(),
        checkout: vi.fn(),
    },
}));

const status = (overrides: Partial<SubscriptionStatusResponse> = {}): SubscriptionStatusResponse => ({
    status: 'ACTIVE',
    isAccessible: true,
    daysRemaining: 10,
    subscriptionEndsAt: '2026-10-11T10:00:00Z',
    trialEndsAt: null,
    trialUsed: true,
    graceEndsAt: null,
    inGrace: false,
    ...overrides,
});

const myPlan = {
    billingStatus: 'EXPIRED',
    plan: { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300 },
    activeAddOns: [],
    pendingDowngrade: null,
    periodEndsAt: '2026-09-20T10:00:00Z',
    trialEndsAt: null,
    graceEndsAt: null,
    daysRemaining: null,
    monthlyCostCents: 17200,
    nextRenewalCostCents: 12300,
    canPurchaseMidPeriod: false,
} satisfies MyPlanResponse;

const renderGate = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <SubscriptionGate><p>Widok aplikacji</p></SubscriptionGate>
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    permissions.isOwner = true;
    vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(myPlan);
    vi.mocked(newSubscriptionApi.getEntitlements).mockResolvedValue({} as never);
    vi.mocked(newSubscriptionApi.getPaymentHistory).mockResolvedValue({ entries: [], total: 0, page: 0, pageSize: 20 });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SubscriptionGate', () => {
    it('403 SUBSCRIPTION_INACTIVE w trakcie sesji: status odświeżony, okno odnowienia bez przeładowania', async () => {
        vi.mocked(subscriptionApi.getStatus)
            .mockResolvedValueOnce(status())
            .mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false, daysRemaining: 0 }));
        renderGate();

        expect(await screen.findByText('Widok aplikacji')).toBeTruthy();
        expect(screen.queryByText('Abonament wygasł')).toBeNull();

        act(() => { window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT)); });

        expect(await screen.findByText('Abonament wygasł')).toBeTruthy();
        expect(subscriptionApi.getStatus).toHaveBeenCalledTimes(2);
        // Okno tłumaczy wszystko - toast „nie jest aktywny" byłby szumem pod nim.
        expect(screen.queryByText('Abonament nie jest aktywny')).toBeNull();
    });

    it('okno odnowienia: jedno wypełnienie, kwota kolejnego okresu, zablokowane tło', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderGate();

        expect(await screen.findByText('Abonament wygasł')).toBeTruthy();
        // Cena przedłużenia, nie dzisiejsza suma (172,00 zł z modułem, który się wyłączył).
        await waitFor(() => expect(screen.getByText(/123,00/)).toBeTruthy());
        const filled = document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Odnów abonament i zapłać/);
        // Jedno słowo na jedną rzecz: „abonament", nie na zmianę z „subskrypcją" i „pakietem".
        expect(screen.queryByText(/subskrypc|pakiet/i)).toBeNull();
        // Bez modułów w odnowieniu nie obiecujemy „pakiet i moduły".
        expect(screen.getByText('brutto za 30 dni')).toBeTruthy();
        expect(document.documentElement.style.overflow).toBe('hidden');

        // Odmontowanie oddaje blokadę - strona nie zostaje zamrożona.
        cleanup();
        expect(document.documentElement.style.overflow).toBe('');
    });

    it('seria odrzuconych zapytań przy już pokazanym oknie nie odpytuje statusu w kółko', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderGate();
        await screen.findByText('Abonament wygasł');

        act(() => {
            for (let i = 0; i < 5; i++) window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT));
        });
        await act(async () => {});
        expect(subscriptionApi.getStatus).toHaveBeenCalledTimes(1);
    });

    it('wygasł sam okres próbny: nie mówi o opłaconym okresie ani karencji, których nie było', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({
            status: 'EXPIRED', isAccessible: false, subscriptionEndsAt: null, trialEndsAt: '2026-09-25T10:00:00Z', daysRemaining: null,
        }));
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue({ ...myPlan, periodEndsAt: null, trialEndsAt: '2026-09-25T10:00:00Z' });
        renderGate();

        expect(await screen.findByText('Okres próbny się skończył')).toBeTruthy();
        expect(screen.queryByText(/Opłacony okres i czas na jego przedłużenie minęły/)).toBeNull();
        expect(screen.getByText(/Opłać abonament, żeby wrócić do pracy/)).toBeTruthy();
        const filled = document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Opłać abonament/);
    });

    it('moduł wchodzi do odnowienia: „plan i moduły"', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue({
            ...myPlan,
            activeAddOns: [{ key: 'FINANCE_MODULE', name: 'Finanse', monthlyPriceGrossCents: 4900, cancelAt: null, resumable: false }],
            nextRenewalCostCents: 17200,
        });
        renderGate();
        expect(await screen.findByText('brutto za 30 dni, plan i moduły')).toBeTruthy();
    });

    it('po wygaśnięciu tuż po karencji pokazuje prawdziwą datę końca okresu i dlaczego to mniej niż 30 dni', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        const in23Days = new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString();
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue({ ...myPlan, renewalPeriodEndsAt: in23Days });
        renderGate();

        expect(await screen.findByText(/^brutto, dostęp do /)).toBeTruthy();
        expect(screen.getByText(/obejmuje dni karencji wykorzystane/)).toBeTruthy();
    });

    it('okno zasłania menu, więc samo daje „Wyloguj" - bez wypełnienia', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderGate();

        const button = await screen.findByRole('button', { name: 'Wyloguj' });
        expect(button.getAttribute('data-variant')).not.toBe('primary');
        fireEvent.click(button);
        expect(logout.mutate).toHaveBeenCalledTimes(1);
    });

    it('pracownik: bez wypełnionego (wyłączonego) przycisku płatności i bez pytania o my-plan', async () => {
        permissions.isOwner = false;
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderGate();

        expect(await screen.findByText('Odnowić może tylko właściciel studia')).toBeTruthy();
        expect(screen.getByText('Poproś właściciela o odnowienie abonamentu.')).toBeTruthy();
        expect(document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: /zapłać/i })).toBeNull();
        // my-plan jest tylko dla właściciela - pracownik dostawałby 403 przy każdym otwarciu okna.
        expect(newSubscriptionApi.getMyPlan).not.toHaveBeenCalled();
    });

    it('403 SUBSCRIPTION_INACTIVE, a odświeżony status wciąż „dostępny": jeden toast zamiast ciszy', async () => {
        // Uprawnienia na serwerze dochodzą chwilę po statusie: okna nie ma, interceptor
        // milczy, wywołujący też - bez toastu kliknięcie „nic nie robiło".
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status());
        renderGate();
        expect(await screen.findByText('Widok aplikacji')).toBeTruthy();

        act(() => { window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT)); });

        expect(await screen.findByText('Abonament nie jest aktywny')).toBeTruthy();
        expect(subscriptionApi.getStatus).toHaveBeenCalledTimes(2);
        expect(screen.queryByText('Abonament wygasł')).toBeNull();

        // Seria odrzuconych zapytań z tego samego kliknięcia: dalej jeden toast.
        act(() => {
            for (let i = 0; i < 3; i++) window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT));
        });
        await act(async () => {});
        expect(screen.getAllByText('Abonament nie jest aktywny')).toHaveLength(1);
        expect(subscriptionApi.getStatus).toHaveBeenCalledTimes(2);
    });
});
