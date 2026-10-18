// src/modules/comms/utils/leadBoard.ts
// Tablica spraw (kanban) - w której kolumnie stoi sprawa i co znaczy przeciągnięcie karty.
//
// ── Kolumny wynikają z faktów, przeciągnięcie jest wyjątkiem ───────────────────
//
// „Oczekuje na odpowiedź", „Odpowiedzieliśmy" i „Ucichło" to te same trzy stany, które
// lista spraw liczy z korespondencji (leadUrgency.ts: czyj ruch i jak dawno). Tablica
// NIE jest drugim źródłem prawdy - inaczej klient, który odpisał, wisiałby w
// „Odpowiedzieliśmy" do chwili, aż ktoś przeciągnie kartę ręką, a tablica zamieniłaby
// się w drugą listę do pilnowania.
//
// Człowiek wie jednak rzeczy, których rozmowa nie zna: odpisał z prywatnego telefonu,
// rozmowa ucichła po jednym zdaniu, trzeba się przypomnieć. Przeciągnięcie zapisuje tę
// wiedzę (boardStage + boardStageAt) i obowiązuje DO NASTĘPNEGO FAKTU - wiadomości
// w dowolną stronę albo zgłoszonego długu. Ten sam wzorzec co dług studia: kasuje go
// dowód, nie człowiek.
//
// „Wymaga przypomnienia" istnieje wyłącznie z decyzji człowieka - z korespondencji nie
// da się wyczytać, że TERAZ jest dobry moment na przypomnienie.
//
// „Zakończono" niesie status (zrealizowana, przegrana z powodem, rezerwacja w kalendarzu),
// nie położenie karty. Przeciągnięcie do niej zamyka sprawę, a wyciągnięcie z niej -
// otwiera ponownie (LeadBoardStageService po stronie serwera).
//
// ── Kolejność w kolumnie nie jest ręczna ───────────────────────────────────────
//
// Najdłużej czekające na górze, jak w kolejce. Karta upuszczona w kolumnie ląduje tam,
// gdzie stawia ją ta kolejność - i dokładnie tam robi się dla niej miejsce już w trakcie
// przeciągania (podgląd liczy tablicę z kartą przesuniętą „na próbę"), więc po
// upuszczeniu nic nie przeskakuje.
import type { Lead, LeadBoardStage, LeadStatus } from '../types';
import { CLOSED_STATUSES } from './leadFormat';
import {
    DEFAULT_STAGNATION,
    describeLeadUrgency,
    type LeadUrgency,
    type StagnationThresholds,
} from './leadUrgency';

const DAY_MS = 86_400_000;

export type BoardColumnKey = LeadBoardStage | 'DONE';

export interface BoardColumnMeta {
    key: BoardColumnKey;
    title: string;
    /** Jedno zdanie pod nagłówkiem pustej kolumny - co tu trafia. */
    empty: string;
    /** Odcień kolumny: kropka przy nagłówku i plakietka licznika (bez wypełnień, CLAUDE.md §2). */
    tone: { dot: string; tint: string; ink: string };
    /** Czy suma wycen ma tu sens - wyłącznie tam, gdzie sprawy przeszły już przez wycenę. */
    showsValue: boolean;
}

export const BOARD_COLUMNS: BoardColumnMeta[] = [
    {
        key: 'AWAITING_REPLY',
        title: 'Oczekuje na odpowiedź',
        empty: 'Nikt nie czeka na naszą odpowiedź.',
        tone: { dot: '#0ea5e9', tint: '#e7f6fd', ink: '#0e6fa0' },
        showsValue: false,
    },
    {
        key: 'REPLIED',
        title: 'Odpowiedzieliśmy',
        empty: 'Tu trafiają sprawy, w których piłka jest u klienta.',
        tone: { dot: '#8b5cf6', tint: '#f3effe', ink: '#6d28d9' },
        showsValue: true,
    },
    {
        key: 'SILENT',
        title: 'Ucichło',
        empty: 'Żaden klient nie milczy dłużej niż próg studia.',
        tone: { dot: '#f59e0b', tint: '#fef6e4', ink: '#b45309' },
        showsValue: true,
    },
    {
        key: 'NEEDS_REMINDER',
        title: 'Wymaga przypomnienia',
        empty: 'Przeciągnij tu sprawę, o której trzeba klientowi przypomnieć.',
        tone: { dot: '#f43f5e', tint: '#fff0f2', ink: '#be123c' },
        showsValue: true,
    },
    {
        key: 'DONE',
        title: 'Zakończono',
        empty: 'Sprawy z rezerwacją i zamknięte w ostatnich 30 dniach.',
        tone: { dot: '#22c55e', tint: '#f0fdf4', ink: '#15803d' },
        showsValue: false,
    },
];

