import type { ThankYouSmsPayload } from '../../types/stateTransitions';

/**
 * Pora dnia, o której wypada podziękować klientowi za wizytę.
 *
 * Podziękowanie było dotąd doklejone do momentu zamknięcia wizyty w systemie, a wizyty
 * zamyka się wtedy, kiedy jest chwila - często długo po tym, jak auto odjechało. Klienci
 * dostawali przez to „dziękujemy za wizytę" o 20:50. Okno 12:00-18:00 jest więc granicą
 * twardą: poza nim nie wysyłamy, tylko przesuwamy na najbliższą dozwoloną godzinę.
 *
 * Te same reguły stoją po stronie backendu (ThankYouSmsWindow) - tam jako ostateczna
 * instancja, bo to, co przyszło z przeglądarki, jest tylko propozycją.
 */

/** Pierwsza dozwolona godzina wysyłki (włącznie). */
export const THANK_YOU_OPENS_HOUR = 12;

/** Ostatnia dozwolona godzina wysyłki (włącznie). */
export const THANK_YOU_CLOSES_HOUR = 18;

/** Zapas między wydaniem pojazdu a wysyłką: klient ma zdążyć odjechać spod bramy. */
export const THANK_YOU_LEAD_MINUTES = 15;

const atHour = (date: Date, hour: number): Date => {
    const result = new Date(date);
    result.setHours(hour, 0, 0, 0);
    return result;
};

/** Czy ten moment mieści się w dozwolonym oknie. Obie granice należą do okna. */
export const isWithinThankYouWindow = (date: Date): boolean => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return minutes >= THANK_YOU_OPENS_HOUR * 60 && minutes <= THANK_YOU_CLOSES_HOUR * 60;
};

/**
 * Ten sam moment, jeśli mieści się w oknie; w przeciwnym razie najbliższe otwarcie -
 * dziś w południe (gdy jest jeszcze przed) albo jutro w południe (gdy jest już po).
 */
export const nextThankYouSlot = (date: Date): Date => {
    if (isWithinThankYouWindow(date)) return new Date(date);

    const beforeOpening = date.getHours() * 60 + date.getMinutes() < THANK_YOU_OPENS_HOUR * 60;
    if (beforeOpening) return atHour(date, THANK_YOU_OPENS_HOUR);

    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return atHour(tomorrow, THANK_YOU_OPENS_HOUR);
};

/** Propozycja wpisywana w pole: „teraz + kwadrans", dociągnięta do okna. */
export const defaultThankYouSendAt = (now: Date = new Date()): Date => {
    const proposal = new Date(now);
    proposal.setMinutes(proposal.getMinutes() + THANK_YOU_LEAD_MINUTES, 0, 0);
    return nextThankYouSlot(proposal);
};

// ─── Zamiana na wartość pola <input type="datetime-local"> i z powrotem ───────

const pad = (value: number): string => String(value).padStart(2, '0');

/** Data → „YYYY-MM-DDTHH:mm" w czasie lokalnym (`toISOString` dałoby UTC). */
export const toDateTimeLocal = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** „YYYY-MM-DDTHH:mm" → data w czasie lokalnym; `null`, gdy pole jest niedokończone. */
export const fromDateTimeLocal = (value: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        0,
        0
    );
    return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Termin, który naprawdę pójdzie do backendu - ta sama reguła, którą backend zastosuje
 * u siebie. Wpis nieczytelny albo z przeszłości ustępuje domyślnej propozycji, bo
 * okno wydania potrafi stać otwarte pół dnia.
 */
export const resolveThankYouSendAt = (value: string, now: Date = new Date()): Date => {
    const parsed = fromDateTimeLocal(value);
    if (!parsed || parsed.getTime() <= now.getTime()) return defaultThankYouSendAt(now);
    return nextThankYouSlot(parsed);
};

/**
 * Czy zapisany draft wydania niesie termin, który wciąż ma sens.
 *
 * Draft przeżywa zamknięcie okna, a więc i noc: „wyślij dziś o 16:30" odtworzone
 * nazajutrz opisywałoby godzinę, która już minęła.
 */
export const isUsableThankYouDraft = (value: string | undefined, now: Date = new Date()): boolean => {
    const parsed = value ? fromDateTimeLocal(value) : null;
    return !!parsed && parsed.getTime() > now.getTime() && isWithinThankYouWindow(parsed);
};

/**
 * Co o podziękowaniu trafia do backendu przy wydaniu pojazdu.
 *
 * Trzy różne rzeczy, które łatwo pomylić:
 *  - sekcji nie było (studio ma wyłączony szablon) → nie wysyłamy pola w ogóle,
 *    bo brak decyzji to nie jest decyzja i nie ma prawa wyciszać automatyki;
 *  - odznaczono → `send: false`, świadoma odmowa, która automatykę wycisza;
 *  - zaznaczono → `send: true` z terminem, o którym backend i tak ma ostatnie słowo.
 */
export const buildThankYouSmsPayload = (
    input: { available: boolean; send: boolean; sendAt: string },
    now: Date = new Date()
): ThankYouSmsPayload | undefined => {
    if (!input.available) return undefined;
    if (!input.send) return { send: false };
    return { send: true, scheduledAt: resolveThankYouSendAt(input.sendAt, now).toISOString() };
};
