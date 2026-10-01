// Odpowiedź zamówienia czytana w jednym miejscu: sukces tylko przy FULFILLED, a każda
// porażka ma treść zgodną z tym, co stało się z pieniędzmi.
import { describe, expect, it } from 'vitest';
import type { CheckoutResponse } from '../types';
import {
    checkoutOutcome,
    describeCheckoutError,
    FREE_ORDER_NOT_APPLIED,
    ORDER_NEEDS_REFUND,
    UNEXPECTED_CHECKOUT,
} from './checkout';

const order = (overrides: Partial<CheckoutResponse> = {}): CheckoutResponse => ({
    orderId: 'o1',
    status: 'PENDING',
    amountCents: 0,
    currency: 'PLN',
    description: '',
    paymentUrl: null,
    ...overrides,
});

describe('checkoutOutcome', () => {
    it('adres płatności: przekierowanie', () => {
        expect(checkoutOutcome(order({ paymentUrl: 'https://p24/x' }))).toEqual({ kind: 'redirect', url: 'https://p24/x' });
    });

    it('FULFILLED bez adresu: sukces', () => {
        expect(checkoutOutcome(order({ status: 'FULFILLED' }))).toEqual({ kind: 'fulfilled' });
    });

    it('CANCELLED (darmowe zamówienie, którego nie dało się wprowadzić): porażka, „nic nie zostało pobrane"', () => {
        const outcome = checkoutOutcome(order({ status: 'CANCELLED' }));
        expect(outcome).toEqual({ kind: 'failed', copy: FREE_ORDER_NOT_APPLIED });
        expect(FREE_ORDER_NOT_APPLIED.message).toMatch(/Nic nie zostało pobrane/);
    });

    it('REFUND_REQUIRED bez adresu: porażka, ale nigdy „nic nie zostało pobrane"', () => {
        const outcome = checkoutOutcome(order({ status: 'REFUND_REQUIRED', amountCents: 4900 }));
        expect(outcome).toEqual({ kind: 'failed', copy: ORDER_NEEDS_REFUND });
        expect(ORDER_NEEDS_REFUND.message).not.toMatch(/nic nie zostało pobrane/i);
    });

    it('inny status bez adresu: błąd, nie sukces', () => {
        expect(checkoutOutcome(order({ status: 'PENDING' }))).toEqual({ kind: 'failed', copy: UNEXPECTED_CHECKOUT });
    });
});

describe('describeCheckoutError', () => {
    it('409 CHECKOUT_IN_PROGRESS: własny tytuł i zdanie backendu', () => {
        const copy = describeCheckoutError({
            response: { status: 409, data: { code: 'CHECKOUT_IN_PROGRESS', message: 'Płatność za ten zakup jest właśnie przygotowywana.' } },
        }, 'Nie udało się aktywować modułu');
        expect(copy).toEqual({
            title: 'Płatność jest już przygotowywana',
            message: 'Płatność za ten zakup jest właśnie przygotowywana.',
        });
    });

    it('503 PAYMENTS_UNAVAILABLE: niedostępne płatności, nic nie pobrano', () => {
        const copy = describeCheckoutError({ response: { status: 503, data: { code: 'PAYMENTS_UNAVAILABLE' } } });
        expect(copy.title).toBe('Płatności są chwilowo niedostępne');
    });

    it('inny błąd: tytuł wywołującego i powód z backendu', () => {
        const copy = describeCheckoutError({ response: { status: 400, data: { message: 'Ten moduł jest już aktywny.' } } }, 'Nie udało się aktywować modułu');
        expect(copy).toEqual({ title: 'Nie udało się aktywować modułu', message: 'Ten moduł jest już aktywny.' });
    });
});
