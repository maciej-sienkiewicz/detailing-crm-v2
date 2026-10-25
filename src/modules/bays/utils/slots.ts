// src/modules/bays/utils/slots.ts
//
// Oś planu stanowisk: dni, godziny otwarcia i podział dnia na okienka.
//
// Każde stanowisko ma WŁASNY podział dnia (`Bay.slotsPerDay`): myjnia na 6 okienek
// (mycie trwa godzinę-dwie), podnośnik na 2 (praca zajmuje pół dnia i dłużej),
// kabina na 1. Plan przyciąga się do okienek swojego wiersza - przy krótkich
// pracach przeciąganie trafia w godzinę, przy długich nie trzeba celować.
//
// Czas pracy liczy się w godzinach otwarcia: auto zostawione na noc na podnośniku
// nie pracowało 22 godzin - licznik bez tej reguły pokazałby „sprzęgło 1 dzień 3 h"
// i nikt by mu więcej nie uwierzył.

export interface DayHours {
    /** Minuty od północy. */
    opens: number;
    closes: number;
}

/** Indeks jak `Date.getDay()`: 0 - niedziela. null - zamknięte. */
export type OpeningHours = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, DayHours | null>;

/** Minuty od północy, jak przysyła serwer (Ustawienia → Stanowiska → Godziny hali). */
export interface StudioHours {
    dayOpens: number;
    dayCloses: number;
    /** null - sobota zamknięta. */
    saturdayOpens: number | null;
    saturdayCloses: number | null;
    /** null - niedziela zamknięta (domyślnie). Brak pola - serwer sprzed V223. */
    sundayOpens?: number | null;
    sundayCloses?: number | null;
}

/** Domyślne godziny serwera (V222, V223): pn-pt 6-20, sb 6-14, niedziela zamknięta. */
export const DEFAULT_STUDIO_HOURS: StudioHours = {
    dayOpens: 6 * 60, dayCloses: 20 * 60, saturdayOpens: 6 * 60, saturdayCloses: 14 * 60, sundayOpens: null, sundayCloses: null,
};

export const toOpeningHours = (h: StudioHours): OpeningHours => {
    const weekday: DayHours = { opens: h.dayOpens, closes: h.dayCloses };
    const optional = (opens: number | null | undefined, closes: number | null | undefined): DayHours | null =>
        (opens != null && closes != null ? { opens, closes } : null);
    return {
        0: optional(h.sundayOpens, h.sundayCloses),
        1: weekday, 2: weekday, 3: weekday, 4: weekday, 5: weekday,
        6: optional(h.saturdayOpens, h.saturdayCloses),
    };
};

export const DEFAULT_HOURS: OpeningHours = toOpeningHours(DEFAULT_STUDIO_HOURS);

// Godziny hali są jedne na studio, a przechodzą przez kilkanaście funkcji osi i licznika
// czasu pracy. Zamiast przewlekać je parametrem przez każdy komponent, widok stanowisk
// ustawia je tu raz po wczytaniu ustawień (`useStudioHours`), a funkcje biorą je jako
// domyślne. Parametr `hours` zostaje - testy i podgląd w ustawieniach podają własne.
let studio: OpeningHours = DEFAULT_HOURS;

export const studioHours = (): OpeningHours => studio;

/** Zwraca true, gdy godziny się zmieniły (wtedy trzeba przeliczyć zapamiętane osie). */
export const setStudioHours = (h: StudioHours): boolean => {
    const next = toOpeningHours(h);
    if (JSON.stringify(next) === JSON.stringify(studio)) return false;
    studio = next;
    return true;
};

/** Klucz do zależności `useMemo` - oś zależy od godzin, nie tylko od dni. */
export const hoursKey = (hours: OpeningHours = studio): string =>
    [1, 6, 0].map(d => {
        const h = hours[d as 0 | 1 | 6];
        return h ? `${h.opens}-${h.closes}` : 'x';
    }).join('/');

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromDateKey = (key: string): Date => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const addDays = (d: Date, days: number): Date => {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
};

