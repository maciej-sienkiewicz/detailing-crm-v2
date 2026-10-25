// src/modules/bays/api/baysApi.ts
//
// API stanowisk (backend: pakiet pl.detailing.crm.bay, tabele z V221).
//
// Moduł NIGDY nie zapisuje do wizyty. „Gotowe do wydania" i wydanie idą kreatorem
// wizyty (powiadomienie klienta, protokół, rozliczenie) - tablica kończy tylko odcinek
// na stanowisku i prowadzi do wizyty.

import { apiClient } from '@/core';
import { problemStatus } from '@/core/problem';
import type { Bay, BaysSettings, BaysSnapshot, StintEndReason } from '../types';

const BASE = '/v1/bays';

/** Stanowisko pełne - serwer odpowiada 409, a widok pyta, co z autem, które tam stoi. */
export const isConflict = (error: unknown): boolean => problemStatus(error) === 409;

export interface Evict {
    carId: string;
    how: 'yard' | 'done';
}

/** Plan wskazuje wizytę albo - zanim auto przyjechało - rezerwację. */
export interface BookingTarget {
    visitId: string | null;
    appointmentId: string | null;
}

export const baysApi = {
    // Odczyty w tle (menu, odświeżanie co pół minuty): wygasła sesja nie wyrzuca
    // z widoku, wyloguje dopiero działanie, które człowiek sam wykonał.
    settings: async (): Promise<BaysSettings> => (await apiClient.get(`${BASE}/settings`, { skipAuthRedirect: true })).data,

    /** Jeden odczyt hali w zakresie osi; auta stojące w warsztacie przychodzą zawsze. */
    snapshot: async (from: Date, to: Date): Promise<BaysSnapshot> =>
        (await apiClient.get(`${BASE}/board`, { params: { from: from.toISOString(), to: to.toISOString() }, skipAuthRedirect: true })).data,

    /** Przełącznik studia i/albo lista stanowisk. Brak `bays` - lista bez zmian. */
    saveSetup: async (settings: Partial<BaysSettings>, bays?: Bay[]): Promise<void> => {
        await apiClient.put(`${BASE}/setup`, {
            ...settings,
            bays: bays?.map(b => ({
                // Nowe stanowisko ma tymczasowe id z przeglądarki - serwer nada własne.
                id: b.id.startsWith('new-') ? null : b.id,
                name: b.name,
                kind: b.kind,
                capacity: b.capacity,
                slotsPerDay: b.slotsPerDay,
                defaultPersonId: b.defaultPersonId,
                active: b.active,
            })),
        });
    },

    /**
     * Wjazd. Pełne stanowisko przechodzi tylko z `evict` - inaczej 409, które widok
     * obsługuje sam (okno „co z autem, które tam stoi"), więc bez ogólnego dymka.
     */
    startStint: async (visitId: string, bayId: string, personIds: string[], evict: Evict | null = null): Promise<void> => {
        await apiClient.post(`${BASE}/stints`, {
            visitId,
            bayId,
            personIds,
            evict: evict ? { visitId: evict.carId, how: evict.how === 'done' ? 'DONE' : 'YARD' } : null,
        }, { skipErrorToast: true });
    },

    endStint: async (visitId: string, reason: Exclude<StintEndReason, 'MOVED'>, note?: string): Promise<void> => {
        await apiClient.post(`${BASE}/stints/end`, { visitId, reason, note: note || null });
    },

    /** „Część dotarła", „Klient zdecydował". */
    clearWaiting: async (visitId: string): Promise<void> => {
        await apiClient.post(`${BASE}/visits/${visitId}/waiting/clear`);
    },

    createBooking: async (bayId: string, target: BookingTarget, start: Date, end: Date): Promise<void> => {
        await apiClient.post(`${BASE}/bookings`, { bayId, ...target, start: start.toISOString(), end: end.toISOString() });
    },

    /** Przesunięcie i rozciągnięcie to ta sama zmiana: nowe stanowisko i nowy przedział. */
    moveBooking: async (bookingId: string, bayId: string, start: Date, end: Date): Promise<void> => {
        await apiClient.put(`${BASE}/bookings/${bookingId}`, { bayId, start: start.toISOString(), end: end.toISOString() });
    },

    deleteBooking: async (bookingId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/bookings/${bookingId}`);
    },
};
