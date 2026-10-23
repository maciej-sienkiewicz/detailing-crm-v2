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
    newSubscriptionApi: { checkout: vi.fn(), changePlan: vi.fn() },
}));

const checkout = vi.mocked(newSubscriptionApi.checkout);
const changePlan = vi.mocked(newSubscriptionApi.changePlan);

const response = (status: PaymentOrderStatus, overrides: Partial<CheckoutResponse> = {}): CheckoutResponse => ({
    orderId: 'ord-7', status, amountCents: 0, currency: 'PLN', description: 'Zakup', paymentUrl: null, failureReason: null,
    ...overrides,
});

const planPreview: PlanChangePreview = {
    changeType: 'UPGRADE', newPlanKey: 'FULL', newPlanName: 'Full', effectiveAt: '2026-10-16T00:00:00Z',
    proratedAmountCents: null, proratedAmountFormatted: null, daysRemaining: null, periodEndsAt: null,
    explanation: 'W okresie próbnym zmiana pakietu jest bez opłat.', allowed: true,
};

const addOnPreview: AddOnPreview = {
    addOnKey: 'FINANCE_MODULE', addOnName: 'Finanse', proratedAmountCents: null, proratedAmountFormatted: null,
    daysRemaining: null, periodEndsAt: null, explanation: 'W okresie próbnym moduł działa bez opłat.', allowed: true,
};

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
    changePlan.mockReset();
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
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        expect(await screen.findByText('Moduł włączony')).toBeTruthy();
        expect(onClose).toHaveBeenCalled();
    });

    it('CANCELLED: błąd z powodem i tym, co zrobić - nigdy „Moduł włączony"', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Ten moduł jest już aktywny.' }));
        renderDialog();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        expect(await screen.findByText('Nie udało się włączyć zakupu')).toBeTruthy();
        expect(screen.getByText(/Ten moduł jest już aktywny\. Nic nie zostało pobrane/)).toBeTruthy();
        expect(screen.queryByText('Moduł włączony')).toBeNull();
    });

    it('REFUND_REQUIRED: ostrzeżenie o zwrocie, nie sukces', async () => {
        checkout.mockResolvedValue(response('REFUND_REQUIRED', { amountCents: 4900, failureReason: 'Moduł już aktywny.' }));
        renderDialog();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Włącz bezpłatnie' }));

        expect(await screen.findByText('Płatność przyjęta, ale zakupu nie da się włączyć')).toBeTruthy();
        expect(screen.queryByText('Moduł włączony')).toBeNull();
    });

    it('PAID: przejście na stronę wyniku płatności, która czeka na włączenie', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderDialog();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
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
            await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
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
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź na Full' }));

        expect(await screen.findByText('Pakiet zmieniony')).toBeTruthy();
        expect(checkout).toHaveBeenCalledWith({ type: 'PLAN_UPGRADE', planKey: 'FULL', acceptTerms: true });
    });

    it('CANCELLED: błąd zamiast „Pakiet zmieniony"', async () => {
        checkout.mockResolvedValue(response('CANCELLED', { failureReason: 'Studio ma już pakiet FULL.' }));
        renderDialog();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź na Full' }));

        expect(await screen.findByText('Nie udało się włączyć zakupu')).toBeTruthy();
        expect(screen.getByText(/Studio ma już pakiet FULL\./)).toBeTruthy();
        expect(screen.queryByText('Pakiet zmieniony')).toBeNull();
    });

    it('PAID: strona wyniku płatności zamiast sukcesu', async () => {
        checkout.mockResolvedValue(response('PAID'));
        renderDialog();
        await userEvent.click(screen.getByRole('checkbox', { name: /Akceptuję regulamin/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Przejdź na Full' }));

        await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/payments/result?orderId=ord-7'));
        expect(screen.queryByText('Pakiet zmieniony')).toBeNull();
    });
});

// Audyt 23.10.2026: okna nie czytały `allowed` ani tego, czy jest trwający opłacony okres.
describe('PlanChangeDialog - treść zależna od sytuacji', () => {
    const render = (preview: PlanChangePreview, newPlanKey: 'BASIC' | 'FULL' = 'FULL') => renderWith(
        <PlanChangeDialog newPlanKey={newPlanKey} newPlanName={newPlanKey === 'FULL' ? 'Full' : 'Basic'}
            currentPlanName={newPlanKey === 'FULL' ? 'Basic' : 'Full'} preview={preview}
            isLoadingPreview={false} onClose={onClose} />,
    );

    it('okres próbny: bez opłat i od razu - bez „po opłaceniu" i „przejdź do płatności"', () => {
        render(planPreview);

        expect(screen.getByText('Bez opłat do końca okresu próbnego')).toBeTruthy();
        expect(screen.getByText('Od razu')).toBeTruthy();
        expect(screen.queryByText('Od razu po opłaceniu')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Przejdź do płatności' })).toBeNull();
    });

    it('karencja (allowed=false): wyjaśnienie zamiast „bezpłatnie w okresie próbnym", bez przycisku zakupu', () => {
        render({ ...planPreview, allowed: false, explanation: 'Opłacony okres się skończył. Najpierw przedłuż pakiet.' });

        expect(screen.getByText(/Najpierw przedłuż pakiet/)).toBeTruthy();
        expect(screen.queryByText(/okresu próbnego/)).toBeNull();
        expect(screen.queryByRole('checkbox', { name: /Akceptuję regulamin/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Przejdź/ })).toBeNull();
        // Stopka: „Zamknij" zamiast „Anuluj" - nie ma czego anulować (krzyżyk w nagłówku też ma tę nazwę).
        expect(screen.getByText('Zamknij', { selector: 'button' })).toBeTruthy();
    });

    it('płatny upgrade: kwota i okres, za który się płaci', () => {
        render({ ...planPreview, proratedAmountCents: 28300, proratedAmountFormatted: '283,00 zł', daysRemaining: 60, periodEndsAt: '2026-12-22T12:00:00Z' });

        expect(screen.getByText('283,00 zł brutto')).toBeTruthy();
        expect(screen.getByText(/22 grudnia 2026 \(60 dni\)/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Przejdź do płatności' })).toBeTruthy();
    });

    it('zejście bez opłaconego okresu: „od razu", bez sprzecznego „po końcu okresu"', async () => {
        changePlan.mockResolvedValue({} as never);
        render({ ...planPreview, changeType: 'DOWNGRADE', newPlanKey: 'BASIC', newPlanName: 'Basic', explanation: 'Pakiet zmieni się od razu, bez opłaty.' }, 'BASIC');

        expect(screen.getByText(/Pakiet zmieni się od razu\. Zostaną funkcje pakietu Basic/)).toBeTruthy();
        expect(screen.queryByText(/po końcu opłaconego okresu/)).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Zmień pakiet' }));

        expect(await screen.findByText('Pakiet zmieniony')).toBeTruthy();
        expect(screen.queryByText('Zmiana zaplanowana')).toBeNull();
    });

    it('zejście w opłaconym okresie: zaplanowane na koniec okresu', async () => {
        changePlan.mockResolvedValue({} as never);
        render({
            ...planPreview, changeType: 'DOWNGRADE', newPlanKey: 'BASIC', newPlanName: 'Basic',
            effectiveAt: '2026-12-22T12:00:00Z', periodEndsAt: '2026-12-22T12:00:00Z', daysRemaining: 60,
        }, 'BASIC');

        expect(screen.getByText(/Do 22 grudnia 2026 masz wszystko jak teraz/)).toBeTruthy();
        await userEvent.click(screen.getByRole('button', { name: 'Zaplanuj zmianę' }));

        expect(await screen.findByText('Zmiana zaplanowana')).toBeTruthy();
    });
});

describe('AddOnActivationDialog - treść zależna od sytuacji', () => {
    const render = (preview: AddOnPreview) => renderWith(
        <AddOnActivationDialog addOnKey="FINANCE_MODULE" addOnName="Finanse" preview={preview}
            isLoadingPreview={false} onClose={onClose} />,
    );

    it('karencja (allowed=false): bez „Włącz bezpłatnie" i bez zgody na płatność', () => {
        render({ ...addOnPreview, allowed: false, explanation: 'Opłacony okres się skończył. Najpierw przedłuż pakiet.' });

        expect(screen.getByText(/Najpierw przedłuż pakiet/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Włącz bezpłatnie' })).toBeNull();
        expect(screen.queryByText(/okresu próbnego/)).toBeNull();
    });

    it('okres próbny: bez pustych wierszy „dni do końca" i „koniec okresu"', () => {
        render(addOnPreview);

        expect(screen.getByText('Bez opłat do końca okresu próbnego')).toBeTruthy();
        expect(screen.queryByText('Dni do końca okresu')).toBeNull();
        expect(screen.queryByText('Koniec okresu')).toBeNull();
    });

    it('w opłaconym okresie: kwota i okres, za który się płaci', () => {
        render({ ...addOnPreview, proratedAmountCents: 9800, proratedAmountFormatted: '98,00 zł', daysRemaining: 60, periodEndsAt: '2026-12-22T12:00:00Z' });

        expect(screen.getByText('98,00 zł brutto')).toBeTruthy();
        expect(screen.getByText(/22 grudnia 2026 \(60 dni\)/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Przejdź do płatności' })).toBeTruthy();
    });
});
