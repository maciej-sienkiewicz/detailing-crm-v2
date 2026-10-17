import { describe, expect, it } from 'vitest';
import {
    GALLERY_COLUMNS,
    GALLERY_PAGE_SIZES,
    columnsFor,
    normalizeDensity,
    normalizePageSize,
    pageAfterResize,
} from './galleryLayout';

describe('galleryLayout', () => {
    it('każda liczba kolumn dzieli każdy rozmiar strony - ostatni wiersz pełnej strony jest pełny', () => {
        for (const steps of Object.values(GALLERY_COLUMNS)) {
            for (const { columns } of steps) {
                for (const size of GALLERY_PAGE_SIZES) {
                    expect(size % columns).toBe(0);
                }
            }
        }
    });

    it('progi rosną, a kolumn przybywa razem z szerokością', () => {
        for (const steps of Object.values(GALLERY_COLUMNS)) {
            expect(steps[0].minWidth).toBe(0);
            for (let i = 1; i < steps.length; i++) {
                expect(steps[i].minWidth).toBeGreaterThan(steps[i - 1].minWidth);
                expect(steps[i].columns).toBeGreaterThan(steps[i - 1].columns);
            }
        }
    });

    it('liczy kolumny jak CSS', () => {
        expect(columnsFor('medium', 360)).toBe(2);
        expect(columnsFor('medium', 860)).toBe(4);
        expect(columnsFor('small', 1500)).toBe(8);
        expect(columnsFor('large', 400)).toBe(1);
    });

    it('nieznane wartości z localStorage wracają do domyślnych', () => {
        expect(normalizeDensity('huge')).toBe('medium');
        expect(normalizeDensity(null)).toBe('medium');
        expect(normalizeDensity('small')).toBe('small');
        expect(normalizePageSize(12)).toBe(24);
        expect(normalizePageSize('48')).toBe(24);
        expect(normalizePageSize(96)).toBe(96);
    });

    it('zmiana rozmiaru strony zostawia na ekranie pierwsze oglądane zdjęcie', () => {
        // strona 5 po 24 zaczyna się od zdjęcia 97 → po 48 to strona 3 (97-144)
        expect(pageAfterResize(5, 24, 48)).toBe(3);
        // strona 2 po 96 zaczyna się od zdjęcia 97 → po 24 to strona 5
        expect(pageAfterResize(2, 96, 24)).toBe(5);
        expect(pageAfterResize(1, 24, 96)).toBe(1);
    });
});
