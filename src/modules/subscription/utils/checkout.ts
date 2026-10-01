// src/modules/subscription/utils/checkout.ts
//
// Odpowiedź POST /subscription/checkout czytana w JEDNYM miejscu.
//
// Dawniej każdy ekran pytał tylko „czy jest paymentUrl" i brak adresu traktował
// jak sukces („Abonament przedłużony", „Moduł aktywowany"). Tymczasem bez adresu
// wraca też zamówienie, którego nie dało się rozliczyć - i użytkownik dostawał
// zielony toast za coś, co się nie stało. Sukcesem jest WYŁĄCZNIE status FULFILLED.

import { CHECKOUT_IN_PROGRESS_CODE, PRICE_CHANGED_CODE, type CheckoutResponse } from '../types';
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from './apiErrors';

export const PAYMENTS_UNAVAILABLE_CODE = 'PAYMENTS_UNAVAILABLE';

export interface CheckoutErrorCopy {
    title: string;
    message: string;
}

export type CheckoutOutcome =
    /** Płatność czeka w Przelewy24 - przekieruj przeglądarkę. */
    | { kind: 'redirect'; url: string }
    /** Rozliczone od razu (kwota zero, np. moduł w okresie próbnym). */
    | { kind: 'fulfilled' }
    /** Ani adresu płatności, ani rozliczenia - błąd, nie sukces. Treść zależy od statusu. */
    | { kind: 'failed'; copy: CheckoutErrorCopy };

/** Komunikat dla odpowiedzi bez adresu płatności i bez rozliczenia. */
export const UNEXPECTED_CHECKOUT: CheckoutErrorCopy = {
    title: 'Nie udało się rozpocząć płatności',
    message: 'Serwer nie przygotował płatności. Nic nie zostało pobrane, spróbuj ponownie za chwilę.',
};

/**
 * Zamówienie bez kwoty (okres próbny), którego efektu nie dało się już wprowadzić -
 * na przykład moduł zdążył się włączyć w drugiej karcie. Backend kończy je statusem
 * CANCELLED: to porażka, ale pieniędzy w niej nie było, więc wolno to powiedzieć.
 */
export const FREE_ORDER_NOT_APPLIED: CheckoutErrorCopy = {
    title: 'Nie udało się wprowadzić zakupu',
    message: 'Tego zakupu nie dało się zastosować, na przykład moduł jest już aktywny. '
        + 'Nic nie zostało pobrane. Odśwież stronę i sprawdź stan abonamentu.',
};

/**
 * Rozliczone bez bramki (tryb testowy), ale nie do wprowadzenia. Tu nie wolno napisać
 * „nic nie zostało pobrane" - to ten sam status, który przy prawdziwej wpłacie znaczy
 * zwrot pieniędzy przez wsparcie.
 */
export const ORDER_NEEDS_REFUND: CheckoutErrorCopy = {
    title: 'Nie udało się wprowadzić zakupu',
    message: 'Tego zakupu nie dało się dodać do konta. Jeśli pobraliśmy płatność, zwrócimy ją, '
        + 'nie musisz nic robić. W razie pytań napisz do nas: pomoc@detailboost.pl.',
};

export function checkoutOutcome(order: CheckoutResponse): CheckoutOutcome {
    if (order.paymentUrl) return { kind: 'redirect', url: order.paymentUrl };
    switch (order.status) {
        case 'FULFILLED': return { kind: 'fulfilled' };
        case 'CANCELLED': return { kind: 'failed', copy: FREE_ORDER_NOT_APPLIED };
        case 'REFUND_REQUIRED': return { kind: 'failed', copy: ORDER_NEEDS_REFUND };
        default: return { kind: 'failed', copy: UNEXPECTED_CHECKOUT };
    }
}

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
    if (apiErrorCode(error) === PRICE_CHANGED_CODE) {
        // Okres próbny skończył się między wyceną a zamówieniem - darmowej aktywacji już nie ma,
        // trzeba zobaczyć nową cenę. Nic nie zostało pobrane.
        return {
            title: 'Cena się zmieniła',
            message: apiErrorMessage(error) ?? 'Okres próbny właśnie się zakończył. Odśwież stronę i spróbuj ponownie.',
        };
    }
    if (apiErrorCode(error) === CHECKOUT_IN_PROGRESS_CODE) {
        // Drugie kliknięcie, zanim pierwsze dostało stronę płatności. To nie awaria
        // („Nie udało się…" kazało szukać przyczyny), tylko „chwilę poczekaj" - i backend
        // mówi to swoim zdaniem.
        return {
            title: 'Płatność jest już przygotowywana',
            message: apiErrorMessage(error)
                ?? 'Płatność za ten zakup jest właśnie przygotowywana. Spróbuj ponownie za chwilę.',
        };
    }
    return {
        title: fallbackTitle,
        message: apiErrorMessage(error) ?? 'Spróbuj ponownie za chwilę.',
    };
}
