// src/modules/bays/utils/weekLayout.ts
//
// Tydzień po stanowiskach: wiersz = stanowisko z własnym podziałem dnia, oś = czas.
//
// Pasek mówi jedno z trzech: ZROBIONE (fakt, z godzinami z wjazdu i zjazdu),
// TRWA (otwarty odcinek, sięga do końca planu) albo PLAN (to, co jeszcze nie nastąpiło).
// Pozycja paska to czas, nie numer kolumny - dzięki temu wiersze z różnym podziałem
// dnia (myjnia na 6, podnośnik na 2) leżą na tej samej osi i pod tą samą linią „teraz".

import type { Bay, BayCar, BaysSnapshot } from '../types';
import {
    addDays, dayCells, fromDateKey, hoursOf, snapRange, toDateKey, weekX, workMinutes, type Cell, type OpeningHours, DEFAULT_HOURS,
} from './slots';

export type BarKind = 'done' | 'active' | 'plan';

export interface WeekBar {
    id: string;
    carId: string;
    car: BayCar;
    kind: BarKind;
    start: Date;
    end: Date;
    /** Pozycja i szerokość na osi tygodnia, 0..1. */
    x: number;
    w: number;
    /** Pas w grupie nachodzących pasków i liczba pasów tej grupy - pasek bez sąsiadów ma 1 z 1. */
    lane: number;
    laneCount: number;
    minutes: number;
    personIds: string[];
    /** Odcinek trwa dłużej, niż przewidział plan. */
    overPlan: boolean;
    /** W tym czasie stoi tu więcej aut, niż stanowisko mieści. */
    conflict: boolean;
    bookingId: string | null;
    curingUntil: string | null;
}

export interface WeekRow {
    rowId: string;
    bay: Bay;
    /** Okienka całego tygodnia dla podziału dnia tego stanowiska. */
    cells: Cell[];
    bars: WeekBar[];
    lanes: number;
}

const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) => a.start < b.end && b.start < a.end;

/** Ile aut stoi naraz w przedziale (bez zrobionych - przeszłość nie blokuje planu). */
const loadIn = (bars: WeekBar[], start: Date, end: Date): number => {
    const live = bars.filter(b => b.kind !== 'done' && overlaps(b, { start, end }));
    // Najgorszy moment przedziału: liczymy w punktach początku pasków.
    const points = [start, ...live.map(b => b.start)].filter(p => p >= start && p < end);
    return Math.max(0, ...points.map(p => live.filter(b => b.start <= p && b.end > p).length));
};

/**
 * Pasy liczone osobno dla każdej grupy pasków, które na siebie nachodzą. Pasek bez
 * sąsiadów zajmuje całą wysokość wiersza; dzielą ją tylko te, które naprawdę stoją
 * w tym samym czasie. Zwraca największą liczbę pasów w wierszu (do wysokości wiersza).
 */
const assignLanes = (bars: WeekBar[]): number => {
    const sorted = [...bars].sort((x, y) => x.start.getTime() - y.start.getTime() || y.end.getTime() - x.end.getTime());
    let max = 1;
    let group: WeekBar[] = [];
    let groupEnd = 0;
    const close = () => {
        const ends: number[] = [];
        for (const bar of group) {
            let lane = ends.findIndex(end => end <= bar.start.getTime());
            if (lane === -1) { lane = ends.length; ends.push(bar.end.getTime()); } else ends[lane] = bar.end.getTime();
            bar.lane = lane;
        }
        for (const bar of group) bar.laneCount = Math.max(1, ends.length);
        max = Math.max(max, ends.length);
        group = [];
    };
    for (const bar of sorted) {
        if (group.length && bar.start.getTime() >= groupEnd) close();
        group.push(bar);
        groupEnd = Math.max(groupEnd, bar.end.getTime());
    }
    if (group.length) close();
    return max;
};

