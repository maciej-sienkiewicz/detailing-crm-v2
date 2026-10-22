// @vitest-environment jsdom
//
// Zakup z ekranu powitania (FirstLoginModal) i z nakładki wygasłego pakietu (ExpiredModal):
// brak adresu płatności nie robił tu nic, więc zamówienie bez płatności anulowane przez backend
// zostawiało przycisk w „Przekierowywanie do płatności…" na zawsze, bez słowa wyjaśnienia.
// Teraz rozstrzyga stan zamówienia: błąd z tym, co zrobić dalej, albo strona wyniku płatności.
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

const state = vi.hoisted(() => ({ status: undefined as unknown }));
const checkout = vi.hoisted(() => vi.fn());

vi.mock('@/core/native/platform', () => ({
    canPurchaseHere: () => true,
    isNativeApp: () => false,
}));

vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ isLoading: false, user: { role: 'OWNER' }, setAuthenticated: vi.fn() }),
}));

vi.mock('@/modules/settings/hooks/useSubscription', () => ({
    useSubscriptionStatus: () => ({ status: state.status, isLoading: false }),
}));

vi.mock('@/modules/auth/api/authApi', () => ({ authApi: { logout: vi.fn() } }));

const PLANS: FeaturePlan[] = [
    { key: 'BASIC', name: 'Basic', monthlyPriceGrossCents: 12300, features: [], displayOrder: 1 },
] as FeaturePlan[];

vi.mock('@/modules/subscription/api/subscriptionQueries', () => ({
    useCheckout: () => ({ isPending: false, mutateAsync: checkout }),
    useMyPlan: () => ({ data: { plan: { key: 'BASIC', name: 'Basic' }, monthlyCostCents: 12300 } }),
    useFeaturePlans: () => ({ data: PLANS, isLoading: false }),
    useAddOns: () => ({ data: [] as AddOnDto[] }),
    useStartTrial: () => ({ mutateAsync: vi.fn() }),
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

beforeEach(() => checkout.mockReset());
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

describe('ExpiredModal - przedłużenie bez płatności', () => {
    beforeEach(() => { state.status = status({ status: 'EXPIRED', isAccessible: false }); });

    // Przelewy24 wymaga akceptacji regulaminu i polityki przed płatnością.
    it('bez zgody na regulamin płatność nie rusza, a zgoda się podświetla', async () => {
        renderGate();
        await userEvent.click(screen.getByRole('button', { name: 'Przedłuż pakiet' }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByText(/Zaznacz akceptację regulaminu/)).toBeTruthy();
        expect(checkout).not.toHaveBeenCalled();
    });

    it('CANCELLED: błąd zamiast ciszy', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Okres już opłacony.' }));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przedłuż pakiet' }));

        expect(await screen.findByText('Nie udało się włączyć zakupu')).toBeTruthy();
        expect(screen.getByText(/Okres już opłacony\./)).toBeTruthy();
    });

    it('PAID: strona wyniku płatności', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przedłuż pakiet' }));

        await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/payments/result?orderId=ord-9'));
    });

    it('FULFILLED: bez komunikatu o błędzie (status pakietu odświeża się sam)', async () => {
        checkout.mockResolvedValue(response('FULFILLED'));
        renderGate();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przedłuż pakiet' }));

        await waitFor(() => expect(checkout).toHaveBeenCalledWith({ type: 'RENEWAL', acceptTerms: true }));
        expect(screen.queryByText('Nie udało się włączyć zakupu')).toBeNull();
        expect(screen.queryByText('Błąd płatności')).toBeNull();
    });
});
