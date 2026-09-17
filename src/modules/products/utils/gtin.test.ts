import { describe, it, expect } from 'vitest';
import { normalizeGtin, isValidGtin } from './gtin';

describe('gtin', () => {
    it('normalises a valid EAN-13 to GTIN-14', () => {
        expect(normalizeGtin('5901234123457')).toBe('05901234123457');
    });
    it('normalises a valid UPC-A to GTIN-14', () => {
        expect(normalizeGtin('036000291452')).toBe('00036000291452');
    });
    it('rejects a transposed-digit code', () => {
        expect(normalizeGtin('5901234132457')).toBeNull();
    });
    it('tolerates spaces and dashes', () => {
        expect(normalizeGtin('590-1234 123457')).toBe('05901234123457');
    });
    it('rejects non-digits and wrong lengths', () => {
        expect(isValidGtin('abc')).toBe(false);
        expect(isValidGtin('12345')).toBe(false);
        expect(isValidGtin('')).toBe(false);
        expect(isValidGtin(null)).toBe(false);
    });
});
