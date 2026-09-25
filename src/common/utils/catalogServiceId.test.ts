import { describe, expect, it } from 'vitest';
import { isCatalogServiceId } from './catalogServiceId';

describe('isCatalogServiceId', () => {
    it('usługa z cennika (UUID z backendu, id z trybu mockowego) jest w cenniku', () => {
        expect(isCatalogServiceId('3f2b8c1e-9a4d-4e7b-b0de-1c2d3e4f5a6b')).toBe(true);
        expect(isCatalogServiceId('1')).toBe(true);
    });

    it('identyfikatory zastępcze usług założonych w locie NIE są w cenniku', () => {
        // Dokładnie ten identyfikator poszedł na produkcji do POST /services/update.
        expect(isCatalogServiceId('temp-1790326470364')).toBe(false);
        expect(isCatalogServiceId('temp-lead-abc-0')).toBe(false); // wycena leada
        expect(isCatalogServiceId('temp_1790326470364')).toBe(false); // przyjęcie pojazdu
    });

    it('brak identyfikatora nie jest usługą z cennika', () => {
        expect(isCatalogServiceId(null)).toBe(false);
        expect(isCatalogServiceId(undefined)).toBe(false);
        expect(isCatalogServiceId('')).toBe(false);
        expect(isCatalogServiceId('null')).toBe(false);
    });
});
