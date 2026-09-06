import { describe, expect, it } from 'vitest';
import {
    THANK_YOU_CLOSES_HOUR,
    buildThankYouSmsPayload,
    THANK_YOU_OPENS_HOUR,
    defaultThankYouSendAt,
    fromDateTimeLocal,
    isUsableThankYouDraft,
    isWithinThankYouWindow,
    nextThankYouSlot,
    resolveThankYouSendAt,
    toDateTimeLocal,
} from './thankYouSms';

/**
 * Regresja z produkcji: klienci dostawali „dziękujemy za wizytę" o 20:50.
 *
 * Nie dlatego, że tak ustawiono wysyłkę - tylko dlatego, że studio zamykało wizyty
 * po godzinach, a podziękowanie liczyło się od zamknięcia. Te testy pilnują jednej
 * rzeczy: cokolwiek wpiszemy i o której byśmy nie wydawali auta, wysyłka wypada
 * w godzinach 12:00-18:00.
 */

/** Data lokalna - taka, jaką widzi pracownik przy ladzie. */
const at = (hour: number, minute: number, day = 15) => new Date(2026, 8, day, hour, minute, 0, 0);

describe('okno wysyłki podziękowania', () => {
    it('obie granice należą do okna', () => {
        expect(isWithinThankYouWindow(at(THANK_YOU_OPENS_HOUR, 0))).toBe(true);
        expect(isWithinThankYouWindow(at(THANK_YOU_CLOSES_HOUR, 0))).toBe(true);
    });

    it('minuta przed i minuta po granicy już nie', () => {
        expect(isWithinThankYouWindow(at(11, 59))).toBe(false);
        expect(isWithinThankYouWindow(at(18, 1))).toBe(false);
    });

    it('godzina w oknie zostaje bez zmian', () => {
        expect(nextThankYouSlot(at(14, 20))).toEqual(at(14, 20));
    });

    it('poranek czeka do południa tego samego dnia', () => {
        expect(nextThankYouSlot(at(7, 40))).toEqual(at(12, 0));
    });

    it('wieczór przechodzi na jutrzejsze południe', () => {
        expect(nextThankYouSlot(at(20, 50))).toEqual(at(12, 0, 16));
    });

    it('przesunięcie na jutro działa też na przełomie miesiąca', () => {
        const lastDayOfSeptember = new Date(2026, 8, 30, 21, 0, 0, 0);
        expect(nextThankYouSlot(lastDayOfSeptember)).toEqual(new Date(2026, 9, 1, 12, 0, 0, 0));
    });
});

describe('domyślna propozycja godziny', () => {
    it('o 15:00 proponuje 15:15', () => {
        expect(defaultThankYouSendAt(at(15, 0))).toEqual(at(15, 15));
    });

    it('o 17:45 proponuje jeszcze dzisiejsze 18:00', () => {
        expect(defaultThankYouSendAt(at(17, 45))).toEqual(at(18, 0));
    });

    it('o 17:50 kwadrans wypada za oknem, więc proponuje jutro o 12:00', () => {
        expect(defaultThankYouSendAt(at(17, 50))).toEqual(at(12, 0, 16));
    });

    it('wydanie o 20:50 nie budzi klienta wieczorem', () => {
        expect(defaultThankYouSendAt(at(20, 50))).toEqual(at(12, 0, 16));
    });

    it('rano czeka do otwarcia okna', () => {
        expect(defaultThankYouSendAt(at(8, 30))).toEqual(at(12, 0));
    });

    it('gubi sekundy - pole i tak pokazuje pełne minuty', () => {
        const withSeconds = new Date(2026, 8, 15, 15, 0, 47, 500);
        expect(defaultThankYouSendAt(withSeconds)).toEqual(at(15, 15));
    });

    it('o żadnej porze doby nie proponuje godziny spoza okna', () => {
        for (let minutes = 0; minutes < 24 * 60; minutes += 5) {
            const now = at(Math.floor(minutes / 60), minutes % 60);
            expect(isWithinThankYouWindow(defaultThankYouSendAt(now))).toBe(true);
        }
    });
});

