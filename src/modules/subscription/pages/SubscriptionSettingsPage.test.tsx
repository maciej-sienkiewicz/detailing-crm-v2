// @vitest-environment jsdom
//
// Abonament: jeden przycisk przedłużenia (a nie dwa wypełnione naraz), karencja
// z działającą akcją i datą końca dostępu zamiast „płatność nie przeszła", kwota
// przedłużenia = cena kolejnego okresu, wyłączenie modułu z końcem okresu
// z „Przywróć", zakupy w trakcie okresu tylko wtedy, gdy backend na nie pozwala,
// a odpowiedź zamówienia czytana po statusie, nie po samym braku adresu płatności.
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
import { subscriptionApi } from '@/modules/settings/api/subscriptionApi';
import type { CheckoutResponse, MyPlanResponse, PaymentHistoryEntry } from '../types';

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
        resumeAddOn: vi.fn(),
        cancelPendingPlanChange: vi.fn(),
        changePlan: vi.fn(),
    },
}));

// Status abonamentu czytają okna zakupu (czy trwa opłacony okres).
vi.mock('@/modules/settings/api/subscriptionApi', () => ({
    subscriptionApi: { getStatus: vi.fn() },
}));

const plan = (overrides: Partial<MyPlanResponse> = {}): MyPlanResponse => ({
    billingStatus: 'ACTIVE',
    plan: { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300 },
    activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: null }],
    pendingDowngrade: null,
    periodEndsAt: '2026-10-20T10:00:00Z',
    trialEndsAt: null,
    graceEndsAt: null,
    daysRemaining: 25,
    monthlyCostCents: 17200,
    nextRenewalCostCents: 17200,
    canPurchaseMidPeriod: true,
    ...overrides,
});

const order = (overrides: Partial<CheckoutResponse> = {}): CheckoutResponse => ({
    orderId: 'o1',
    status: 'PENDING',
    amountCents: 17200,
    currency: 'PLN',
    description: '',
    paymentUrl: 'https://sandbox.przelewy24.pl/trnRequest/abc',
    ...overrides,
});

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

let assign: ReturnType<typeof vi.fn>;
let originalLocation: Location;

