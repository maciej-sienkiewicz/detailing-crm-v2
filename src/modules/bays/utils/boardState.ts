// src/modules/bays/utils/boardState.ts
//
// Stan hali NIE jest zapisywany - ten plik wylicza go z faktów (odcinków pracy).
// Zapisany stan „Podnośnik 1: zajęty" rozjechałby się z historią przy pierwszym
// zapomnianym kliknięciu; wyliczony zawsze mówi to samo, co odcinki.

import type { BayBooking, BayCar, BayPerson, BayStint, BaysSnapshot } from '../types';
import { workMinutes, type OpeningHours, studioHours } from './slots';

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
    hours: OpeningHours = studioHours(),
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
