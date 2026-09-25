import { describe, expect, it } from 'vitest';
import {
    currentMonthPeriod, formatDay, isWholeMonth, monthPeriod, parseIsoDate, periodIn, periodPhrase, periodTitle,
    shiftMonth, todayIso,
} from './period';

describe('okres rozliczeniowy', () => {
    it('miesiąc to pierwszy i ostatni dzień, także w lutym przestępnym', () => {
        expect(monthPeriod(2026, 8)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
        expect(monthPeriod(2028, 1)).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    });

    it('strzałki przechodzą przez granicę roku', () => {
        expect(shiftMonth({ from: '2026-01-01', to: '2026-01-31' }, -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
        expect(shiftMonth({ from: '2026-12-01', to: '2026-12-31' }, 1)).toEqual({ from: '2027-01-01', to: '2027-01-31' });
    });

    it('zakres niestandardowy po strzałce staje się pełnym miesiącem', () => {
        expect(shiftMonth({ from: '2026-09-10', to: '2026-09-20' }, 1)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    });

    it('rozpoznaje pełny miesiąc', () => {
        expect(isWholeMonth({ from: '2026-09-01', to: '2026-09-30' })).toBe(true);
        expect(isWholeMonth({ from: '2026-09-01', to: '2026-09-29' })).toBe(false);
    });

    it('nazywa okres słowami albo datami', () => {
        expect(periodPhrase({ from: '2026-09-01', to: '2026-09-30' })).toBe('wrzesień 2026');
        expect(periodTitle({ from: '2026-09-01', to: '2026-09-30' })).toBe('Wrzesień 2026');
        expect(periodPhrase({ from: '2026-09-03', to: '2026-09-17' })).toBe('03.09–17.09.2026');
        expect(periodPhrase({ from: '2025-12-28', to: '2026-01-03' })).toBe('28.12.2025–03.01.2026');
    });

    it('okres w zdaniu ma przyimek i miejscownik', () => {
        expect(periodIn({ from: '2026-09-01', to: '2026-09-30' })).toBe('we wrześniu 2026');
        expect(periodIn({ from: '2026-02-01', to: '2026-02-28' })).toBe('w lutym 2026');
        expect(periodIn({ from: '2026-09-03', to: '2026-09-17' })).toBe('w okresie 03.09–17.09.2026');
    });

    // Zgłoszenie: po północy formularz podpowiadał wczorajszą datę, bo brał ją z UTC.
    it('dzisiejsza data jest lokalna, nie z UTC', () => {
        const justAfterMidnight = new Date(2026, 8, 25, 0, 30);
        expect(todayIso(justAfterMidnight)).toBe('2026-09-25');
        expect(currentMonthPeriod(justAfterMidnight)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    });

    it('data z serwera nie przesuwa się o dzień', () => {
        expect(parseIsoDate('2026-09-01').getDate()).toBe(1);
        expect(formatDay('2026-09-01')).toBe('01.09.2026');
    });
});
