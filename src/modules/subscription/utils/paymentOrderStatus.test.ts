// Odpowiedź checkoutu bez adresu płatności: dawniej każde okno zakupu brało ją za sukces,
// także gdy backend darmowe zamówienie anulował (CANCELLED) - kupujący widział „Moduł
// włączony", a modułu nie było.
import { describe, expect, it } from 'vitest';
import { checkoutNextStep, paymentResultPath } from './paymentOrderStatus';
import type { CheckoutResponse, PaymentOrderStatus } from '../types';

const response = (status: PaymentOrderStatus, overrides: Partial<CheckoutResponse> = {}): CheckoutResponse => ({
    orderId: 'ord-1',
    status,
    amountCents: 0,
    currency: 'PLN',
    description: 'Dokupienie modułu',
    paymentUrl: null,
    failureReason: null,
    ...overrides,
});

describe('checkoutNextStep', () => {
    it('adres płatności zawsze wygrywa - kupujący idzie do Przelewy24', () => {
        expect(checkoutNextStep(response('PENDING', { paymentUrl: 'https://p24/trnRequest/T' })))
            .toEqual({ kind: 'redirect', url: 'https://p24/trnRequest/T' });
    });

    it('sukces tylko dla FULFILLED', () => {
        expect(checkoutNextStep(response('FULFILLED'))).toEqual({ kind: 'done' });
    });

    it('PAID bez efektu oddaje sprawę stronie wyniku płatności, która odpytuje', () => {
        expect(checkoutNextStep(response('PAID'))).toEqual({ kind: 'track', orderId: 'ord-1' });
        // PENDING bez adresu nie powinien się zdarzyć - na pewno nie jest sukcesem.
        expect(checkoutNextStep(response('PENDING'))).toEqual({ kind: 'track', orderId: 'ord-1' });
    });

    it('CANCELLED i FAILED to błąd z powodem z backendu i tym, co zrobić dalej', () => {
        for (const status of ['CANCELLED', 'FAILED'] as const) {
            const step = checkoutNextStep(response(status, { failureReason: 'Ten moduł jest już aktywny.' }));
            expect(step.kind).toBe('failed');
            if (step.kind !== 'failed') return;
            expect(step.message).toMatch(/^Ten moduł jest już aktywny\./);
            expect(step.message).toMatch(/Nic nie zostało pobrane/);
            expect(step.message).toMatch(/spróbuj ponownie/);
        }
    });

    it('bez powodu z backendu komunikat i tak mówi, co się stało', () => {
        const step = checkoutNextStep(response('CANCELLED'));
        expect(step.kind === 'failed' && step.message).toMatch(/Stan pakietu zmienił się/);
    });

    it('REFUND_REQUIRED mówi o zwrocie, nie o sukcesie', () => {
        const step = checkoutNextStep(response('REFUND_REQUIRED', { amountCents: 4900, failureReason: 'Plan już zmieniony.' }));
        expect(step.kind).toBe('refund');
        expect(step.kind === 'refund' && step.message).toMatch(/Plan już zmieniony\. Zwrócimy pieniądze/);
    });

    it('nieznany stan nie jest sukcesem', () => {
        expect(checkoutNextStep(response('SOMETHING_NEW' as PaymentOrderStatus)).kind).toBe('track');
    });

    it('adres strony wyniku jest ten sam, na który wraca kupujący z P24', () => {
        expect(paymentResultPath('ord-1')).toBe('/payments/result?orderId=ord-1');
    });
});
