import { describe, it, expect } from 'vitest';
import {
    formatMoney,
    formatMoneyCompact,
    formatMoneyFloat,
    formatMoneyFloatCompact,
    groszToInputValue,
    inputValueToGrosze,
} from './formatters';

/*
 * Intl rozdziela tysiące i walutę spacją niełamliwą, a to, czy grupuje już tysiące
 * (1 900 vs 1900), zależy od wersji danych ICU. Porównujemy treść bez odstępów.
 */
const strip = (s: string) => s.replace(/\s/g, '');

// ─── Pola kwot w oknach dokumentów ────────────────────────────────────────────

describe('groszToInputValue', () => {
    it('grosze → wartość pola: kropka, dwa miejsca', () => {
        expect(groszToInputValue(190000)).toBe('1900.00');
        expect(groszToInputValue(154472)).toBe('1544.72');
        expect(groszToInputValue(5)).toBe('0.05');
        expect(groszToInputValue(0)).toBe('0.00');
    });

    it('kwota ujemna zachowuje znak', () => {
        expect(groszToInputValue(-150)).toBe('-1.50');
    });
});

describe('inputValueToGrosze', () => {
    it('kropka albo przecinek → grosze', () => {
        expect(inputValueToGrosze('1900.00')).toBe(190000);
        expect(inputValueToGrosze('1900,00')).toBe(190000);
        expect(inputValueToGrosze('1900')).toBe(190000);
        expect(inputValueToGrosze('1544.72')).toBe(154472);
    });

    it('zmiennoprzecinkowe × 100 nie ucina grosza', () => {
        // 19.99 × 100 = 1998,9999999999998
        expect(inputValueToGrosze('19.99')).toBe(1999);
        expect(inputValueToGrosze('0,07')).toBe(7);
    });

    it('brak liczby → 0', () => {
        expect(inputValueToGrosze('')).toBe(0);
        expect(inputValueToGrosze('abc')).toBe(0);
    });

    it('wartość pola wraca jako te same grosze - 1900,00 nie staje się 1900,01', () => {
        [0, 1, 5, 99, 35528, 154472, 190000, 190001].forEach(cents => {
            expect(inputValueToGrosze(groszToInputValue(cents))).toBe(cents);
        });
    });
});

// ─── Kwoty do wyświetlenia ────────────────────────────────────────────────────

describe('formatMoney / formatMoneyCompact (grosze)', () => {
    it('grosze → złotówki po polsku, z walutą albo bez', () => {
        expect(strip(formatMoney(190000))).toBe('1900,00zł');
        expect(strip(formatMoney(12345678))).toBe('123456,78zł');
        expect(strip(formatMoneyCompact(190000))).toBe('1900,00');
        expect(strip(formatMoneyCompact(5))).toBe('0,05');
    });

    it('kwota ujemna zachowuje znak', () => {
        expect(strip(formatMoney(-150))).toBe('-1,50zł');
    });

    it('nie gubi grosza: 190001 to nie 190000', () => {
        expect(strip(formatMoneyCompact(190001))).toBe('1900,01');
    });
});

describe('formatMoneyFloat / formatMoneyFloatCompact (złotówki z KSeF)', () => {
    it('złotówki → kwota po polsku', () => {
        expect(strip(formatMoneyFloat(1900))).toBe('1900,00zł');
        expect(strip(formatMoneyFloat(1544.72))).toBe('1544,72zł');
        expect(strip(formatMoneyFloatCompact(1900))).toBe('1900,00');
    });

    it('brak kwoty → myślnik', () => {
        expect(formatMoneyFloat(null)).toBe('-');
        expect(formatMoneyFloat(undefined)).toBe('-');
        expect(formatMoneyFloatCompact(null)).toBe('-');
    });
});
