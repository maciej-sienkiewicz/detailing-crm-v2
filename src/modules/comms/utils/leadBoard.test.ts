import { describe, expect, it } from 'vitest';
import type { Lead } from '../types';
import { DEFAULT_STAGNATION, describeLeadUrgency } from './leadUrgency';
import {
    buildBoard,
    canRemindByMail,
    leadAfterMove,
    leadAfterReminder,
    manualStageInForce,
    planBoardMove,
    type BoardColumnKey,
} from './leadBoard';

const HOUR = 3_600_000;
const DAY = 86_400_000;
const NOW = Date.parse('2026-10-19T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const lead = (overrides: Partial<Lead> = {}): Lead => ({
    id: Math.random().toString(36).slice(2),
    source: 'EMAIL',
    status: 'IN_PROGRESS',
    contactIdentifier: 'klient@example.com',
    customerName: 'Jan Klient',
    initialMessage: null,
    estimatedValue: 0,
    requiresVerification: false,
    customerId: null,
    appointmentId: null,
    visitId: null,
    assignedUserId: null,
    assignedUserName: null,
    threadId: 'thread-1',
    tags: [],
    tagLabels: [],
    vehicleBrand: null,
    vehicleModel: null,
    vehicleDetectionStatus: 'DONE',
    lostReasonCode: null,
    lostReasonLabel: null,
    lostReason: null,
    services: [],
    replyState: 'AWAITING_OUR_REPLY',
    waitingSince: ago(2 * HOUR),
    lastInboundAt: ago(2 * HOUR),
    lastOutboundAt: null,
    firstResponseAt: null,
    owedSince: null,
    owedNote: null,
    closedAt: null,
    createdAt: ago(30 * DAY),
    updatedAt: ago(2 * HOUR),
    ...overrides,
});

/** Wycena sprawy: przyjęta pozycja o danym brutto i (opcjonalnie) sugestia AI, która NIE jest wyceną. */
const quoted = (gross: number, suggested = 0): Partial<Lead> => ({
    estimatedValue: gross + suggested,
    services: [
        { id: `a-${gross}`, status: 'ACCEPTED', totalGross: gross } as Lead['services'][number],
        ...(suggested ? [{ id: `s-${suggested}`, status: 'SUGGESTED', totalGross: suggested } as Lead['services'][number]] : []),
    ],
});

/** Odpisaliśmy `days` dni temu, klient milczy. */
const replied = (days: number, overrides: Partial<Lead> = {}) =>
    lead({
        replyState: 'AWAITING_CLIENT_REPLY',
        waitingSince: ago(days * DAY),
        lastInboundAt: ago((days + 1) * DAY),
        lastOutboundAt: ago(days * DAY),
        firstResponseAt: ago((days + 1) * DAY),
        ...overrides,
    });

/** Odpowiedź `answeredDays` temu, przypomnienie `remindedDays` temu, klient dalej milczy. */
const reminded = (answeredDays: number, remindedDays: number, overrides: Partial<Lead> = {}) =>
    replied(answeredDays, { lastOutboundAt: ago(remindedDays * DAY), lastReminderAt: ago(remindedDays * DAY - 60_000), ...overrides });

const columnOf = (item: Lead, now = NOW): BoardColumnKey | null =>
    buildBoard([item], DEFAULT_STAGNATION, now).find((column) => column.cards.some((card) => card.lead.id === item.id))?.key ?? null;

const cardOf = (item: Lead) =>
    buildBoard([item], DEFAULT_STAGNATION, NOW).flatMap((column) => column.cards).find((card) => card.lead.id === item.id)!;

