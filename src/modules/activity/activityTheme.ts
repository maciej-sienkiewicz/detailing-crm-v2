// src/modules/activity/activityTheme.ts

import type { ActivityIconKey } from './types';

interface Tone {
    /** Icon glyph colour. */
    solid: string;
    /** Tinted fill behind the icon tile. */
    tint: string;
    /** Border of the icon tile. */
    edge: string;
}

const TONES = {
    neutral: { solid: '#64748b', tint: 'rgba(100, 116, 139, 0.10)', edge: 'rgba(100, 116, 139, 0.20)' },
    brand: { solid: '#0284c7', tint: 'rgba(14, 165, 233, 0.10)', edge: 'rgba(14, 165, 233, 0.22)' },
    positive: { solid: '#059669', tint: 'rgba(16, 185, 129, 0.11)', edge: 'rgba(16, 185, 129, 0.24)' },
    negative: { solid: '#dc2626', tint: 'rgba(239, 68, 68, 0.10)', edge: 'rgba(239, 68, 68, 0.22)' },
    money: { solid: '#0f766e', tint: 'rgba(15, 118, 110, 0.10)', edge: 'rgba(15, 118, 110, 0.20)' },
    comms: { solid: '#7c3aed', tint: 'rgba(124, 58, 237, 0.10)', edge: 'rgba(124, 58, 237, 0.22)' },
    attention: { solid: '#d97706', tint: 'rgba(245, 158, 11, 0.12)', edge: 'rgba(245, 158, 11, 0.26)' },
} as const satisfies Record<string, Tone>;

/**
 * The icon tile is coloured by what the action *means*, not by how important it is.
 *
 * Those are different questions and conflating them reads as a contradiction: a
 * customer accepting extra work is one of the most important things that can
 * happen in a studio, but painting its tick red makes it look like a failure.
 * Valence lives here; importance lives in [severityFlag].
 */
const ICON_TONE: Record<ActivityIconKey, keyof typeof TONES> = {
    CREATE: 'positive',
    EDIT: 'brand',
    DELETE: 'negative',
    STATUS: 'brand',
    PHOTO: 'neutral',
    DOCUMENT: 'neutral',
    COMMENT: 'neutral',
    NOTE: 'neutral',
    SERVICE: 'brand',
    MONEY: 'money',
    CALENDAR: 'brand',
    VEHICLE: 'brand',
    CUSTOMER: 'brand',
    USER: 'brand',
    SECURITY: 'negative',
    MESSAGE: 'comms',
    CAMPAIGN: 'comms',
    TIME: 'neutral',
    SIGNATURE: 'positive',
    PHONE: 'comms',
    TASK: 'brand',
    VIEW: 'neutral',
    APPROVE: 'positive',
    REJECT: 'negative',
    ARCHIVE: 'neutral',
    RESTORE: 'positive',
    SPLIT: 'brand',
    MERGE: 'brand',
    LEAVE: 'attention',
    PAYROLL: 'money',
    LINK: 'brand',
    EXPORT: 'attention',
};

export const iconTone = (icon: string): Tone =>
    TONES[ICON_TONE[icon as ActivityIconKey] ?? 'neutral'];

// ─── time formatting ─────────────────────────────────────────────────────────

const timeFormat = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' });
const dayMonthFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' });

export const formatTime = (iso: string): string => timeFormat.format(new Date(iso));

/** Calendar day key in local time; the basis for the day separators. */
const dayKey = (date: Date): string =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

/**
 * "Dzisiaj" / "Wczoraj" / "poniedziałek, 17 lutego 2026".
 *
 * Named days only for today and yesterday: past that, a weekday alone stops being
 * a useful anchor and the reader wants the date.
 */
export const formatDayLabel = (iso: string): string => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dayKey(date) === dayKey(today)) return 'Dzisiaj';
    if (dayKey(date) === dayKey(yesterday)) return 'Wczoraj';
    return `${weekdayFormat.format(date)}, ${dayFormat.format(date)}`;
};

export interface ActivityDayGroup<T> {
    key: string;
    label: string;
    /** „piątek, 16 października" obok „Wczoraj"; null, gdy etykieta już jest datą. */
    date: string | null;
    items: T[];
}