export const boardColumnMeta = (key: BoardColumnKey): BoardColumnMeta =>
    BOARD_COLUMNS.find((column) => column.key === key)!;

/** Ile dni zamknięta sprawa stoi jeszcze w „Zakończono" - starsze są w archiwum. */
export const DONE_WINDOW_DAYS = 30;

const time = (iso: string | null | undefined): number => (iso ? new Date(iso).getTime() : 0);

/**
 * Ręczne położenie, o ile nadal obowiązuje.
 *
 * Fakt PÓŹNIEJSZY niż przesunięcie unieważnia je: wiadomość klienta, nasza wiadomość,
 * pierwsza reakcja (odnotowany telefon) albo zgłoszony dług. Równy czas nie unieważnia -
 * przesunięcie zrobione w tej samej chwili co wysyłka jest świadomą decyzją o niej.
 *
 * ⚠️ Kolejny telefon po pierwszym nie przesuwa żadnego z tych pól (backend zna tylko
 * pierwszą reakcję), więc przesunięcia nie zdejmie - to samo przybliżenie, które opisuje
 * leadUrgency.ts.
 */
export function manualStageInForce(lead: Pick<Lead, 'boardStage' | 'boardStageAt' | 'lastInboundAt' | 'lastOutboundAt' | 'firstResponseAt' | 'owedSince'>): LeadBoardStage | null {
    if (!lead.boardStage || !lead.boardStageAt) return null;
    const placedAt = time(lead.boardStageAt);
    const facts = [lead.lastInboundAt, lead.lastOutboundAt, lead.firstResponseAt, lead.owedSince];
    return facts.some((fact) => fact && time(fact) > placedAt) ? null : lead.boardStage;
}

/** Kolumna wynikająca z samych faktów - bez ręcznego położenia. */
export function factColumnOf(lead: Lead, urgency: LeadUrgency): BoardColumnKey {
    if (CLOSED_STATUSES.has(lead.status)) return 'DONE';
    // Rezerwacja domyka sprzedaż - chyba że klient napisał po niej coś, na co nikt nie odpisał.
    if (lead.appointmentId && urgency.turn !== 'OURS') return 'DONE';
    if (urgency.turn === 'OURS') return 'AWAITING_REPLY';
    // „Ucichło" to ten sam ruch klienta po przekroczeniu progu studia - ton liczy reguła pilności.
    return urgency.tone === 'stale' ? 'SILENT' : 'REPLIED';
}

export function boardColumnOf(lead: Lead, urgency: LeadUrgency): BoardColumnKey {
    // Status bije położenie: zamknięta sprawa stoi w „Zakończono", cokolwiek zapisano wcześniej.
    if (CLOSED_STATUSES.has(lead.status)) return 'DONE';
    return manualStageInForce(lead) ?? factColumnOf(lead, urgency);
}

export interface BoardCard {
    lead: Lead;
    urgency: LeadUrgency;
    column: BoardColumnKey;
    /** Karta stoi tu z decyzji człowieka, nie z faktów - karta mówi o tym jednym słowem. */
    manual: boolean;
}

export interface BoardColumn extends BoardColumnMeta {
    cards: BoardCard[];
    /** Suma wycen (grosze brutto z serwera, bez przeliczania - CLAUDE.md §1). */
    value: number;
}

const byWaiting = (a: BoardCard, b: BoardCard) => b.urgency.waitingMs - a.urgency.waitingMs;
const byPlacement = (a: BoardCard, b: BoardCard) => time(a.lead.boardStageAt) - time(b.lead.boardStageAt);
const byClosing = (a: BoardCard, b: BoardCard) =>
    time(b.lead.closedAt ?? b.lead.updatedAt) - time(a.lead.closedAt ?? a.lead.updatedAt);

const ORDER: Record<BoardColumnKey, (a: BoardCard, b: BoardCard) => number> = {
    AWAITING_REPLY: byWaiting,
    REPLIED: byWaiting,
    SILENT: byWaiting,
    // Przypomnienie odłożone najdawniej na górze; nowo upuszczona karta staje na końcu kolejki.
    NEEDS_REMINDER: byPlacement,
    // Najświeższe rozstrzygnięcie na górze - do niego się wraca, nie do sprzed miesiąca.
    DONE: byClosing,
};

