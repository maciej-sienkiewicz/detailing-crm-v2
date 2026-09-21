import { describe, expect, it } from 'vitest';
import {
    THANK_YOU_CLOSES_HOUR,
    THANK_YOU_OPENS_HOUR,
    buildThankYouSmsPayload,
    defaultThankYouSendAt,
    isWithinThankYouWindow,
    nextThankYouSlot,
} from './thankYouSms';

/**
 * Regresja z produkcji: klienci dostawali „dziękujemy za wizytę" o 20:50.
 *
 * Nie dlatego, że tak ustawiono wysyłkę - tylko dlatego, że studio zamykało wizyty
 * po godzinach, a podziękowanie liczyło się od zamknięcia. Te testy pilnują jednej
 * rzeczy: o której byśmy auta nie wydawali, wysyłka wypada w godzinach 12:00-18:00.
 *
 * Godziny nie wybiera już człowiek - wyznacza ją backend. To, co zostało tutaj, jest
 * lustrem jego reguły i służy wyłącznie do napisania na ekranie „Pojazd wydany",
 * kiedy podziękowanie wyjdzie.
 */

/** Data lokalna - taka, jaką widzi pracownik przy ladzie. */
const at = (hour: number, minute: number, day = 15) => new Date(2026, 8, day, hour, minute, 0, 0);

describe('okno wysyłki podziękowania', () => {
    it('obie granice należą do okna', () => {
        expect(isWithinThankYouWindow(at(THANK_YOU_OPENS_HOUR, 0))).toBe(true);
        expect(isWithinThankYouWindow(at(THANK_YOU_CLOSES_HOUR, 0))).toBe(true);
    });

    it('o żadnej porze doby nie proponuje godziny spoza okna', () => {
        for (let minutes = 0; minutes < 24 * 60; minutes += 5) {
            const now = at(Math.floor(minutes / 60), minutes % 60);
            expect(isWithinThankYouWindow(defaultThankYouSendAt(now))).toBe(true);
        }
    });

    it('godzina w oknie zostaje tam, gdzie jest', () => {
        expect(nextThankYouSlot(at(16, 30))).toEqual(at(16, 30));
    });

    it('wieczór przesuwa się na najbliższe południe, czyli nazajutrz', () => {
        expect(nextThankYouSlot(at(22, 0))).toEqual(at(12, 0, 16));
    });

    it('poranek czeka do dzisiejszego południa', () => {
        expect(nextThankYouSlot(at(7, 40))).toEqual(at(12, 0));
    });
});

describe('termin, który wyliczy serwer', () => {
    it('to kwadrans po wydaniu, gdy wydanie wypada w oknie', () => {
        expect(defaultThankYouSendAt(at(15, 0))).toEqual(at(15, 15));
    });

    it('wydanie po godzinach nie budzi klienta wieczorem', () => {
        expect(defaultThankYouSendAt(at(20, 50))).toEqual(at(12, 0, 16));
    });
});

describe('to, co o podziękowaniu trafia do backendu', () => {
    it('zaznaczone pole niesie samą zgodę, bez terminu', () => {
        // Terminu nie wysyłamy: `scheduledAt` jest opcjonalne, a jego brak znaczy
        // po stronie backendu dokładnie „teraz + kwadrans, dociągnięte do okna".
        expect(buildThankYouSmsPayload({ available: true, send: true })).toEqual({ send: true });
    });

    it('odznaczone pole to świadoma odmowa - i ona wycisza automat', () => {
        // Bez tego „nie wysyłaj" byłoby tylko opóźnieniem: automatyka POST_VISIT
        // wysłałaby wiadomość i tak, po swoim opóźnieniu od odbioru pojazdu.
        expect(buildThankYouSmsPayload({ available: true, send: false })).toEqual({ send: false });
    });

    it('bez widocznej sekcji nie wysyłamy pola w ogóle', () => {
        // Studio z wyłączonym szablonem nikogo o nic nie pytało, więc nie mamy
        // decyzji, którą moglibyśmy wyciszyć automatykę.
        expect(buildThankYouSmsPayload({ available: false, send: true })).toBeUndefined();
    });
});
