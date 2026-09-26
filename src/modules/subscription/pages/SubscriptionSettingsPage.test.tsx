// @vitest-environment jsdom
//
// Abonament: jeden przycisk przedłużenia (a nie dwa wypełnione naraz), zaległość
// z działającą akcją zamiast samego ostrzeżenia, nieudana wycena mówiąca o sobie
// toastem zamiast cichego zamknięcia okna, i jedno „Dezaktywuj" na moduł.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { SubscriptionSettingsPage } from './SubscriptionSettingsPage';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { MyPlanResponse, PaymentHistoryEntry } from '../types';

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ isOwner: true, can: () => true, defaultRoute: '/' }),
}));

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: {
        getMyPlan: vi.fn(),
        getFeaturePlans: vi.fn(),
        getAddOns: vi.fn(),
        getPaymentHistory: vi.fn(),
        previewPlanChange: vi.fn(),
        previewAddOn: vi.fn(),
        checkout: vi.fn(),
        deactivateAddOn: vi.fn(),
        cancelPendingPlanChange: vi.fn(),
        changePlan: vi.fn(),
    },
}));

const plan = (overrides: Partial<MyPlanResponse> = {}): MyPlanResponse => ({
    billingStatus: 'ACTIVE',
    plan: { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300 },
    activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900 }],
    pendingDowngrade: null,
    periodEndsAt: '2026-10-20T00:00:00Z',
    trialEndsAt: null,
    daysRemaining: 25,
    monthlyCostCents: 17200,
    nextRenewalCostCents: 17200,
    ...overrides,
} as MyPlanResponse);

const renderPage = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <SubscriptionSettingsPage />
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