/**
 * Pięć kolumn z leadów otwartych i niedawno zamkniętych.
 *
 * Ten sam lead bywa w dwóch odpowiedziach naraz (zamknięty przed chwilą, a lista
 * otwartych jeszcze się nie odświeżyła) - wygrywa nowszy zapis.
 *
 * [now] wstrzykiwane wyłącznie dla testów - w aplikacji zawsze bieżąca chwila.
 */
export function buildBoard(
    leads: Lead[],
    thresholds: StagnationThresholds = DEFAULT_STAGNATION,
    now: number = Date.now()
): BoardColumn[] {
    const unique = new Map<string, Lead>();
    for (const lead of leads) {
        const seen = unique.get(lead.id);
        if (!seen || time(lead.updatedAt) >= time(seen.updatedAt)) unique.set(lead.id, lead);
    }

    const buckets = new Map<BoardColumnKey, BoardCard[]>(BOARD_COLUMNS.map((column) => [column.key, []]));
    const doneSince = now - DONE_WINDOW_DAYS * DAY_MS;

    for (const lead of unique.values()) {
        if (CLOSED_STATUSES.has(lead.status) && time(lead.closedAt ?? lead.updatedAt) < doneSince) continue;
        const urgency = describeLeadUrgency(lead, thresholds, now);
        const column = boardColumnOf(lead, urgency);
        const manual = column !== 'DONE' && manualStageInForce(lead) === column && factColumnOf(lead, urgency) !== column;
        buckets.get(column)!.push({ lead, urgency, column, manual });
    }

    return BOARD_COLUMNS.map((meta) => {
        const cards = buckets.get(meta.key)!.sort(ORDER[meta.key]);
        return { ...meta, cards, value: cards.reduce((sum, card) => sum + card.lead.estimatedValue, 0) };
    });
}

/**
 * Co zrobić z kartą upuszczoną w kolumnie [target].
 *
 *  - NONE  - ta sama kolumna; kolejność w kolumnie nie jest ręczna.
 *  - STAGE - zapis położenia; null, gdy kolumna docelowa jest tą, którą wyznaczają fakty
 *            (przesunięcie „z powrotem" zdejmuje decyzję, zamiast ją przypinać - inaczej
 *            sprawa przypięta do „Odpowiedzieliśmy" nie ucichłaby nigdy sama).
 *  - CLOSE - „Zakończono" dla sprawy, którą fakty trzymają gdzie indziej: trzeba zapytać,
 *            jak się skończyła (wygrana / przegrana z powodem).
 */
export type BoardMove =
    | { kind: 'NONE' }
    | { kind: 'STAGE'; stage: LeadBoardStage | null }
    | { kind: 'CLOSE' };

export function planBoardMove(card: BoardCard, target: BoardColumnKey): BoardMove {
    if (target === card.column) return { kind: 'NONE' };
    const facts = factColumnOf(card.lead, card.urgency);
    if (target === 'DONE') return facts === 'DONE' ? { kind: 'STAGE', stage: null } : { kind: 'CLOSE' };
    return { kind: 'STAGE', stage: facts === target ? null : target };
}

/**
 * Lead po przesunięciu - dla podglądu w trakcie przeciągania i dla zapisu optymistycznego.
 *
 * Jedna funkcja dla obu, bo to ona gwarantuje, że karta po upuszczeniu stoi dokładnie
 * tam, gdzie zrobiło się dla niej miejsce.
 */
export function leadAfterMove(lead: Lead, move: BoardMove, nowIso: string, closeAs: LeadStatus = 'COMPLETED'): Lead {
    if (move.kind === 'NONE') return lead;
    if (move.kind === 'CLOSE') {
        return { ...lead, status: closeAs, closedAt: nowIso, boardStage: null, boardStageAt: null, updatedAt: nowIso };
    }
    const reopened = CLOSED_STATUSES.has(lead.status) && move.stage !== null;
    return {
        ...lead,
        ...(reopened ? { status: 'IN_PROGRESS' as LeadStatus, closedAt: null } : {}),
        boardStage: move.stage,
        boardStageAt: move.stage ? nowIso : null,
        updatedAt: nowIso,
    };
}
