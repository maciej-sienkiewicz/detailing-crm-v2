// src/modules/comms/utils/leadUrgency.ts
// „Czyj ruch i od kiedy" - jedna reguła pilności dla całego modułu.
//
// Zastępuje leadReply.ts, który znał wyłącznie leady mailowe. Backend liczy
// [replyState] z korespondencji, więc lead bez wątku - z telefonu, z formularza,
// dodany ręcznie - dostawał NO_CONVERSATION i wypadał ze WSZYSTKIEGO naraz:
// z filtru „do odpisania", z paska pilności i z kwoty zaległości. Odnotowanie
// telefonu przestawiało go dodatkowo na „W kontakcie", więc znikał też z licznika
// nowych. Za odnotowanie kontaktu użytkownik dostawał zniknięcie sprawy z listy
// i przestawał go odnotowywać.
//
// Stąd druga gałąź reguły: brak wątku nie znaczy „nie ma na co czekać", tylko
// „czekanie trzeba policzyć z innych pól". Te pola już są - [firstResponseAt]
// stempluje zarówno pierwsza wysłana wiadomość, jak i odnotowany telefon.
//
// Progi NIE są tu zaszyte: przychodzą z ustawień studia, bo to właściciel wie,
// po ilu godzinach jego klient dzwoni do konkurencji.
import type { LeadReplyState, LeadStatus } from '../types';
import { CLOSED_STATUSES } from './leadFormat';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type ReplyTone = 'neutral' | 'due' | 'stale';

/**
 * OURS - klient czeka na nas. CLIENT - my czekamy na klienta.
 * SETTLED - sprawa rozstrzygnięta, nikt na nic nie czeka.
 */
export type LeadTurn = 'OURS' | 'CLIENT' | 'SETTLED';

export interface StagnationThresholds {
    /** Po ilu godzinach nasza zwłoka przestaje nazywać zadanie i zaczyna nazywać dług. */
    ourReplyHours: number;
    /** Po ilu godzinach cisza klienta to moment na przypomnienie albo zamknięcie. */
    clientSilenceHours: number;
}

/**
 * Wartości startowe, gdy ustawienia studia jeszcze nie doszły.
 *
 * To liczby, które interfejs pokazywał dotąd (24 h i 5 dni), a nie backendowe
 * 48/72 - te nigdy nie były przez nic czytane, więc nie ma czego zachowywać,
 * za to zmiana domyślnych przesunęłaby każdą plakietkę na ekranie u wszystkich
 * klientów naraz, bez powodu produktowego.
 */
export const DEFAULT_STAGNATION: StagnationThresholds = {
    ourReplyHours: 24,
    clientSilenceHours: 120,
};

/** Tyle o leadzie wystarczy, żeby rozstrzygnąć czyj ruch - nie cały DTO. */
export interface UrgencyInput {
    status: LeadStatus;
    replyState: LeadReplyState;
    waitingSince: string | null;
    threadId: string | null;
    firstResponseAt: string | null;
    createdAt: string;
}

export interface LeadUrgency {
    turn: LeadTurn;
    tone: ReplyTone;
    /** Od kiedy trwa oczekiwanie; null przy sprawie zamkniętej. */
    waitingSince: string | null;
    /** Wiek oczekiwania w milisekundach; 0 przy sprawie zamkniętej. */
    waitingMs: number;
    label: string;
    title: string;
    icon: 'reply' | 'question' | 'clock';
}

