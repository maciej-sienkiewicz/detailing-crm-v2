// Data przyjęcia rezerwacji z minionego dnia: kiedy pytać i co wpisać do „Data rozpoczęcia".
import { describe, expect, it } from 'vitest';
import {
    arrivalStartUpdates,
    calendarDaysBetween,
    daysAgoLabel,
    needsArrivalDateDecision,
    resolveArrivalStart,
} from './arrivalDate';

// Czas lokalny przeglądarki - tak, jak liczy kreator.
const NOW = new Date(2026, 9, 17, 11, 42);

describe('needsArrivalDateDecision', () => {
    it('pyta przy rezerwacji z minionego dnia', () => {
        expect(needsArrivalDateDecision(new Date(2026, 9, 13, 9, 0).toISOString(), NOW)).toBe(true);
        // wczoraj późnym wieczorem to też inny dzień
        expect(needsArrivalDateDecision(new Date(2026, 9, 16, 23, 30).toISOString(), NOW)).toBe(true);
    });

    it('nie pyta przy rezerwacji z dzisiaj, także wcześniejszej godziny', () => {
        expect(needsArrivalDateDecision(new Date(2026, 9, 17, 0, 0).toISOString(), NOW)).toBe(false);
        expect(needsArrivalDateDecision(new Date(2026, 9, 17, 9, 0).toISOString(), NOW)).toBe(false);
    });

    it('nie pyta przy rezerwacji z przyszłości - auto jest u nas dziś', () => {
        expect(needsArrivalDateDecision(new Date(2026, 9, 20, 9, 0).toISOString(), NOW)).toBe(false);
    });

    it('nie pyta bez terminu albo z nieczytelnym terminem', () => {
        expect(needsArrivalDateDecision(undefined, NOW)).toBe(false);
        expect(needsArrivalDateDecision('', NOW)).toBe(false);
        expect(needsArrivalDateDecision('nie-data', NOW)).toBe(false);
    });
});

describe('calendarDaysBetween / daysAgoLabel', () => {
    it('liczy dni kalendarzowe, nie pełne doby', () => {
        expect(calendarDaysBetween(new Date(2026, 9, 16, 23, 59), new Date(2026, 9, 17, 0, 1))).toBe(1);
        // przez zmianę czasu (25.10.2026) doba ma 25 godzin - nadal jeden dzień
        expect(calendarDaysBetween(new Date(2026, 9, 25, 12), new Date(2026, 9, 26, 12))).toBe(1);
    });

    it('mówi po ludzku', () => {
        expect(daysAgoLabel(1)).toBe('wczoraj');
        expect(daysAgoLabel(4)).toBe('4 dni temu');
    });
});

describe('resolveArrivalStart', () => {
    const planned = new Date(2026, 9, 13, 9, 0).toISOString();

    it('bez odpowiedzi nie ma daty', () => {
        expect(resolveArrivalStart(null, planned, '', NOW)).toBeNull();
    });

    it('„Od dziś" to bieżąca chwila', () => {
        expect(resolveArrivalStart('today', planned, '', NOW)).toBe('2026-10-17T11:42');
    });

    it('„Od dnia rezerwacji" zostawia termin rezerwacji dokładnie', () => {
        expect(resolveArrivalStart('planned', planned, '', NOW)).toBe('2026-10-13T09:00');
    });

    it('„Od innego dnia" bierze wskazaną datę, ale nie z przyszłości', () => {
        expect(resolveArrivalStart('other', planned, '2026-10-15T08:30', NOW)).toBe('2026-10-15T08:30');
        expect(resolveArrivalStart('other', planned, '2026-10-18T08:30', NOW)).toBeNull();
        expect(resolveArrivalStart('other', planned, '', NOW)).toBeNull();
    });
});

describe('arrivalStartUpdates', () => {
    it('koniec po początku zostaje bez zmian', () => {
        expect(arrivalStartUpdates('2026-10-13T09:00', '2026-10-18T12:00')).toEqual({ visitStartAt: '2026-10-13T09:00' });
    });

    it('koniec przed początkiem przesuwa się na godzinę po nim', () => {
        expect(arrivalStartUpdates('2026-10-17T11:42', '2026-10-17T10:00')).toEqual({
            visitStartAt: '2026-10-17T11:42',
            visitEndAt: '2026-10-17T12:42',
        });
    });
});
