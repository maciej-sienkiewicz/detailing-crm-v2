// src/modules/comms/components/LeadUrgencyBadge.tsx
// „Czyj ruch" - znacznik pilności leada.
//
// Status mówi, na jakim etapie jest sprzedaż. Nie mówi, czy w tej chwili to my
// zalegamy z odpowiedzią, czy klient milczy - a to dwie zupełnie różne sytuacje,
// wymagające dwóch różnych reakcji.
//
// Komponent nie liczy nic sam: bierze gotowy wynik reguły. Wcześniej liczył, więc
// pasek pilności na wierszu i etykieta w środku wiersza przeliczały to samo dwa
// razy - a przy progach przychodzących z ustawień studia dwa przeliczenia to dwie
// okazje, żeby użyć innych progów.
//
// Forma: ikona i tekst, bez ramki i bez tła. Kolor niesie tylko pilność i tylko
// wtedy, gdy jest o czym mówić - normalny rytm rozmowy zostaje szary.
import styled from 'styled-components';
import { Clock, MailQuestion, Reply } from 'lucide-react';
import type { LeadUrgency, ReplyTone } from '../utils/leadUrgency';

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
            // Ruch po naszej stronie - jedyny stan, który jest zadaniem dla nas.
            case 'due':   return theme.colors.error;
            // Cisza klienta - ostrzeżenie, nie zarzut: to sygnał do przypomnienia.
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

export function LeadUrgencyBadge({ urgency }: { urgency: LeadUrgency }) {
    if (urgency.turn === 'SETTLED') return null;

    return (
        <Marker $tone={urgency.tone} title={urgency.title}>
            {ICONS[urgency.icon]}
            {urgency.label}
        </Marker>
    );
}
