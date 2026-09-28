// src/core/rateLimit.ts
//
// Odpowiedź 429 „Przekroczono limit żądań" z backendu (RateLimitFilter).
//
// Trzy rzeczy pogarszały ją, zamiast ją łagodzić:
//  - react-query ponawiał odrzucone zapytanie po sekundzie, czyli dokładał żądanie
//    do licznika, który właśnie się przepełnił,
//  - każde odrzucone żądanie dawało osobny toast - przy pięciu listach na ekranie
//    pięć jednakowych komunikatów naraz,
//  - odpytywanie w pętli (stan synchronizacji skrzynki) tykało dalej co parę sekund.
// Serwer mówi w nagłówku Retry-After, ile trzeba odczekać - tu jest jedno miejsce,
// które go czyta.

interface HttpErrorLike {
    response?: { status?: number; headers?: Record<string, unknown> };
}

export const isRateLimited = (error: unknown): boolean =>
    (error as HttpErrorLike | null)?.response?.status === 429;

/** Ile odczekać po 429: Retry-After z serwera (sekundy), inaczej minuta - okno limitu. */
export function rateLimitRetryAfterMs(error: unknown): number {
    const raw = (error as HttpErrorLike | null)?.response?.headers?.['retry-after'];
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

let quietUntil = 0;

/**
 * Czy pokazać komunikat o limicie. Jeden toast na okno limitu: kolejne 429 w tym samym
 * oknie to ten sam problem, a nie nowa informacja.
 */
export function shouldAnnounceRateLimit(error: unknown, now: number = Date.now()): boolean {
    if (now < quietUntil) return false;
    quietUntil = now + rateLimitRetryAfterMs(error);
    return true;
}

/** Tylko dla testów. */
export const resetRateLimitAnnouncements = () => {
    quietUntil = 0;
};
