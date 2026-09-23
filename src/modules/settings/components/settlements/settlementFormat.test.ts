import { describe, expect, it } from 'vitest';
import { employeesLabel, isApproved, pendingCount, periodDays, periodLabel, sheetFileName } from './settlementFormat';

describe('settlementFormat - opis rozliczenia w tabeli', () => {
    it('okres to miesiąc i rok, a pod nim dni, które obejmuje', () => {
        expect(periodLabel('2026-09')).toBe('Wrzesień 2026');
        expect(periodDays('2026-09')).toBe('01.09–30.09.2026');
        expect(periodDays('2026-12')).toBe('01.12–31.12.2026');
    });

    it('luty ma tyle dni, ile ma w danym roku', () => {
        expect(periodDays('2026-02')).toBe('01.02–28.02.2026');
        expect(periodDays('2028-02')).toBe('01.02–29.02.2028');
    });

    it('nieczytelny okres pokazuje się tak, jak przyszedł, zamiast „undefined NaN"', () => {
        expect(periodLabel('bzdura')).toBe('bzdura');
        expect(periodDays('bzdura')).toBe('bzdura');
    });

    it('liczba pracowników po polsku', () => {
        expect(employeesLabel(1)).toBe('1 pracownik');
        expect(employeesLabel(3)).toBe('3 pracowników');
        expect(employeesLabel(12)).toBe('12 pracowników');
    });

    it('licznik na zakładce liczy tylko rozliczenia do zatwierdzenia', () => {
        expect(pendingCount([{ status: 'GENERATED' }, { status: 'APPROVED' }, { status: 'GENERATED' }])).toBe(2);
        expect(isApproved({ status: 'APPROVED' })).toBe(true);
        expect(isApproved({ status: 'GENERATED' })).toBe(false);
    });

    it('nazwa pobieranego pliku mówi, czy lista jest podpisana', () => {
        expect(sheetFileName({ period: '2026-09', signed: false })).toBe('lista-obecnosci-2026-09.pdf');
        expect(sheetFileName({ period: '2026-09', signed: true })).toBe('lista-obecnosci-2026-09-podpisana.pdf');
    });
});