/** „2 dni", „5 godz.", „przed chwilą" - bez sekund i minut, bo nikt nie działa w tej skali. */
export function formatAge(elapsedMs: number): string {
    if (elapsedMs < HOUR_MS) return 'przed chwilą';
    if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)} godz.`;
    const days = Math.floor(elapsedMs / DAY_MS);
    return days === 1 ? '1 dzień' : `${days} dni`;
}

/**
 * Czyj ruch i od kiedy - sam fakt, bez oceny.
 *
 * Kolejność gałęzi jest istotna. Najpierw sprawy zamknięte, bo w nich żadne
 * oczekiwanie nie trwa niezależnie od tego, co mówi korespondencja („dziękuję"
 * od klienta w leadzie zrealizowanym nie jest zaległością). Potem odpowiedź
 * backendu, o ile ją zna. Dopiero na końcu leady bez rozmowy, dla których
 * backend nie ma czego policzyć.
 */
/**
 * Czy nasza reakcja jest późniejsza niż początek oczekiwania.
 *
 * Porównanie przez `Date`, nie przez tekst: oba znaczniki są w ISO 8601 i zwykle
 * porównałyby się poprawnie także leksykograficznie, ale wystarczy jeden bez
 * milisekund albo z przesunięciem strefy zamiast „Z", żeby to przestało być prawdą.
 */
function respondedAfter(respondedAt: string | null, waitingSince: string): boolean {
    if (!respondedAt) return false;
    return new Date(respondedAt).getTime() > new Date(waitingSince).getTime();
}

function resolveTurn(lead: UrgencyInput): { turn: LeadTurn; since: string | null } {
    if (CLOSED_STATUSES.has(lead.status)) return { turn: 'SETTLED', since: null };

    if (lead.replyState === 'AWAITING_OUR_REPLY' && lead.waitingSince) {
        /*
         * Kontakt poza pocztą JEST odpowiedzią - tyle że `replyState` jej nie widzi.
         *
         * Backend liczy „czyj ruch" wyłącznie z `comm_messages`, a odnotowany telefon
         * ląduje w `lead_callbacks` (RecordLeadCallbackHandler). Lead, do którego
         * zadzwoniliśmy po ostatnim mailu klienta, zostawał więc w „Twój ruch" na
         * zawsze - a użytkownik dostawał komunikat, że zszedł z kolejki. Za dobre
         * zachowanie dostawał kłamstwo.
         *
         * Jedyny ślad takiego kontaktu w DTO listy to `firstResponseAt`: backend
         * stempluje nim pierwszą reakcję niezależnie od kanału. Jeśli jest nowszy niż
         * początek oczekiwania, odezwaliśmy się PO ostatniej wiadomości klienta i ruch
         * jest u niego.
         *
         * ⚠️ To łapie pierwszy kontakt, nie każdy: `firstResponseAt` z definicji nie
         * przesuwa się przy kolejnych telefonach. Lead, w którym odpisaliśmy mailem,
         * klient napisał znowu, a my oddzwoniliśmy, nadal zostanie w „Twój ruch".
         * Pełne domknięcie wymaga kolumny „ostatni kontakt dowolnym kanałem" -
         * zmiana O4 w docs/leads-queue-backend-spec.md.
         */
        if (respondedAfter(lead.firstResponseAt, lead.waitingSince)) {
            return { turn: 'CLIENT', since: lead.firstResponseAt! };
        }
        return { turn: 'OURS', since: lead.waitingSince };
    }
    if (lead.replyState === 'AWAITING_CLIENT_REPLY' && lead.waitingSince) {
        return { turn: 'CLIENT', since: lead.waitingSince };
    }

    // Lead bez wątku (telefon, formularz, dodany ręcznie) albo z wątkiem jeszcze
    // pustym. Dopóki nikt z naszej strony się nie odezwał, ruch jest nasz i trwa
    // od chwili wpłynięcia zapytania - to jest ten przypadek, który dotąd nie
    // istniał dla żadnego mechanizmu pilności.
    if (!lead.firstResponseAt) return { turn: 'OURS', since: lead.createdAt };

    // Odezwaliśmy się (mailem albo odnotowanym telefonem) - piłka jest u klienta.
    // Drugi i kolejny telefon nie przesuwa tej daty, bo backend zna wyłącznie
    // PIERWSZĄ odpowiedź; to świadome przybliżenie, opisane w specyfikacji.
    return { turn: 'CLIENT', since: lead.firstResponseAt };
}

/**
 * Pełny opis pilności: ton, etykieta i podpowiedź.
 *
 * [now] wstrzykiwane wyłącznie dla testów - w aplikacji zawsze bieżąca chwila.
 */
export function describeLeadUrgency(
    lead: UrgencyInput,
    thresholds: StagnationThresholds = DEFAULT_STAGNATION,
    now: number = Date.now()
): LeadUrgency {
    const { turn, since } = resolveTurn(lead);

    if (turn === 'SETTLED' || !since) {
        return {
            turn: 'SETTLED',
            tone: 'neutral',
            waitingSince: null,
            waitingMs: 0,
            label: '',
            title: '',
            icon: 'question',
        };
    }

    const waitingMs = Math.max(0, now - new Date(since).getTime());
    const age = formatAge(waitingMs);

    if (turn === 'OURS') {
        // Czerwień od pierwszej minuty, nie dopiero po progu. „Klient czeka" to
        // zawsze zadanie po naszej stronie, a nie stan neutralny - próg zmienia
        // ton wypowiedzi, nie jej wagę: etykieta przestaje mówić, co trzeba
        // zrobić, i zaczyna mówić, jak długo tego nie robimy.
        const overdue = waitingMs >= thresholds.ourReplyHours * HOUR_MS;
        return {
            turn,
            tone: 'due',
            waitingSince: since,
            waitingMs,
            icon: 'reply',
            label: overdue ? `Czeka ${age}` : 'Wymagany kontakt',
            title: overdue ? `Klient czeka na odpowiedź od ${age}` : 'Klient czeka na naszą odpowiedź',
        };
    }

    const stale = waitingMs >= thresholds.clientSilenceHours * HOUR_MS;
    return {
        turn,
        tone: stale ? 'stale' : 'neutral',
        waitingSince: since,
        waitingMs,
        icon: stale ? 'clock' : 'question',
        label: stale ? `Cisza ${age}` : `U klienta ${age}`,
        title: stale
            ? `Klient milczy od ${age} - czas na przypomnienie albo zamknięcie leada`
            : 'Odpisaliśmy - czekamy na decyzję klienta',
    };
}

/**
 * Sam ton - dla paska pilności przy krawędzi karty. Pasek nie zajmuje szerokości,
 * więc znajduje zaległość szybciej niż jakakolwiek plakietka w środku wiersza.
 */
export function leadUrgencyTone(
    lead: UrgencyInput,
    thresholds?: StagnationThresholds,
    now?: number
): ReplyTone {
    return describeLeadUrgency(lead, thresholds, now).tone;
}

/**
 * Do którego segmentu kolejki trafia lead. Segmenty dzielą sprawy OTWARTE po tym,
 * czyj jest ruch; zamknięte nie mają czyjego ruchu i mieszkają w archiwum.
 */
export function leadSegmentOf(lead: UrgencyInput, now?: number): LeadTurn {
    return describeLeadUrgency(lead, DEFAULT_STAGNATION, now).turn;
}
