import { describe, expect, it } from 'vitest';
import { mergeCatalogs } from './useVehicleMetadata';

describe('mergeCatalogs - marki obu rodzajów w filtrach', () => {
    it('marka wspólna jest jedna, z pisownią z katalogu samochodów i modelami obu', () => {
        const merged = mergeCatalogs(
            [{ marka: 'Bmw', modele: ['X5', 'Seria 3'] }],
            [{ marka: 'BMW', modele: ['R', 'S'] }, { marka: 'Yamaha', modele: ['MT'] }],
        );

        expect(merged.map(b => b.marka)).toEqual(['Bmw', 'Yamaha']);
        expect(merged[0].modele).toEqual(['X5', 'Seria 3', 'R', 'S']);
    });

    it('model o tej samej nazwie w obu katalogach nie dubluje się', () => {
        const merged = mergeCatalogs(
            [{ marka: 'Honda', modele: ['Inny'] }],
            [{ marka: 'Honda', modele: ['inny', 'CBR'] }],
        );

        expect(merged[0].modele).toEqual(['Inny', 'CBR']);
    });

    it('nie zmienia katalogów wejściowych (dane z cache zapytań)', () => {
        const cars = [{ marka: 'Honda', modele: ['Civic'] }];
        mergeCatalogs(cars, [{ marka: 'Honda', modele: ['CBR'] }]);
        expect(cars[0].modele).toEqual(['Civic']);
    });
});
