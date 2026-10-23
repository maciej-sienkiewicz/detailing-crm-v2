// @vitest-environment jsdom
//
// Zakup z ekranu powitania (FirstLoginModal) i z ekranu wygasłego pakietu (ten sam FirstLoginModal
// w trybie `expired`): brak adresu płatności nie robił tu nic, więc zamówienie bez płatności
// anulowane przez backend zostawiało przycisk w „Przekierowywanie do płatności…" na zawsze.
// Teraz rozstrzyga stan zamówienia: błąd z tym, co zrobić dalej, albo strona wyniku płatności.
//
// Po wygaśnięciu dawniej było tylko „Przedłuż pakiet" - dotychczasowy pakiet ze wszystkimi
// modułami. Teraz wybór pakietu i modułów, z dotychczasowym zestawem zaznaczonym na start.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';
import type { AddOnDto, CheckoutResponse, FeaturePlan, PaymentOrderStatus } from '@/modules/subscription/types';
import { SubscriptionGate } from './SubscriptionGate';

const state = vi.hoisted(() => ({
    status: undefined as unknown,
    user: { role: 'OWNER' } as Record<string, unknown>,
}));
const checkout = vi.hoisted(() => vi.fn());

vi.mock('@/core/native/platform', () => ({
    canPurchaseHere: () => true,
    isNativeApp: () => false,
}));

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ isLoading: false, user: state.user, setAuthenticated: vi.fn() }),
}));

vi.mock('@/modules/settings/hooks/useSubscription', () => ({
    useSubscriptionStatus: () => ({ status: state.status, isLoading: false }),
}));

vi.mock('@/modules/auth/api/authApi', () => ({ authApi: { logout: vi.fn() } }));

const PLANS: FeaturePlan[] = [
    { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300, features: [], displayOrder: 1 },
    { key: 'FULL', name: 'Full', monthlyPriceGrossCents: 29900, features: [], displayOrder: 2 },
] as FeaturePlan[];

const ADD_ONS: AddOnDto[] = [{
    key: 'FINANCE_MODULE', name: 'Finanse', description: 'Faktury i KSeF',
    monthlyPriceGrossCents: 4900, features: [], isAvailable: true,
}] as AddOnDto[];

const entitlements = vi.hoisted(() => ({ plan: { key: 'FULL', name: 'Full' }, activeAddOns: [] as string[] }));

vi.mock('@/modules/subscription/api/subscriptionQueries', () => ({
    useCheckout: () => ({ isPending: false, mutateAsync: checkout }),
    useFeaturePlans: () => ({ data: PLANS, isLoading: false }),
    useAddOns: () => ({ data: ADD_ONS }),
    useStartTrial: () => ({ mutateAsync: vi.fn() }),
    useEntitlements: () => ({ data: entitlements, isLoading: false }),
}));

vi.mock('@/modules/subscription/api/subscriptionApi', () => ({
    newSubscriptionApi: {
        calculatePrice: vi.fn().mockResolvedValue({
            basePlanKey: 'BASIC', basePlanName: 'Basic', basePlanMonthlyPriceCents: 12300, addOns: [],
            totalMonthlyPriceCents: 12300, hasUndefinedPrices: false, fullPlanMonthlyPriceCents: 29900, savingsWithFullCents: null,
        }),
    },
}));

const response = (status: PaymentOrderStatus, overrides: Partial<CheckoutResponse> = {}): CheckoutResponse => ({
    orderId: 'ord-9', status, amountCents: 0, currency: 'PLN', description: 'Zakup', paymentUrl: null, failureReason: null,
    ...overrides,
});

const status = (overrides: Partial<SubscriptionStatusResponse>): SubscriptionStatusResponse => ({
    status: 'ACTIVE', isAccessible: true, daysRemaining: null, subscriptionEndsAt: null, trialEndsAt: null, trialUsed: true,
    ...overrides,
});

const Where = () => <p data-testid="where">{useLocation().pathname + useLocation().search}</p>;

const renderGate = () => render(
    <MemoryRouter initialEntries={['/calendar']}>
        <ThemeProvider theme={theme}>
            <ToastProvider>
                <Routes>
                    <Route path="/calendar" element={<SubscriptionGate><p>kalendarz</p></SubscriptionGate>} />
                    <Route path="/payments/result" element={<Where />} />
                </Routes>
            </ToastProvider>
        </ThemeProvider>
    </MemoryRouter>,
);

