import { describe, expect, it } from 'vitest';
import type { CardDay } from '../types';
import { leaveConflictDatesText, leaveConflictTitle } from './leaveConflict';

const day = (date: string, leaveConflict = true): CardDay => ({
    date, minutes: 480, note: null, isWorkingDay: true, holidayName: null,
    leave: { type: 'ANNUAL', label: 'Urlop' }, missing: false, leaveConflict,
});

describe('godziny w dniach urlopu', () => {
    it('kolejne dni łączą się w zakres, jak w komunikatach backendu', () => {
        const days = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-14']
            .map(d => day(d))
            .concat(day('2026-09-28'), day('2026-09-29', false));
        expect(leaveConflictDatesText(days)).toBe('7–11.09, 14.09, 28.09');
    });

    it('zakres przez koniec miesiąca', () => {
        expect(leaveConflictDatesText([day('2026-09-30'), day('2026-10-01')])).toBe('30.09–1.10');
    });

    it('liczba dni w zdaniu', () => {
        expect(leaveConflictTitle(1, '9.09')).toBe('W 1 dniu urlopu lub L4 są wpisane godziny pracy: 9.09.');
        expect(leaveConflictTitle(5, '7–11.09')).toBe('W 5 dniach urlopu lub L4 są wpisane godziny pracy: 7–11.09.');
    });
});