describe('wartość pola datetime-local', () => {
    it('zapisuje czas lokalny, nie UTC', () => {
        expect(toDateTimeLocal(at(9, 5))).toBe('2026-09-15T09:05');
    });

    it('odczyt jest odwrotnością zapisu', () => {
        expect(fromDateTimeLocal(toDateTimeLocal(at(16, 30)))).toEqual(at(16, 30));
    });

    it('niedokończona wartość to null, a nie Invalid Date', () => {
        expect(fromDateTimeLocal('')).toBeNull();
        expect(fromDateTimeLocal('2026-09-15')).toBeNull();
    });
});

describe('termin wysyłany do backendu', () => {
    it('godzina z pola przechodzi bez zmian, gdy mieści się w oknie', () => {
        expect(resolveThankYouSendAt('2026-09-15T16:30', at(13, 0))).toEqual(at(16, 30));
    });

    it('ręcznie wpisana 22:00 wraca na najbliższe południe', () => {
        expect(resolveThankYouSendAt('2026-09-15T22:00', at(13, 0))).toEqual(at(12, 0, 16));
    });

    it('godzina, która zdążyła minąć, ustępuje nowej propozycji', () => {
        // Okno wydania potrafi stać otwarte pół dnia.
        expect(resolveThankYouSendAt('2026-09-15T13:00', at(16, 0))).toEqual(at(16, 15));
    });

    it('pusta wartość nie blokuje wydania pojazdu', () => {
        expect(resolveThankYouSendAt('', at(13, 0))).toEqual(at(13, 15));
    });
});

describe('termin odtwarzany z zapisanego draftu', () => {
    it('wraca, dopóki opisuje przyszłą godzinę w oknie', () => {
        expect(isUsableThankYouDraft('2026-09-15T16:30', at(13, 0))).toBe(true);
    });

    it('nie wraca nazajutrz - to godzina, która minęła', () => {
        expect(isUsableThankYouDraft('2026-09-15T16:30', at(13, 0, 16))).toBe(false);
    });

    it('nie wraca, gdy leży poza oknem', () => {
        expect(isUsableThankYouDraft('2026-09-15T23:00', at(13, 0))).toBe(false);
    });

    it('brak wartości w draftcie nie jest terminem', () => {
        expect(isUsableThankYouDraft(undefined, at(13, 0))).toBe(false);
    });
});

describe('to, co o podziękowaniu trafia do backendu', () => {
    const now = at(15, 0);

    it('zaznaczone pole niesie termin w ISO 8601', () => {
        const payload = buildThankYouSmsPayload(
            { available: true, send: true, sendAt: '2026-09-15T16:30' },
            now
        );

        expect(payload).toEqual({ send: true, scheduledAt: at(16, 30).toISOString() });
    });

    it('odznaczone pole to świadoma odmowa - i ona wycisza automat', () => {
        // Bez tego „nie wysyłaj" byłoby tylko opóźnieniem: automatyka POST_VISIT
        // wysłałaby wiadomość i tak, po swoim opóźnieniu od odbioru pojazdu.
        const payload = buildThankYouSmsPayload(
            { available: true, send: false, sendAt: '2026-09-15T16:30' },
            now
        );

        expect(payload).toEqual({ send: false });
    });

    it('bez widocznej sekcji nie wysyłamy pola w ogóle', () => {
        // Studio z wyłączonym szablonem nikogo o nic nie pytało, więc nie mamy
        // decyzji, którą moglibyśmy wyciszyć automatykę.
        const payload = buildThankYouSmsPayload(
            { available: false, send: true, sendAt: '2026-09-15T16:30' },
            now
        );

        expect(payload).toBeUndefined();
    });

    it('termin spoza okna jest dociągany, zanim wyjdzie z przeglądarki', () => {
        const payload = buildThankYouSmsPayload(
            { available: true, send: true, sendAt: '2026-09-15T22:00' },
            now
        );

        expect(payload?.scheduledAt).toBe(at(12, 0, 16).toISOString());
    });
});
