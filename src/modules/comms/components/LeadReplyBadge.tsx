// src/modules/comms/components/LeadReplyBadge.tsx
// „Czyj ruch" — znacznik obok statusu leada.
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
//
// Forma: ikona i tekst, bez ramki i bez tła. W tabeli, gdzie każdy wiersz ma
// status, druga wypełniona plakietka nad drugą zamienia kolumnę w kolaż kolorów
// i przestaje cokolwiek wyróżniać. Kolor niesie tylko pilność i tylko wtedy,
// gdy jest o czym mówić — normalny rytm rozmowy zostaje szary.
import styled from 'styled-components';
import { Clock, MailQuestion, Reply } from 'lucide-react';
import type { LeadReplyState } from '../types';
import { describeReplyState, type ReplyTone } from '../utils/leadReply';

const Marker = styled.span<{ $tone: ReplyTone }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    line-height: 1.3;
    white-space: nowrap;
    font-weight: ${p => (p.$tone === 'neutral' ? p.theme.fontWeights.normal : p.theme.fontWeights.semibold)};
    color: ${({ $tone, theme }) => {
        switch ($tone) {
            // Nasza zaległość — jedyny stan, który jest zarzutem wobec nas.
            case 'due':   return theme.colors.error;
            // Cisza klienta — ostrzeżenie, nie zarzut: to sygnał do przypomnienia.
            case 'stale': return theme.colors.warning;
            default:      return theme.colors.textMuted;
        }
    }};

    svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

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

    const marker = describeReplyState(replyState, waitingSince);
    return (
        <Marker $tone={marker.tone} title={marker.title}>
            {ICONS[marker.icon]}
            {marker.label}
        </Marker>
    );
}
