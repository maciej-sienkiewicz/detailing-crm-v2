import { describe, expect, it } from 'vitest';
import { hoursInDays, normalizeHours, parseHours, sanitizeHours } from './hoursField';

describe('hoursField', () => {
    // Zgłoszenie: wpisanie „800" zamieniało się w trakcie pisania w „720",
    // a skasowanie pola od razu wstawiało „1".
    it('keeps what is typed: an empty field and an out-of-range number are allowed mid-typing', () => {
        expect(sanitizeHours('')).toBe('');
        expect(sanitizeHours('800')).toBe('800');
        expect(sanitizeHours('4,5e')).toBe('45');
        expect(parseHours('')).toBeNull();
        expect(parseHours('800')).toBeNull();
        expect(parseHours('0')).toBeNull();
        expect(parseHours('48')).toBe(48);
    });

    it('clamps only when the field is left, and an empty field returns to the saved value', () => {
        expect(normalizeHours('800', 48)).toBe('720');
        expect(normalizeHours('0', 48)).toBe('1');
        expect(normalizeHours('', 48)).toBe('48');
        expect(normalizeHours('72', 48)).toBe('72');
    });

    it('reads hours as days in Polish', () => {
        expect(hoursInDays(12)).toBe('12 godz.');
        expect(hoursInDays(24)).toBe('1 dzień');
        expect(hoursInDays(120)).toBe('5 dni');
        expect(hoursInDays(36)).toBe('1,5 dnia');
    });
});
