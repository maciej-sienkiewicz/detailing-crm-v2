import { describe, expect, it } from 'vitest';
import type { Lead } from '../types';
import { DEFAULT_STAGNATION } from './leadUrgency';
import {
    boardColumnOf,
    buildBoard,
    leadAfterMove,
    manualStageInForce,
    planBoardMove,
    type BoardColumnKey,
} from './leadBoard';

const HOUR = 3_600_000;
const DAY = 86_400_000;
const NOW = Date.parse('2026-10-18T12:00:00Z');
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
    createdAt: ago(3 * DAY),
    updatedAt: ago(2 * HOUR),
    ...overrides,
});

/** My napisaliśmy ostatni - ruch jest u klienta od `daysAgo`. */
const waitingOnClient = (daysAgo: number, overrides: Partial<Lead> = {}) =>
    lead({
        replyState: 'AWAITING_CLIENT_REPLY',
        waitingSince: ago(daysAgo * DAY),
        lastInboundAt: ago((daysAgo + 1) * DAY),
        lastOutboundAt: ago(daysAgo * DAY),
        firstResponseAt: ago((daysAgo + 1) * DAY),
        ...overrides,
    });

const columnOf = (item: Lead): BoardColumnKey => {
    const board = buildBoard([item], DEFAULT_STAGNATION, NOW);
    return board.find((column) => column.cards.some((card) => card.lead.id === item.id))!.key;
};

const cardOf = (item: Lead) =>
    buildBoard([item], DEFAULT_STAGNATION, NOW).flatMap((column) => column.cards).find((card) => card.lead.id === item.id)!;

describe('kolumny z faktów', () => {
    it('klient napisał ostatni - Oczekuje na odpowiedź', () => {
        expect(columnOf(lead())).toBe('AWAITING_REPLY');
    });

    it('odpisaliśmy niedawno - Odpowiedzieliśmy', () => {
        expect(columnOf(waitingOnClient(1))).toBe('REPLIED');
    });

    it('cisza klienta po progu studia - Ucichło', () => {
        expect(columnOf(waitingOnClient(6))).toBe('SILENT');
    });

    it('rezerwacja w kalendarzu - Zakończono, chyba że klient napisał po niej', () => {
        expect(columnOf(waitingOnClient(1, { appointmentId: 'apt-1', status: 'CONFIRMED' }))).toBe('DONE');
        expect(columnOf(lead({ appointmentId: 'apt-1', status: 'CONFIRMED' }))).toBe('AWAITING_REPLY');
    });

    it('sprawa zamknięta - Zakończono, ale tylko przez 30 dni', () => {
        const recent = lead({ status: 'LOST', closedAt: ago(3 * DAY) });
        const old = lead({ status: 'COMPLETED', closedAt: ago(45 * DAY) });
        const board = buildBoard([recent, old], DEFAULT_STAGNATION, NOW);
        const done = board.find((column) => column.key === 'DONE')!;
        expect(done.cards.map((card) => card.lead.id)).toEqual([recent.id]);
    });
});

describe('ręczne położenie', () => {
    it('obowiązuje, dopóki w rozmowie nie zdarzy się nic nowego', () => {
        const item = waitingOnClient(1, { boardStage: 'NEEDS_REMINDER', boardStageAt: ago(HOUR) });
        expect(columnOf(item)).toBe('NEEDS_REMINDER');
        expect(cardOf(item).manual).toBe(true);
    });

    it('wiadomość klienta po przesunięciu zwraca kartę faktom', () => {
        const item = lead({ boardStage: 'NEEDS_REMINDER', boardStageAt: ago(5 * HOUR), lastInboundAt: ago(HOUR), waitingSince: ago(HOUR) });
        expect(manualStageInForce(item)).toBeNull();
        expect(columnOf(item)).toBe('AWAITING_REPLY');
    });

    it('nasza wiadomość i zgłoszony dług też są faktem', () => {
        const replied = lead({ boardStage: 'SILENT', boardStageAt: ago(5 * HOUR), lastOutboundAt: ago(HOUR) });
        const owed = waitingOnClient(1, { boardStage: 'REPLIED', boardStageAt: ago(5 * HOUR), owedSince: ago(HOUR) });
        expect(manualStageInForce(replied)).toBeNull();
        expect(manualStageInForce(owed)).toBeNull();
    });

    it('status bije położenie - zamknięta sprawa jest w Zakończono', () => {
        const item = lead({ status: 'LOST', closedAt: ago(HOUR), boardStage: 'SILENT', boardStageAt: ago(30 * 60_000) });
        expect(columnOf(item)).toBe('DONE');
    });

    it('położenie zgodne z faktami nie jest oznaczone jako ręczne', () => {
        const item = lead({ boardStage: 'AWAITING_REPLY', boardStageAt: ago(HOUR) });
        expect(cardOf(item).manual).toBe(false);
    });
});

