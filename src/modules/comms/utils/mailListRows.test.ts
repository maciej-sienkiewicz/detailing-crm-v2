import { describe, expect, it } from 'vitest';
import type { CommThread } from '../types';
import { buildMailListRows, dayLabel, sendersLabel } from './mailListRows';

const NOW = new Date(2026, 9, 8, 15, 0);

const thread = (id: string, at: Date, extra: Partial<CommThread> = {}): CommThread =>
    ({
        id,
        accountId: 'a',
        subject: id,
        participantEmail: `${id}@example.com`,
        participantName: null,
        lastMessageAt: at.toISOString(),
        lastDirection: 'INBOUND',
        lastSnippet: null,
        messageCount: 1,
        unreadCount: 0,
        inboundCount: 1,
        outboundCount: 0,
        hasAttachments: false,
        leadId: null,
        labelId: null,
        archived: false,
        ...extra,
    }) as CommThread;

const today = (hour: number) => new Date(2026, 9, 8, hour);
const yesterday = (hour: number) => new Date(2026, 9, 7, hour);

describe('dayLabel', () => {
    it('nazywa dziś i wczoraj, starsze dni datą', () => {
        expect(dayLabel(today(9).toISOString(), NOW)).toBe('Dziś');
        expect(dayLabel(yesterday(9).toISOString(), NOW)).toBe('Wczoraj');
        expect(dayLabel(new Date(2026, 9, 5, 9).toISOString(), NOW)).toBe('5 października');
    });

    it('dopisuje rok tylko dla innego roku', () => {
        expect(dayLabel(new Date(2025, 11, 30, 9).toISOString(), NOW)).toBe('30 grudnia 2025');
    });
});

describe('sendersLabel', () => {
    it('wylicza do trzech nadawców przecinkami, resztę liczy', () => {
        const threads = ['Allegro', 'Google', 'Facebook', 'Bank', 'Poczta'].map((name, index) =>
            thread(`t${index}`, today(9), { participantName: name })
        );
        expect(sendersLabel(threads)).toBe('Allegro, Google, Facebook i 2 innych');
        expect(sendersLabel(threads.slice(0, 4))).toBe('Allegro, Google, Facebook i 1 inny');
        expect(sendersLabel(threads.slice(0, 2))).toBe('Allegro, Google');
    });

    it('nie liczy dwa razy tego samego nadawcy', () => {
        const threads = [thread('a', today(9), { participantName: 'Allegro' }), thread('b', today(8), { participantName: 'Allegro' })];
        expect(sendersLabel(threads)).toBe('Allegro');
    });
});

describe('buildMailListRows', () => {
    const list = [
        thread('klient', today(11)),
        thread('news1', today(10), { automated: true, unreadCount: 1 }),
        thread('dostawca', today(9)),
        thread('news2', yesterday(18), { automated: true }),
        thread('anna', yesterday(8)),
    ];

    it('zwija automaty w jeden wiersz w miejscu najnowszego z nich', () => {
        const rows = buildMailListRows(list, { bundleAutomated: true, bundleOpen: false, now: NOW });
        expect(rows.map((row) => (row.kind === 'thread' ? row.thread.id : row.kind === 'day' ? row.label : 'BUNDLE'))).toEqual([
            'Dziś', 'klient', 'BUNDLE', 'dostawca', 'Wczoraj', 'anna',
        ]);
        const bundle = rows.find((row) => row.kind === 'bundle');
        expect(bundle && bundle.kind === 'bundle' && bundle.unread).toBe(1);
    });

    it('rozwinięty wiersz pokazuje automaty pod sobą, wcięte', () => {
        const rows = buildMailListRows(list, { bundleAutomated: true, bundleOpen: true, now: NOW });
        const nested = rows.filter((row) => row.kind === 'thread' && row.nested).map((row) => row.kind === 'thread' && row.thread.id);
        expect(nested).toEqual(['news1', 'news2']);
    });

    it('jednego automatu nie zwija - stoi na liście jak każdy wątek', () => {
        const rows = buildMailListRows([thread('klient', today(11)), thread('news', today(10), { automated: true })], {
            bundleAutomated: true,
            bundleOpen: false,
            now: NOW,
        });
        expect(rows.some((row) => row.kind === 'bundle')).toBe(false);
        expect(rows.filter((row) => row.kind === 'thread')).toHaveLength(2);
    });

    it('bez zwijania (Wysłane, wyszukiwanie) każdy wątek stoi osobno', () => {
        const rows = buildMailListRows(list, { bundleAutomated: false, bundleOpen: false, now: NOW });
        expect(rows.filter((row) => row.kind === 'thread')).toHaveLength(5);
    });

    it('wątek bez znacznika (starszy backend) nigdy nie trafia do automatów', () => {
        const rows = buildMailListRows([thread('a', today(11)), thread('b', today(10))], {
            bundleAutomated: true,
            bundleOpen: false,
            now: NOW,
        });
        expect(rows.some((row) => row.kind === 'bundle')).toBe(false);
    });
});

