import { describe, expect, it } from 'vitest';
import { amountInWords } from './amountInWords';

describe('amountInWords', () => {
    it('pisze kwotę jak na fakturze: złote słownie, grosze cyframi', () => {
        expect(amountInWords(67100)).toBe('sześćset siedemdziesiąt jeden złotych 00/100');
        expect(amountInWords(221400)).toBe('dwa tysiące dwieście czternaście złotych 00/100');
        expect(amountInWords(12345)).toBe('sto dwadzieścia trzy złote 45/100');
    });

    it('odmienia złote i tysiące po polsku', () => {
        expect(amountInWords(100)).toBe('jeden złoty 00/100');
        expect(amountInWords(2200)).toBe('dwadzieścia dwa złote 00/100');
        expect(amountInWords(1200)).toBe('dwanaście złotych 00/100');
        expect(amountInWords(121300)).toBe('tysiąc dwieście trzynaście złotych 00/100');
        expect(amountInWords(512000000)).toBe('pięć milionów sto dwadzieścia tysięcy złotych 00/100');
    });

    it('zero i kwota ujemna', () => {
        expect(amountInWords(5)).toBe('zero złotych 05/100');
        expect(amountInWords(-1000)).toBe('minus dziesięć złotych 00/100');
    });
});
