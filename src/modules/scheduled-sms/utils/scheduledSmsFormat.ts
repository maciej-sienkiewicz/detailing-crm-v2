// Formatowanie i grupowanie listy „Zaplanowane SMS-y".
//
// Lista jest ułożona po dniach („Dziś", „Jutro", „środa, 14.10"), bo pytanie, z którym
// się tu przychodzi, brzmi „co i komu wyjdzie" - a odpowiedź zaczyna się od „kiedy".

import type { AxiosError } from 'axios';
import { pluralPl } from '@/common/utils/plural';
import type { ScheduledSmsItem, ScheduledSmsSource } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

/** „14:05" */
export const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** „14.10.2026, 10:00" */
export const formatWhen = (iso: string): string => {
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${formatTime(iso)}`;
};

/** „Dziś", „Jutro", „środa, 14.10" (z rokiem, gdy to nie ten rok). */
export const dayLabel = (iso: string, now: Date = new Date()): string => {
    const d = new Date(iso);
    const today = dayKey(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (dayKey(d) === today) return 'Dziś';
    if (dayKey(d) === dayKey(tomorrow)) return 'Jutro';
    const date = d.getFullYear() === now.getFullYear()
        ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
        : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    return `${WEEKDAYS[d.getDay()]}, ${date}`;
};

export interface DayGroup {
    key: string;
    label: string;
    items: ScheduledSmsItem[];
}

/**
 * Grupy dni w kolejności terminów. Wiadomość bez terminu (kampania „jak najszybciej")
 * i ta, której termin już minął (czeka na otwarcie okna albo na najbliższy przebieg
 * wysyłki), stoją razem na początku jako „Najbliższa wysyłka" - wyjdą pierwsze.
 */
export const groupByDay = (items: ScheduledSmsItem[], now: Date = new Date()): DayGroup[] => {
    const groups = new Map<string, DayGroup>();
    const sorted = [...items].sort((a, b) =>
        (a.scheduledFor ? Date.parse(a.scheduledFor) : 0) - (b.scheduledFor ? Date.parse(b.scheduledFor) : 0));
    for (const item of sorted) {
        const due = !item.scheduledFor || Date.parse(item.scheduledFor) <= now.getTime();
        const key = due && item.state === 'PENDING' ? 'due' : dayKey(new Date(item.scheduledFor ?? now));
        const label = key === 'due' ? 'Najbliższa wysyłka' : dayLabel(item.scheduledFor ?? now.toISOString(), now);
        const group = groups.get(key) ?? { key, label, items: [] };
        group.items.push(item);
        groups.set(key, group);
    }
    return [...groups.values()];
};

export type KindFilter = 'all' | 'reminders' | 'transactional' | 'campaigns';

const KIND_OF: Record<ScheduledSmsSource, Exclude<KindFilter, 'all'>> = {
    PRE_VISIT: 'reminders',
    VISIT_REMINDER: 'reminders',
    DELAYED_REMINDER: 'reminders',
    QUEUE: 'transactional',
    THANK_YOU: 'transactional',
    POST_VISIT: 'transactional',
    CAMPAIGN: 'campaigns',
};

export const matchesKind = (item: ScheduledSmsItem, filter: KindFilter): boolean =>
    filter === 'all' || KIND_OF[item.source] === filter;

/** SMS automatu: bez wiersza, liczony z reguł - zmiana dotyczy tylko tego jednego SMS-a. */
export const isAutomation = (source: ScheduledSmsSource): boolean =>
    source === 'PRE_VISIT' || source === 'POST_VISIT' || source === 'DELAYED_REMINDER';

/** Limit znaków taki jak na serwerze: przypomnienie przy wizycie ma własny, krótki. */
export const contentLimit = (source: ScheduledSmsSource): number => source === 'VISIT_REMINDER' ? 160 : 1000;

/** Kto dostanie wiadomość - nazwa klienta, a gdy jej nie ma, numer. */
export const recipientLabel = (item: ScheduledSmsItem): string =>
    item.campaign?.name ?? item.customerName ?? item.phoneNumber ?? 'Klient bez nazwy';

/** „120 SMS-ów czeka", „odbiorców ustalimy w dniu wysyłki". */
export const campaignCountLabel = (pendingCount: number | null): string => {
    if (pendingCount === null) return 'Odbiorców ustalimy w dniu wysyłki';
    return `${pendingCount} ${pluralPl(pendingCount, 'SMS czeka', 'SMS-y czekają', 'SMS-ów czeka')}`;
};

/** Komunikat serwera z odpowiedzi błędu; serwer pisze je po polsku i dla ludzi. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
    const message = (error as AxiosError<{ message?: string }>)?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
};
