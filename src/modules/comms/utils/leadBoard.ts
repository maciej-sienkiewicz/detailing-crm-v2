// src/modules/comms/utils/leadBoard.ts
// Tablica spraw (kanban) - w której kolumnie stoi sprawa i co znaczy przeciągnięcie karty.
//
// ── Przepływ (decyzja biznesu 2026-10-19) ─────────────────────────────────────
//
//   klient napisał                 → Czeka na nas
//   odpisaliśmy                    → Czeka na klienta
//   3 dni ciszy klienta            → Do przypomnienia
//   przypomnieliśmy się            → Czeka na klienta, z plakietką przypomnienia
//   10 dni ciszy                   → Ucichło
//   10 kolejnych dni               → karta schodzi z tablicy (na liście zostaje w „Ucichło")
//
// Nazwy kolumn są te same co grup listy spraw (leadWorklist.ts) - od 25.10.2026. Dawniej
// tablica mówiła „Oczekuje na odpowiedź / Odpowiedzieliśmy / Utrata", a lista o tych samych
// sprawach „Czeka na nas / Czeka na klienta / Ucichło": dwa słowniki na jedną rzecz,
// a czerwona „Utrata" sugerowała sprawę straconą, choć jej status się nie zmienia.
//
// Ciszę liczymy od NASZEJ OSTATNIEJ wiadomości. Przypomnienie jest jedno na jedną ciszę:
// po nim karta czeka w „Czeka na klienta" do 10. dnia od przypomnienia i drugi raz o nie
// nie prosi. Bez przypomnienia - do „Ucichło" po 10 dniach od naszej odpowiedzi.
//
// „Ucichło" to sam widok: status sprawy zostaje, jaki był. Zamkniętej sprawy nic w systemie
// nie otwiera ponownie, więc automatyczne zamykanie zgubiłoby wiadomość klienta, który
// odpisze po trzech tygodniach - a tak jego karta po prostu wraca do „Czeka na nas".
//
// ── Przeciągnięcie jest wyjątkiem ─────────────────────────────────────────────
//
// Człowiek wie rzeczy, których rozmowa nie zna (odpisał z prywatnego telefonu, sprawa
// jest już stracona). Przeciągnięcie zapisuje tę wiedzę (boardStage + boardStageAt)
// i obowiązuje DO NASTĘPNEGO FAKTU - wiadomości w dowolną stronę albo zgłoszonego długu.
// Ten sam wzorzec co dług studia: kasuje go dowód, nie człowiek.
//
// ── Kolejność w kolumnie nie jest ręczna ──────────────────────────────────────
//
// Najdłużej czekające na górze, jak w kolejce. Karta upuszczona w kolumnie ląduje tam,
// gdzie stawia ją ta kolejność - i dokładnie tam robi się dla niej miejsce już w trakcie
// przeciągania (podgląd liczy tablicę z kartą przesuniętą „na próbę"), więc po
// upuszczeniu nic nie przeskakuje.
import type { Lead, LeadBoardStage } from '../types';
import { CLOSED_STATUSES } from './leadFormat';
import { quoteTotal } from './leadServiceLines';
import {
    DEFAULT_STAGNATION,
    describeLeadUrgency,
    type LeadUrgency,
    type StagnationThresholds,
} from './leadUrgency';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Po ilu dniach ciszy klienta trzeba się przypomnieć. */
export const REMIND_AFTER_DAYS = 3;
/**
 * Po ilu dniach ciszy (od odpowiedzi albo od przypomnienia) sprawa ucichła. Karta zostaje
 * w „Ucichło", dopóki ktoś jej nie zamknie (decyzja biznesu 2026-10-27, V227): dawniej
 * znikała po kolejnych 10 dniach jako otwarta i wisiała w statystykach „w toku" bez końca.
 * Te same progi liczy serwer (`LeadFollowUpService`) do porannego podsumowania.
 */
export const LAPSE_AFTER_DAYS = 10;

/**
 * Przypomnienie stempluje serwer PO wysłaniu maila, więc stempel bywa o chwilę późniejszy
 * niż sama wiadomość w rozmowie. Tyle zapasu, żeby przypomnienie nadal było „ostatnią
 * wiadomością", a ręczny mail dopisany godzinę później już nie.
 */
const REMINDER_TOLERANCE_MS = 10 * MINUTE_MS;

