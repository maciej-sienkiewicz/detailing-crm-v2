// src/modules/comms/utils/mailListRows.ts
// Lista wątków w zakładce „Poczta" - z podziałem na dni i jednym wierszem na automaty.
//
// Skrzynka studia to w połowie poczta, której nikt nie czyta: newslettery hurtowni,
// powiadomienia z Allegro i Google, potwierdzenia z banku. Rozsiane między mailami
// od klientów spychały te właściwe w dół i każdy wiersz trzeba było przeczytać, żeby
// wiedzieć, że można go pominąć. Wątki, w których pisał wyłącznie automat
// (`thread.automated`, ustalane przy imporcie), zwijają się w jeden wiersz
// „Powiadomienia i reklamy" - stoi tam, gdzie stałby najnowszy z nich, więc niczego
// nie przesuwa w czasie i rozwija się jednym kliknięciem.
//
// Podział na dni („Dziś", „Wczoraj", „5 października") zastępuje czytanie godziny
// przy każdym wierszu: oko szuka granicy, a nie porównuje dat.
import type { CommThread } from '../types';

export type MailListRow =
    | { kind: 'day'; key: string; label: string }
    | { kind: 'thread'; key: string; thread: CommThread; nested: boolean }
    | { kind: 'bundle'; key: string; threads: CommThread[]; unread: number; senders: string };

interface Options {
    /** Zwijać automaty w jeden wiersz (zakładka Poczta, bez wyszukiwania). */
    bundleAutomated: boolean;
    /** Wiersz automatów rozwinięty - jego wątki stoją pod nim, wcięte. */
    bundleOpen: boolean;
    /** Wstrzykiwane w testach; w aplikacji zawsze bieżąca chwila. */
    now?: Date;
}

/** Ile nazw nadawców pokazać w wierszu automatów, zanim padnie „i N innych". */
const NAMED_SENDERS = 3;

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** „Dziś", „Wczoraj", „5 października", a dla innego roku „5 października 2025". */
export function dayLabel(iso: string, now: Date = new Date()): string {
    const date = new Date(iso);
    const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
    if (diffDays === 0) return 'Dziś';
    if (diffDays === 1) return 'Wczoraj';
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    });
}

/** „Allegro, Google, Facebook i 9 innych" - zdanie z przecinkami, nie lista z kropkami (CLAUDE.md §4). */
export function sendersLabel(threads: CommThread[]): string {
    const names: string[] = [];
    for (const thread of threads) {
        const name = (thread.participantName?.trim() || thread.participantEmail).trim();
        if (!names.includes(name)) names.push(name);
    }
    if (names.length <= NAMED_SENDERS) return names.join(', ');
    const rest = names.length - NAMED_SENDERS;
    return `${names.slice(0, NAMED_SENDERS).join(', ')} i ${rest} ${rest === 1 ? 'inny' : 'innych'}`;
}

export function buildMailListRows(threads: CommThread[], { bundleAutomated, bundleOpen, now = new Date() }: Options): MailListRow[] {
    const automated = bundleAutomated ? threads.filter((thread) => thread.automated) : [];
    // Jeden automat to nie „grupa" - zwinięty w osobny wiersz tylko by się schował.
    const bundling = automated.length >= 2;
    const rows: MailListRow[] = [];
    let currentDay: string | null = null;
    let bundleEmitted = false;

    const dayRow = (iso: string) => {
        const label = dayLabel(iso, now);
        if (label === currentDay) return;
        currentDay = label;
        rows.push({ kind: 'day', key: `day:${label}`, label });
    };

    for (const thread of threads) {
        if (bundling && thread.automated) {
            if (bundleEmitted) continue;
            bundleEmitted = true;
            dayRow(thread.lastMessageAt);
            rows.push({
                kind: 'bundle',
                key: 'bundle:automated',
                threads: automated,
                unread: automated.filter((item) => item.unreadCount > 0).length,
                senders: sendersLabel(automated),
            });
            if (bundleOpen) {
                automated.forEach((item) => rows.push({ kind: 'thread', key: item.id, thread: item, nested: true }));
            }
            continue;
        }
        dayRow(thread.lastMessageAt);
        rows.push({ kind: 'thread', key: thread.id, thread, nested: false });
    }
    return rows;
}