describe('przepływ sprawy przez tablicę', () => {
    it('klient napisał - Oczekuje na odpowiedź', () => {
        expect(columnOf(lead())).toBe('AWAITING_REPLY');
    });

    it('odpisaliśmy - Odpowiedzieliśmy', () => {
        expect(columnOf(replied(0.1))).toBe('REPLIED');
        expect(columnOf(replied(2.9))).toBe('REPLIED');
    });

    it('klient dopytuje - znowu Oczekuje na odpowiedź', () => {
        expect(columnOf(lead({ lastOutboundAt: ago(DAY), firstResponseAt: ago(2 * DAY), waitingSince: ago(HOUR), lastInboundAt: ago(HOUR) }))).toBe('AWAITING_REPLY');
    });

    it('po 3 dniach ciszy - Wymaga przypomnienia', () => {
        expect(columnOf(replied(3))).toBe('NEEDS_REMINDER');
        expect(columnOf(replied(9.9))).toBe('NEEDS_REMINDER');
    });

    it('przypomnieliśmy się - Odpowiedzieliśmy z plakietką przypomnienia', () => {
        const item = reminded(5, 0.1);
        expect(columnOf(item)).toBe('REPLIED');
        expect(cardOf(item).silence?.reminded).toBe(true);
    });

    it('po przypomnieniu nie prosi o drugie - Utrata dopiero 10 dni po przypomnieniu', () => {
        expect(columnOf(reminded(9, 6))).toBe('REPLIED');
        expect(columnOf(reminded(15, 9.9))).toBe('REPLIED');
        expect(columnOf(reminded(15, 10.01))).toBe('LAPSED');
    });

    it('bez przypomnienia - Utrata po 10 dniach od odpowiedzi', () => {
        expect(columnOf(replied(10))).toBe('LAPSED');
        expect(columnOf(replied(19.9))).toBe('LAPSED');
    });

    it('ucichła sprawa zostaje w Ucichło, dopóki ktoś jej nie zamknie', () => {
        // Dawniej znikała po kolejnych 10 dniach jako otwarta i wisiała w statystykach
        // „w toku" bez końca - teraz kolumna proponuje „Zamknij bez odzewu".
        expect(columnOf(replied(20))).toBe('LAPSED');
        expect(columnOf(reminded(45, 30))).toBe('LAPSED');
    });

    it('klient odpisał po przypomnieniu - Oczekuje, a przypomnienie przestaje liczyć się jako ostatnie słowo', () => {
        const item = reminded(8, 4, { replyState: 'AWAITING_OUR_REPLY', lastInboundAt: ago(HOUR), waitingSince: ago(HOUR) });
        expect(columnOf(item)).toBe('AWAITING_REPLY');
    });

    it('ręczna wiadomość długo po przypomnieniu zaczyna nową ciszę bez plakietki', () => {
        const item = reminded(12, 8, { lastOutboundAt: ago(4 * DAY) });
        expect(columnOf(item)).toBe('NEEDS_REMINDER');
        expect(cardOf(item).silence?.reminded).toBe(false);
    });

    it('sprawa zamknięta i sprawa z rezerwacją schodzą z tablicy', () => {
        expect(columnOf(replied(1, { status: 'LOST', closedAt: ago(HOUR) }))).toBeNull();
        expect(columnOf(replied(1, { status: 'CONFIRMED', appointmentId: 'apt-1' }))).toBeNull();
        // ...chyba że klient napisał po rezerwacji.
        expect(columnOf(lead({ status: 'CONFIRMED', appointmentId: 'apt-1' }))).toBe('AWAITING_REPLY');
    });

    it('sprawa z telefonu bez maila liczy ciszę od odnotowanego kontaktu', () => {
        const phone = lead({ source: 'PHONE', threadId: null, replyState: 'NO_CONVERSATION', waitingSince: null, lastInboundAt: null, firstResponseAt: ago(4 * DAY) });
        expect(columnOf(phone)).toBe('NEEDS_REMINDER');
        expect(canRemindByMail(phone)).toBe(false);
    });
});

describe('ręczne położenie', () => {
    it('obowiązuje, dopóki w rozmowie nie zdarzy się nic nowego', () => {
        const item = replied(1, { boardStage: 'LAPSED', boardStageAt: ago(HOUR) });
        expect(columnOf(item)).toBe('LAPSED');
        expect(cardOf(item).manual).toBe(true);
    });

    it('wiadomość klienta po przesunięciu zwraca kartę faktom', () => {
        const item = lead({ boardStage: 'NEEDS_REMINDER', boardStageAt: ago(5 * HOUR), lastInboundAt: ago(HOUR), waitingSince: ago(HOUR) });
        expect(manualStageInForce(item)).toBeNull();
        expect(columnOf(item)).toBe('AWAITING_REPLY');
    });

    it('wysłane przypomnienie też jest faktem', () => {
        const item = replied(4, { boardStage: 'LAPSED', boardStageAt: ago(DAY) });
        const after = leadAfterReminder(item, new Date(NOW).toISOString());
        expect(manualStageInForce(after)).toBeNull();
        expect(columnOf(after)).toBe('REPLIED');
        expect(cardOf(after).silence?.reminded).toBe(true);
    });

    it('ręcznie odłożona do Ucichło zostaje tam, dopóki ktoś jej nie zamknie', () => {
        // Dawniej znikała po 10 dniach od przesunięcia jako otwarta (decyzja z 2026-10-27, V227).
        const item = replied(11, { boardStage: 'LAPSED', boardStageAt: ago(10 * DAY) });
        expect(columnOf(item, NOW)).toBe('LAPSED');
    });
});

