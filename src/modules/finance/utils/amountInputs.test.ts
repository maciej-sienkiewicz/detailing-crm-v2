import { describe, it, expect } from 'vitest';
import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import { priceInputsForVatRate } from '@/common/utils/priceInputs';
import {
    DOCUMENT_VAT_RATE,
    EXPENSE_AMOUNT_INPUT,
    documentVatForNet,
    expenseGrossForNet,
    expenseNetForGross,
    expenseVatRate,
} from './amountInputs';
import { inputValueToGrosze } from './formatters';

// ─── Faktura kosztowa ─────────────────────────────────────────────────────────

describe('expenseVatRate', () => {
    it('stawki z listy jako liczby, „zw" jako -1 (ZW w priceAdjustment)', () => {
        expect(expenseVatRate('23')).toBe(23);
        expect(expenseVatRate('8')).toBe(8);
        expect(expenseVatRate('5')).toBe(5);
        expect(expenseVatRate('0')).toBe(0);
        expect(expenseVatRate('zw')).toBe(-1);
    });
});

describe('expenseGrossForNet / expenseNetForGross', () => {
    it('netto → brutto w groszach, z kropką jak w polu', () => {
        expect(expenseGrossForNet('1000', 23)).toBe('1230.00');
        expect(expenseGrossForNet('1544.72', 23)).toBe('1900.01');
    });

    it('brutto → netto w groszach', () => {
        expect(expenseNetForGross('1900', 23)).toBe('1544.72');
        expect(expenseNetForGross('1900', 8)).toBe('1759.26');
    });

    it('połówka grosza zaokrągla się w górę, jak wszędzie indziej', () => {
        // 16,50 × 1,23 = 20,295 - zmiennoprzecinkowo 20,2949…, więc dawało 20,29.
        expect(expenseGrossForNet('16.50', 23)).toBe((netToGross(1650, 23) / 100).toFixed(2));
        expect(expenseGrossForNet('16.50', 23)).toBe('20.30');
    });

    it('ZW i 0%: druga kwota równa wpisanej', () => {
        expect(expenseGrossForNet('1900', expenseVatRate('zw'))).toBe('1900.00');
        expect(expenseNetForGross('1900', expenseVatRate('zw'))).toBe('1900.00');
        expect(expenseGrossForNet('1900', 0)).toBe('1900.00');
    });

    it('pole bez liczby: druga kwota pusta', () => {
        expect(expenseGrossForNet('', 23)).toBe('');
        expect(expenseGrossForNet('.', 23)).toBe('');
        expect(expenseNetForGross('', 23)).toBe('');
    });
});

describe('faktura kosztowa: zmiana stawki VAT', () => {
    const change = (fields: { net: string; gross: string }, from: string, to: string, side: 'net' | 'gross') =>
        priceInputsForVatRate(fields, expenseVatRate(from), expenseVatRate(to), side, EXPENSE_AMOUNT_INPUT);

    it('brutto wpisane 1900.00 przy 23% → 8% → 23% wraca co do grosza', () => {
        const typed = { net: expenseNetForGross('1900.00', 23), gross: '1900.00' };
        const at8 = change(typed, '23', '8', 'gross');
        expect(at8).toEqual({ net: '1759.26', gross: '1900.00' });

        const back = change(at8, '8', '23', 'gross');
        expect(back).toEqual({ net: '1544.72', gross: '1900.00' });
        expect(inputValueToGrosze(back.gross)).toBe(190000);
    });

    it('wpisane netto zostaje, brutto liczy się przy nowej stawce', () => {
        expect(change({ net: '1000', gross: '1230.00' }, '23', '8', 'net')).toEqual({ net: '1000', gross: '1080.00' });
    });

    it('ponowny wybór tej samej stawki niczego nie przelicza', () => {
        const fields = { net: '1544.72', gross: '1900.00' };
        expect(change(fields, '23', '23', 'net')).toBe(fields);
        expect(change(fields, '23', '23', 'gross')).toBe(fields);
    });

    it('ZW: wpisana kwota zostaje, druga jej równa', () => {
        expect(change({ net: '1544.72', gross: '1900.00' }, '23', 'zw', 'gross')).toEqual({ net: '1900.00', gross: '1900.00' });
        expect(change({ net: '1000', gross: '1230.00' }, '23', 'zw', 'net')).toEqual({ net: '1000', gross: '1000.00' });
        expect(change({ net: '1900.00', gross: '1900.00' }, 'zw', '23', 'gross').net).toBe((grossToNet(190000, 23) / 100).toFixed(2));
    });

    it('puste pole wpisane: druga kwota pusta', () => {
        expect(change({ net: '', gross: '' }, '23', '8', 'net')).toEqual({ net: '', gross: '' });
    });
});

// ─── Dokument przychodowy ─────────────────────────────────────────────────────

describe('documentVatForNet', () => {
    it('stała stawka okna to 23%', () => {
        expect(DOCUMENT_VAT_RATE).toBe(23);
    });

    it('VAT = brutto − netto w groszach', () => {
        expect(documentVatForNet('100')).toBe('23.00');
        expect(documentVatForNet('1900')).toBe('437.00');
        // 1544,72 zł netto × 1,23 = 1900,01 zł brutto → VAT 355,29 zł.
        expect(documentVatForNet('1544.72')).toBe('355.29');
    });

    it('netto + VAT daje brutto z netToGross co do grosza', () => {
        ['0.01', '1.50', '13.50', '14.50', '1544.72', '99999.99'].forEach(net => {
            const netCents = inputValueToGrosze(net);
            expect(netCents + inputValueToGrosze(documentVatForNet(net)), net).toBe(netToGross(netCents, 23));
        });
    });

    it('połówka grosza zaokrągla się w górę: 13,50 → 3,11, a nie 3,10 jak `toFixed`', () => {
        expect(documentVatForNet('13.50')).toBe('3.11');
        expect(documentVatForNet('14.50')).toBe('3.34');
        expect(documentVatForNet('1.50')).toBe('0.35');
    });

    it('przecinek też jest separatorem', () => {
        expect(documentVatForNet('13,50')).toBe('3.11');
    });

    it('pole bez liczby: VAT pusty; zero: VAT zero', () => {
        expect(documentVatForNet('')).toBe('');
        expect(documentVatForNet('abc')).toBe('');
        expect(documentVatForNet('0')).toBe('0.00');
    });

    it('inna stawka, gdy okno kiedyś ją dostanie', () => {
        expect(documentVatForNet('100', 8)).toBe('8.00');
        expect(documentVatForNet('100', -1)).toBe('0.00');
    });
});
