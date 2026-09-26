import { describe, expect, it } from 'vitest';
import { daysInRange, formatRange, lastFullWeeks, validateRange } from './reportPeriod';

describe('okres raportu właściciela', () => {
    it('w poniedziałek bierze tydzień zakończony wczoraj', () => {
        expect(lastFullWeeks(1, new Date(2026, 8, 21))).toEqual({ from: '2026-09-14', to: '2026-09-20' });
    });

    it('w niedzielę bieżący tydzień trwa - bierze poprzedni (jak backend)', () => {
        expect(lastFullWeeks(1, new Date(2026, 8, 20))).toEqual({ from: '2026-09-07', to: '2026-09-13' });
    });

    it('dwa tygodnie to 14 pełnych dni', () => {
        const range = lastFullWeeks(2, new Date(2026, 8, 23));
        expect(range).toEqual({ from: '2026-09-07', to: '2026-09-20' });
        expect(daysInRange(range)).toBe(14);
    });

    it('przez przełom roku daty z rokiem po obu stronach', () => {
        expect(formatRange({ from: '2026-09-14', to: '2026-09-20' })).toBe('14.09–20.09.2026');
        expect(formatRange({ from: '2025-12-29', to: '2026-01-04' })).toBe('29.12.2025–04.01.2026');
    });

    it('własny okres: odwrócone daty i ponad 93 dni są odrzucone', () => {
        expect(validateRange({ from: '2026-09-20', to: '2026-09-14' })).toMatch(/przed/);
        expect(validateRange({ from: '2026-01-01', to: '2026-06-30' })).toMatch(/93/);
        expect(validateRange({ from: '', to: '2026-09-14' })).toMatch(/obie daty/);
        expect(validateRange({ from: '2026-09-01', to: '2026-09-30' })).toBeNull();
    });
});
