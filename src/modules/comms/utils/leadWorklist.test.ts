import { describe, expect, it } from 'vitest';
import { buildWorklist, caseCount, overdueCount } from './leadWorklist';
import { DEFAULT_STAGNATION } from './leadUrgency';
import type { Lead } from '../types';

const HOUR = 3_600_000;
const DAY = 86_400_000;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** Pełny lead - sekcje czytają z niego także kwotę, więc atrapa musi ją mieć. */
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
        firstResponseAt: ago(daysAgo * DAY),
        ...overrides,
    });

describe('podział kolejki na sekcje', () => {
    it('rozdziela sprawy na trzy sekcje po tym, czyj jest ruch', () => {
        const mine = lead({ waitingSince: ago(3 * HOUR) });
        const quiet = waitingOnClient(2);
        // Próg ciszy to 120 h = 5 dni; siedem dni jest wyraźnie po drugiej stronie.
        const gone = waitingOnClient(7);

        const worklist = buildWorklist([quiet, gone, mine]);

        expect(worklist.ours.entries.map((e) => e.lead.id)).toEqual([mine.id]);
        expect(worklist.silent.entries.map((e) => e.lead.id)).toEqual([gone.id]);
        expect(worklist.client.entries.map((e) => e.lead.id)).toEqual([quiet.id]);
        expect(worklist.total).toBe(3);
    });

    it('sprawy zamknięte nie trafiają do żadnej sekcji - mieszkają w archiwum', () => {
        const worklist = buildWorklist([
            lead({ status: 'COMPLETED' }),
            lead({ status: 'LOST' }),
            lead({ status: 'NO_SHOW' }),
        ]);

        expect(worklist.total).toBe(0);
        expect(worklist.sections).toHaveLength(0);
        expect(worklist.head).toBeNull();
    });

    it('puste sekcje wypadają z listy do wyrenderowania', () => {
        const worklist = buildWorklist([lead()]);

        expect(worklist.sections.map((s) => s.key)).toEqual(['OURS']);
    });

    it('wewnątrz sekcji najdłużej czekające stoi na górze', () => {
        const fresh = lead({ waitingSince: ago(1 * HOUR) });
        const old = lead({ waitingSince: ago(4 * DAY) });
        const middle = lead({ waitingSince: ago(6 * HOUR) });

        const worklist = buildWorklist([fresh, middle, old]);

        expect(worklist.ours.entries.map((e) => e.lead.id)).toEqual([old.id, middle.id, fresh.id]);
    });
});

describe('sprawa, od której zaczyna się dzień', () => {
    it('to najstarsza zaległość, a nie najdroższa sprawa', () => {
        const rich = lead({ waitingSince: ago(2 * HOUR), estimatedValue: 900_000 });
        const old = lead({ waitingSince: ago(5 * DAY), estimatedValue: 10_000 });

        expect(buildWorklist([rich, old]).head?.lead.id).toBe(old.id);
    });

    it('gdy nikt nie czeka na nas, prowadzi do najstarszej ucichłej rozmowy', () => {
        const quiet = waitingOnClient(2);
        const gone = waitingOnClient(9);

        expect(buildWorklist([quiet, gone]).head?.lead.id).toBe(gone.id);
    });

    it('gdy nie ma ani zaległości, ani ciszy - nie ma od czego zaczynać', () => {
        expect(buildWorklist([waitingOnClient(1)]).head).toBeNull();
    });
});

describe('dług studia w sekcjach', () => {
    /*
     * Klient zadzwonił i poprosił o ofertę mailem. Korespondencja mówi „piłka
     * u klienta" - i to jest ten jeden przypadek, w którym mówi nieprawdę.
     */
    it('sprawa z ręcznie zgłoszonym długiem stoi w „Czeka na Ciebie"', () => {
        const owed = waitingOnClient(6, { owedSince: ago(2 * DAY) });

        const worklist = buildWorklist([owed]);

        expect(worklist.ours.entries).toHaveLength(1);
        expect(worklist.silent.entries).toHaveLength(0);
        expect(worklist.ours.entries[0].urgency.owed).toBe(true);
    });

    it('nasza wiadomość wysłana po zgłoszeniu długu zdejmuje go z sekcji', () => {
        const settled = waitingOnClient(6, {
            owedSince: ago(3 * DAY),
            lastOutboundAt: ago(1 * DAY),
        });

        const worklist = buildWorklist([settled]);

        expect(worklist.ours.entries).toHaveLength(0);
        expect(worklist.silent.entries).toHaveLength(1);
    });

    it('dług liczy wiek od chwili obietnicy, a nie od ostatniej wiadomości', () => {
        const owed = waitingOnClient(9, { owedSince: ago(1 * DAY) });

        const [entry] = buildWorklist([owed]).ours.entries;

        // Dziewięć dni ciszy, ale obietnica ma jeden dzień - i to ona jest długiem.
        expect(entry.urgency.waitingMs).toBeGreaterThanOrEqual(DAY - HOUR);
        expect(entry.urgency.waitingMs).toBeLessThan(2 * DAY);
    });
});

describe('kwoty i liczniki', () => {
    it('suma sekcji „Ucichło" liczy pieniądze do odzyskania', () => {
        const worklist = buildWorklist([
            waitingOnClient(7, { estimatedValue: 890_000 }),
            waitingOnClient(8, { estimatedValue: 420_000 }),
            waitingOnClient(1, { estimatedValue: 100_000 }),
        ]);

        expect(worklist.silent.value).toBe(1_310_000);
        expect(worklist.client.value).toBe(100_000);
    });

    it('licznik przekroczonego progu liczy tylko to, co przekroczyło', () => {
        const worklist = buildWorklist([
            lead({ waitingSince: ago(2 * HOUR) }),
            lead({ waitingSince: ago(30 * HOUR) }),
            lead({ waitingSince: ago(3 * DAY) }),
        ]);

        expect(worklist.ours.entries).toHaveLength(3);
        expect(overdueCount(worklist, DEFAULT_STAGNATION)).toBe(2);
    });

    it('odmienia słowo „sprawa" tak, jak mówi się po polsku', () => {
        expect(caseCount(1)).toBe('1 sprawa');
        expect(caseCount(3)).toBe('3 sprawy');
        expect(caseCount(5)).toBe('5 spraw');
        expect(caseCount(12)).toBe('12 spraw');
        expect(caseCount(22)).toBe('22 sprawy');
    });
});