/** Data pod etykietą „Dzisiaj"/„Wczoraj" - nazwa dnia sama w sobie nie mówi, który to dzień. */
const formatDayDate = (iso: string): string | null => {
    const label = formatDayLabel(iso);
    if (label !== 'Dzisiaj' && label !== 'Wczoraj') return null;
    const date = new Date(iso);
    return `${weekdayFormat.format(date)}, ${dayMonthFormat.format(date)}`;
};

/**
 * Splits a chronologically ordered list into day buckets, preserving order.
 *
 * Works across pages because the feed is strictly newest-first: a day never
 * reappears once it has been closed, so no merging is needed.
 */
export const groupByDay = <T extends { occurredAt: string }>(items: T[]): ActivityDayGroup<T>[] => {
    const groups: ActivityDayGroup<T>[] = [];

    items.forEach(item => {
        const key = dayKey(new Date(item.occurredAt));
        const last = groups[groups.length - 1];

        if (last && last.key === key) {
            last.items.push(item);
        } else {
            groups.push({ key, label: formatDayLabel(item.occurredAt), date: formatDayDate(item.occurredAt), items: [item] });
        }
    });

    return groups;
};

// ─── date range presets ──────────────────────────────────────────────────────

/**
 * Okres feedu. „Wczoraj" stoi osobno, bo to pierwsze pytanie właściciela, który rano
 * sprawdza, co działo się dzień wcześniej. `ALL` nie ma przycisku: wchodzi się w niego
 * z końca listy („Pokaż starsze"), a `CUSTOM` to „Zakres dat".
 */
export type DateRangePreset = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'ALL';

export const DATE_RANGE_PRESETS: { value: Exclude<DateRangePreset, 'CUSTOM' | 'ALL'>; label: string }[] = [
    { value: 'TODAY', label: 'Dzisiaj' },
    { value: 'YESTERDAY', label: 'Wczoraj' },
    { value: 'WEEK', label: '7 dni' },
    { value: 'MONTH', label: '30 dni' },
];

/** „Wszystko z 7 dni", „Pieniądze z wczoraj" - nagłówek listy. */
export const PRESET_PHRASE: Record<DateRangePreset, string> = {
    TODAY: 'z dzisiaj',
    YESTERDAY: 'z wczoraj',
    WEEK: 'z 7 dni',
    MONTH: 'z 30 dni',
    CUSTOM: 'z wybranego zakresu',
    ALL: 'z całego okresu',
};

export interface DateRange {
    from: string | null;
    to: string | null;
}

const startOfDay = (date: Date): Date => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const endOfDay = (date: Date): Date => {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
};

/** Resolves a preset to the instants the API expects; null means no bound. */
export const presetToRange = (preset: DateRangePreset, now: Date = new Date()): DateRange => {
    switch (preset) {
        case 'TODAY':
            return { from: startOfDay(now).toISOString(), to: null };
        case 'YESTERDAY': {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return { from: startOfDay(yesterday).toISOString(), to: endOfDay(yesterday).toISOString() };
        }
        case 'WEEK':
        case 'MONTH': {
            const from = new Date(now);
            from.setDate(now.getDate() - (preset === 'WEEK' ? 7 : 30));
            return { from: from.toISOString(), to: null };
        }
        default:
            return { from: null, to: null };
    }
};

/**
 * Własny zakres z dwóch pól `<input type="date">` (YYYY-MM-DD, czas lokalny), oba końce
 * włącznie - „do 17.10" znaczy do końca tego dnia, a nie do jego północy.
 */
export const customRange = (fromDay: string, toDay: string): DateRange => {
    const parse = (day: string): Date | null => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
    };
    const from = parse(fromDay);
    const to = parse(toDay);
    return {
        from: from ? startOfDay(from).toISOString() : null,
        to: to ? endOfDay(to).toISOString() : null,
    };
};

/** „sobota, 17 października" - data w nagłówku ekranu. */
export const formatToday = (now: Date = new Date()): string =>
    `${weekdayFormat.format(now)}, ${dayMonthFormat.format(now)}`;
