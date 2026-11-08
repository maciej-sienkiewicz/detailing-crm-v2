// src/modules/vehicles/vehicleKind.ts
//
// Rodzaj pojazdu: samochód, motocykl albo „Inny". Od niego zależy, z którego katalogu
// podpowiadamy marki i modele (Honda, BMW czy Suzuki są w obu, z innymi modelami),
// jaką ikonę dostaje pojazd bez logo marki, od którego schematu startuje mapa
// uszkodzeń i czy w ogóle jest. Wartości są kontraktem z serwerem (`VehicleKind`).
//
// „Inny" (decyzja biznesu z 6.11): lawety, betoniarki, samoloty, śmigłowce, skutery
// wodne. Jedna wartość zamiast listy, bo dla żadnej z tych grup nie ma katalogu ani
// rysunku. Marka i model są wpisywane z ręki, mapy uszkodzeń nie ma, a przebieg nie ma
// jednostki - samolot czy skuter wodny liczy motogodziny, nie kilometry.
//
// Każda decyzja zależna od rodzaju mieszka tu, jako Record: następny rodzaj nie
// skompiluje się, dopóki ktoś jej nie podejmie. Dawniej stały po ekranach warunki
// „motocykl ? ... : auto", przez które nowy rodzaj po cichu udawałby samochód.

export type VehicleKind = 'CAR' | 'MOTORCYCLE' | 'OTHER';

/** Kolejność w przełącznikach i filtrach. */
export const VEHICLE_KINDS = ['CAR', 'MOTORCYCLE', 'OTHER'] as const satisfies readonly VehicleKind[];

/** Filtr marek w listach i wyszukiwarkach: marki obu katalogów naraz. */
export type VehicleKindFilter = VehicleKind | 'ALL';

export const VEHICLE_KIND_LABEL: Record<VehicleKind, string> = {
    CAR: 'Samochód',
    MOTORCYCLE: 'Motocykl',
    OTHER: 'Inny',
};

export const DEFAULT_VEHICLE_KIND: VehicleKind = 'CAR';

/**
 * Rodzaj z odpowiedzi serwera. Brak pola (starszy backend, pojazd sprzed rodzajów,
 * dane z mocka) znaczy „samochód" - tak było, zanim pojawiły się motocykle.
 */
export const normalizeVehicleKind = (raw: string | null | undefined): VehicleKind => {
    const upper = raw?.toUpperCase();
    return VEHICLE_KINDS.find(kind => kind === upper) ?? DEFAULT_VEHICLE_KIND;
};

const BRAND_CATALOG: Record<VehicleKind, boolean> = { CAR: true, MOTORCYCLE: true, OTHER: false };

/** Marka i model z katalogu. Bez katalogu („Inny") wpisuje się je z ręki. */
export const hasBrandCatalog = (kind: VehicleKindFilter): boolean =>
    kind === 'ALL' || BRAND_CATALOG[kind];

const DAMAGE_MAP: Record<VehicleKind, boolean> = { CAR: true, MOTORCYCLE: true, OTHER: false };

/**
 * Mapa uszkodzeń. Dla „Inny" jej nie ma - żaden rysunek nie pasuje do śmigłowca czy
 * betoniarki, a punkty na sylwetce sedana byłyby w protokole nieprawdą. Stan takiego
 * pojazdu dokumentują zdjęcia.
 */
export const hasDamageMap = (kind: string | null | undefined): boolean =>
    DAMAGE_MAP[normalizeVehicleKind(kind)];

const MILEAGE_UNIT: Record<VehicleKind, string | null> = { CAR: 'km', MOTORCYCLE: 'km', OTHER: null };

/** Jednostka przebiegu przy polu i przy liczbie; null - sama liczba. */
export const mileageUnit = (kind: string | null | undefined): string | null =>
    MILEAGE_UNIT[normalizeVehicleKind(kind)];

/** „124 000 km" albo, dla „Inny", samo „124 000". */
export const formatMileage = (value: number, kind: string | null | undefined): string => {
    const unit = mileageUnit(kind);
    const number = value.toLocaleString('pl-PL');
    return unit ? `${number} ${unit}` : number;
};
