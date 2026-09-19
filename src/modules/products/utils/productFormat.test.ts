import { describe, expect, it } from 'vitest';
import { formatRating } from './productFormat';

/**
 * Ocena stoi w tabeli obok gwiazdki, więc jest czytana jako jedna rzecz z nią.
 * „4.3333" w tym miejscu wygląda jak wyciek z bazy, a kropka dziesiętna
 * w polskim interfejsie jak błąd.
 */
describe('formatRating', () => {
    it('ocena całkowita nie dostaje części dziesiętnej', () => {
        expect(formatRating(4)).toBe('4');
        expect(formatRating(5)).toBe('5');
        expect(formatRating(1)).toBe('1');
    });

    it('średnia dostaje jedną cyfrę po przecinku, po polsku', () => {
        expect(formatRating(4.5)).toBe('4,5');
        expect(formatRating(3.25)).toBe('3,3');
        expect(formatRating(4.3333)).toBe('4,3');
    });

    it('zaokrąglenie do pełnej oceny gubi przecinek zamiast pisać „4,0"', () => {
        expect(formatRating(3.98)).toBe('4');
        expect(formatRating(4.04)).toBe('4');
    });
});