export type BoardColumnKey = LeadBoardStage;

export interface BoardColumnMeta {
    key: BoardColumnKey;
    title: string;
    /** Jedno zdanie w pustej kolumnie - co tu trafia. */
    empty: string;
    /** Odcień kolumny: kropka przy nagłówku i plakietka licznika (bez wypełnień, CLAUDE.md §2). */
    tone: { dot: string; tint: string; ink: string };
    /** Czy suma wycen ma tu sens - wyłącznie tam, gdzie sprawy przeszły już przez wycenę. */
    showsValue: boolean;
}

export const BOARD_COLUMNS: BoardColumnMeta[] = [
    {
        key: 'AWAITING_REPLY',
        title: 'Czeka na nas',
        empty: 'Nikt nie czeka na naszą odpowiedź.',
        tone: { dot: '#0369a1', tint: '#e7f6fd', ink: '#0e6fa0' },
        showsValue: false,
    },
    {
        key: 'REPLIED',
        title: 'Czeka na klienta',
        empty: 'Tu trafiają leady, w których piłka jest u klienta.',
        tone: { dot: '#8b5cf6', tint: '#f3effe', ink: '#6d28d9' },
        showsValue: true,
    },
    {
        key: 'NEEDS_REMINDER',
        title: 'Do przypomnienia',
        empty: `Tu trafiają leady po ${REMIND_AFTER_DAYS} dniach ciszy klienta.`,
        tone: { dot: '#f59e0b', tint: '#fef6e4', ink: '#b45309' },
        showsValue: true,
    },
    {
        key: 'LAPSED',
        title: 'Ucichło',
        empty: `Tu trafiają leady po ${LAPSE_AFTER_DAYS} dniach ciszy klienta. Zostają, dopóki ich nie zamkniesz.`,
        // Szarość, nie czerwień: sprawa ucichła, ale nie przepadła - jej status się nie zmienia.
        tone: { dot: '#94a3b8', tint: '#f1f5f9', ink: '#475569' },
        showsValue: true,
    },
];

export const boardColumnMeta = (key: BoardColumnKey): BoardColumnMeta =>
    BOARD_COLUMNS.find((column) => column.key === key)!;

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

/** Cisza klienta: od kiedy (nasza ostatnia wiadomość) i czy tą wiadomością było przypomnienie. */
export interface Silence {
    since: number;
    ms: number;
    reminded: boolean;
}

/**
 * Od kiedy milczy klient - liczone od naszej OSTATNIEJ wiadomości.
 *
 * `waitingSince` z serwera to początek oczekiwania (pierwsza nasza wiadomość po ostatniej
 * klienta), a nie ostatnia - po przypomnieniu cisza liczyłaby się od odpowiedzi sprzed
 * tygodnia. Stąd najpóźniejsza z naszych dat: ostatnia wysłana, przypomnienie (jeśli
 * późniejsze niż ostatnia wiadomość klienta) i - dla spraw bez rozmowy mailowej - początek
 * oczekiwania (odnotowany telefon).
 */
export function silenceOf(lead: Lead, urgency: LeadUrgency, now: number): Silence | null {
    if (urgency.turn !== 'CLIENT') return null;
    const reminder = time(lead.lastReminderAt);
    const reminderCounts = reminder > 0 && reminder > time(lead.lastInboundAt);
    const since = Math.max(time(lead.lastOutboundAt), time(urgency.waitingSince), reminderCounts ? reminder : 0);
    if (since === 0) return null;
    return {
        since,
        ms: Math.max(0, now - since),
        reminded: reminderCounts && reminder >= since - REMINDER_TOLERANCE_MS,
    };
}

/** Kolumna wynikająca z samych faktów i czasu; null - sprawy nie ma na tablicy. */
export function factColumnOf(lead: Lead, urgency: LeadUrgency, now: number): BoardColumnKey | null {
    if (CLOSED_STATUSES.has(lead.status)) return null;
    if (urgency.turn === 'OURS') return 'AWAITING_REPLY';
    // Rezerwacja domyka sprzedaż - sprawa schodzi z tablicy, chyba że klient napisał po niej.
    if (lead.appointmentId) return null;
    const silence = silenceOf(lead, urgency, now);
    if (!silence) return null;
    const days = silence.ms / DAY_MS;
    if (days >= LAPSE_AFTER_DAYS) return 'LAPSED';
    if (!silence.reminded && days >= REMIND_AFTER_DAYS) return 'NEEDS_REMINDER';
    return 'REPLIED';
}

