import { describe, expect, it } from 'vitest';
import { localIsoDate } from './localDate';

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
