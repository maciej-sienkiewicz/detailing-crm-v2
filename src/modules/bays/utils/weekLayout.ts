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
    addDays, dayCells, fromDateKey, hoursOf, snapRange, toDateKey, weekX, workMinutes, type Cell, type OpeningHours, studioHours,
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

/**
 * Paski jednego stanowiska bez położenia na osi - wspólne dla osi planu i listy etapów
 * auta w podglądzie.
 *
 * Jedno auto może mieć kilka planów (podnośnik rano, myjnia po południu, drugi dzień na
 * tym samym podnośniku). Dlatego pasek „trwa" bierze plan, do którego należy ten wjazd
 * (pierwszy kończący się po wjeździe), a pozostałe plany tego auta zostają osobnymi
 * paskami. Dawniej brał pierwszy z brzegu i chował wszystkie inne plany auta na stanowisku.
 */
const barsOfBay = (snap: BaysSnapshot, bay: Bay, now: Date, hours: OpeningHours): Omit<WeekBar, 'x' | 'w'>[] => {
    const carById = new Map(snap.cars.map(c => [c.id, c]));
    const bars: Omit<WeekBar, 'x' | 'w'>[] = [];
    const stints = snap.stints.filter(s => s.bayId === bay.id);
    const bookings = snap.bookings.filter(b => b.bayId === bay.id).sort((a, b) => a.start.localeCompare(b.start));
    const attached = new Set<string>();

    for (const s of stints) {
        const car = carById.get(s.carId);
        if (!car) continue;
        const start = new Date(s.startedAt);
        const factEnd = s.endedAt ? new Date(s.endedAt) : now;
        const booking = bookings.find(b => b.carId === s.carId && new Date(b.end) > start
            && (s.endedAt ? new Date(b.start) < factEnd : true));
        if (booking && !s.endedAt) attached.add(booking.id);
        // Trwający odcinek sięga do końca planu: jeden pasek „trwa, plan do jutra"
        // czyta się lepiej niż wąski fakt i osobny ogon planu obok.
        const end = !s.endedAt && booking && new Date(booking.end) > factEnd ? new Date(booking.end) : factEnd;
        bars.push({
            id: s.id, carId: s.carId, car,
            kind: s.endedAt ? 'done' : 'active',
            start, end, lane: 0, laneCount: 1,
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
        // Auto stoi teraz w ramach tego planu - niesie go pasek „trwa".
        if (attached.has(b.id)) continue;
        // Plan, który fakty już „zjadły", zostaje tylko po ostatnim zjeździe w jego czasie.
        const lastFact = stints
            .filter(s => s.carId === b.carId && s.endedAt && new Date(s.startedAt) < new Date(b.end))
            .map(s => new Date(s.endedAt!)).sort((x, y) => y.getTime() - x.getTime())[0];
        const start = lastFact && lastFact > new Date(b.start) ? lastFact : new Date(b.start);
        const end = new Date(b.end);
        if (start >= end) continue;
        bars.push({
            id: `plan-${b.id}`, carId: b.carId, car, kind: 'plan',
            start, end, lane: 0, laneCount: 1,
            minutes: workMinutes(start, end, hours), personIds: [], overPlan: false, conflict: false,
            bookingId: b.id, curingUntil: null,
        });
    }
    return bars;
};

export const buildWeekRows = (
    snap: BaysSnapshot,
    days: string[],
    now: Date,
    hours: OpeningHours = studioHours(),
): { rows: WeekRow[] } => {
    const first = days[0];
    const last = days[days.length - 1];
    const weekStart = first ? new Date(`${first}T00:00:00`) : now;
    const weekEnd = last ? new Date(`${last}T23:59:59`) : now;

    const place = (start: Date, end: Date) => {
        const x = weekX(start, days, hours);
        return { x, w: Math.max(0.004, weekX(end, days, hours) - x) };
    };

    const rows = snap.bays.filter(b => b.active).map(bay => {
        const bars: WeekBar[] = barsOfBay(snap, bay, now, hours)
            .filter(b => !(b.end < weekStart || b.start > weekEnd))
            .map(b => ({ ...b, ...place(b.start, b.end) }));

        for (const bar of bars) {
            if (bar.kind !== 'done' && loadIn(bars, bar.start, bar.end) > bay.capacity) bar.conflict = true;
        }

        const cells = days.flatMap(d => dayCells(d, bay.slotsPerDay, hours));
        return { rowId: bay.id, bay, cells, bars, lanes: assignLanes(bars) };
    });

    return { rows };
};

export interface CarStage {
    bayId: string;
    kind: BarKind;
    start: Date;
    end: Date;
    bookingId: string | null;
    /** Id paska - ten sam co na osi, żeby podgląd mógł wskazać „to ten". */
    barId: string;
}

/**
 * Etapy auta po kolei przez wszystkie stanowiska: zrobione, trwa i plany. Podgląd
 * pokazuje z tego trasę auta („podnośnik 8-10, przerwa, myjnia 11-12"), a oś numer
 * etapu na pasku.
 */
export const carStages = (snap: BaysSnapshot, carId: string, now: Date, hours: OpeningHours = studioHours()): CarStage[] =>
    snap.bays.filter(b => b.active)
        .flatMap(bay => barsOfBay(snap, bay, now, hours)
            .filter(b => b.carId === carId)
            // Wjazd i zjazd w tej samej minucie to pomyłka przy kliknięciu, nie etap trasy.
            .filter(b => b.kind !== 'done' || b.end.getTime() - b.start.getTime() >= 60_000)
            .map(b => ({ bayId: bay.id, kind: b.kind, start: b.start, end: b.end, bookingId: b.bookingId, barId: b.id })))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

/** Pozycja okienka na osi. */
export const cellBox = (c: Cell, days: string[], hours: OpeningHours = studioHours()) => {
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
    hours: OpeningHours = studioHours(),
): { start: Date; end: Date } | null => {
    const cells: Cell[] = [];
    const last = toDateKey(end);
    for (let key = toDateKey(start), guard = 0; key <= last && guard < 60; key = toDateKey(addDays(fromDateKey(key), 1)), guard++) {
        if (hoursOf(key, hours)) cells.push(...dayCells(key, slotsPerDay, hours));
    }
    return snapRange(cells, start, end);
};
