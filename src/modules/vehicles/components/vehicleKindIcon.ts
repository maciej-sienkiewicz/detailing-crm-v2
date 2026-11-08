// src/modules/vehicles/components/vehicleKindIcon.ts
//
// Ikona rodzaju pojazdu - w przełączniku, na liście pojazdów klienta i tam, gdzie
// pojazd nie ma logo marki. „Inny" dostaje kształty, a nie ciężarówkę czy samolot:
// pod tym rodzajem stoją oba, a ikona konkretnej maszyny przy drugiej mówiłaby nieprawdę.

import { Car, Motorbike, Shapes, type LucideIcon } from 'lucide-react';
import type { VehicleKind } from '../vehicleKind';

export const VEHICLE_KIND_ICON: Record<VehicleKind, LucideIcon> = {
    CAR: Car,
    MOTORCYCLE: Motorbike,
    OTHER: Shapes,
};
