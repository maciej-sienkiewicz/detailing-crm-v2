import { describe, it, expect } from 'vitest';
import type { PreparedReply } from '../types';
import {
    preparedTextFor,
    calendarDayLoad,
    calendarDayShort,
    fillDatePlaceholder,
    preparedReplyHint,
    toReplyDraft,
} from './preparedReply';

const prepared = (overrides: Partial<PreparedReply> = {}): PreparedReply => ({
    kind: 'QUOTE',
    bodyText: 'Dzień dobry, folia PPF na całe auto to 18 450,00 zł. Termin: [proponowany termin].',
    useSentStyle: true,
    signatureAppended: true,
    offer: [{ itemId: 'i-1', name: 'Oklejenie pojazdu - Full Body', quantity: 1, priceGross: 1_845_000, suggested: true }],
    preparedAt: '2026-10-28T08:00:00Z',
    calendar: [],
    ...overrides,
});

describe('preparedReply', () => {
    it('szkic niesie swoje znaczniki - niewypełniony termin blokuje wysyłkę', () => {
        const draft = toReplyDraft(prepared());
        expect(draft.placeholders).toEqual(['[proponowany termin]']);
        expect(draft.offerIncluded).toBe(true);
        expect(draft.offer?.[0].priceGross).toBe(1_845_000);
    });

    it('dzień z kalendarza trafia w miejsce znacznika terminu', () => {
        const day = { date: '2026-10-30', bookings: 1 };
        expect(fillDatePlaceholder('Termin: [proponowany termin].', day)).toBe('Termin: piątek 30.10.');
        expect(fillDatePlaceholder('Bez znacznika.', day)).toBeNull();
        expect(calendarDayShort(day)).toBe('pt 30.10');
        expect(calendarDayLoad(day)).toBe('1 rezerwacja');
        expect(calendarDayLoad({ date: '2026-10-29', bookings: 0 })).toBe('bez rezerwacji');
        expect(calendarDayLoad({ date: '2026-10-29', bookings: 5 })).toBe('5 rezerwacji');
    });

    it('podpowiedź o telefonie: stały klient albo wycena od 10 000 zł', () => {
        expect(preparedReplyHint(prepared(), 0)).toBe('Wycena na 18 450 zł. Przy takiej kwocie po wysłaniu warto zadzwonić.');
        expect(preparedReplyHint(prepared(), 2)).toBe('Stały klient (2 wizyty). Po wysłaniu warto zadzwonić.');
        const small = prepared({ offer: [{ itemId: 'i-2', name: 'Polerowanie szyby', quantity: 1, priceGross: 90_000, suggested: false }] });
        expect(preparedReplyHint(small, 0)).toBeNull();
        expect(preparedReplyHint(null, 5)).toBeNull();
    });
});

describe('preparedTextFor - szkic z tła a stopka odpisującego', () => {
    const body = 'Dzień dobry,\n\ncena to 990,00 zł.\n\nPozdrawiam serdecznie';

    it('ta sama stopka - treść bez zmian', () => {
        expect(preparedTextFor(body, true, true, 'Jakub')).toBe(body);
    });

    it('bez stopki - imię pod pożegnaniem, a bez imienia sama treść', () => {
        expect(preparedTextFor(body, true, false, 'Jakub')).toBe(`${body}\nJakub`);
        expect(preparedTextFor(body, true, false, '  ')).toBe(body);
    });

    it('szkic podpisany imieniem, a edytor doda stopkę - nie zgadujemy, co wyciąć', () => {
        expect(preparedTextFor(body, false, true, 'Jakub')).toBeNull();
    });
});
