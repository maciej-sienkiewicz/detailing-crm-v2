import { describe, expect, it } from 'vitest';
import { comparisonLabel } from './comparisonLabel';

describe('comparisonLabel', () => {
    it('names the same days of the previous month', () => {
        expect(comparisonLabel(true, new Date(2026, 9, 3))).toBe('vs. 1–3 wrz');
    });

    it('uses a single day on the first of the month', () => {
        expect(comparisonLabel(true, new Date(2026, 9, 1))).toBe('vs. 1 wrz');
    });

    it('caps at the length of a shorter previous month', () => {
        expect(comparisonLabel(true, new Date(2026, 2, 31))).toBe('vs. 1–28 lut');
    });

    it('crosses the year boundary', () => {
        expect(comparisonLabel(true, new Date(2026, 0, 15))).toBe('vs. 1–15 gru');
    });

    it('keeps the old wording for a backend without the to-date base', () => {
        expect(comparisonLabel(false, new Date(2026, 9, 3))).toBe('vs. poprzedni miesiąc');
    });
});
