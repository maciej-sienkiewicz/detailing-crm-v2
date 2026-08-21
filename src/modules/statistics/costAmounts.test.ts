import { describe, expect, it } from 'vitest';
import { effectiveGross, effectiveNet, isNetDerived, parseVatRate } from './costAmounts';
import type { CostExpenseItem } from './costTypes';

const item = (over: Partial<CostExpenseItem>): CostExpenseItem => ({
    id: 'i', invoiceId: 'f', invoiceNumber: null, sellerNip: null, sellerName: null,
    saleDate: null, lineNumber: 1, name: null, unit: null, quantity: null,
    unitPriceNet: null, netValue: null, grossValue: null, vatRate: null,
    costCategoryId: null, costCategoryName: null,
    ...over,
});

const round = (v: number) => Math.round(v * 100) / 100;

describe('parseVatRate', () => {
    it('czyta stawkę zapisaną jako goła liczba (format KSeF)', () => {
        expect(parseVatRate('23')).toBe(23);
        expect(parseVatRate('8')).toBe(8);
    });

    it('czyta stawkę ze znakiem procenta i spacjami', () => {
        expect(parseVatRate(' 23 % ')).toBe(23);
    });

    it('traktuje kody bez VAT jako 0%', () => {
        expect(parseVatRate('zw')).toBe(0);
        expect(parseVatRate('ZW')).toBe(0);
        expect(parseVatRate('np')).toBe(0);
        expect(parseVatRate('oo')).toBe(0);
        expect(parseVatRate('0 KR')).toBe(0);
    });

    it('nie zgaduje przy nierozpoznanym kodzie', () => {
        expect(parseVatRate(null)).toBeNull();
        expect(parseVatRate('')).toBeNull();
        expect(parseVatRate('b/d')).toBeNull();
    });
});

describe('effectiveNet', () => {
    it('zwraca netto z faktury, gdy jest', () => {
        expect(effectiveNet(item({ netValue: 347.38, grossValue: 427.28, vatRate: '23' }))).toBe(347.38);
    });

    it('wylicza netto z brutto metodą „w stu"', () => {
        expect(round(effectiveNet(item({ grossValue: 6642, vatRate: '23' })))).toBe(5400);
        expect(round(effectiveNet(item({ grossValue: 92, vatRate: '8' })))).toBe(85.19);
    });

    it('dla stawek bez VAT netto równa się brutto', () => {
        expect(effectiveNet(item({ grossValue: 1900, vatRate: 'zw' }))).toBe(1900);
    });

    it('nie zgaduje netto przy nieznanej stawce', () => {
        expect(effectiveNet(item({ grossValue: 100, vatRate: 'b/d' }))).toBe(0);
    });
});

describe('effectiveGross', () => {
    it('dolicza VAT do netto, gdy brutto nie ma na fakturze', () => {
        expect(round(effectiveGross(item({ netValue: 347.38, vatRate: '23' })))).toBe(427.28);
        expect(round(effectiveGross(item({ netValue: 157.40, vatRate: '8' })))).toBe(169.99);
    });

    it('poprzednio stawka bez znaku % nie była rozpoznawana i brutto == netto', () => {
        // regresja: parseVatRate('23') zwracało null, więc gross wychodziło 347.38
        expect(effectiveGross(item({ netValue: 347.38, vatRate: '23' }))).not.toBe(347.38);
    });
});

describe('isNetDerived', () => {
    it('oznacza pozycje z netto policzonym z brutto', () => {
        expect(isNetDerived(item({ netValue: 5400, grossValue: 6642, vatRate: '23', amountsDerived: true }))).toBe(true);
        expect(isNetDerived(item({ grossValue: 6642, vatRate: '23' }))).toBe(true);
        expect(isNetDerived(item({ netValue: 347.38, grossValue: 427.28, vatRate: '23' }))).toBe(false);
    });
});

describe('suma KPI z danych sierpnia 2026', () => {
    it('różnica brutto − netto mieści się w realnym VAT', () => {
        const items = [
            item({ netValue: 347.38, grossValue: 427.28, vatRate: '23' }),
            item({ grossValue: 6642, vatRate: '23' }),          // faktura tylko z brutto
            item({ grossValue: 1900, vatRate: 'zw' }),          // usługa zwolniona
        ];
        const gross = items.reduce((s, i) => s + effectiveGross(i), 0);
        const net   = items.reduce((s, i) => s + effectiveNet(i), 0);
        expect(round(gross)).toBe(8969.28);
        expect(round(net)).toBe(7647.38);
        // VAT = 23% od dwóch pozycji z 23%, zero od "zw"
        expect(round(gross - net)).toBe(1321.90);
    });
});
