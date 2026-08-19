import { describe, it, expect } from 'vitest';
import { MAX_2_DECIMALS, centsToInput, inputToCents } from './moneyInput';

const accepts = (v: string) => MAX_2_DECIMALS.test(v);

describe('MAX_2_DECIMALS', () => {
    it('lets a price be typed one character at a time', () => {
        // Every prefix of "12,45" has to pass, or the field blocks its own input.
        ['', '1', '12', '12,', '12,4', '12,45'].forEach(step => {
            expect(accepts(step), step).toBe(true);
        });
    });

    it('accepts either decimal separator', () => {
        expect(accepts('12.45')).toBe(true);
        expect(accepts('12,45')).toBe(true);
    });

    it('stops at two decimals', () => {
        expect(accepts('12,456')).toBe(false);
    });

    it('rejects everything that is not a plain amount', () => {
        ['12a', '1e5', '-5', '+5', '12,,4', '12.4.5', '1 2', 'zł'].forEach(bad => {
            expect(accepts(bad), bad).toBe(false);
        });
    });
});

describe('centsToInput / inputToCents', () => {
    it('renders cents with the Polish separator and both decimals', () => {
        expect(centsToInput(12345)).toBe('123,45');
        expect(centsToInput(500)).toBe('5,00');
        expect(centsToInput(0)).toBe('0,00');
    });

    it('round-trips a typed amount', () => {
        expect(inputToCents(centsToInput(12345))).toBe(12345);
    });

    it('reads an amount typed with either separator', () => {
        expect(inputToCents('123,45')).toBe(12345);
        expect(inputToCents('123.45')).toBe(12345);
    });

    it('treats a half-typed field as nothing entered rather than NaN', () => {
        expect(inputToCents('')).toBe(0);
        expect(inputToCents(',')).toBe(0);
    });

    it('does not let float drift move a grosz', () => {
        // 8.29 * 100 is 828.9999... in binary floating point.
        expect(inputToCents('8,29')).toBe(829);
        expect(inputToCents('1,15')).toBe(115);
    });
});
