import { describe, it, expect } from 'vitest';
import { vehicleLabel } from './vehicleLabel';

/**
 * Sedno: BRAK ma wrócić jako null, a nie jako myślnik. Wcześniej ta logika
 * wstawiała '-', przez co panel „Najbliższe wizyty" rysował „Radek Radziwiłko · -"
 * — widok nie miał jak odróżnić braku danych od prawdziwej nazwy i pokazać
 * zamiast niego „Nie wprowadzono pojazdu".
 */
describe('vehicleLabel', () => {
    it('sklada marke i model w jedna nazwe', () => {
        expect(vehicleLabel({ brand: 'BMW', model: 'X5' })).toBe('BMW X5');
    });

    it('brak pojazdu to null, nie myslnik', () => {
        expect(vehicleLabel(undefined)).toBeNull();
        expect(vehicleLabel(null)).toBeNull();
    });

    // Backend potrafi oddać samą markę — „BMW" jest lepsze niż „BMW undefined".
    it('sama marka albo sam model wystarcza za nazwe', () => {
        expect(vehicleLabel({ brand: 'BMW' })).toBe('BMW');
        expect(vehicleLabel({ model: 'X5' })).toBe('X5');
    });

    it('puste i bialoznakowe wartosci licza sie jako brak', () => {
        expect(vehicleLabel({ brand: '', model: '' })).toBeNull();
        expect(vehicleLabel({ brand: '  ', model: null })).toBeNull();
        expect(vehicleLabel({ brand: ' BMW ', model: ' X5 ' })).toBe('BMW X5');
    });
});
