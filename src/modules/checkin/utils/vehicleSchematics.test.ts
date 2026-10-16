import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    VEHICLE_SCHEMATICS,
    resolveVehicleSchematic,
    vehicleSchematicImageUrl,
    vehicleSchematicLabel,
} from './vehicleSchematics';

describe('vehicleSchematics', () => {
    /*
     * Typ bez pliku daje w edytorze pusty prostokąt, w którym da się klikać - punkty
     * zapisują się na niczym. Lepiej, żeby wywrócił się test niż przyjęcie pojazdu.
     */
    it.each(VEHICLE_SCHEMATICS.map(option => option.value))('%s ma grafikę w public/assets', type => {
        expect(existsSync(new URL(`../../../../public${vehicleSchematicImageUrl(type)}`, import.meta.url))).toBe(true);
    });

    it('klucze są unikalne i mieszczą się w kolumnie vehicle_type (30 znaków)', () => {
        const values = VEHICLE_SCHEMATICS.map(option => option.value);
        expect(new Set(values).size).toBe(values.length);
        values.forEach(value => expect(value.length).toBeLessThanOrEqual(30));
    });

    it('nieznany albo pusty typ rysuje sedana, a nie ścieżkę z zapisu', () => {
        expect(resolveVehicleSchematic(null)).toBe('sedan');
        expect(resolveVehicleSchematic('')).toBe('sedan');
        expect(vehicleSchematicImageUrl('../../etc')).toBe('/assets/sedan.webp');
    });

    it('typy jednośladów i skuterów wodnych mają własne grafiki i nazwy', () => {
        expect(vehicleSchematicImageUrl('motorcycle_sport')).toBe('/assets/motorcycle_sport.webp');
        expect(vehicleSchematicImageUrl('jetski_standup')).toBe('/assets/jetski_standup.webp');
        expect(vehicleSchematicLabel('scooter')).toBe('Skuter');
    });
});