export function boardColumnOf(lead: Lead, urgency: LeadUrgency, now: number = Date.now()): BoardColumnKey | null {
    // Zamknięta sprawa schodzi z tablicy, cokolwiek zapisano wcześniej.
    if (CLOSED_STATUSES.has(lead.status)) return null;
    return manualStageInForce(lead) ?? factColumnOf(lead, urgency, now);
}

export interface BoardCard {
    lead: Lead;
    urgency: LeadUrgency;
    column: BoardColumnKey;
    /** Karta stoi tu z decyzji człowieka, nie z faktów - karta mówi o tym jednym słowem. */
    manual: boolean;
    /** Cisza klienta; null, gdy ruch jest nasz. */
    silence: Silence | null;
}

export interface BoardColumn extends BoardColumnMeta {
    cards: BoardCard[];
    /** Suma wycen (grosze brutto z serwera, bez przeliczania - CLAUDE.md §1). */
    value: number;
}

const waitingOf = (card: BoardCard) => card.silence?.ms ?? card.urgency.waitingMs;
const byWaiting = (a: BoardCard, b: BoardCard) => waitingOf(b) - waitingOf(a);

/**
 * Cztery kolumny z leadów otwartych.
 *
 * Ten sam lead bywa w dwóch odpowiedziach naraz (zmienił status przed chwilą, a druga
 * lista jeszcze się nie odświeżyła) - wygrywa nowszy zapis.
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

    for (const lead of unique.values()) {
        const urgency = describeLeadUrgency(lead, thresholds, now);
        const column = boardColumnOf(lead, urgency, now);
        if (!column) continue;
        const silence = silenceOf(lead, urgency, now);
        const manual = manualStageInForce(lead) === column && factColumnOf(lead, urgency, now) !== column;
        buckets.get(column)!.push({ lead, urgency, column, manual, silence });
    }

    return BOARD_COLUMNS.map((meta) => {
        const cards = buckets.get(meta.key)!.sort(byWaiting);
        return { ...meta, cards, value: cards.reduce((sum, card) => sum + quoteTotal(card.lead), 0) };
    });
}

/**
 * Co zrobić z kartą upuszczoną w kolumnie [target].
 *
 *  - NONE  - ta sama kolumna; kolejność w kolumnie nie jest ręczna.
 *  - STAGE - zapis położenia; null, gdy kolumna docelowa jest tą, którą wyznaczają fakty
 *            (przesunięcie „z powrotem" zdejmuje decyzję, zamiast ją przypinać - inaczej
 *            sprawa przypięta do „Czeka na klienta" nie poprosiłaby nigdy o przypomnienie).
 */
export type BoardMove =
    | { kind: 'NONE' }
    | { kind: 'STAGE'; stage: LeadBoardStage | null };

export function planBoardMove(card: BoardCard, target: BoardColumnKey, now: number = Date.now()): BoardMove {
    if (target === card.column) return { kind: 'NONE' };
    return { kind: 'STAGE', stage: factColumnOf(card.lead, card.urgency, now) === target ? null : target };
}

/**
 * Lead po przesunięciu - dla podglądu w trakcie przeciągania i dla zapisu optymistycznego.
 *
 * Jedna funkcja dla obu, bo to ona gwarantuje, że karta po upuszczeniu stoi dokładnie
 * tam, gdzie zrobiło się dla niej miejsce.
 */
export function leadAfterMove(lead: Lead, move: BoardMove, nowIso: string): Lead {
    if (move.kind === 'NONE') return lead;
    return { ...lead, boardStage: move.stage, boardStageAt: move.stage ? nowIso : null, updatedAt: nowIso };
}

/** Czy można przypomnieć się mailem - w rozmowie, którą ma sprawa. */
export const canRemindByMail = (lead: Pick<Lead, 'threadId' | 'source'>): boolean =>
    Boolean(lead.threadId) && lead.source !== 'INSTAGRAM';

/** Lead po wysłanym przypomnieniu - zapis optymistyczny, zanim serwer odpowie. */
export const leadAfterReminder = (lead: Lead, nowIso: string): Lead => ({
    ...lead,
    lastOutboundAt: nowIso,
    lastReminderAt: nowIso,
    updatedAt: nowIso,
});