export const buildWeekRows = (
    snap: BaysSnapshot,
    days: string[],
    now: Date,
    hours: OpeningHours = DEFAULT_HOURS,
): { rows: WeekRow[] } => {
    const carById = new Map(snap.cars.map(c => [c.id, c]));
    const first = days[0];
    const last = days[days.length - 1];
    const weekStart = first ? new Date(`${first}T00:00:00`) : now;
    const weekEnd = last ? new Date(`${last}T23:59:59`) : now;

    const place = (start: Date, end: Date) => {
        const x = weekX(start, days, hours);
        return { x, w: Math.max(0.004, weekX(end, days, hours) - x) };
    };

    const rows = snap.bays.filter(b => b.active).map(bay => {
        const bars: WeekBar[] = [];
        const stints = snap.stints.filter(s => s.bayId === bay.id);
        const bookings = snap.bookings.filter(b => b.bayId === bay.id);

        for (const s of stints) {
            const car = carById.get(s.carId);
            if (!car) continue;
            const booking = bookings.find(b => b.carId === s.carId);
            const start = new Date(s.startedAt);
            const factEnd = s.endedAt ? new Date(s.endedAt) : now;
            // Trwający odcinek sięga do końca planu: jeden pasek „trwa, plan do jutra"
            // czyta się lepiej niż wąski fakt i osobny ogon planu obok.
            const end = !s.endedAt && booking && new Date(booking.end) > factEnd ? new Date(booking.end) : factEnd;
            if (end < weekStart || start > weekEnd) continue;
            bars.push({
                id: s.id, carId: s.carId, car,
                kind: s.endedAt ? 'done' : 'active',
                start, end, ...place(start, end), lane: 0, laneCount: 1,
                minutes: workMinutes(start, factEnd, hours),
                personIds: s.personIds,
                overPlan: !!booking && factEnd > new Date(booking.end),
                conflict: false,
                bookingId: booking?.id ?? null,
                curingUntil: s.curingUntil,
            });
        }

        for (const b of bookings) {
            const car = carById.get(b.carId);
            if (!car || car.stage === 'READY' || car.stage === 'HANDED_OVER') continue;
            // Auto stoi teraz na tym stanowisku - jego plan już niesie pasek „trwa".
            if (stints.some(s => s.carId === b.carId && s.endedAt === null)) continue;
            // Plan, który fakty już „zjadły", zostaje tylko po ostatnim zjeździe.
            const lastFact = stints.filter(s => s.carId === b.carId && s.endedAt).map(s => new Date(s.endedAt!)).sort((x, y) => y.getTime() - x.getTime())[0];
            const start = lastFact && lastFact > new Date(b.start) ? lastFact : new Date(b.start);
            const end = new Date(b.end);
            if (start >= end || end < weekStart || start > weekEnd) continue;
            bars.push({
                id: `plan-${b.id}`, carId: b.carId, car, kind: 'plan',
                start, end, ...place(start, end), lane: 0, laneCount: 1,
                minutes: workMinutes(start, end, hours), personIds: [], overPlan: false, conflict: false,
                bookingId: b.id, curingUntil: null,
            });
        }

        for (const bar of bars) {
            if (bar.kind !== 'done' && loadIn(bars, bar.start, bar.end) > bay.capacity) bar.conflict = true;
        }

        const cells = days.flatMap(d => dayCells(d, bay.slotsPerDay, hours));
        return { rowId: bay.id, bay, cells, bars, lanes: assignLanes(bars) };
    });

    return { rows };
};

/** Pozycja okienka na osi. */
export const cellBox = (c: Cell, days: string[], hours: OpeningHours = DEFAULT_HOURS) => {
    const x = weekX(c.start, days, hours);
    return { x, w: weekX(c.end, days, hours) - x };
};

/** Czy w okienku jest jeszcze miejsce. */
export const cellIsFree = (row: WeekRow, c: Cell): boolean => loadIn(row.bars, c.start, c.end) < row.bay.capacity;

/** Wolne okienka stanowiska w danym dniu (te, które jeszcze się nie skończyły). */
export const freeCellsOn = (row: WeekRow, date: string, now: Date): number =>
    row.cells.filter(c => c.date === date && c.end > now && cellIsFree(row, c)).length;

/** Kto zablokuje nowy plan w przedziale: puste, gdy stanowisko ma jeszcze miejsce. */
export const overlapsInRange = (row: WeekRow, start: Date, end: Date, exceptCarId?: string): WeekBar[] => {
    const bars = exceptCarId ? row.bars.filter(b => b.carId !== exceptCarId) : row.bars;
    if (loadIn(bars, start, end) + 1 <= row.bay.capacity) return [];
    return bars.filter(b => b.kind !== 'done' && overlaps(b, { start, end }));
};

/** Plan z zakresu dat wpisanego w formularzu rezerwacji - przyciągnięty do okienek stanowiska. */
export const bookingRangeFromDates = (
    start: Date,
    end: Date,
    slotsPerDay: number,
    hours: OpeningHours = DEFAULT_HOURS,
): { start: Date; end: Date } | null => {
    const cells: Cell[] = [];
    const last = toDateKey(end);
    for (let key = toDateKey(start), guard = 0; key <= last && guard < 60; key = toDateKey(addDays(fromDateKey(key), 1)), guard++) {
        if (hoursOf(key, hours)) cells.push(...dayCells(key, slotsPerDay, hours));
    }
    return snapRange(cells, start, end);
};
