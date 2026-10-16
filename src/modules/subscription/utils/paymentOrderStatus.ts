import type { CheckoutResponse, PaymentOrderStatus } from '../types';

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

/** Adres strony wyniku płatności - tej samej, na którą P24 odsyła kupującego (urlReturn). */
export const paymentResultPath = (orderId: string) => `/payments/result?orderId=${encodeURIComponent(orderId)}`;

/**
 * Co zrobić z odpowiedzią checkoutu.
 *
 *  - redirect - jest strona płatności P24, kupujący idzie zapłacić;
 *  - done     - zamówienie bez płatności (0 zł, tryb mock) jest zrealizowane;
 *  - track    - pieniądze są albo dopiero będą (PAID, a w teorii PENDING bez adresu), efekt jeszcze
 *               nie zastosowany - stronę wyniku płatności, która odpytuje i ma „Odśwież", przejmuje
 *               to dalej, zamiast drugiej kopii tej pętli w każdym oknie zakupu;
 *  - refund   - pieniądze przyjęte, efektu nie da się zastosować;
 *  - failed   - zamówienie nie doszło do skutku (darmowe, którego nie dało się zastosować).
 *
 * Dawniej każde okno zakupu traktowało „brak adresu płatności" jak sukces: darmowe zamówienie,
 * które backend anulował (CANCELLED, np. moduł zdążył się włączyć w drugiej karcie), kończyło
 * się toastem „Moduł włączony", a okno startowe po zakupie bez płatności po prostu zamierało.
 */
export type CheckoutNextStep =
    | { kind: 'redirect'; url: string }
    | { kind: 'done' }
    | { kind: 'track'; orderId: string }
    | { kind: 'refund' | 'failed'; title: string; message: string };

export function checkoutNextStep(order: CheckoutResponse): CheckoutNextStep {
    if (order.paymentUrl) return { kind: 'redirect', url: order.paymentUrl };
    const reason = order.failureReason?.trim();
    switch (paymentOutcome(order.status)) {
        case 'done':
            return { kind: 'done' };
        case 'refund':
            return {
                kind: 'refund',
                title: 'Płatność przyjęta, ale zakupu nie da się włączyć',
                message: `${reason ?? 'Stan pakietu zmienił się w trakcie zakupu.'} Zwrócimy pieniądze na konto, z którego przyszła płatność, nic nie musisz robić.`,
            };
        case 'failed':
            return {
                kind: 'failed',
                title: 'Nie udało się włączyć zakupu',
                message: `${reason ?? 'Stan pakietu zmienił się w trakcie zakupu.'} Nic nie zostało pobrane. Sprawdź pakiet w ustawieniach i spróbuj ponownie, a jeśli błąd się powtórzy, napisz do nas.`,
            };
        case 'activating':
        case 'waiting':
        default:
            return { kind: 'track', orderId: order.orderId };
    }
}