beforeEach(() => {
    vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan());
    vi.mocked(newSubscriptionApi.getFeaturePlans).mockResolvedValue([
        { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300, features: [], displayOrder: 1 },
        { key: 'FULL', name: 'Full', monthlyPriceGrossCents: 24600, features: [], displayOrder: 2 },
    ] as Awaited<ReturnType<typeof newSubscriptionApi.getFeaturePlans>>);
    vi.mocked(newSubscriptionApi.getAddOns).mockResolvedValue([
        { key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', description: 'SMS i e-mail', monthlyPriceGrossCents: 4900, features: [], isAvailable: true },
        { key: 'FINANCE', name: 'Finanse', description: 'Faktury', monthlyPriceGrossCents: 6900, features: [], isAvailable: true },
    ] as Awaited<ReturnType<typeof newSubscriptionApi.getAddOns>>);
    vi.mocked(newSubscriptionApi.getPaymentHistory).mockResolvedValue({ entries: [], total: 0, page: 0, pageSize: 20 });
    vi.mocked(newSubscriptionApi.checkout).mockResolvedValue({
        orderId: 'o1', status: 'PENDING', amountCents: 17200, currency: 'PLN', description: '', paymentUrl: null,
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const renewButtons = () => screen.queryAllByRole('button', { name: /przedłuż|odnów|zapłać/i });

describe('SubscriptionSettingsPage', () => {
    it('nie powtarza tytułu sekcji z nagłówka ramy', async () => {
        renderPage();
        await screen.findByText('Plan Basic');
        expect(screen.queryByRole('heading', { name: 'Abonament' })).toBeNull();
        expect(screen.queryByText(/konto i rozliczenia/i)).toBeNull();
    });

    it('aktywny plan: dokładnie jeden przycisk przedłużenia, z kwotą', async () => {
        renderPage();
        await screen.findByText('Plan Basic');
        expect(renewButtons()).toHaveLength(1);
        expect(renewButtons()[0].textContent?.replace(/\s/g, ' ')).toMatch(/Przedłuż o 30 dni za 172,00 zł/);
    });

    it('ceny planów i modułów są oznaczone jako brutto', async () => {
        renderPage();
        await screen.findByText('Plan Basic');
        expect((await screen.findAllByText('brutto / mies.')).length).toBeGreaterThan(0);
    });

    it('zaległa płatność: komunikat ma akcję, która uruchamia płatność, i jest jedyną', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({ billingStatus: 'PAST_DUE', daysRemaining: 3 }));
        renderPage();

        expect(await screen.findByText('Ostatnia płatność nie przeszła')).toBeTruthy();
        expect(renewButtons()).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: /Zapłać 172,00/ }));
        await waitFor(() => expect(newSubscriptionApi.checkout).toHaveBeenCalledWith({ type: 'RENEWAL' }));
    });

    it('wygasły plan: jeden przycisk odnowienia w komunikacie', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({ billingStatus: 'EXPIRED', daysRemaining: 0 }));
        renderPage();
        expect(await screen.findByText('Abonament wygasł')).toBeTruthy();
        expect(renewButtons()).toHaveLength(1);
    });

    it('nieudana wycena planu: toast zamiast cichego zamknięcia okna', async () => {
        vi.mocked(newSubscriptionApi.previewPlanChange).mockRejectedValue({
            response: { status: 500, data: {} },
            config: { skipErrorToast: true },
        });
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Przejdź na Full' }));
        expect(newSubscriptionApi.previewPlanChange).toHaveBeenCalledWith('FULL', { skipErrorToast: true });
        expect(await screen.findByText('Nie udało się pobrać wyceny')).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('nieudana wycena modułu: toast z powodem z backendu', async () => {
        vi.mocked(newSubscriptionApi.previewAddOn).mockRejectedValue({
            response: { status: 400, data: { message: 'Moduł niedostępny w tym planie' } },
            config: { skipErrorToast: true },
        });
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Aktywuj' }));
        expect(await screen.findByText('Nie udało się pobrać wyceny modułu')).toBeTruthy();
        expect(screen.getByText('Moduł niedostępny w tym planie')).toBeTruthy();
    });

    it('aktywny moduł ma jedno „Dezaktywuj" i nie wraca na listę do dokupienia', async () => {
        renderPage();
        await screen.findByText('Plan Basic');
        await screen.findByText('Finanse');
        expect(screen.getAllByRole('button', { name: 'Dezaktywuj' })).toHaveLength(1);
        // Komunikacja jest aktywna - do dokupienia zostają tylko Finanse.
        expect(screen.getAllByRole('button', { name: 'Aktywuj' })).toHaveLength(1);
    });

    it('dezaktywacja pyta oknem potwierdzenia, zanim cokolwiek wyłączy', async () => {
        vi.mocked(newSubscriptionApi.deactivateAddOn).mockResolvedValue({} as never);
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Dezaktywuj' }));

        expect(newSubscriptionApi.deactivateAddOn).not.toHaveBeenCalled();
        expect(await screen.findByText('Dezaktywować moduł Komunikacja?')).toBeTruthy();
        const confirm = screen.getAllByRole('button', { name: 'Dezaktywuj' }).at(-1)!;
        await userEvent.click(confirm);
        await waitFor(() => expect(newSubscriptionApi.deactivateAddOn).toHaveBeenCalledWith('CLIENT_COMMUNICATION'));
    });

    it('błąd wczytania planu to komunikat z ponowieniem', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockRejectedValue(new Error('offline'));
        renderPage();
        expect(await screen.findByText('Nie udało się wczytać abonamentu')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeTruthy();
    });

    it('historia płatności pokazuje okno numerów stron, nie każdą stronę', async () => {
        const entry = (i: number): PaymentHistoryEntry => ({
            id: `p${i}`, date: '2026-09-01T10:00:00Z', eventType: 'SUBSCRIPTION_PURCHASE',
            eventTypeDisplayName: 'Zakup', description: '', amountCents: 17200, amountFormatted: '172,00 zł',
            currency: 'PLN', transactionId: `t${i}`, plan: null, addOn: null,
        } as PaymentHistoryEntry);
        vi.mocked(newSubscriptionApi.getPaymentHistory).mockResolvedValue({
            entries: Array.from({ length: 20 }, (_, i) => entry(i)), total: 400, page: 0, pageSize: 20,
        });
        renderPage();

        const nav = await screen.findByRole('navigation', { name: /strony historii/i });
        const numbered = within(nav).getAllByRole('button', { name: /^Strona \d+$/ });
        expect(numbered.map(b => b.textContent)).toEqual(['1', '2', '20']);
    });
});
