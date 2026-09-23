import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isSameLocalDay } from './dateTime';

/*
 * Dzień liczy się w strefie przeglądarki, a różnicę względem UTC widać tylko poza UTC.
 * Testy ustawiają czas polski i przywracają po sobie strefę, w której zostały uruchomione.
 */
const originalTz = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/Warsaw'; });
afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
});

describe('isSameLocalDay - czy wizyta mieści się w jednym dniu', () => {
    it('strefa testu to czas polski - inaczej reszta testów niczego by nie sprawdzała', () => {
        expect(new Date('2026-09-23T22:00:00Z').getHours()).toBe(0);
    });

    it('cały dzień czasu polskiego (22:00Z → 21:59:59Z) to jeden dzień', () => {
        expect(isSameLocalDay('2026-09-23T22:00:00Z', '2026-09-24T21:59:59Z')).toBe(true);
    });

    it('rezerwacja 24-28.09 to kilka dni', () => {
        expect(isSameLocalDay('2026-09-23T22:00:00Z', '2026-09-28T21:45:00Z')).toBe(false);
    });

    it('liczy się dzień lokalny, nie data z zapisu UTC', () => {
        // Obie chwile mają w UTC datę 24.09, ale w Polsce to 23:30 24.09 i 00:30 25.09.
        expect(isSameLocalDay('2026-09-24T21:30:00Z', '2026-09-24T22:30:00Z')).toBe(false);
    });

    it('przyjmuje wartości z pól daty i godziny (czas lokalny) i obiekty Date', () => {
        expect(isSameLocalDay('2026-09-24T00:00', '2026-09-24T23:59')).toBe(true);
        expect(isSameLocalDay(new Date(2026, 8, 24, 8), new Date(2026, 8, 25, 8))).toBe(false);
    });

    it('nieprawidłowa data to nie jeden dzień', () => {
        expect(isSameLocalDay('nie-data', '2026-09-24T10:00')).toBe(false);
    });
});
