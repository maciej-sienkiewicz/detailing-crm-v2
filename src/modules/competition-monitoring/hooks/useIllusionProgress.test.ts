import { describe, expect, it } from 'vitest';
import { illusionPercent, PROGRESS_CEILING } from './useIllusionProgress';

/**
 * Kształt krzywej paska postępu.
 *
 * Pasek nie mierzy niczego — ma sprawiać wrażenie, że czekanie idzie do przodu.
 * Działa to tylko przy jednym kształcie: szybko na starcie, coraz wolniej pod koniec.
 * Odwrotny przebieg (albo liniowy, który pod koniec „stoi") czyta się jak zacięcie.
 */
describe('krzywa paska postępu', () => {
    it('rusza szybko: po sekundzie widać wyraźny ruch', () => {
        expect(illusionPercent(1000)).toBeGreaterThan(15);
    });

    it('zwalnia z czasem: każda kolejna sekunda dokłada mniej niż poprzednia', () => {
        const deltas = [0, 1, 2, 3, 4, 5].map(
            second => illusionPercent((second + 1) * 1000) - illusionPercent(second * 1000),
        );
        deltas.slice(1).forEach((delta, index) => {
            expect(delta).toBeLessThan(deltas[index]);
        });
    });

    it('nigdy nie dobija do końca — 100% należy do odpowiedzi serwera', () => {
        expect(illusionPercent(60_000)).toBeLessThan(PROGRESS_CEILING + 0.001);
        expect(illusionPercent(10 * 60_000)).toBeLessThan(PROGRESS_CEILING + 0.001);
    });

    it('po typowym czasie generowania (~12 s) pasek jest daleko, ale nie na końcu', () => {
        const atTwelveSeconds = illusionPercent(12_000);
        expect(atTwelveSeconds).toBeGreaterThan(80);
        expect(atTwelveSeconds).toBeLessThan(PROGRESS_CEILING);
    });

    it('startuje od zera', () => {
        expect(illusionPercent(0)).toBe(0);
    });
});
