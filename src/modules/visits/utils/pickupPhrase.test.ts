import { describe, expect, it } from 'vitest';
import { pickupPhrase } from './pickupPhrase';

// Czwartek, 24.09.2026, 10:00 czasu lokalnego.
const now = new Date(2026, 8, 24, 10, 0);
const at = (day: number, h: number, m = 0) => new Date(2026, 8, day, h, m).toISOString();

describe('pickupPhrase', () => {
    it('najbliższe dni - słowem, z poprawnym przyimkiem', () => {
        expect(pickupPhrase('IN_PROGRESS', at(26, 15), null, now).text).toBe('Odbiór w sobotę, 26.09 o 15:00');
        expect(pickupPhrase('IN_PROGRESS', at(30, 15), null, now).text).toBe('Odbiór w środę, 30.09 o 15:00');
        expect(pickupPhrase('IN_PROGRESS', at(29, 9, 30), null, now).text).toBe('Odbiór we wtorek, 29.09 o 09:30');
        expect(pickupPhrase('IN_PROGRESS', at(24, 17), null, now).text).toBe('Odbiór dziś o 17:00');
        expect(pickupPhrase('IN_PROGRESS', at(25, 8), null, now).text).toBe('Odbiór jutro o 08:00');
    });

    it('dalszy termin - samą datą', () => {
        expect(pickupPhrase('IN_PROGRESS', new Date(2026, 9, 1, 12).toISOString(), null, now).text).toBe('Odbiór 01.10 o 12:00');
    });

    it('minięty termin auta w studiu jest oznaczony, a nie udaje przyszłości', () => {
        const p = pickupPhrase('READY_FOR_PICKUP', at(22, 15), null, now);
        expect(p.overdue).toBe(true);
        expect(p.text).toBe('Odbiór miał być 22.09 o 15:00');
    });

    it('bez terminu i po wydaniu', () => {
        expect(pickupPhrase('IN_PROGRESS', undefined, null, now).text).toBe('Termin odbioru nieustalony');
        expect(pickupPhrase('COMPLETED', at(22, 15), at(23, 16, 5), now)).toEqual({ text: 'Wydano 23.09 o 16:05', overdue: false });
    });
});
