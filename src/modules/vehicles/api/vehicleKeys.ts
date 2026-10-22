// src/modules/vehicles/api/vehicleKeys.ts
import type { VehicleFilters } from '../types';

/**
 * Klucze zapytań pojazdów. Szczegóły mają własny człon `'detail'`: pod gołym
 * `['vehicle', id]` były prefiksem galerii, notatek, dokumentów i historii, więc wysłanie
 * zdjęcia pobierało galerię dwa razy, a zmiana tablicy rejestracyjnej - wszystkie zakładki.
 */
export const vehicleKeys = {
    /** Listy i wyszukiwarki pojazdów. */
    lists: ['vehicles'],
    list: (filters: VehicleFilters) => ['vehicles', filters],
    search: (query: string) => ['vehicles', 'search', query],
    /** Szczegóły wszystkich pojazdów - VIN poprawiony na wizycie zmienia kartę pojazdu. */
    details: ['vehicle'],
    scope: (vehicleId: string) => ['vehicle', vehicleId],
    detail: (vehicleId: string) => ['vehicle', vehicleId, 'detail'],
    gallery: (vehicleId: string) => ['vehicle', vehicleId, 'photos', 'gallery'],
    galleryPage: (vehicleId: string, page: number, pageSize: number) =>
        [...vehicleKeys.gallery(vehicleId), page, pageSize],
    comments: (vehicleId: string, page: number, pageSize: number) => ['vehicle', vehicleId, 'comments', page, pageSize],
    documents: (vehicleId: string) => ['vehicle', vehicleId, 'documents'] as const,
    notes: (vehicleId: string) => ['vehicle', vehicleId, 'notes'] as const,
    appointments: (vehicleId: string, page: number) => ['vehicle', vehicleId, 'appointments', page],
    visits: (vehicleId: string, page: number) => ['vehicle', vehicleId, 'visits', page],
    historyEvents: (vehicleId: string) => ['vehicle', vehicleId, 'history-events'],
    deletedVisits: (vehicleId: string) => ['vehicle', vehicleId, 'deleted-visits'],
};
