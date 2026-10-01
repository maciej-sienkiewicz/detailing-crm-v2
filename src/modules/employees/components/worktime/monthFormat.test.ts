import { describe, expect, it } from 'vitest';
import type { MonthCardRow, MonthOverview } from '../../api/worktimeMonthsApi';
import {
    addMonths, approvedSummary, cardFactsSentence, cardPath, defaultPeriod, employeesLabel, hoursOfNorm, hoursText,
    isPeriod, missingDaysText, monthOptions, monthPath, periodLabel, remindedRecently, reusableSheet, sheetFileName,
    signedSheetIncludes,
} from './monthFormat';

const row = (userId: string, overrides: Partial<MonthCardRow> = {}): MonthCardRow => ({
    userId,
    employeeId: `e-${userId}`,
    name: userId,
    status: 'SUBMITTED',
    totalMinutes: 9600,
    expectedMinutes: 10080,
    missingWorkingDays: 0,
    overtimeMinutes: 0,
    leaveWorkingDays: 0,
    submittedAt: '2026-10-01T08:00:00Z',
    approvedAt: null,
    approvedByName: null,
    returnNote: null,
    canDecide: true,
    remindedAt: null,
    ...overrides,
});

describe('monthFormat - który miesiąc i jak go opisać', () => {
    it('do 10. dnia widok otwiera poprzedni miesiąc, potem bieżący', () => {
        expect(defaultPeriod(new Date(2026, 9, 1))).toBe('2026-09');
        expect(defaultPeriod(new Date(2026, 9, 10))).toBe('2026-09');
        expect(defaultPeriod(new Date(2026, 9, 11))).toBe('2026-10');
        expect(defaultPeriod(new Date(2027, 0, 5))).toBe('2026-12');
    });

    it('lista miesięcy zaczyna się od bieżącego - przyszłych nie ma', () => {
        const options = monthOptions(new Date(2026, 9, 15), 3);
        expect(options).toEqual(['2026-10', '2026-09', '2026-08']);
        expect(addMonths('2026-01', -1)).toBe('2025-12');
    });

    it('okres z adresu musi być prawdziwym miesiącem', () => {
        expect(isPeriod('2026-09')).toBe(true);
        expect(isPeriod('2026-13')).toBe(false);
        expect(isPeriod('wrzesień')).toBe(false);
        expect(isPeriod(null)).toBe(false);
    });

    it('nazwy i liczby po polsku', () => {
        expect(periodLabel('2026-09')).toBe('Wrzesień 2026');
        expect(periodLabel('bzdura')).toBe('bzdura');
        expect(employeesLabel(1)).toBe('1 pracownik');
        expect(employeesLabel(12)).toBe('12 pracowników');
        expect(sheetFileName('2026-09', true)).toBe('lista-obecnosci-2026-09-podpisana.pdf');
    });

    it('godziny: pełne bez minut, niepełne jak w karcie pracownika', () => {
        expect(hoursText(9120)).toBe('152 h');
        expect(hoursText(9135)).toBe('152:15 h');
        expect(hoursOfNorm(8250, 9120)).toBe('137:30 z 152 h');
    });

    it('podsumowanie miesiąca i braki w wierszu po polsku', () => {
        expect(approvedSummary(4, 7)).toBe('4 z 7 kart zatwierdzonych');
        expect(approvedSummary(0, 1)).toBe('0 z 1 karty zatwierdzonej');
        expect(missingDaysText(1)).toBe('brak 1 dnia');
        expect(missingDaysText(2)).toBe('brak 2 dni');
    });

    it('zdanie pod godzinami karty pomija zera', () => {
        expect(cardFactsSentence({ missingWorkingDays: 2, overtimeMinutes: 90, leaveWorkingDays: 2 }))
            .toBe('Brakuje 2 dni roboczych. Nadgodziny 1:30 h. Urlop i L4: 2 dni.');
        expect(cardFactsSentence({ missingWorkingDays: 1, overtimeMinutes: 0, leaveWorkingDays: 1 }))
            .toBe('Brakuje 1 dnia roboczego. Urlop i L4: 1 dzień.');
        expect(cardFactsSentence({ missingWorkingDays: 0, overtimeMinutes: 0, leaveWorkingDays: 0 })).toBe('');
    });

    it('adresy: miesiąc to zakładka z `?period`, karta to osobna strona', () => {
        expect(monthPath('2026-09')).toBe('/employees/worktime?period=2026-09');
        expect(cardPath('2026-09', 'u-1')).toBe('/employees/worktime/2026-09/u-1');
    });
});

describe('monthFormat - przypomnienie', () => {
    it('backend przypomina najwyżej raz na 12 h - przycisk wie to wcześniej', () => {
        const now = Date.parse('2026-10-01T12:00:00Z');
        expect(remindedRecently(null, now)).toBe(false);
        expect(remindedRecently('2026-10-01T06:00:00Z', now)).toBe(true);
        expect(remindedRecently('2026-09-30T20:00:00Z', now)).toBe(false);
    });
});

describe('monthFormat - lista obecności', () => {
    const month = (overrides: Partial<MonthOverview> = {}): MonthOverview => ({
        period: '2026-09',
        label: 'Wrzesień 2026',
        workingDays: 21,
        stage: 'READY_TO_SIGN',
        counts: { total: 1, notSubmitted: 0, submitted: 0, returned: 0, approved: 1 },
        employees: [row('a', { status: 'APPROVED', approvedAt: '2026-10-01T08:00:00Z' })],
        sheet: {
            id: 's1', status: 'GENERATED', outdated: false, generatedAt: '2026-10-01T09:00:00Z',
            approvedAt: null, approvedByName: null, excludedNames: [],
        },
        sheetHistory: [],
        ...overrides,
    });

    it('niepodpisaną, aktualną listę podpisuje się bez tworzenia nowej', () => {
        expect(reusableSheet(month())?.id).toBe('s1');
    });

    it('lista sprzed zatwierdzenia którejś karty albo z pominiętymi powstaje od nowa', () => {
        expect(reusableSheet(month({
            employees: [row('a', { status: 'APPROVED', approvedAt: '2026-10-01T10:00:00Z' })],
        }))).toBeNull();
        const base = month();
        expect(reusableSheet({ ...base, sheet: { ...base.sheet!, excludedNames: ['Jan Nowak'] } })).toBeNull();
        expect(reusableSheet({ ...base, sheet: { ...base.sheet!, status: 'APPROVED' } })).toBeNull();
    });

    it('podpisana lista obejmuje osobę, chyba że jest wśród pominiętych', () => {
        const base = month();
        const signed = { ...base, sheet: { ...base.sheet!, status: 'APPROVED' as const, excludedNames: ['Jan Nowak'] } };
        expect(signedSheetIncludes(signed, 'Anna Lis')).toBe(true);
        expect(signedSheetIncludes(signed, 'Jan Nowak')).toBe(false);
        expect(signedSheetIncludes(base, 'Anna Lis')).toBe(false);
    });
});
