// src/modules/activity/activityTheme.ts

import type { ActivityActorType, ActivityIconKey } from './types';

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
};

export const iconTone = (icon: string): Tone =>
    TONES[ICON_TONE[icon as ActivityIconKey] ?? 'neutral'];

export interface SeverityFlag {
    /** Left accent bar; null leaves the row unmarked. */
    bar: string | null;
    /** Whole-row wash, reserved for the loudest step. */
    wash: string | null;
}

/**
 * Importance is a single warm accent, deliberately neutral about good and bad.
 *
 * Only the top two steps are marked at all. If every row carried a flag the flags
 * would stop meaning anything, so the quiet majority — photos, comments, routine
 * edits — is left completely plain and the eye lands on what is left.
 */
export const severityFlag = (code: string): SeverityFlag => {
    if (code === 'CRITICAL') return { bar: '#f59e0b', wash: 'rgba(245, 158, 11, 0.045)' };
    if (code === 'HIGH') return { bar: 'rgba(245, 158, 11, 0.45)', wash: null };
    return { bar: null, wash: null };
};

/**
 * Actor type colours the avatar and nothing else.
 *
 * The point is a single glance answering "was this us, the customer, or an
 * automation?" — the question an owner scanning the feed asks first. Customers
 * get the one hue that appears nowhere else in a row.
 */
export const ACTOR_ACCENT: Record<ActivityActorType, { fg: string; bg: string }> = {
    EMPLOYEE: { fg: '#334155', bg: 'rgba(51, 65, 85, 0.10)' },
    CUSTOMER: { fg: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
    SYSTEM: { fg: '#0f766e', bg: 'rgba(15, 118, 110, 0.10)' },
    INTEGRATION: { fg: '#0f766e', bg: 'rgba(15, 118, 110, 0.10)' },
};

export const actorAccent = (type: string) =>
    ACTOR_ACCENT[type as ActivityActorType] ?? ACTOR_ACCENT.EMPLOYEE;

// ─── time formatting ─────────────────────────────────────────────────────────

const timeFormat = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' });

export const formatTime = (iso: string): string => timeFormat.format(new Date(iso));

/** Calendar day key in local time — the basis for the day separators. */
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
    items: T[];
}

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
            groups.push({ key, label: formatDayLabel(item.occurredAt), items: [item] });
        }
    });

    return groups;
};

// ─── date range presets ──────────────────────────────────────────────────────

export type DateRangePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
    { value: 'ALL', label: 'Cały okres' },
    { value: 'TODAY', label: 'Dzisiaj' },
    { value: 'WEEK', label: '7 dni' },
    { value: 'MONTH', label: '30 dni' },
];

/** Resolves a preset to the `from` instant the API expects; null means no lower bound. */
export const presetToFrom = (preset: DateRangePreset): string | null => {
    if (preset === 'ALL') return null;

    const from = new Date();
    if (preset === 'TODAY') {
        from.setHours(0, 0, 0, 0);
    } else {
        from.setDate(from.getDate() - (preset === 'WEEK' ? 7 : 30));
    }
    return from.toISOString();
};