describe('buildMailListRows - Rezerwacje', () => {
    const base = { bundleAutomated: true, bundleOpen: false, now: NOW };

    it('wątki spraw z rezerwacją zwijają się w jeden wiersz, tam gdzie stałby najnowszy z nich', () => {
        const list = [
            thread('nowe', today(14)),
            thread('rez1', today(12), { leadId: 'l1', unreadCount: 1 }),
            thread('inne', today(10)),
            thread('rez2', yesterday(9), { leadId: 'l2' }),
        ];

        const rows = buildMailListRows(list, { ...base, bookedThreadIds: new Set(['rez1', 'rez2']) });

        expect(rows.map((row) => (row.kind === 'thread' ? row.thread.id : row.key))).toEqual([
            'day:Dziś', 'nowe', 'bundle:booked', 'inne',
        ]);
        const bundle = rows.find((row) => row.kind === 'bundle');
        expect(bundle).toMatchObject({ group: 'BOOKED', unread: 1 });
        expect(bundle?.kind === 'bundle' && bundle.threads.map((t) => t.id)).toEqual(['rez1', 'rez2']);
    });

    it('jedna rezerwacja też ma swój wiersz - sekcja jest stałym miejscem', () => {
        const rows = buildMailListRows([thread('rez', today(9))], { ...base, bookedThreadIds: new Set(['rez']) });

        expect(rows.filter((row) => row.kind === 'bundle')).toHaveLength(1);
        expect(rows.filter((row) => row.kind === 'thread')).toHaveLength(0);
    });

    it('rozwinięty wiersz pokazuje wątki pod sobą, wcięte', () => {
        const rows = buildMailListRows([thread('rez', today(9))], { ...base, bookedThreadIds: new Set(['rez']), bookedOpen: true });

        expect(rows[rows.length - 1]).toMatchObject({ kind: 'thread', nested: true });
    });

    it('rezerwacja nie trafia do „Powiadomień i reklam", nawet gdy automat ją tak oznaczył', () => {
        const list = [
            thread('a1', today(14), { automated: true }),
            thread('rez', today(12), { automated: true }),
            thread('a2', today(10), { automated: true }),
        ];

        const rows = buildMailListRows(list, { ...base, bookedThreadIds: new Set(['rez']) });
        const groups = rows.filter((row) => row.kind === 'bundle').map((row) => row.kind === 'bundle' && [row.group, row.threads.length]);

        expect(groups).toEqual([['AUTOMATED', 2], ['BOOKED', 1]]);
    });

    it('bez listy rezerwacji nic się nie zwija', () => {
        const rows = buildMailListRows([thread('rez', today(9), { leadId: 'l1' })], base);

        expect(rows.filter((row) => row.kind === 'thread')).toHaveLength(1);
    });
});
