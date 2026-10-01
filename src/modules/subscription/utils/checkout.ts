// src/modules/subscription/utils/checkout.ts
//
// Odpowiedź POST /subscription/checkout czytana w JEDNYM miejscu.
//
// Dawniej każdy ekran pytał tylko „czy jest paymentUrl" i brak adresu traktował
// jak sukces („Abonament przedłużony", „Moduł aktywowany"). Tymczasem bez adresu
// wraca też zamówienie, którego nie dało się rozliczyć - i użytkownik dostawał
// zielony toast za coś, co się nie stało. Sukcesem jest WYŁĄCZNIE status FULFILLED.

import type { CheckoutResponse } from '../types';
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from './apiErrors';

export const PAYMENTS_UNAVAILABLE_CODE = 'PAYMENTS_UNAVAILABLE';

export type CheckoutOutcome =
    /** Płatność czeka w Przelewy24 - przekieruj przeglądarkę. */
    | { kind: 'redirect'; url: string }
    /** Rozliczone od razu (kwota zero, np. moduł w okresie próbnym). */
    | { kind: 'fulfilled' }
    /** Ani adresu płatności, ani rozliczenia - błąd, nie sukces. */
    | { kind: 'unexpected' };

export function checkoutOutcome(order: CheckoutResponse): CheckoutOutcome {
    if (order.paymentUrl) return { kind: 'redirect', url: order.paymentUrl };
    if (order.status === 'FULFILLED') return { kind: 'fulfilled' };
    return { kind: 'unexpected' };
}

export interface CheckoutErrorCopy {
    title: string;
    message: string;
}

/** Komunikat dla odpowiedzi bez adresu płatności i bez rozliczenia. */
export const UNEXPECTED_CHECKOUT: CheckoutErrorCopy = {
    title: 'Nie udało się rozpocząć płatności',
    message: 'Serwer nie przygotował płatności. Nic nie zostało pobrane, spróbuj ponownie za chwilę.',
};

/**
 * Tytuł i treść błędu zamówienia. Każde wywołanie checkoutu idzie z
 * `skipErrorToast`, więc to jest jedyny komunikat, jaki użytkownik zobaczy -
 * musi mówić, co się stało, a nie tylko, że „wystąpił błąd".
 */
export function describeCheckoutError(
    error: unknown,
    fallbackTitle = 'Nie udało się rozpocząć płatności',
): CheckoutErrorCopy {
    const status = apiErrorStatus(error);
    if (status === 503 || apiErrorCode(error) === PAYMENTS_UNAVAILABLE_CODE) {
        // Bramka płatności nie odpowiada albo nie jest skonfigurowana - nic, co
        // użytkownik może poprawić po swojej stronie, i nic nie zostało pobrane.
        return {
            title: 'Płatności są chwilowo niedostępne',
            message: 'Spróbuj ponownie za kilka minut. Nic nie zostało pobrane.',
        };
    }
    return {
        title: fallbackTitle,
        message: apiErrorMessage(error) ?? 'Spróbuj ponownie za chwilę.',
    };
}