const atMinutes = (dateKey: string, minutes: number): Date => {
    const d = fromDateKey(dateKey);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return d;
};

export const hoursOf = (dateKey: string, hours: OpeningHours = studioHours()): DayHours | null =>
    hours[fromDateKey(dateKey).getDay() as keyof OpeningHours];

/** Najdłuższy dzień tygodnia - szerokość kolumny dnia. Krótsza sobota ma zakreskowany ogon. */
export const longestDay = (hours: OpeningHours = studioHours()): number =>
    Math.max(...Object.values(hours).map(h => (h ? h.closes - h.opens : 0)));

/** Poniedziałek tygodnia, w którym leży dzień. */
export const mondayOf = (d: Date): Date => {
    const day = d.getDay();
    const monday = addDays(d, day === 0 ? -6 : 1 - day);
    monday.setHours(0, 0, 0, 0);
    return monday;
};

/** Otwarte dni tygodnia od poniedziałku (zwykle pn-sb). */
export const weekDays = (monday: Date, hours: OpeningHours = studioHours()): string[] =>
    Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i))).filter(date => hoursOf(date, hours) !== null);

export interface Cell {
    date: string;
    start: Date;
    end: Date;
}

/** Okienka dnia dla stanowiska podzielonego na `n` części. Zamknięty dzień - brak okienek. */
export const dayCells = (date: string, n: number, hours: OpeningHours = studioHours()): Cell[] => {
    const h = hoursOf(date, hours);
    if (!h) return [];
    const len = (h.closes - h.opens) / n;
    return Array.from({ length: n }, (_, i) => ({
        date,
        start: atMinutes(date, Math.round(h.opens + i * len)),
        end: atMinutes(date, Math.round(h.opens + (i + 1) * len)),
    }));
};

/** Okienka kolejnych otwartych dni od `from` - do wyboru długości planu na telefonie. */
export const cellsFrom = (from: Cell, count: number, n: number, hours: OpeningHours = studioHours()): Cell[] => {
    const out: Cell[] = [];
    let date = from.date;
    for (let guard = 0; out.length < count && guard < 30; guard++) {
        for (const c of dayCells(date, n, hours)) if (c.start >= from.start && out.length < count) out.push(c);
        date = toDateKey(addDays(fromDateKey(date), 1));
    }
    return out;
};

/** Indeks okienka, w którym leży chwila; przed pierwszym - 0, po ostatnim - ostatnie. */
export const cellIndexAt = (cells: Cell[], t: Date): number => {
    const i = cells.findIndex(c => t < c.end);
    return i === -1 ? cells.length - 1 : i;
};

/** Zakres przyciągnięty do okienek: początek w dół, koniec w górę. */
export const snapRange = (cells: Cell[], start: Date, end: Date): { start: Date; end: Date } | null => {
    if (cells.length === 0) return null;
    const a = cells[cellIndexAt(cells, start)];
    const b = cells[cellIndexAt(cells, new Date(Math.max(start.getTime(), end.getTime() - 60_000)))];
    return { start: a.start, end: b.end < a.end ? a.end : b.end };
};

/**
 * Pozycja chwili na osi tygodnia, 0..1. Każdy dzień ma tę samą szerokość (najdłuższy
 * dzień), wewnątrz dnia czas biegnie liniowo od otwarcia. Noc i niedziela nie zajmują
 * miejsca: chwila poza godzinami przykleja się do najbliższej krawędzi dnia.
 */
