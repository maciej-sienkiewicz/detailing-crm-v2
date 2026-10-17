import { describe, expect, it } from 'vitest';
import { normLabel } from './inspiration';

describe('normLabel', () => {
    it('krotność normy po polsku, okolice jedynki to norma', () => {
        expect(normLabel(3.42)).toBe('3,4× normy');
        expect(normLabel(1.02)).toBe('w normie');
        expect(normLabel(0.6)).toBe('0,6× normy');
        expect(normLabel(null)).toBeNull();
        expect(normLabel(undefined)).toBeNull();
    });
});