beforeEach(() => {
    checkout.mockReset();
    state.user = { role: 'OWNER' };
    entitlements.plan = { key: 'FULL', name: 'Full' };
    entitlements.activeAddOns = [];
});
afterEach(() => cleanup());

describe('FirstLoginModal - zakup bez płatności', () => {
    beforeEach(() => { state.status = status({ status: 'NO_PLAN', isAccessible: false, trialUsed: true }); });

    it('CANCELLED: komunikat z powodem, a ekran znów pozwala wybrać', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Studio ma już pakiet.' }));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByText('Basic'));

        expect((await screen.findAllByText(/Studio ma już pakiet\. Nic nie zostało pobrane/)).length).toBeGreaterThan(0);
        expect(screen.queryByText('Przekierowywanie do płatności…')).toBeNull();
        expect(screen.getByText('Basic')).toBeTruthy();
    });

    it('PAID: strona wyniku płatności przejmuje czekanie na włączenie', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByText('Basic'));

        await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/payments/result?orderId=ord-9'));
    });
});

describe('Wygasły pakiet - wybór pakietu zamiast samego przedłużenia', () => {
    beforeEach(() => {
        state.status = status({ status: 'EXPIRED', isAccessible: false, subscriptionEndsAt: '2026-09-01T00:00:00Z' });
    });

    it('pokazuje oba pakiety z dotychczasowym oznaczonym i bez okresu próbnego', () => {
        renderGate();

        expect(screen.getByRole('heading', { name: 'Twój pakiet wygasł' })).toBeTruthy();
        expect(screen.getByText('Basic')).toBeTruthy();
        expect(screen.getByText('Full')).toBeTruthy();
        expect(screen.getByText('Dotychczasowy')).toBeTruthy();
        expect(screen.queryByText(/Wypróbuj bezpłatnie/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Wyloguj się' })).toBeTruthy();
    });

    it('bez zgody na regulamin płatność nie rusza, a zgoda się podświetla', async () => {
        renderGate();
        await userEvent.click(screen.getByText('Basic'));

        expect(screen.getByText(/Zaznacz akceptację regulaminu/)).toBeTruthy();
        expect(checkout).not.toHaveBeenCalled();
    });

    it('niższy pakiet po wygaśnięciu: zakup BASIC, bez opłacania dotychczasowego FULL', async () => {
        checkout.mockResolvedValue(response('FULFILLED'));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByText('Basic'));

        await waitFor(() => expect(checkout).toHaveBeenCalledWith({
            type: 'INITIAL_PURCHASE', planKey: 'BASIC', addOnKeys: [], acceptTerms: true,
        }));
        expect(screen.queryByText('Nie udało się włączyć zakupu')).toBeNull();
    });

    it('BASIC z modułami: dotychczasowe moduły zaznaczone, odznaczony nie wchodzi do zamówienia', async () => {
        entitlements.plan = { key: 'BASIC', name: 'Basic' };
        entitlements.activeAddOns = ['FINANCE_MODULE'];
        checkout.mockResolvedValue(response('FULFILLED'));
        renderGate();

        const finance = screen.getByRole('checkbox', { name: 'Finanse' }) as HTMLInputElement;
        expect(finance.checked).toBe(true);
        await userEvent.click(finance);
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(await screen.findByRole('button', { name: 'Przejdź do płatności' }));

        await waitFor(() => expect(checkout).toHaveBeenCalledWith({
            type: 'INITIAL_PURCHASE', planKey: 'BASIC', addOnKeys: [], acceptTerms: true,
        }));
    });

    it('CANCELLED: błąd zamiast ciszy', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Okres już opłacony.' }));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByText('Full'));

        expect((await screen.findAllByText(/Okres już opłacony\./)).length).toBeGreaterThan(0);
    });

    it('PAID: strona wyniku płatności', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByText('Full'));

        await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/payments/result?orderId=ord-9'));
    });

    it('koniec okresu próbnego ma własny nagłówek', () => {
        state.status = status({ status: 'EXPIRED', isAccessible: false, subscriptionEndsAt: null });
        renderGate();

        expect(screen.getByRole('heading', { name: 'Okres próbny się skończył' })).toBeTruthy();
    });

    it('pracownik nie wybiera pakietu, ale może się wylogować', () => {
        state.user = { role: 'EMPLOYEE', permissions: [] };
        renderGate();

        expect(screen.getByText(/Pakiet może opłacić tylko właściciel studia/)).toBeTruthy();
        expect(screen.queryByText('Basic')).toBeNull();
        expect(screen.getByRole('button', { name: 'Wyloguj się' })).toBeTruthy();
    });
});
