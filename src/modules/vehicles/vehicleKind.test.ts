import { describe, expect, it } from 'vitest';
import {
    VEHICLE_KINDS,
    VEHICLE_KIND_LABEL,
    formatMileage,
    hasBrandCatalog,
    hasDamageMap,
    mileageUnit,
    normalizeVehicleKind,
} from './vehicleKind';

describe('vehicleKind', () => {
    /*
     * Rodzaj spoza listy zamieniany po cichu na samochód to dokładnie ten błąd, przed
     * którym chroni kolejność wdrożenia: okno edycji zawsze wysyła rodzaj, więc pojazd
     * „Inny" odczytany jako auto wróciłby do bazy jako auto.
     */
    it('„Inny" z serwera zostaje „Inny", w dowolnej wielkości liter', () => {
        expect(normalizeVehicleKind('OTHER')).toBe('OTHER');
        expect(normalizeVehicleKind('other')).toBe('OTHER');
        expect(normalizeVehicleKind('MOTORCYCLE')).toBe('MOTORCYCLE');
    });

    it('brak albo nieznany rodzaj to samochód - jak przed rodzajami', () => {
        expect(normalizeVehicleKind(undefined)).toBe('CAR');
        expect(normalizeVehicleKind(null)).toBe('CAR');
        expect(normalizeVehicleKind('TRUCK')).toBe('CAR');
    });

    it('każdy rodzaj ma nazwę', () => {
        VEHICLE_KINDS.forEach(kind => expect(VEHICLE_KIND_LABEL[kind]).toBeTruthy());
        expect(VEHICLE_KIND_LABEL.OTHER).toBe('Inny');
    });

    it('„Inny" nie ma katalogu marek; filtr „wszystkie" i oba katalogi - mają', () => {
        expect(hasBrandCatalog('OTHER')).toBe(false);
        expect(hasBrandCatalog('CAR')).toBe(true);
        expect(hasBrandCatalog('MOTORCYCLE')).toBe(true);
        expect(hasBrandCatalog('ALL')).toBe(true);
    });

    it('„Inny" nie ma mapy uszkodzeń; pojazd bez rodzaju (auto) ma', () => {
        expect(hasDamageMap('OTHER')).toBe(false);
        expect(hasDamageMap('MOTORCYCLE')).toBe(true);
        expect(hasDamageMap(undefined)).toBe(true);
    });

    it('przebieg „Inny" bez jednostki - samolot liczy motogodziny', () => {
        expect(mileageUnit('OTHER')).toBeNull();
        expect(mileageUnit('CAR')).toBe('km');
        expect(formatMileage(124000, 'OTHER')).toMatch(/^124\s000$/);
        expect(formatMileage(124000, 'MOTORCYCLE')).toMatch(/^124\s000 km$/);
        expect(formatMileage(124000, undefined)).toMatch(/^124\s000 km$/);
    });
});
