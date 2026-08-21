// src/modules/comms/utils/leadReply.ts
// „Czyj ruch" — cała arytmetyka czasu dla znacznika odpowiedzi w jednym miejscu.
//
// Mieszka poza komponentem, bo korzystają z tego dwa różne widoki tej samej
// informacji: znacznik tekstowy w kolumnie „Status" i pasek pilności przy
// krawędzi wiersza tabeli. Progi liczone dwa razy rozjechałyby się przy
// pierwszej zmianie.
import type { LeadReplyState } from '../types';

/**
 * Po dobie bez naszej odpowiedzi to już zaległość, a nie „jeszcze zdążę".
 * Próg dobowy, nie godzinowy: zapytanie z piątkowego popołudnia nie ma świecić
 * na czerwono w sobotę rano.
 */
const OUR_REPLY_OVERDUE_HOURS = 24;

/**
 * Pięć dni ciszy klienta to moment na przypomnienie albo na zamknięcie leada.
 * Krócej — normalny rytm decyzji; dłużej — lead, o którym już nikt nie pamięta.
 */
const CLIENT_SILENCE_DAYS = 5;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type ReplyTone = 'neutral' | 'due' | 'stale';

export interface ReplyMarker {
    tone: ReplyTone;
    icon: 'reply' | 'question' | 'clock';
    label: string;
    title: string;
}

/** „2 dni", „5 godz.", „przed chwilą" — bez sekund i minut, bo nikt nie działa w tej skali. */
function formatAge(elapsedMs: number): string {
    if (elapsedMs < HOUR_MS) return 'przed chwilą';
    if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)} godz.`;
    const days = Math.floor(elapsedMs / DAY_MS);
    return days === 1 ? '1 dzień' : `${days} dni`;
}

/**
 * Render zostaje wtedy czystym mapowaniem danych na widok, a „ile to już trwa"
 * liczy się raz, w jednym miejscu.
 *
 * Etykiety są krótkie z wyliczenia: znacznik stoi w wąskiej kolumnie tabeli,
 * a pełne zdanie i tak jest w podpowiedzi. Czas pojawia się w etykiecie tylko
 * tam, gdzie sam w sobie jest zarzutem — przy normalnym rytmie rozmowy „ile"
 * nie zmienia tego, co trzeba zrobić.
 */
export function describeReplyState(replyState: LeadReplyState, waitingSince: string): ReplyMarker {
    const elapsed = Date.now() - new Date(waitingSince).getTime();
    const age = formatAge(elapsed);

    if (replyState === 'AWAITING_OUR_REPLY') {
        const overdue = elapsed >= OUR_REPLY_OVERDUE_HOURS * HOUR_MS;
        return {
            tone: overdue ? 'due' : 'neutral',
            icon: 'reply',
            label: overdue ? `Czeka ${age}` : 'Nasz ruch',
            title: overdue
                ? `Klient czeka na odpowiedź od ${age}`
                : 'Ostatnie słowo należy do klienta — piłka po naszej stronie',
        };
    }

    const stale = elapsed >= CLIENT_SILENCE_DAYS * DAY_MS;
    return {
        tone: stale ? 'stale' : 'neutral',
        icon: stale ? 'clock' : 'question',
        label: stale ? `Cisza ${age}` : 'U klienta',
        title: stale
            ? `Klient milczy od ${age} — czas na przypomnienie albo zamknięcie leada`
            : 'Odpisaliśmy — czekamy na decyzję klienta',
    };
}

/**
 * Ton „czyjego ruchu" bez renderowania znacznika — dla wiersza tabeli, który
 * zaznacza pilne leady paskiem przy krawędzi. Pasek nie zajmuje szerokości,
 * więc znajduje zaległość szybciej niż jakakolwiek plakietka w środku wiersza.
 */
export function leadReplyTone(
    replyState: LeadReplyState,
    waitingSince: string | null,
    muted?: boolean
): ReplyTone {
    if (muted || replyState === 'NO_CONVERSATION' || !waitingSince) return 'neutral';
    return describeReplyState(replyState, waitingSince).tone;
}
