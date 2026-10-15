import type { PaymentOrderStatus } from '../types';

/**
 * Co stan zamówienia znaczy dla kupującego, który właśnie wrócił z Przelewy24.
 *
 * Backend rozdziela „zapłacone" (PAID) i „zrealizowane" (FULFILLED) - to dwa fakty
 * i dwa stany. Strona powrotu sprawdzała wyłącznie `=== 'PAID'`, a webhook P24
 * realizuje zamówienie w tym samym żądaniu, więc odpytywanie widziało od razu
 * FULFILLED, nie rozpoznawało go i kręciło się bez końca. Stąd jedno miejsce,
 * które zna CAŁY zbiór stanów, zamiast porównań rozsianych po widoku.
 *
 *  - waiting    - pieniędzy jeszcze nie ma; czekamy dalej
 *  - activating - pieniądze są (PAID), efekt jeszcze niezastosowany; czekamy na FULFILLED
 *  - done       - zakup zrealizowany
 *  - refund     - pieniądze są, efektu nie da się zastosować; czeka na zwrot przez operatora
 *  - failed     - zamówienia nie da się już opłacić
 */
export type PaymentOutcome = 'waiting' | 'activating' | 'done' | 'refund' | 'failed';

export function paymentOutcome(status: PaymentOrderStatus | string): PaymentOutcome {
    switch (status) {
        case 'FULFILLED':
            return 'done';
        case 'PAID':
            return 'activating';
        case 'REFUND_REQUIRED':
            return 'refund';
        case 'FAILED':
        case 'CANCELLED':
            return 'failed';
        // EXPIRED nie jest końcem dla pieniędzy: spóźniona, zweryfikowana płatność przenosi
        // zamówienie z powrotem do PAID (np. opłacona karta, którą zastąpiło nowsze zamówienie
        // z drugiej karty przeglądarki). Kupujący, który właśnie zapłacił, ma to zobaczyć.
        case 'EXPIRED':
        case 'PENDING':
        default:
            // Nieznany stan (nowszy backend) też czeka - limit czasu i tak pokaże wyjście.
            return 'waiting';
    }
}

/** Po tym wyniku odpytywanie się kończy - stan zamówienia już się nie zmieni sam z siebie. */
export function isFinalOutcome(outcome: PaymentOutcome): boolean {
    return outcome === 'done' || outcome === 'refund' || outcome === 'failed';
}
