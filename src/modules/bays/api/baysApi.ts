// src/modules/bays/api/baysApi.ts
//
// Kształt API stanowisk. Dziś pod spodem jest mockStore; po dopisaniu backendu
// (osobny pakiet, trzy własne tabele: bay, bay_booking, bay_stint) każda funkcja
// staje się jednym wywołaniem apiClient, a widoki zostają bez zmian.
//
// Moduł NIGDY nie zapisuje do wizyty. Jedyny wyjątek w przyszłości - „Gotowe do
// wydania" - pójdzie istniejącym endpointem statusu wizyty, wywołanym świadomie
// przez użytkownika, a nie z wnętrza tego modułu.

import type { Bay, BayCar, BayStint, BaysSettings, BaysSnapshot, StintEndReason } from '../types';
import { baysNow } from './clock';
import { getStore, resetStore, setStore } from './mockStore';

const delay = <T,>(value: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(value), 120));
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/** Stanowisko pełne: kto na nim stoi. Widok pokazuje to jako pytanie, nigdy nie nadpisuje po cichu. */
export class BayOccupiedError extends Error {
    constructor(public readonly occupants: BayStint[]) {
        super('Stanowisko jest zajęte');
    }
}

const update = (fn: (s: BaysSnapshot) => BaysSnapshot) => setStore(fn(getStore()));

const occupantsOf = (s: BaysSnapshot, bayId: string, exceptCarId?: string) =>
    s.stints.filter(x => x.bayId === bayId && x.endedAt === null && x.carId !== exceptCarId);

const closeOpen = (s: BaysSnapshot, carId: string, reason: StintEndReason, at: string): BaysSnapshot => ({
    ...s,
    stints: s.stints.map(x => (x.carId === carId && x.endedAt === null ? { ...x, endedAt: at, endReason: reason } : x)),
});

export const baysApi = {
    snapshot: (): Promise<BaysSnapshot> => delay(getStore()),

    /** Wjazd: plac → stanowisko albo stanowisko → stanowisko (stary odcinek kończy się „MOVED"). */
    startStint: (carId: string, bayId: string, personIds: string[]): Promise<void> => {
        const s = getStore();
        const bay = s.bays.find(b => b.id === bayId);
        const occupants = occupantsOf(s, bayId, carId);
        if (bay && occupants.length >= bay.capacity) return Promise.reject(new BayOccupiedError(occupants));
        const now = baysNow().toISOString();
        update(x => {
            const closed = closeOpen(x, carId, 'MOVED', now);
            return {
                ...closed,
                cars: closed.cars.map(c => (c.id === carId ? { ...c, waiting: null, stage: 'IN_SHOP' } : c)),
                stints: [...closed.stints, { id: uid('s'), bayId, carId, startedAt: now, endedAt: null, endReason: null, personIds, curingUntil: null }],
            };
        });
        return delay(undefined);
    },

    /**
     * Zjazd. `DONE` + `ready` przestawia auto do wydania (w prawdziwym API: osobne,
     * świadome wywołanie statusu wizyty); `WAITING_*` odstawia je na plac z powodem.
     */
    endStint: (carId: string, reason: StintEndReason, opts: { note?: string; ready?: boolean } = {}): Promise<void> => {
        const now = baysNow().toISOString();
        update(x => {
            const closed = closeOpen(x, carId, reason, now);
            return {
                ...closed,
                cars: closed.cars.map((c): BayCar => {
                    if (c.id !== carId) return c;
                    if (reason === 'WAITING_PART' || reason === 'WAITING_CUSTOMER') return { ...c, waiting: { reason, note: opts.note ?? '' } };
                    return opts.ready ? { ...c, stage: 'READY', readyAt: now, waiting: null } : { ...c, waiting: null };
                }),
            };
        });
        return delay(undefined);
    },

    /** Część dotarła, klient zdecydował: auto zostaje na placu, ale już na nic nie czeka. */
    clearWaiting: (carId: string): Promise<void> => {
        update(x => ({ ...x, cars: x.cars.map(c => (c.id === carId ? { ...c, waiting: null } : c)) }));
        return delay(undefined);
    },

    handOver: (carId: string): Promise<void> => {
        const now = baysNow().toISOString();
        update(x => {
            const closed = closeOpen(x, carId, 'DONE', now);
            return {
                ...closed,
                cars: closed.cars.map(c => (c.id === carId ? { ...c, stage: 'HANDED_OVER' } : c)),
                // Wydanie zwalnia plan, którego auto już nie wykorzysta.
                bookings: closed.bookings.filter(b => b.carId !== carId),
            };
        });
        return delay(undefined);
    },

    /** Korekta przy domknięciu dnia: odcinek kończy się o podanej godzinie. */
    endStintAt: (stintId: string, endedAt: string, reason: StintEndReason): Promise<void> => {
        update(x => ({ ...x, stints: x.stints.map(s => (s.id === stintId ? { ...s, endedAt, endReason: reason } : s)) }));
        return delay(undefined);
    },

    createBooking: (bayId: string, carId: string, start: Date, end: Date): Promise<void> => {
        update(x => ({ ...x, bookings: [...x.bookings, { id: uid('k'), bayId, carId, start: start.toISOString(), end: end.toISOString() }] }));
        return delay(undefined);
    },

    /** Przesunięcie i rozciągnięcie to ta sama zmiana: nowe stanowisko i nowy przedział. */
    moveBooking: (bookingId: string, bayId: string, start: Date, end: Date): Promise<void> => {
        update(x => ({ ...x, bookings: x.bookings.map(b => (b.id === bookingId ? { ...b, bayId, start: start.toISOString(), end: end.toISOString() } : b)) }));
        return delay(undefined);
    },

    deleteBooking: (bookingId: string): Promise<void> => {
        update(x => ({ ...x, bookings: x.bookings.filter(b => b.id !== bookingId) }));
        return delay(undefined);
    },

    /**
     * Auto z rezerwacji założonej z osi stanowisk. W prawdziwym API tego nie ma -
     * plan wskazuje `appointmentId`, a dane auta czyta się z rezerwacji.
     */
    addBookedCar: (c: Omit<BayCar, 'id' | 'stage' | 'arrivedAt' | 'readyAt' | 'waiting' | 'visitId'>): Promise<string> => {
        const id = uid('c');
        update(x => ({
            ...x,
            cars: [...x.cars, { ...c, id, stage: 'BOOKED', visitId: null, arrivedAt: null, readyAt: null, waiting: null }],
        }));
        return delay(id);
    },

    /** Wizyta otwarta w CRM, której prototyp jeszcze nie zna - stoi na placu od przyjęcia. */
    ensureVisitCar: (c: { visitId: string; licensePlate: string; vehicleName: string; jobTitle: string; arrivedAt: string | null; promisedAt: string | null; done: boolean }): string => {
        const existing = getStore().cars.find(x => x.visitId === c.visitId);
        if (existing) return existing.id;
        const id = uid('c');
        update(x => ({
            ...x,
            cars: [...x.cars, {
                id, visitId: c.visitId, appointmentId: null, licensePlate: c.licensePlate, vehicleName: c.vehicleName,
                jobTitle: c.jobTitle, stage: c.done ? 'HANDED_OVER' : 'IN_SHOP', arrivedAt: c.arrivedAt, promisedAt: c.promisedAt,
                readyAt: null, waiting: null,
            }],
        }));
        return id;
    },

    saveSetup: (bays: Bay[], settings: BaysSettings): Promise<void> => {
        update(x => ({ ...x, bays, settings }));
        return delay(undefined);
    },

    reset: (): Promise<void> => {
        resetStore();
        return delay(undefined);
    },
};
