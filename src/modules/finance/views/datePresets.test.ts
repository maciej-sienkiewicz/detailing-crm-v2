// src/modules/finance/views/datePresets.test.ts
// Zakresy filtra dat w Finansach. Testujemy granice, bo to one psują raporty:
// pierwszy i ostatni dzień miesiąca, luty przestępny i przełom roku — a do tego
// strefa czasowa, przez którą data liczona w UTC potrafi cofnąć się o dobę.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPresetRange } from './FinanceView';

const at = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
};

afterEach(() => vi.useRealTimers());

describe('getPresetRange — bieżący miesiąc', () => {
    it('obejmuje cały miesiąc kalendarzowy, nie ostatnie 30 dni', () => {
        at('2026-08-19T12:00:00');
        expect(getPresetRange('currentMonth')).toEqual({
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
        });
    });

    it('pierwszego dnia miesiąca nie cofa się do poprzedniego', () => {
        // Nad ranem pierwszego dnia data liczona w UTC wskazywałaby jeszcze lipiec.
        at('2026-08-01T00:30:00');
        expect(getPresetRange('currentMonth')).toEqual({
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
        });
    });

    it('ostatniego dnia miesiąca nie przechodzi do następnego', () => {
        at('2026-08-31T23:30:00');
        expect(getPresetRange('currentMonth')).toEqual({
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
        });
    });

    it('luty roku przestępnego kończy się 29 dnia', () => {
        at('2028-02-10T10:00:00');
        expect(getPresetRange('currentMonth')).toEqual({
            dateFrom: '2028-02-01',
            dateTo: '2028-02-29',
        });
    });

    it('grudzień nie przecieka do następnego roku', () => {
        at('2026-12-05T10:00:00');
        expect(getPresetRange('currentMonth')).toEqual({
            dateFrom: '2026-12-01',
            dateTo: '2026-12-31',
        });
    });
});

describe('getPresetRange — pozostałe presety', () => {
    it('„cały czas" i zakres własny nie narzucają dat', () => {
        at('2026-08-19T12:00:00');
        expect(getPresetRange('all')).toEqual({});
        expect(getPresetRange('custom')).toEqual({});
    });

    it('okresy kroczące liczą się wstecz od dziś', () => {
        at('2026-08-19T12:00:00');
        expect(getPresetRange('week')).toEqual({ dateFrom: '2026-08-12', dateTo: '2026-08-19' });
        expect(getPresetRange('month')).toEqual({ dateFrom: '2026-07-20', dateTo: '2026-08-19' });
        expect(getPresetRange('quarter')).toEqual({ dateFrom: '2026-05-21', dateTo: '2026-08-19' });
    });
});
