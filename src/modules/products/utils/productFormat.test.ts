import { describe, expect, it } from 'vitest';
import { formatLastUsed, formatPrice, formatRating } from './productFormat';

/**
 * Cena produktu pokazuje stronę, którą wpisał człowiek (CLAUDE.md §1): brutto wpisane
 * jako 1900,00 zł ma się pokazać jako 1900,00, a nie jako 1900,01 odtworzone z netta.
 */
describe('formatPrice', () => {
    it('cena wpisana jako brutto: dokładne brutto, z dopiskiem', () => {
        expect(formatPrice({ unitPriceNet: 154472, unitPriceGross: 190000, priceEnteredAs: 'GROSS', vatRate: 23 }))
            .toBe('1900.00 zł brutto');
    });

    it('cena wpisana jako netto: netto, nie brutto policzone z niego', () => {
        expect(formatPrice({ unitPriceNet: 154472, unitPriceGross: 190001, priceEnteredAs: 'NET', vatRate: 23 }))
            .toBe('1544.72 zł netto');
        expect(formatPrice({ unitPriceNet: 42000, unitPriceGross: 51660, priceEnteredAs: 'NET', vatRate: 23 }))
            .toBe('420.00 zł netto');
    });

    it('ZW: pokazuje wpisaną stronę tak samo', () => {
        expect(formatPrice({ unitPriceNet: 5000, unitPriceGross: 5000, priceEnteredAs: 'GROSS', vatRate: -1 }))
            .toBe('50.00 zł brutto');
    });
});

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

/**
 * Kolumna „Użycie" odpowiada na jedno pytanie: czy ten preparat idzie w ruch.
 * Data dzienna każe liczyć w pamięci, więc w tabeli stoi czas względny -
 * i to on musi być poprawny na granicach, bo „7 dni temu" kontra „tydzień temu"
 * to ta sama chwila opisana dwa razy.
 */
describe('formatLastUsed', () => {
    const now = new Date('2026-05-20T12:00:00Z');
    const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

    it('dziś i wczoraj mają własne słowa', () => {
        expect(formatLastUsed(ago(0), now)).toBe('dziś');
        expect(formatLastUsed(ago(1), now)).toBe('wczoraj');
    });

    it('do tygodnia liczy w dniach', () => {
        expect(formatLastUsed(ago(2), now)).toBe('2 dni temu');
        expect(formatLastUsed(ago(6), now)).toBe('6 dni temu');
    });

    it('od tygodnia do miesiąca liczy w tygodniach', () => {
        expect(formatLastUsed(ago(7), now)).toBe('tydzień temu');
        expect(formatLastUsed(ago(20), now)).toBe('2 tyg. temu');
    });

    it('powyżej miesiąca liczy w miesiącach, powyżej roku w latach', () => {
        expect(formatLastUsed(ago(31), now)).toBe('miesiąc temu');
        expect(formatLastUsed(ago(90), now)).toBe('3 mies. temu');
        expect(formatLastUsed(ago(400), now)).toBe('rok temu');
        expect(formatLastUsed(ago(800), now)).toBe('2 lata temu');
    });

    it('data z przyszłości (przestawiony zegar) nie daje ujemnych dni', () => {
        expect(formatLastUsed(new Date(now.getTime() + 86_400_000).toISOString(), now)).toBe('dziś');
    });

    it('nieczytelna data nie wywraca wiersza', () => {
        expect(formatLastUsed('nie-data', now)).toBe('');
    });
});