describe('przeciągnięcie', () => {
    it('ta sama kolumna niczego nie zmienia', () => {
        expect(planBoardMove(cardOf(lead()), 'AWAITING_REPLY', NOW)).toEqual({ kind: 'NONE' });
    });

    it('do kolumny innej niż z faktów - zapis położenia', () => {
        expect(planBoardMove(cardOf(replied(1)), 'LAPSED', NOW)).toEqual({ kind: 'STAGE', stage: 'LAPSED' });
    });

    it('z powrotem do kolumny z faktów - zdjęcie decyzji, nie przypięcie', () => {
        const item = replied(4, { boardStage: 'REPLIED', boardStageAt: ago(HOUR) });
        expect(planBoardMove(cardOf(item), 'NEEDS_REMINDER', NOW)).toEqual({ kind: 'STAGE', stage: null });
    });

    /**
     * Podgląd w trakcie przeciągania i zapis optymistyczny liczą tę samą funkcją, więc
     * karta po upuszczeniu musi stać dokładnie w kolumnie, w której zrobiło się dla niej miejsce.
     */
    it('lead po przesunięciu stoi w kolumnie docelowej', () => {
        const nowIso = new Date(NOW).toISOString();
        const targets: BoardColumnKey[] = ['AWAITING_REPLY', 'REPLIED', 'NEEDS_REMINDER', 'LAPSED'];
        for (const source of [lead(), replied(1), replied(5), replied(12), reminded(6, 1)]) {
            for (const target of targets) {
                const moved = leadAfterMove(source, planBoardMove(cardOf(source), target, NOW), nowIso);
                expect(columnOf(moved)).toBe(target);
            }
        }
    });
});

describe('budowa tablicy', () => {
    it('ten sam lead z dwóch odpowiedzi - wygrywa nowszy zapis', () => {
        const older = replied(1, { id: 'x', updatedAt: ago(2 * HOUR) });
        const newer = { ...older, status: 'LOST' as const, closedAt: ago(HOUR), updatedAt: ago(HOUR) };
        expect(buildBoard([older, newer], DEFAULT_STAGNATION, NOW).flatMap((column) => column.cards)).toHaveLength(0);
    });

    it('najdłużej czekające na górze', () => {
        const fresh = replied(4, { id: 'fresh' });
        const old = replied(8, { id: 'old' });
        const column = buildBoard([fresh, old], DEFAULT_STAGNATION, NOW).find((c) => c.key === 'NEEDS_REMINDER')!;
        expect(column.cards.map((card) => card.lead.id)).toEqual(['old', 'fresh']);
    });

    it('suma wycen bez przeliczania - z przyjętych pozycji, bez sugestii AI', () => {
        const a = replied(4, quoted(190000, 29900));
        const b = replied(5, quoted(154471));
        expect(buildBoard([a, b], DEFAULT_STAGNATION, NOW).find((c) => c.key === 'NEEDS_REMINDER')!.value).toBe(344471);
    });

    it('cisza liczy się od naszej OSTATNIEJ wiadomości, nie od początku oczekiwania', () => {
        // Serwer podaje waitingSince = pierwsza nasza wiadomość po ostatniej klienta.
        const item = replied(6, { lastOutboundAt: ago(DAY) });
        const urgency = describeLeadUrgency(item, DEFAULT_STAGNATION, NOW);
        expect(urgency.turn).toBe('CLIENT');
        expect(columnOf(item)).toBe('REPLIED');
    });
});
