import { describe, expect, it } from 'vitest';
import { countActiveVehicleFilters } from './vehicleFilters';

describe('countActiveVehicleFilters - licznik przy „Filtry"', () => {
    it('bez filtrów - zero', () => {
        expect(countActiveVehicleFilters({})).toBe(0);
    });

    it('rodzaj pojazdu liczy się jak każdy inny filtr', () => {
        expect(countActiveVehicleFilters({ kind: 'MOTORCYCLE' })).toBe(1);
        expect(countActiveVehicleFilters({ kind: 'CAR', brand: 'Honda' })).toBe(2);
    });

    it('wyczyszczone pola (undefined, null, pusta lista) się nie liczą', () => {
        expect(countActiveVehicleFilters({
            kind: undefined, brand: undefined, yearFrom: null, services: [],
        })).toBe(0);
    });
});