describe('przeciągnięcie', () => {
    it('ta sama kolumna niczego nie zmienia', () => {
        expect(planBoardMove(cardOf(lead()), 'AWAITING_REPLY')).toEqual({ kind: 'NONE' });
    });

    it('do kolumny innej niż z faktów - zapis położenia', () => {
        expect(planBoardMove(cardOf(waitingOnClient(1)), 'NEEDS_REMINDER')).toEqual({ kind: 'STAGE', stage: 'NEEDS_REMINDER' });
    });

    it('z powrotem do kolumny z faktów - zdjęcie decyzji, nie przypięcie', () => {
        const item = waitingOnClient(1, { boardStage: 'NEEDS_REMINDER', boardStageAt: ago(HOUR) });
        expect(planBoardMove(cardOf(item), 'REPLIED')).toEqual({ kind: 'STAGE', stage: null });
    });

    it('do Zakończono otwartej sprawy - pytanie o wynik', () => {
        expect(planBoardMove(cardOf(waitingOnClient(6)), 'DONE')).toEqual({ kind: 'CLOSE' });
    });

    it('z Zakończono - zapis położenia, serwer otwiera sprawę ponownie', () => {
        const item = lead({ status: 'LOST', closedAt: ago(DAY) });
        const move = planBoardMove(cardOf(item), 'REPLIED');
        expect(move).toEqual({ kind: 'STAGE', stage: 'REPLIED' });
        const after = leadAfterMove(item, move, new Date(NOW).toISOString());
        expect(after.status).toBe('IN_PROGRESS');
        expect(after.closedAt).toBeNull();
    });

    /**
     * Podgląd w trakcie przeciągania i zapis optymistyczny liczą tę samą funkcją, więc
     * karta po upuszczeniu musi stać dokładnie w kolumnie, w której zrobiło się dla niej miejsce.
     */
    it('lead po przesunięciu stoi w kolumnie docelowej', () => {
        const nowIso = new Date(NOW).toISOString();
        const targets: BoardColumnKey[] = ['AWAITING_REPLY', 'REPLIED', 'SILENT', 'NEEDS_REMINDER', 'DONE'];
        for (const source of [lead(), waitingOnClient(1), waitingOnClient(6), lead({ status: 'COMPLETED', closedAt: ago(DAY) })]) {
            for (const target of targets) {
                const card = cardOf(source);
                const moved = leadAfterMove(source, planBoardMove(card, target), nowIso);
                expect(columnOf(moved)).toBe(target === card.column ? card.column : target);
            }
        }
    });

    it('nowo odłożone przypomnienie staje na końcu kolejki', () => {
        const older = waitingOnClient(2, { id: 'older', boardStage: 'NEEDS_REMINDER', boardStageAt: ago(DAY) });
        const fresh = leadAfterMove(waitingOnClient(1, { id: 'fresh' }), { kind: 'STAGE', stage: 'NEEDS_REMINDER' }, new Date(NOW).toISOString());
        const column = buildBoard([fresh, older], DEFAULT_STAGNATION, NOW).find((c) => c.key === 'NEEDS_REMINDER')!;
        expect(column.cards.map((card) => card.lead.id)).toEqual(['older', 'fresh']);
    });
});

describe('budowa tablicy', () => {
    it('ten sam lead z dwóch odpowiedzi - wygrywa nowszy zapis', () => {
        const open = lead({ id: 'x', updatedAt: ago(2 * HOUR) });
        const closed = { ...open, status: 'LOST' as const, closedAt: ago(HOUR), updatedAt: ago(HOUR) };
        const board = buildBoard([open, closed], DEFAULT_STAGNATION, NOW);
        expect(board.flatMap((column) => column.cards)).toHaveLength(1);
        expect(boardColumnOf(closed, cardOf(closed).urgency)).toBe('DONE');
        expect(board.find((column) => column.key === 'DONE')!.cards).toHaveLength(1);
    });

    it('najdłużej czekające na górze', () => {
        const fresh = lead({ id: 'fresh', waitingSince: ago(HOUR), lastInboundAt: ago(HOUR) });
        const old = lead({ id: 'old', waitingSince: ago(20 * HOUR), lastInboundAt: ago(20 * HOUR) });
        const column = buildBoard([fresh, old], DEFAULT_STAGNATION, NOW).find((c) => c.key === 'AWAITING_REPLY')!;
        expect(column.cards.map((card) => card.lead.id)).toEqual(['old', 'fresh']);
    });

    it('suma wycen bez przeliczania', () => {
        const a = waitingOnClient(6, { estimatedValue: 190000 });
        const b = waitingOnClient(7, { estimatedValue: 154471 });
        expect(buildBoard([a, b], DEFAULT_STAGNATION, NOW).find((c) => c.key === 'SILENT')!.value).toBe(344471);
    });
});
