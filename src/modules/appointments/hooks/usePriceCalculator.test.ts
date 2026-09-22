import { describe, it, expect } from 'vitest';
import { formatMoneyAmount, parseMoneyAmount } from './usePriceCalculator';

/*
 * Mimo nazwy pliku to nie jest hook: dwie czyste funkcje, którymi wycena wizyty
 * (ServiceItem, InvoiceSummary) pokazuje grosze jako złotówki.
 */

describe('formatMoneyAmount', () => {
    it('grosze → złotówki z kropką i dwoma miejscami', () => {
        expect(formatMoneyAmount(190000)).toBe('1900.00');
        expect(formatMoneyAmount(154472)).toBe('1544.72');
        expect(formatMoneyAmount(35528)).toBe('355.28');
        expect(formatMoneyAmount(5)).toBe('0.05');
        expect(formatMoneyAmount(0)).toBe('0.00');
    });

    it('kwota ujemna zachowuje znak', () => {
        expect(formatMoneyAmount(-150)).toBe('-1.50');
    });

    it('brutto wpisane 1900,00 pokazuje się jako 1900.00, nie 1900.01', () => {
        // Funkcja niczego nie przelicza - pokazuje dokładnie te grosze, które dostała.
        expect(formatMoneyAmount(190000)).toBe('1900.00');
        expect(formatMoneyAmount(190001)).toBe('1900.01');
    });
});

describe('parseMoneyAmount', () => {
    it('kwota z kropką → grosze', () => {
        expect(parseMoneyAmount('1900.00')).toBe(190000);
        expect(parseMoneyAmount('1900')).toBe(190000);
        expect(parseMoneyAmount('1544.72')).toBe(154472);
    });

    it('zmiennoprzecinkowe × 100 nie ucina grosza', () => {
        // 19.99 × 100 = 1998,9999999999998
        expect(parseMoneyAmount('19.99')).toBe(1999);
        expect(parseMoneyAmount('0.07')).toBe(7);
    });

    it('brak liczby → 0', () => {
        expect(parseMoneyAmount('')).toBe(0);
        expect(parseMoneyAmount('abc')).toBe(0);
    });

    it('formatMoneyAmount i parseMoneyAmount są swoimi odwrotnościami', () => {
        [0, 1, 5, 99, 35528, 154472, 190000, 190001].forEach(cents => {
            expect(parseMoneyAmount(formatMoneyAmount(cents))).toBe(cents);
        });
    });
});
