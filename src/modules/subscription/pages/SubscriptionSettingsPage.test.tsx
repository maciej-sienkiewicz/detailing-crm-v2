// @vitest-environment jsdom
//
// Pakiet: jeden przycisk przedłużenia (a nie dwa wypełnione naraz), zaległość
// z działającą akcją zamiast samego ostrzeżenia, nieudana wycena mówiąca o sobie
// toastem zamiast cichego zamknięcia okna, i jedno „Wyłącz" na moduł.
//
// Audyt 23.10.2026: kwota przedłużenia to cena KOLEJNEGO okresu (przycisk mówił 299 zł,
// serwer pobierał 99 zł), wyłączenie modułu działa z końcem okresu i da się je cofnąć,
// w karencji nie ma zakupów „za darmo", a zmiany opłaconej z góry nie da się odwołać.
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
        resumeAddOn: vi.fn(),
        cancelPendingPlanChange: vi.fn(),
        changePlan: vi.fn(),
    },
}));

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const plan = (overrides: Partial<MyPlanResponse> = {}): MyPlanResponse => ({
    billingStatus: 'ACTIVE',
    plan: { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300 },
    activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: null, resumable: false }],
    pendingDowngrade: null,
    periodEndsAt: inDays(25),
    trialEndsAt: null,
    daysRemaining: 25,
    monthlyCostCents: 17200,
    nextRenewalCostCents: 17200,
    graceEndsAt: null,
    canPurchaseMidPeriod: true,
    renewalPeriodEndsAt: inDays(55),
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
    vi.mocked(newSubscriptionApi.getPaymentHistory).mockResolvedValue({ items: [], page: { number: 1, size: 20, totalItems: 0, totalPages: 1 } });
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
        await screen.findByText('Pakiet Basic');
        expect(screen.queryByRole('heading', { name: 'Pakiet' })).toBeNull();
        expect(screen.queryByText(/konto i rozliczenia/i)).toBeNull();
    });

    it('aktywny plan: dokładnie jeden przycisk przedłużenia, z kwotą', async () => {
        renderPage();
        await screen.findByText('Pakiet Basic');
        expect(renewButtons()).toHaveLength(1);
        expect(renewButtons()[0].textContent?.replace(/\s/g, ' ')).toMatch(/Przedłuż o 30 dni za 172,00 zł/);
    });

    it('ceny planów i modułów są oznaczone jako brutto', async () => {
        renderPage();
        await screen.findByText('Pakiet Basic');
        expect((await screen.findAllByText('brutto / mies.')).length).toBeGreaterThan(0);
    });

    it('karencja: komunikat ma akcję, która uruchamia płatność, i jest jedyną', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            billingStatus: 'PAST_DUE', periodEndsAt: inDays(-1), graceEndsAt: inDays(6), daysRemaining: 6, canPurchaseMidPeriod: false,
        }));
        renderPage();

        // Dawniej „Ostatnia płatność nie przeszła" - płatności automatycznych nie ma.
        expect(await screen.findByText('Opłacony okres minął')).toBeTruthy();
        expect(screen.queryByText(/płatność nie przeszła/)).toBeNull();
        expect(renewButtons()).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: /Przedłuż za 172,00/ }));
        await userEvent.click(await screen.findByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności' }));
        await waitFor(() => expect(newSubscriptionApi.checkout).toHaveBeenCalledWith({ type: 'RENEWAL', acceptTerms: true }));
    });

    it('przedłużenie bez płatności: sukces tylko dla FULFILLED', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue({
            orderId: 'o1', status: 'FULFILLED', amountCents: 0, currency: 'PLN', description: '', paymentUrl: null,
        });
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: /Przedłuż o 30 dni/ }));
        await userEvent.click(await screen.findByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności' }));
        expect(await screen.findByText('Pakiet przedłużony')).toBeTruthy();
    });

    it('przedłużenie bez płatności, którego nie dało się zastosować: błąd, a nie „Pakiet przedłużony"', async () => {
        vi.mocked(newSubscriptionApi.checkout).mockResolvedValue({
            orderId: 'o1', status: 'CANCELLED', amountCents: 0, currency: 'PLN', description: '', paymentUrl: null,
            failureReason: 'Studio ma już opłacony okres.',
        });
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: /Przedłuż o 30 dni/ }));
        await userEvent.click(await screen.findByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności' }));
        expect(await screen.findByText('Nie udało się włączyć zakupu')).toBeTruthy();
        expect(screen.getByText(/Studio ma już opłacony okres\. Nic nie zostało pobrane/)).toBeTruthy();
        expect(screen.queryByText('Pakiet przedłużony')).toBeNull();
    });

    // Pakiet wybiera się na pełnoekranowym ekranie wygaśnięcia (SubscriptionGate) - tu nie ma
    // drugiego, konkurencyjnego przycisku zakupu.
    it('wygasły plan: komunikat bez własnego przycisku zakupu', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({ billingStatus: 'EXPIRED', daysRemaining: 0, canPurchaseMidPeriod: false }));
        renderPage();
        expect(await screen.findByText('Twój pakiet wygasł')).toBeTruthy();
        expect(renewButtons()).toHaveLength(0);
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

        await userEvent.click(await screen.findByRole('button', { name: 'Włącz moduł Finanse' }));
        expect(await screen.findByText('Nie udało się pobrać wyceny modułu')).toBeTruthy();
        expect(screen.getByText('Moduł niedostępny w tym planie')).toBeTruthy();
    });

    it('włączony moduł ma jedno „Wyłącz" i nie wraca na listę do dokupienia', async () => {
        renderPage();
        await screen.findByText('Pakiet Basic');
        await screen.findByText('Finanse');
        expect(screen.getAllByRole('button', { name: /^Wyłącz moduł/ })).toHaveLength(1);
        // Komunikacja jest aktywna - do dokupienia zostają tylko Finanse.
        expect(screen.getAllByRole('button', { name: /^Włącz moduł/ })).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Włącz moduł Finanse' })).toBeTruthy();
    });

    it('dezaktywacja pyta oknem potwierdzenia i mówi, że moduł działa do końca opłaconego okresu', async () => {
        vi.mocked(newSubscriptionApi.deactivateAddOn).mockResolvedValue({} as never);
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Wyłącz moduł Komunikacja' }));

        expect(newSubscriptionApi.deactivateAddOn).not.toHaveBeenCalled();
        expect(await screen.findByText('Wyłączyć moduł Komunikacja?')).toBeTruthy();
        // Dawniej „Stracisz dostęp od razu" - a serwer zostawia moduł do końca okresu.
        expect(screen.getByText(/Moduł działa do .*, bo ten czas jest już opłacony/)).toBeTruthy();
        expect(screen.queryByText(/od razu/)).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Wyłącz z końcem okresu' }));
        await waitFor(() => expect(newSubscriptionApi.deactivateAddOn).toHaveBeenCalledWith('CLIENT_COMMUNICATION'));
        expect(await screen.findByText('Wyłączenie zaplanowane')).toBeTruthy();
    });

    it('w okresie próbnym moduł wyłącza się od razu i okno tak mówi', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            billingStatus: 'TRIALING', periodEndsAt: null, trialEndsAt: inDays(60), daysRemaining: 60,
        }));
        renderPage();
        await userEvent.click(await screen.findByRole('button', { name: 'Wyłącz moduł Komunikacja' }));

        expect(await screen.findByText(/Moduł przestanie działać od razu/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Wyłącz' })).toBeTruthy();
    });

    it('przedłużenie pokazuje cenę kolejnego okresu, nie dzisiejszą', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: inDays(25), resumable: true }],
            nextRenewalCostCents: 12300,
        }));
        renderPage();
        await screen.findByText('Pakiet Basic');

        expect(renewButtons()[0].textContent?.replace(/\s/g, ' ')).toMatch(/Przedłuż o 30 dni za 123,00 zł/);
        expect(screen.getByText(/Kolejny okres: 123,00 zł/)).toBeTruthy();

        await userEvent.click(renewButtons()[0]);
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('123,00 zł brutto')).toBeTruthy();
        expect(within(dialog).queryByText(/od opłacenia/)).toBeNull();
        expect(within(dialog).getByText(/^30 dni, do /)).toBeTruthy();
    });

    it('wyłączany moduł: data końca i „Przywróć", dopóki kolejny okres nie jest opłacony', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: inDays(25), resumable: true }],
            nextRenewalCostCents: 12300,
        }));
        vi.mocked(newSubscriptionApi.resumeAddOn).mockResolvedValue({} as never);
        renderPage();

        expect(await screen.findByText(/Działa do .*, potem się wyłączy/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Wyłącz moduł Komunikacja' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Przywróć moduł Komunikacja' }));
        await waitFor(() => expect(newSubscriptionApi.resumeAddOn).toHaveBeenCalledWith('CLIENT_COMMUNICATION'));
    });

    it('wyłączany moduł po opłaconym przedłużeniu: bez „Przywróć", z wyjaśnieniem', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            activeAddOns: [{ key: 'CLIENT_COMMUNICATION', name: 'Komunikacja', monthlyPriceGrossCents: 4900, cancelAt: inDays(25), resumable: false }],
        }));
        renderPage();

        expect(await screen.findByText(/Kolejny okres opłacono bez tego modułu/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Przywróć/ })).toBeNull();
    });

    it('karencja: wyższy pakiet i moduły nieaktywne, z wyjaśnieniem', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            billingStatus: 'PAST_DUE', periodEndsAt: inDays(-1), graceEndsAt: inDays(6), canPurchaseMidPeriod: false,
        }));
        renderPage();
        await screen.findByText('Finanse');

        expect((screen.getByRole('button', { name: 'Przejdź na Full' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('Na wyższy pakiet przejdziesz po przedłużeniu.')).toBeTruthy();
        expect((screen.getByRole('button', { name: 'Włącz moduł Finanse' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('Moduły dokupisz po przedłużeniu pakietu.')).toBeTruthy();
    });

    it('zmiana opłacona już z góry: bez „Odwołaj zmianę", z wyjaśnieniem', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockResolvedValue(plan({
            plan: { key: 'FULL', name: 'Full', monthlyPriceGrossCents: 24600 },
            activeAddOns: [],
            pendingDowngrade: { toPlanKey: 'BASIC', toPlanName: 'Basic', effectiveAt: inDays(25), cancellable: false },
        }));
        renderPage();

        expect(await screen.findByText(/zmiany nie da się odwołać/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Odwołaj zmianę' })).toBeNull();
    });

    it('błąd wczytania planu to komunikat z ponowieniem', async () => {
        vi.mocked(newSubscriptionApi.getMyPlan).mockRejectedValue(new Error('offline'));
        renderPage();
        expect(await screen.findByText('Nie udało się wczytać pakietu')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeTruthy();
    });

    it('historia płatności pokazuje okno numerów stron, nie każdą stronę', async () => {
        const entry = (i: number): PaymentHistoryEntry => ({
            id: `p${i}`, date: '2026-09-01T10:00:00Z', eventType: 'SUBSCRIPTION_PURCHASE',
            eventTypeDisplayName: 'Zakup', description: '', amountCents: 17200, amountFormatted: '172,00 zł',
            currency: 'PLN', transactionId: `t${i}`, plan: null, addOn: null,
        } as PaymentHistoryEntry);
        vi.mocked(newSubscriptionApi.getPaymentHistory).mockResolvedValue({
            items: Array.from({ length: 20 }, (_, i) => entry(i)), page: { number: 1, size: 20, totalItems: 400, totalPages: 20 },
        });
        renderPage();

        const nav = await screen.findByRole('navigation', { name: /strony historii/i });
        const numbered = within(nav).getAllByRole('button', { name: /^Strona \d+$/ });
        expect(numbered.map(b => b.textContent)).toEqual(['1', '2', '20']);
    });
});
