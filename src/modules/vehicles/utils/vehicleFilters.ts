// src/modules/vehicles/utils/vehicleFilters.ts
//
// Licznik przy przycisku „Filtry" na liście pojazdów. Każdy ustawiony filtr to jedna
// pozycja - także rodzaj pojazdu: lista samych motocykli bez licznika wyglądałaby
// jak pełna baza, w której nagle zabrakło aut.

import type { VehicleAdvancedFilters } from '../types';

export const countActiveVehicleFilters = (f: VehicleAdvancedFilters): number => {
    let n = 0;
    if (f.kind)   n++;
    if (f.brand)  n++;
    if (f.model)  n++;
    if (f.yearFrom != null) n++;
    if (f.yearTo   != null) n++;
    if (f.minVisits != null) n++;
    if (f.maxVisits != null) n++;
    if (f.minRevenue != null) n++;
    if (f.maxRevenue != null) n++;
    if (f.services?.length) n++;
    if (f.lastServiceWithinDays != null) n++;
    if (f.notServicedSinceDays  != null) n++;
    return n;
};