beforeEach(() => {
    assign = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, assign },
    });

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
    vi.mocked(newSubscriptionApi.checkout).mockResolvedValue(order());
    vi.mocked(subscriptionApi.getStatus).mockResolvedValue({
        status: 'ACTIVE', isAccessible: true, daysRemaining: 25, subscriptionEndsAt: '2026-10-20T10:00:00Z',
        trialEndsAt: null, trialUsed: true, graceEndsAt: null, inGrace: false,
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
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

    it('kwota przedłużenia to cena KOLEJNEGO okresu, nie dzisiejsza suma', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: '2026-10-20T10:00:00Z' }],
            nextRenewalCostCents: 12300,
        }));
        renderPage();
        await screen.findByText('Plan Basic');
        expect(renewButtons()[0].textContent?.replace(/\s/g, ' ')).toMatch(/Przedłuż o 30 dni za 123,00 zł/);
        expect(screen.getByText(/kolejny okres 123,00/)).toBeTruthy();
    });

    it('ceny planów i modułów są oznaczone jako brutto', async () => {
        renderPage();
        await screen.findByText('Plan Basic');
        expect((await screen.findAllByText('brutto / mies.')).length).toBeGreaterThan(0);
    });

    it('karencja: okres minął, dostęp do końca karencji, jedna akcja przedłużenia', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            billingStatus: 'PAST_DUE',
            periodEndsAt: '2026-09-28T10:00:00Z',
            graceEndsAt: '2026-10-05T10:00:00Z',
            daysRemaining: 4,
            canPurchaseMidPeriod: false,
        }));
        renderPage();

        expect(await screen.findByText('Opłacony okres minął 28 września 2026')).toBeTruthy();
        expect(screen.getByText(/Pełny dostęp działa jeszcze do 5 października 2026/)).toBeTruthy();
        // Przedłużenie w karencji liczy się od końca starego okresu - dni karencji są płatne.
        expect(screen.getByText(/liczy się od 28 września 2026/)).toBeTruthy();
        // Nie ma automatycznego obciążenia - nic „nie przeszło".
        expect(screen.queryByText(/nie przeszła/)).toBeNull();

        expect(renewButtons()).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: /Przedłuż za 172,00/ }));
        await waitFor(() => expect(newSubscriptionApi.checkout).toHaveBeenCalledWith({ type: 'RENEWAL' }));
        expect(assign).toHaveBeenCalledWith('https://sandbox.przelewy24.pl/trnRequest/abc');
    });

    it('bez trwającego okresu: wyższy plan i moduły czekają na przedłużenie', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            billingStatus: 'PAST_DUE',
            periodEndsAt: '2026-09-28T10:00:00Z',
            graceEndsAt: '2026-10-05T10:00:00Z',
            canPurchaseMidPeriod: false,
        }));
        renderPage();
        await screen.findByText('Finanse');

        expect((screen.getByRole('button', { name: 'Przejdź na Full' }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole('button', { name: 'Aktywuj' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getAllByText(/Najpierw opłać przedłużenie/).length).toBeGreaterThan(0);
        expect(newSubscriptionApi.previewPlanChange).not.toHaveBeenCalled();
    });

    it('wygasły plan: jeden przycisk odnowienia w komunikacie', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({ billingStatus: 'EXPIRED', daysRemaining: 0, canPurchaseMidPeriod: false }));
        renderPage();
        expect(await screen.findByText('Abonament wygasł')).toBeTruthy();
        expect(renewButtons()).toHaveLength(1);
    });

    it('przedłużenie FULFILLED bez adresu płatności: sukces bez przekierowania', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue(order({ status: 'FULFILLED', paymentUrl: null }));
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: /Przedłuż o 30 dni/ }));

        expect(await screen.findByText('Abonament przedłużony')).toBeTruthy();
        expect(assign).not.toHaveBeenCalled();
    });

    it('brak adresu płatności przy innym statusie niż FULFILLED to błąd, nie sukces', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue(order({ status: 'PENDING', paymentUrl: null }));
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: /Przedłuż o 30 dni/ }));

        expect(await screen.findByText('Nie udało się rozpocząć płatności')).toBeTruthy();
        expect(screen.queryByText('Abonament przedłużony')).toBeNull();
        expect(assign).not.toHaveBeenCalled();
    });

    it('503 PAYMENTS_UNAVAILABLE: jasny komunikat o niedostępnych płatnościach', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockRejectedValue({
            response: { status: 503, data: { code: 'PAYMENTS_UNAVAILABLE', message: 'Payment gateway not configured' } },
            config: { skipErrorToast: true },
        });
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: /Przedłuż o 30 dni/ }));

        expect(await screen.findByText('Płatności są chwilowo niedostępne')).toBeTruthy();
        expect(screen.queryByText('Payment gateway not configured')).toBeNull();
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

    it('odrzucona płatność za wyższy plan: powód z backendu w oknie, okno zostaje', async () => {
        vi.mocked(newSubscriptionApi.previewPlanChange).mockResolvedValue({
            changeType: 'UPGRADE', newPlanKey: 'FULL', newPlanName: 'Full', effectiveAt: '2026-10-01T10:00:00Z',
            proratedAmountCents: 9000, proratedAmountFormatted: '90,00 zł', daysRemaining: 19,
            periodEndsAt: '2026-10-20T10:00:00Z', explanation: 'Dopłata za resztę okresu.',
        });
        vi.mocked(newSubscriptionApi.checkout).mockRejectedValue({
            response: { status: 400, data: { message: 'Opłacony okres minął, najpierw przedłuż abonament' } },
            config: { skipErrorToast: true },
        });
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Przejdź na Full' }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Przejdź do płatności' }));

        expect(await within(dialog).findByText('Opłacony okres minął, najpierw przedłuż abonament')).toBeTruthy();
        expect(within(dialog).getByText('Nie udało się zmienić planu')).toBeTruthy();
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(assign).not.toHaveBeenCalled();
    });

    it('istniejące zamówienie z inną kwotą niż wycena: pokazuje kwotę i czeka na potwierdzenie', async () => {
        vi.mocked(newSubscriptionApi.previewAddOn).mockResolvedValue({
            addOnKey: 'FINANCE_MODULE', addOnName: 'Finanse', proratedAmountCents: 5000, proratedAmountFormatted: '50,00 zł',
            daysRemaining: 19, periodEndsAt: '2026-10-20T10:00:00Z', explanation: 'Dopłata za resztę okresu.',
        });
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue(order({ amountCents: 6000 }));
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Aktywuj' }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Przejdź do płatności' }));

        expect(await within(dialog).findByText('Kwota do zapłaty się zmieniła')).toBeTruthy();
        expect(assign).not.toHaveBeenCalled();
        // Nadal jedno wypełnienie w oknie: to ono prowadzi do płatności po nowej kwocie.
        const filled = dialog.querySelectorAll('[data-variant="primary"], [data-variant="success"]');
        expect(filled).toHaveLength(1);
        await userEvent.click(within(dialog).getByRole('button', { name: /Zapłać 60,00/ }));
        expect(assign).toHaveBeenCalledWith('https://sandbox.przelewy24.pl/trnRequest/abc');
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

    it('wyłączenie modułu pyta oknem i zapowiada koniec okresu, zanim cokolwiek wyłączy', async () => {
        vi.mocked(newSubscriptionApi.deactivateAddOn).mockResolvedValue({} as never);
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Dezaktywuj' }));

        expect(newSubscriptionApi.deactivateAddOn).not.toHaveBeenCalled();
        expect(await screen.findByText('Wyłączyć moduł Komunikacja z końcem okresu?')).toBeTruthy();
        expect(screen.getByText(/do 20 października 2026/)).toBeTruthy();
        await userEvent.click(screen.getByRole('button', { name: 'Wyłącz z końcem okresu' }));
        await waitFor(() => expect(newSubscriptionApi.deactivateAddOn).toHaveBeenCalledWith('CLIENT_COMMUNICATION'));
        expect(await screen.findByText('Moduł wyłączy się 20 października 2026')).toBeTruthy();
    });

    it('w okresie próbnym wyłączenie modułu jest natychmiastowe i okno to mówi', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            billingStatus: 'TRIALING', trialEndsAt: '2026-11-01T10:00:00Z',
        }));
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Dezaktywuj' }));

        expect(await screen.findByText('Wyłączyć moduł Komunikacja?')).toBeTruthy();
        expect(screen.getByText(/wyłączy się od razu/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Wyłącz moduł' })).toBeTruthy();
    });

    it('moduł z zaplanowanym wyłączeniem: data w plakietce i „Przywróć" zamiast „Dezaktywuj"', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: '2026-10-20T10:00:00Z' }],
            nextRenewalCostCents: 12300,
        }));
        vi.mocked(newSubscriptionApi.resumeAddOn).mockResolvedValue({} as never);
        renderPage();

        expect(await screen.findByText('Wyłączy się 20 października 2026')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Dezaktywuj' })).toBeNull();
        const resume = screen.getByRole('button', { name: 'Przywróć' });
        expect(resume.getAttribute('data-variant')).not.toBe('primary');

        await userEvent.click(resume);
        await waitFor(() => expect(newSubscriptionApi.resumeAddOn).toHaveBeenCalledWith('CLIENT_COMMUNICATION'));
        expect(await screen.findByText('Moduł zostaje')).toBeTruthy();
        // Moduł nadal aktywny - nie wraca na listę do dokupienia.
        expect(screen.getAllByRole('button', { name: 'Aktywuj' })).toHaveLength(1);
    });

    it('odwołanie obniżenia po opłaceniu kolejnego okresu (409): toast i baner znika po odświeżeniu', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan)
            .mockResolvedValueOnce(plan({
                pendingDowngrade: { toPlanKey: 'BASIC', toPlanName: 'Basic', effectiveAt: '2026-10-20T10:00:00Z', cancellable: true },
            }))
            .mockResolvedValue(plan());
        vi.mocked(newSubscriptionApi.cancelPendingPlanChange).mockRejectedValue({
            response: { status: 409, data: { code: 'DOWNGRADE_ALREADY_PAID', message: 'Kolejny okres jest już opłacony w planie Basic.' } },
            config: { skipErrorToast: true },
        });
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Odwołaj zmianę' }));
        expect(await screen.findByText('Za późno na odwołanie')).toBeTruthy();
        await waitFor(() => expect(screen.queryByText('Zaplanowana zmiana planu')).toBeNull());
        expect(newSubscriptionApi.getMyPlan).toHaveBeenCalledTimes(2);
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
