// src/modules/comms/components/LeadReplyBadge.tsx
// „Czyj ruch" — jedna plakietka obok statusu leada.
//
// Status mówi, na jakim etapie jest sprzedaż. Nie mówi, czy w tej chwili to my
// zalegamy z odpowiedzią, czy klient milczy — a to dwie zupełnie różne sytuacje,
// wymagające dwóch różnych reakcji. „W kontakcie" opisywało obie naraz, więc
// wiadomość otwarta w biegu i zapomniana wyglądała dokładnie tak samo jak lead,
// w którym piłka jest po stronie klienta.
//
// Ta informacja NIE jest statusem i nie ma nim być: wynika wprost z kierunku
// ostatniej wiadomości, więc utrzymywanie jej ręcznie znaczyłoby tylko tyle, że
// pierwszego dnia jest prawdziwa, a tydzień później już nie.
import styled from 'styled-components';
import { Clock, MailQuestion, Reply } from 'lucide-react';
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

const Chip = styled.span<{ $tone: 'neutral' | 'due' | 'stale' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    border: 1px solid;
    ${({ $tone }) => {
        switch ($tone) {
            // Nasza zaległość — jedyny stan, który jest zarzutem wobec nas.
            case 'due':   return 'border-color: #fca5a5; background: #fef2f2; color: #b91c1c;';
            // Cisza klienta — ostrzeżenie, nie zarzut: to sygnał do przypomnienia.
            case 'stale': return 'border-color: #fcd34d; background: #fffbeb; color: #b45309;';
            default:      return 'border-color: #e2e8f0; background: #f8fafc; color: #64748b;';
        }
    }}

    svg { width: 11px; height: 11px; flex-shrink: 0; }
`;

/** „2 dni", „5 godz.", „przed chwilą" — bez sekund i minut, bo nikt nie działa w tej skali. */
function formatAge(elapsedMs: number): string {
    if (elapsedMs < HOUR_MS) return 'przed chwilą';
    if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)} godz.`;
    const days = Math.floor(elapsedMs / DAY_MS);
    return days === 1 ? '1 dzień' : `${days} dni`;
}

interface ReplyChip {
    tone: 'neutral' | 'due' | 'stale';
    icon: 'reply' | 'question' | 'clock';
    label: string;
    title: string;
}

/**
 * Cała arytmetyka czasu w jednym miejscu, poza ciałem komponentu — tak samo jak
 * formatRelativeTime w reszcie modułu. Render zostaje wtedy czystym mapowaniem
 * danych na widok, a „ile to już trwa" liczy się raz, w jednym miejscu.
 */
function describeReplyState(replyState: LeadReplyState, waitingSince: string): ReplyChip {
    const elapsed = Date.now() - new Date(waitingSince).getTime();
    const age = formatAge(elapsed);

    if (replyState === 'AWAITING_OUR_REPLY') {
        const overdue = elapsed >= OUR_REPLY_OVERDUE_HOURS * HOUR_MS;
        return {
            tone: overdue ? 'due' : 'neutral',
            icon: 'reply',
            label: `Do odpisania · ${age}`,
            title: overdue
                ? `Klient czeka na odpowiedź od ${age}`
                : 'Ostatnie słowo należy do klienta — piłka po naszej stronie',
        };
    }

    const stale = elapsed >= CLIENT_SILENCE_DAYS * DAY_MS;
    return {
        tone: stale ? 'stale' : 'neutral',
        icon: stale ? 'clock' : 'question',
        label: `${stale ? 'Cisza' : 'Czeka na klienta'} · ${age}`,
        title: stale
            ? `Klient milczy od ${age} — czas na przypomnienie albo zamknięcie leada`
            : 'Odpisaliśmy — czekamy na decyzję klienta',
    };
}

const ICONS = {
    reply: <Reply />,
    question: <MailQuestion />,
    clock: <Clock />,
} as const;

interface LeadReplyBadgeProps {
    replyState: LeadReplyState;
    waitingSince: string | null;
    /** Lead zamknięty (zrealizowany, przegrany, nie pojawił się) — nie ma już czyjego ruchu. */
    muted?: boolean;
}

export function LeadReplyBadge({ replyState, waitingSince, muted }: LeadReplyBadgeProps) {
    if (muted || replyState === 'NO_CONVERSATION' || !waitingSince) return null;

    const chip = describeReplyState(replyState, waitingSince);
    return (
        <Chip $tone={chip.tone} title={chip.title}>
            {ICONS[chip.icon]}
            {chip.label}
        </Chip>
    );
}
