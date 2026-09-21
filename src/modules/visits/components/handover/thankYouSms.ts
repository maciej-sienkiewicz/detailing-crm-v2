import type { ThankYouSmsPayload } from '../../types/stateTransitions';

/**
 * Pora dnia, o której wypada podziękować klientowi za wizytę.
 *
 * Podziękowanie było dotąd doklejone do momentu zamknięcia wizyty w systemie, a wizyty
 * zamyka się wtedy, kiedy jest chwila - często długo po tym, jak auto odjechało. Klienci
 * dostawali przez to „dziękujemy za wizytę" o 20:50. Okno 12:00-18:00 jest więc granicą
 * twardą: poza nim nie wysyłamy, tylko przesuwamy na najbliższą dozwoloną godzinę.
 *
 * Reguła mieszka po stronie backendu (ThankYouSmsWindow) i to on wyznacza termin.
 * Tutaj zostaje jej lustro — wyłącznie po to, żeby po wydaniu pojazdu napisać na
 * ekranie, kiedy podziękowanie wyjdzie.
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

/**
 * Termin, który wyliczy serwer: „teraz + kwadrans", dociągnięty do okna.
 *
 * Lustro `ThankYouSmsWindow.defaultFor` — jedyne, do czego jeszcze służy po stronie
 * przeglądarki, to pokazanie na ekranie „Pojazd wydany", kiedy podziękowanie wyjdzie.
 * Liczymy to po zakończeniu żądania, więc od wartości serwera dzielą je sekundy.
 */
export const defaultThankYouSendAt = (now: Date = new Date()): Date => {
    const proposal = new Date(now);
    proposal.setMinutes(proposal.getMinutes() + THANK_YOU_LEAD_MINUTES, 0, 0);
    return nextThankYouSlot(proposal);
};

/**
 * Co o podziękowaniu trafia do backendu przy wydaniu pojazdu.
 *
 * Trzy różne rzeczy, które łatwo pomylić:
 *  - sekcji nie było (studio ma wyłączony szablon) → nie wysyłamy pola w ogóle,
 *    bo brak decyzji to nie jest decyzja i nie ma prawa wyciszać automatyki;
 *  - odznaczono → `send: false`, świadoma odmowa, która automatykę wycisza;
 *  - zaznaczono → `send: true`, BEZ terminu.
 *
 * Terminu nie wysyłamy, bo nie mamy go skąd wziąć lepiej niż serwer. Pole „data
 * i godzina wysyłki" pytało człowieka przy ladzie o coś, na co odpowiedź jest
 * zawsze ta sama („jak najszybciej, ale nie wieczorem"), a przeglądarka i tak
 * nie zna ani zegara serwera, ani strefy studia. `scheduledAt` jest po stronie
 * backendu opcjonalne i jego brak znaczy dokładnie to, o co chodzi:
 * `ThankYouSmsWindow.resolveSendAt(null, now)` → „teraz + kwadrans, dociągnięte
 * do okna wysyłki".
 */
export const buildThankYouSmsPayload = (
    input: { available: boolean; send: boolean }
): ThankYouSmsPayload | undefined => {
    if (!input.available) return undefined;
    return { send: input.send };
};
