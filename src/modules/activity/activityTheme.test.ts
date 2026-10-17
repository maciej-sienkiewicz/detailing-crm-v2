import { describe, expect, it } from 'vitest';
import { customRange, presetToRange } from './activityTheme';

describe('okres feedu', () => {
    // Sobota 17.10.2026, 15:40 czasu lokalnego testu.
    const now = new Date(2026, 9, 17, 15, 40);

    it('„Wczoraj" to cały poprzedni dzień, od północy do końca dnia', () => {
        const range = presetToRange('YESTERDAY', now);
        expect(new Date(range.from!)).toEqual(new Date(2026, 9, 16, 0, 0, 0, 0));
        expect(new Date(range.to!)).toEqual(new Date(2026, 9, 16, 23, 59, 59, 999));
    });

    it('„Dzisiaj" zaczyna się o północy i nie ma końca', () => {
        const range = presetToRange('TODAY', now);
        expect(new Date(range.from!)).toEqual(new Date(2026, 9, 17, 0, 0, 0, 0));
        expect(range.to).toBeNull();
    });

    it('cały okres nie ma żadnej granicy', () => {
        expect(presetToRange('ALL', now)).toEqual({ from: null, to: null });
    });

    it('własny zakres obejmuje oba dni w całości', () => {
        const range = customRange('2026-10-01', '2026-10-05');
        expect(new Date(range.from!)).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
        expect(new Date(range.to!)).toEqual(new Date(2026, 9, 5, 23, 59, 59, 999));
    });

    it('niepełny zakres zostawia brakujący koniec otwarty', () => {
        expect(customRange('', '2026-10-05').from).toBeNull();
        expect(customRange('2026-10-01', '').to).toBeNull();
    });
});
