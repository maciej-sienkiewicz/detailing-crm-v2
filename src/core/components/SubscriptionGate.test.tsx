// @vitest-environment jsdom
//
// Abonament wygasa w trakcie sesji: 403 SUBSCRIPTION_INACTIVE (zdarzenie z apiClient)
// odświeża status, a bramka pokazuje okno odnowienia - bez przeładowania strony.
// Okno ma jedno wypełnienie (było: karta pakietu w gradiencie + przycisk) i blokuje
// przewijanie tła przez acquireScrollLock.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../permissions/usePermissions', () => ({
    usePermissions: () => ({ isOwner: true, can: () => true, defaultRoute: '/' }),
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
        expect(screen.queryByText('Twoja subskrypcja wygasła')).toBeNull();

        act(() => { window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT)); });

        expect(await screen.findByText('Twoja subskrypcja wygasła')).toBeTruthy();
        expect(subscriptionApi.getStatus).toHaveBeenCalledTimes(2);
    });

    it('okno odnowienia: jedno wypełnienie, kwota kolejnego okresu, zablokowane tło', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderGate();

        expect(await screen.findByText('Twoja subskrypcja wygasła')).toBeTruthy();
        // Cena przedłużenia, nie dzisiejsza suma (172,00 zł z modułem, który się wyłączył).
        await waitFor(() => expect(screen.getByText(/123,00/)).toBeTruthy());
        const filled = document.body.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
        expect(filled).toHaveLength(1);
        expect(filled[0].textContent).toMatch(/Odnów subskrypcję i zapłać/);
        expect(document.documentElement.style.overflow).toBe('hidden');

        // Odmontowanie oddaje blokadę - strona nie zostaje zamrożona.
        cleanup();
        expect(document.documentElement.style.overflow).toBe('');
    });

    it('seria odrzuconych zapytań przy już pokazanym oknie nie odpytuje statusu w kółko', async () => {
        vi.mocked(subscriptionApi.getStatus).mockResolvedValue(status({ status: 'EXPIRED', isAccessible: false }));
        renderGate();
        await screen.findByText('Twoja subskrypcja wygasła');

        act(() => {
            for (let i = 0; i < 5; i++) window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT));
        });
        await act(async () => {});
        expect(subscriptionApi.getStatus).toHaveBeenCalledTimes(1);
    });
});