export const weekX = (t: Date, days: string[], hours: OpeningHours = studioHours()): number => {
    if (days.length === 0) return 0;
    const key = toDateKey(t);
    if (key < days[0]) return 0;
    if (key > days[days.length - 1]) return 1;
    let i = days.indexOf(key);
    let frac: number;
    if (i === -1) {
        // Dzień zamknięty w środku tygodnia - koniec poprzedniego otwartego.
        i = days.filter(d => d < key).length - 1;
        frac = (hoursOf(days[i], hours)!.closes - hoursOf(days[i], hours)!.opens) / longestDay(hours);
    } else {
        const h = hoursOf(key, hours)!;
        const m = t.getHours() * 60 + t.getMinutes();
        frac = Math.min(h.closes - h.opens, Math.max(0, m - h.opens)) / longestDay(hours);
    }
    return (i + frac) / days.length;
};

/** Odwrotność `weekX`: chwila pod kursorem, przycięta do godzin otwarcia dnia. */
export const timeAtWeekX = (x: number, days: string[], hours: OpeningHours = studioHours()): Date => {
    const pos = Math.min(days.length - 1e-6, Math.max(0, x * days.length));
    const i = Math.floor(pos);
    const h = hoursOf(days[i], hours)!;
    const m = Math.min(h.closes - 1, h.opens + (pos - i) * longestDay(hours));
    return atMinutes(days[i], Math.round(m));
};

/**
 * Minuty pracy między dwiema chwilami, liczone tylko w godzinach otwarcia. Noc,
 * niedziela i czas po zamknięciu nie są pracą - auto po prostu stoi.
 */
export const workMinutes = (start: Date, end: Date, hours: OpeningHours = studioHours()): number => {
    if (end <= start) return 0;
    let total = 0;
    let cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
        const h = hours[cursor.getDay() as keyof OpeningHours];
        if (h) {
            const key = toDateKey(cursor);
            const from = Math.max(atMinutes(key, h.opens).getTime(), start.getTime());
            const to = Math.min(atMinutes(key, h.closes).getTime(), end.getTime());
            if (to > from) total += (to - from) / 60000;
        }
        cursor = addDays(cursor, 1);
    }
    return Math.round(total);
};

/** „3 h 10 min", „40 min", „1 h". */
export const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** Długość planu słowami: pełne dni (i połówki) jako dni, reszta w godzinach. */
export const durationLabel = (minutes: number, hours: OpeningHours = studioHours()): string => {
    const day = longestDay(hours);
    if (minutes >= day && minutes % (day / 2) === 0) {
        const d = minutes / day;
        if (d === 1) return '1 dzień';
        return Number.isInteger(d) ? `${d} dni` : `${String(d).replace('.', ',')} dnia`;
    }
    return formatMinutes(minutes);
};

const DAY_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
const DAY_LONG = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

export const dayShort = (dateKey: string): string => DAY_SHORT[fromDateKey(dateKey).getDay()];
export const dayLong = (dateKey: string): string => DAY_LONG[fromDateKey(dateKey).getDay()];

/** „26.10". */
export const dayMonth = (dateKey: string): string => {
    const d = fromDateKey(dateKey);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
};

/** „8:00". */
export const clockText = (d: Date): string => `${d.getHours()}:${pad(d.getMinutes())}`;

/** „dziś", „jutro", dalej „cz 29.10" - tak mówi się na hali. */
export const relativeDay = (date: string, now: Date): string => {
    if (date === toDateKey(now)) return 'dziś';
    if (date === toDateKey(addDays(now, 1))) return 'jutro';
    return `${dayShort(date)} ${dayMonth(date)}`;
};

/** „dziś 8:00–12:30", „dziś 12:30 – jutro 12:30". */
export const rangeText = (start: Date, end: Date, now: Date): string => {
    const a = toDateKey(start);
    const b = toDateKey(end);
    return a === b
        ? `${relativeDay(a, now)} ${clockText(start)}–${clockText(end)}`
        : `${relativeDay(a, now)} ${clockText(start)} – ${relativeDay(b, now)} ${clockText(end)}`;
};

/** Okienko jako tekst: „8:00–12:30". */
export const cellText = (c: Cell): string => `${clockText(c.start)}–${clockText(c.end)}`;
