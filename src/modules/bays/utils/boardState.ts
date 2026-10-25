// src/modules/bays/utils/boardState.ts
//
// Stan hali NIE jest zapisywany - ten plik wylicza go z faktów (odcinków pracy).
// Zapisany stan „Podnośnik 1: zajęty" rozjechałby się z historią przy pierwszym
// zapomnianym kliknięciu; wyliczony zawsze mówi to samo, co odcinki.

import type { Bay, BayBooking, BayCar, BayPerson, BayStint, BaysSnapshot } from '../types';
import { workMinutes, toDateKey, type OpeningHours, DEFAULT_HOURS } from './slots';

export type CarPlace =
    | { kind: 'bay'; bayId: string; stint: BayStint }
    | { kind: 'yard' }
    | { kind: 'ready' }
    | { kind: 'booked' };

export interface CarView {
    car: BayCar;
    place: CarPlace;
    /** Ludzie z otwartego odcinka. */
    people: BayPerson[];
    /** Bieżący odcinek: minuty pracy od wjazdu (tylko godziny otwarcia). */
    currentMinutes: number;
    /** Wszystkie odcinki tej wizyty razem. */
    totalMinutes: number;
    stints: BayStint[];
    /** Najbliższy plan, który jeszcze się nie skończył. */
    nextBooking: BayBooking | null;
    /** Schnie (czas technologiczny jeszcze trwa). */
    curing: boolean;
}

export interface BayColumn {
    bay: Bay;
    items: CarView[];
    /** Ile aut jeszcze się zmieści. */
    freeSpots: number;
    /** Od kiedy stoi puste - koniec ostatniego odcinka dziś. */
    freeSince: string | null;
    defaultPerson: BayPerson | null;
}

export interface Board {
    yard: CarView[];
    bays: BayColumn[];
    ready: CarView[];
}

export const openStintOf = (carId: string, stints: BayStint[]): BayStint | null =>
    stints.find(s => s.carId === carId && s.endedAt === null) ?? null;

export const placeOf = (car: BayCar, stints: BayStint[]): CarPlace => {
    if (car.stage === 'READY') return { kind: 'ready' };
    if (car.stage === 'BOOKED' || car.stage === 'HANDED_OVER') return { kind: 'booked' };
    const open = openStintOf(car.id, stints);
    return open ? { kind: 'bay', bayId: open.bayId, stint: open } : { kind: 'yard' };
};

export const viewOf = (
    car: BayCar,
    snap: BaysSnapshot,
    now: Date,
    hours: OpeningHours = DEFAULT_HOURS,
): CarView => {
    const stints = snap.stints
        .filter(s => s.carId === car.id)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const place = placeOf(car, snap.stints);
    const open = place.kind === 'bay' ? place.stint : null;
    const minutesOf = (s: BayStint) => workMinutes(new Date(s.startedAt), s.endedAt ? new Date(s.endedAt) : now, hours);
    const nowIso = now.toISOString();
    const nextBooking = snap.bookings
        .filter(b => b.carId === car.id && b.end > nowIso)
        .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;

    return {
        car,
        place,
        people: open ? open.personIds.map(id => snap.people.find(p => p.id === id)).filter((p): p is BayPerson => !!p) : [],
        currentMinutes: open ? minutesOf(open) : 0,
        totalMinutes: stints.reduce((sum, s) => sum + minutesOf(s), 0),
        stints,
        nextBooking,
        curing: !!open?.curingUntil && new Date(open.curingUntil) > now,
    };
};

export const buildBoard = (snap: BaysSnapshot, now: Date, hours: OpeningHours = DEFAULT_HOURS): Board => {
    const views = snap.cars.filter(c => c.stage !== 'HANDED_OVER').map(car => viewOf(car, snap, now, hours));
    const todayKey = toDateKey(now);

    return {
        yard: views
            .filter(v => v.place.kind === 'yard')
            // Czekające na część na końcu: z nimi i tak nic teraz nie zrobisz.
            .sort((a, b) => Number(!!a.car.waiting) - Number(!!b.car.waiting)
                || (a.car.arrivedAt ?? '').localeCompare(b.car.arrivedAt ?? '')),
        ready: views
            .filter(v => v.place.kind === 'ready')
            .sort((a, b) => (a.car.readyAt ?? '').localeCompare(b.car.readyAt ?? '')),
        bays: snap.bays.filter(b => b.active).map(bay => {
            const items = views.filter(v => v.place.kind === 'bay' && v.place.bayId === bay.id);
            const lastToday = snap.stints
                .filter(s => s.bayId === bay.id && s.endedAt && s.endedAt.startsWith(todayKey))
                .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))[0];
            return {
                bay,
                items,
                freeSpots: Math.max(0, bay.capacity - items.length),
                freeSince: items.length === 0 ? lastToday?.endedAt ?? null : null,
                defaultPerson: snap.people.find(p => p.id === bay.defaultPersonId) ?? null,
            };
        }),
    };
};
