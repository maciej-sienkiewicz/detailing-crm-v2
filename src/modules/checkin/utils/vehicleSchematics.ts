// src/modules/checkin/utils/vehicleSchematics.ts
//
// Schematy pojazdów na mapie uszkodzeń. Klucz to nazwa pliku grafiki
// `public/assets/<klucz>.webp` i zarazem wartość `vehicleType` zapisywana przy mapie.
//
// Jedna lista dla edytora, telefonu i wydruku. Dawniej każde z tych miejsc miało
// własną kopię, więc nowy typ dodany w jednym z nich w drugim dawał pusty obrazek.
// Backend trzyma tę samą listę w `VehicleSchematics.TYPES` (te same rysunki jako PNG
// do raportu PDF) - dodając typ, dodaj go w obu miejscach.

import type { VehicleKind } from '@/modules/vehicles/vehicleKind';

export type VehicleSchematicType =
    | 'sedan' | 'suv' | 'hatchback' | 'kombi' | 'coupe' | 'cabrio' | 'van'
    | 'motorcycle' | 'jetski';

export interface VehicleSchematicOption {
    value: VehicleSchematicType;
    label: string;
}

/*
 * Motocykl i skuter wodny mają po jednym schemacie, bez podziału na rodzaje
 * (sportowy, cruiser, stojący...) - decyzja biznesu: do wskazania miejsca rysy
 * jeden rysunek wystarcza, a dłuższa lista tylko utrudnia wybór.
 */
export const VEHICLE_SCHEMATICS: VehicleSchematicOption[] = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'coupe', label: 'Coupe' },
    { value: 'cabrio', label: 'Kabriolet' },
    { value: 'van', label: 'Van' },
    { value: 'motorcycle', label: 'Motocykl' },
    { value: 'jetski', label: 'Skuter wodny' },
];

/** Schemat, gdy żaden nie został wybrany - tak było przed wyborem typu i tak zostaje. */
export const DEFAULT_VEHICLE_SCHEMATIC: VehicleSchematicType = 'sedan';

export const isVehicleSchematicType = (value: string | null | undefined): value is VehicleSchematicType =>
    VEHICLE_SCHEMATICS.some(option => option.value === value);

/**
 * Schemat, od którego startuje mapa uszkodzeń, dopóki pracownik nie wybierze innego.
 * Musi zgadzać się z `VehicleSchematics.defaultFor` w backendzie: raport PDF rysuje
 * punkty bez wybranego typu właśnie na tym rysunku.
 */
export const defaultSchematicForKind = (kind: VehicleKind | null | undefined): VehicleSchematicType =>
    kind === 'MOTORCYCLE' ? 'motorcycle' : DEFAULT_VEHICLE_SCHEMATIC;

/** Typ do narysowania: nieznany albo pusty (stara mapa, ręcznie zmieniony adres) = sedan. */
export const resolveVehicleSchematic = (value: string | null | undefined): VehicleSchematicType =>
    isVehicleSchematicType(value) ? value : DEFAULT_VEHICLE_SCHEMATIC;

/**
 * Adres grafiki schematu. Nieznany typ dostaje sedana zamiast pustego obrazka:
 * wartość pochodzi z zapisu i nie wolno jej wklejać do ścieżki bez sprawdzenia.
 */
export const vehicleSchematicImageUrl = (value: string | null | undefined): string =>
    `/assets/${resolveVehicleSchematic(value)}.webp`;

export const vehicleSchematicLabel = (value: string | null | undefined): string => {
    const type = resolveVehicleSchematic(value);
    return VEHICLE_SCHEMATICS.find(option => option.value === type)?.label ?? type;
};
