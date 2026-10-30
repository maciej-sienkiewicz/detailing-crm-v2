import { describe, expect, it } from 'vitest';
import { dueDateNotBeforeToday, localIsoDate } from './localDate';

describe('localIsoDate', () => {
    it('bierze dzień kalendarza z lokalnej strefy, nie z UTC', () => {
        // 16.10.2026 01:20 czasu lokalnego - w UTC (strefa Polski) to jeszcze 15.10.
        const lateNight = new Date(2026, 9, 16, 1, 20);
        expect(localIsoDate(lateNight)).toBe('2026-10-16');
    });

    it('dopełnia miesiąc i dzień zerami', () => {
        expect(localIsoDate(new Date(2027, 0, 5, 12, 0))).toBe('2027-01-05');
    });
});

describe('dueDateNotBeforeToday', () => {
    it('termin, który minął, staje się dzisiejszym; przyszły i dzisiejszy zostają', () => {
        expect(dueDateNotBeforeToday('2026-10-22', '2026-10-30')).toBe('2026-10-30');
        expect(dueDateNotBeforeToday('2026-10-30', '2026-10-30')).toBe('2026-10-30');
        expect(dueDateNotBeforeToday('2026-11-13', '2026-10-30')).toBe('2026-11-13');
    });

    it('brak terminu zostaje brakiem', () => {
        expect(dueDateNotBeforeToday(null, '2026-10-30')).toBeNull();
        expect(dueDateNotBeforeToday('', '2026-10-30')).toBeNull();
    });
});
