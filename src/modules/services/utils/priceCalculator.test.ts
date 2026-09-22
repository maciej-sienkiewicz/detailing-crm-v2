import { describe, it, expect } from 'vitest';
import {
    calculateGrossFromNet,
    calculateNetFromGross,
    formatMoneyAmount,
    parseMoneyInput,
} from './priceCalculator';

// ─── calculateGrossFromNet ────────────────────────────────────────────────────

describe('calculateGrossFromNet', () => {
    it('netto wpisane: brutto liczone z netta, VAT to różnica', () => {
        expect(calculateGrossFromNet(100000, 23)).toEqual({ priceNet: 100000, vatAmount: 23000, priceGross: 123000 });
        expect(calculateGrossFromNet(100000, 8)).toEqual({ priceNet: 100000, vatAmount: 8000, priceGross: 108000 });
        expect(calculateGrossFromNet(100000, 5)).toEqual({ priceNet: 100000, vatAmount: 5000, priceGross: 105000 });
    });

    it('0% i ZW: brutto równe netto, VAT zero', () => {
        expect(calculateGrossFromNet(100000, 0)).toEqual({ priceNet: 100000, vatAmount: 0, priceGross: 100000 });
        expect(calculateGrossFromNet(100000, -1)).toEqual({ priceNet: 100000, vatAmount: 0, priceGross: 100000 });
    });

    it('połówka grosza VAT zaokrągla się w górę', () => {
        // 1350 × 23% = 310,5 gr → 311 gr.
        expect(calculateGrossFromNet(1350, 23)).toEqual({ priceNet: 1350, vatAmount: 311, priceGross: 1661 });
    });
});

// ─── calculateNetFromGross ────────────────────────────────────────────────────

describe('calculateNetFromGross', () => {
    it('brutto wpisane 1900,00 zostaje co do grosza, netto i VAT są pochodne', () => {
        expect(calculateNetFromGross(190000, 23)).toEqual({ priceNet: 154472, vatAmount: 35528, priceGross: 190000 });
    });

    it('to jest powód, dla którego wpisanego brutto nie wolno liczyć z netta', () => {
        // 154472 gr × 1,23 = 190000,56 → 190001 gr: brutto 1900,00 jest z netta nieosiągalne.
        const { priceNet } = calculateNetFromGross(190000, 23);
        expect(calculateGrossFromNet(priceNet, 23).priceGross).toBe(190001);
    });

    it('inne stawki: brutto przechodzi bez zmian', () => {
        expect(calculateNetFromGross(190000, 8)).toEqual({ priceNet: 175926, vatAmount: 14074, priceGross: 190000 });
        expect(calculateNetFromGross(190000, 5)).toEqual({ priceNet: 180952, vatAmount: 9048, priceGross: 190000 });
    });

    it('0% i ZW: netto równe brutto, VAT zero', () => {
        expect(calculateNetFromGross(190000, 0)).toEqual({ priceNet: 190000, vatAmount: 0, priceGross: 190000 });
        expect(calculateNetFromGross(190000, -1)).toEqual({ priceNet: 190000, vatAmount: 0, priceGross: 190000 });
    });

    it('netto + VAT = brutto w każdym kierunku', () => {
        [1, 99, 1230, 154472, 190000, 190001, 9999999].forEach(amount => {
            ([23, 8, 5, 0, -1] as const).forEach(rate => {
                const g = calculateNetFromGross(amount, rate);
                expect(g.priceNet + g.vatAmount).toBe(g.priceGross);
                const n = calculateGrossFromNet(amount, rate);
                expect(n.priceNet + n.vatAmount).toBe(n.priceGross);
            });
        });
    });
});

// ─── formatMoneyAmount ────────────────────────────────────────────────────────

describe('formatMoneyAmount', () => {
    it('grosze → złotówki z kropką i dwoma miejscami', () => {
        expect(formatMoneyAmount(190000)).toBe('1900.00');
        expect(formatMoneyAmount(154472)).toBe('1544.72');
        expect(formatMoneyAmount(5)).toBe('0.05');
        expect(formatMoneyAmount(0)).toBe('0.00');
    });

    it('kwota ujemna zachowuje znak', () => {
        expect(formatMoneyAmount(-150)).toBe('-1.50');
    });

    it('nie gubi grosza: 190001 to nie 190000', () => {
        expect(formatMoneyAmount(190001)).toBe('1900.01');
    });
});

// ─── parseMoneyInput ──────────────────────────────────────────────────────────

describe('parseMoneyInput', () => {
    it('kwota z przecinkiem albo kropką → grosze', () => {
        expect(parseMoneyInput('1900,00')).toBe(190000);
        expect(parseMoneyInput('1900.00')).toBe(190000);
        expect(parseMoneyInput('1900')).toBe(190000);
        expect(parseMoneyInput('1544,72')).toBe(154472);
    });

    it('spacje i dopisek waluty nie przeszkadzają', () => {
        expect(parseMoneyInput('1 900,50')).toBe(190050);
        expect(parseMoneyInput('1900 zł')).toBe(190000);
    });

    it('zmiennoprzecinkowe × 100 nie ucina grosza', () => {
        // 19,99 × 100 = 1998,9999999999998
        expect(parseMoneyInput('19,99')).toBe(1999);
        expect(parseMoneyInput('0,07')).toBe(7);
    });

    it('brak liczby → 0', () => {
        expect(parseMoneyInput('')).toBe(0);
        expect(parseMoneyInput('abc')).toBe(0);
        expect(parseMoneyInput(',')).toBe(0);
    });

    it('pole z formatMoneyAmount wraca jako te same grosze', () => {
        [0, 1, 5, 99, 154472, 190000, 190001].forEach(cents => {
            expect(parseMoneyInput(formatMoneyAmount(cents))).toBe(cents);
        });
    });
});
