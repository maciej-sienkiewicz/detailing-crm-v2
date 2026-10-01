import { describe, expect, it } from 'vitest';
import type { MonthCardRow, MonthOverview } from '../../api/worktimeMonthsApi';
import {
    addMonths, approvableInBulk, defaultPeriod, employeesLabel, hoursText, hoursVsNorm, isPeriod, monthOptions,
    nextAwaiting, periodLabel, remindable, reusableSheet, sheetFileName, signedSheetIncludes, stageStep,
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
        expect(hoursVsNorm(9120, 10080)).toBe('152 / 168 h');
    });
});

describe('monthFormat - kolejka decyzji', () => {
    it('następna karta idzie dalej w kolejności listy i zawija, pomijając rozpatrzone', () => {
        const rows = [row('a'), row('b', { status: 'APPROVED' }), row('c'), row('d', { canDecide: false })];
        expect(nextAwaiting(rows, 'a')?.userId).toBe('c');
        expect(nextAwaiting(rows, 'c')?.userId).toBe('a');
        expect(nextAwaiting(rows, 'c', new Set(['a']))).toBeNull();
    });

    it('zbiorczo zatwierdza się tylko złożone bez braków, na które można zdecydować', () => {
        const rows = [row('a'), row('b', { missingWorkingDays: 2 }), row('c', { canDecide: false }), row('d', { status: 'DRAFT' })];
        expect(approvableInBulk(rows).map(r => r.userId)).toEqual(['a']);
    });

    it('przypomnienie idzie do niezłożonych, ale nie częściej niż raz na 12 h', () => {
        const now = Date.parse('2026-10-01T12:00:00Z');
        const rows = [
            // Przy niezłożonych kartach backend zawsze daje canDecide=false - to nie blokuje przypomnienia.
            row('a', { status: 'NOT_STARTED', canDecide: false }),
            row('b', { status: 'DRAFT', remindedAt: '2026-10-01T06:00:00Z' }),
            row('c', { status: 'RETURNED', remindedAt: '2026-09-30T20:00:00Z' }),
            row('d'),
        ];
        expect(remindable(rows, now).map(r => r.userId)).toEqual(['a', 'c']);
        // Własnej karty się sobie nie przypomina.
        expect(remindable(rows, now, 'a').map(r => r.userId)).toEqual(['c']);
    });

    it('etap miesiąca wskazuje pastylkę postępu', () => {
        expect(stageStep('COLLECTING')).toBe(0);
        expect(stageStep('REVIEWING')).toBe(1);
        expect(stageStep('READY_TO_SIGN')).toBe(2);
        expect(stageStep('NEEDS_RESIGN')).toBe(2);
        expect(stageStep('SIGNED')).toBe(3);
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
