// src/modules/vehicles/vehicleKind.ts
//
// Rodzaj pojazdu: samochód albo motocykl. Od niego zależy, z którego katalogu
// podpowiadamy marki i modele (Honda, BMW czy Suzuki są w obu, z innymi modelami),
// jaką ikonę dostaje pojazd bez logo marki i od którego schematu startuje mapa
// uszkodzeń. Wartości są kontraktem z serwerem (`VehicleKind`).

export type VehicleKind = 'CAR' | 'MOTORCYCLE';

/** Filtr marek w listach i wyszukiwarkach: marki obu rodzajów naraz. */
export type VehicleKindFilter = VehicleKind | 'ALL';

export const VEHICLE_KIND_LABEL: Record<VehicleKind, string> = {
    CAR: 'Samochód',
    MOTORCYCLE: 'Motocykl',
};

export const DEFAULT_VEHICLE_KIND: VehicleKind = 'CAR';

/**
 * Rodzaj z odpowiedzi serwera. Brak pola (starszy backend, pojazd sprzed rodzajów,
 * dane z mocka) znaczy „samochód" - tak było, zanim pojawiły się motocykle.
 */
export const normalizeVehicleKind = (raw: string | null | undefined): VehicleKind =>
    raw?.toUpperCase() === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR';
