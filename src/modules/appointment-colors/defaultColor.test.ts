import { describe, it, expect } from 'vitest';
import { pickInitialColorId } from './defaultColor';

const color = (id: string, isDefault = false, isActive = true) => ({ id, isDefault, isActive });

describe('pickInitialColorId', () => {
    it('nie nadpisuje wyboru, który już jest', () => {
        expect(pickInitialColorId([color('a', true)], 'b')).toBe('b');
    });

    it('bierze kolor domyślny, nie pierwszy z listy', () => {
        expect(pickInitialColorId([color('a'), color('b', true), color('c')])).toBe('b');
    });

    it('bez domyślnego zostaje pierwszy - pole i tak jest wymagane', () => {
        expect(pickInitialColorId([color('a'), color('b')])).toBe('a');
    });

    it('pomija kolory archiwalne', () => {
        expect(pickInitialColorId([color('stary', true, false), color('nowy')])).toBe('nowy');
    });

    it('pusta lista daje pusty wybór zamiast wyjątku', () => {
        expect(pickInitialColorId([])).toBe('');
        expect(pickInitialColorId([], null)).toBe('');
    });
});
