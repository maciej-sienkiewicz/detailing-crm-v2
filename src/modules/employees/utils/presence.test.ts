import { describe, expect, it } from 'vitest';
import { dateTimeLong, lastSeenShort, seenRecently } from './presence';

// Dziś: piątek 2 października 2026, 10:00 czasu lokalnego.
const NOW = new Date(2026, 9, 2, 10, 0);
const at = (...a: [number, number, number, number, number]) => new Date(...a).toISOString();

describe('presence - „Ostatnio w aplikacji"', () => {
    it('dziś i wczoraj z godziną, starsze daty bez godziny', () => {
        expect(lastSeenShort(at(2026, 9, 2, 7, 58), NOW)).toBe('dziś, 7:58');
        expect(lastSeenShort(at(2026, 9, 1, 18, 42), NOW)).toBe('wczoraj, 18:42');
        expect(lastSeenShort(at(2026, 8, 28, 9, 0), NOW)).toBe('28 września');
    });

    it('inny rok dopisuje rok', () => {
        expect(lastSeenShort(at(2025, 11, 30, 9, 0), NOW)).toBe('30 grudnia 2025');
    });

    it('pełna data logowania', () => {
        expect(dateTimeLong(at(2026, 9, 1, 18, 42))).toBe('1 października 2026, 18:42');
    });

    it('zielona kropka tylko przy aktywności z ostatniej godziny', () => {
        expect(seenRecently(at(2026, 9, 2, 9, 30), NOW)).toBe(true);
        expect(seenRecently(at(2026, 9, 2, 8, 30), NOW)).toBe(false);
        expect(seenRecently(null, NOW)).toBe(false);
    });
});
