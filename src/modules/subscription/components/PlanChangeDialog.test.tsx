// @vitest-environment jsdom
//
// Zakup bez płatności (moduł w trialu, zmiana pakietu za 0 zł, tryb mock): okno brało brak
// adresu płatności za sukces. Darmowe zamówienie, którego backend nie mógł zastosować, wraca
// jako CANCELLED - a kupujący widział „Moduł włączony". Sukces jest teraz tylko dla FULFILLED.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { AddOnActivationDialog, PlanChangeDialog } from './PlanChangeDialog';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { AddOnPreview, CheckoutResponse, PaymentOrderStatus, PlanChangePreview } from '../types';

vi.mock('../api/subscriptionApi', () => ({
    newSubscriptionApi: { checkout: vi.fn() },
}));

const checkout = vi.mocked(newSubscriptionApi.checkout);

const response = (status: PaymentOrderStatus, overrides: Partial<CheckoutResponse> = {}): CheckoutResponse => ({
    orderId: 'ord-7', status, amountCents: 0, currency: 'PLN', description: 'Zakup', paymentUrl: null, failureReason: null,
    ...overrides,
});

const planPreview = {
    changeType: 'UPGRADE', newPlanName: 'Full', effectiveAt: '2026-10-16T00:00:00Z',
    proratedAmountFormatted: null, daysRemaining: 20, explanation: 'W okresie próbnym bez opłaty.',
} as unknown as PlanChangePreview;

const addOnPreview = {
    addOnName: 'Finanse', proratedAmountCents: null, proratedAmountFormatted: null,
    daysRemaining: 20, periodEndsAt: '2026-11-05T00:00:00Z', explanation: 'W okresie próbnym bez opłaty.',
} as unknown as AddOnPreview;

const Where = () => <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;

const renderWith = (dialog: React.ReactNode) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <MemoryRouter initialEntries={['/settings']}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <Routes>
                            <Route path="/settings" element={<>{dialog}<Where /></>} />
                            <Route path="/payments/result" element={<Where />} />
                        </Routes>
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
};

let onClose = vi.fn<() => void>();

beforeEach(() => {
    checkout.mockReset();
    onClose = vi.fn<() => void>();
});

afterEach(() => cleanup());

describe('AddOnActivationDialog - zakup bez płatności', () => {
    const renderDialog = () => renderWith(
        <AddOnActivationDialog addOnKey="FINANCE_MODULE" addOnName="Finanse" preview={addOnPreview}
            isLoadingPreview={false} onClose={onClose} />,
    );

    it('FULFILLED: „Moduł włączony" i zamknięcie okna', async () => {
        checkout.mockResolvedValue(response('FULFILLED'));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        expect(await screen.findByText('Moduł włączony')).toBeTruthy();
        expect(onClose).toHaveBeenCalled();
    });

    it('CANCELLED: błąd z powodem i tym, co zrobić - nigdy „Moduł włączony"', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Ten moduł jest już aktywny.' }));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        expect(await screen.findByText('Nie udało się włączyć zakupu')).toBeTruthy();
        expect(screen.getByText(/Ten moduł jest już aktywny\. Nic nie zostało pobrane/)).toBeTruthy();
        expect(screen.queryByText('Moduł włączony')).toBeNull();
    });

    it('REFUND_REQUIRED: ostrzeżenie o zwrocie, nie sukces', async () => {
        checkout.mockResolvedValue(response('REFUND_REQUIRED', { amountCents: 4900, failureReason: 'Moduł już aktywny.' }));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        expect(await screen.findByText('Płatność przyjęta, ale zakupu nie da się włączyć')).toBeTruthy();
        expect(screen.queryByText('Moduł włączony')).toBeNull();
    });

    it('PAID: przejście na stronę wyniku płatności, która czeka na włączenie', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/payments/result?orderId=ord-7'));
        expect(screen.queryByText('Moduł włączony')).toBeNull();
    });

    it('adres płatności: przekierowanie do Przelewy24 bez żadnego toastu', async () => {
        const assign = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign });
        try {
            checkout.mockResolvedValue(response('PENDING', { paymentUrl: 'https://sandbox.przelewy24.pl/trnRequest/T', amountCents: 4900 }));
            renderDialog();
            await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

            await waitFor(() => expect(assign).toHaveBeenCalledWith('https://sandbox.przelewy24.pl/trnRequest/T'));
            expect(screen.queryByText('Moduł włączony')).toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe('PlanChangeDialog - zmiana pakietu bez płatności', () => {
    const renderDialog = () => renderWith(
        <PlanChangeDialog newPlanKey="FULL" newPlanName="Full" currentPlanName="Basic" preview={planPreview}
            isLoadingPreview={false} onClose={onClose} />,
    );

    it('FULFILLED: „Pakiet zmieniony"', async () => {
        checkout.mockResolvedValue(response('FULFILLED'));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności' }));

        expect(await screen.findByText('Pakiet zmieniony')).toBeTruthy();
        expect(checkout).toHaveBeenCalledWith({ type: 'PLAN_UPGRADE', planKey: 'FULL' });
    });

    it('CANCELLED: błąd zamiast „Pakiet zmieniony"', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Studio ma już pakiet FULL.' }));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności' }));

        expect(await screen.findByText('Nie udało się włączyć zakupu')).toBeTruthy();
        expect(screen.getByText(/Studio ma już pakiet FULL\./)).toBeTruthy();
        expect(screen.queryByText('Pakiet zmieniony')).toBeNull();
    });

    it('PAID: strona wyniku płatności zamiast sukcesu', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderDialog();
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności' }));

        await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/payments/result?orderId=ord-7'));
        expect(screen.queryByText('Pakiet zmieniony')).toBeNull();
    });
});
