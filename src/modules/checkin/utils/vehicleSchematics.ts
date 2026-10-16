// src/modules/checkin/utils/vehicleSchematics.ts
//
// Schematy pojazdów na mapie uszkodzeń. Klucz to nazwa pliku grafiki
// `public/assets/<klucz>.webp` i zarazem wartość `vehicleType` zapisywana przy mapie.
//
// Jedna lista dla edytora, telefonu i wydruku. Dawniej każde z tych miejsc miało
// własną kopię, więc nowy typ dodany w jednym z nich w drugim dawał pusty obrazek.
// Backend trzyma tę samą listę w `VehicleSchematics.TYPES` (te same rysunki jako PNG
// do raportu PDF) - dodając typ, dodaj go w obu miejscach.

export type VehicleSchematicType =
    | 'sedan' | 'suv' | 'hatchback' | 'kombi' | 'coupe' | 'cabrio' | 'van'
    | 'motorcycle_sport' | 'motorcycle_naked' | 'motorcycle_cruiser' | 'motorcycle_touring'
    | 'motorcycle_adventure' | 'motorcycle_offroad' | 'scooter'
    | 'jetski_recreational' | 'jetski_compact' | 'jetski_standup';

export interface VehicleSchematicOption {
    value: VehicleSchematicType;
    label: string;
}

export interface VehicleSchematicGroup {
    label: string;
    options: VehicleSchematicOption[];
}

/** Grupy do `<optgroup>`: lista ma kilkanaście pozycji i bez grup trudno w niej trafić. */
export const VEHICLE_SCHEMATIC_GROUPS: VehicleSchematicGroup[] = [
    {
        label: 'Samochody',
        options: [
            { value: 'sedan', label: 'Sedan' },
            { value: 'suv', label: 'SUV' },
            { value: 'hatchback', label: 'Hatchback' },
            { value: 'kombi', label: 'Kombi' },
            { value: 'coupe', label: 'Coupe' },
            { value: 'cabrio', label: 'Kabriolet' },
            { value: 'van', label: 'Van' },
        ],
    },
    {
        label: 'Motocykle i skutery',
        options: [
            { value: 'motorcycle_sport', label: 'Motocykl sportowy' },
            { value: 'motorcycle_naked', label: 'Motocykl naked' },
            { value: 'motorcycle_cruiser', label: 'Cruiser / chopper' },
            { value: 'motorcycle_touring', label: 'Motocykl turystyczny' },
            { value: 'motorcycle_adventure', label: 'Motocykl adventure' },
            { value: 'motorcycle_offroad', label: 'Cross / enduro' },
            { value: 'scooter', label: 'Skuter' },
        ],
    },
    {
        label: 'Skutery wodne',
        options: [
            { value: 'jetski_recreational', label: 'Skuter wodny rekreacyjny' },
            { value: 'jetski_compact', label: 'Skuter wodny kompaktowy' },
            { value: 'jetski_standup', label: 'Skuter wodny stojący' },
        ],
    },
];

export const VEHICLE_SCHEMATICS: VehicleSchematicOption[] =
    VEHICLE_SCHEMATIC_GROUPS.flatMap(group => group.options);

/** Schemat, gdy żaden nie został wybrany - tak było przed wyborem typu i tak zostaje. */
export const DEFAULT_VEHICLE_SCHEMATIC: VehicleSchematicType = 'sedan';

export const isVehicleSchematicType = (value: string | null | undefined): value is VehicleSchematicType =>
    VEHICLE_SCHEMATICS.some(option => option.value === value);

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
