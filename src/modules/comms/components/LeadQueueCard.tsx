// src/modules/comms/components/LeadQueueCard.tsx
// Jedna sprawa w kolejce. Cztery fakty i jeden przycisk.
//
// Karta zastąpiła wiersz tabeli o sześciu kolumnach, którego na telefonie nie
// dało się przeczytać bez przewijania w bok (siatka miała sztywne 880 px).
// Wysokość 88 px to nie rozrzutność: trzy linijki plus cel dotykowy 48 px muszą
// się zmieścić bez ściskania. Wiersz 52 px z wytycznych pochodzi z widoku
// biurkowego z myszą i w rękawicy nitrylowej nie działa.
//
// STATUSU TU NIE MA i nie ma go być. Etap zmienia się w oknie szczegółów albo
// - najczęściej - sam, jako skutek odpowiedzi. Kolejka pokazuje pracę do
// zrobienia, a nie stan bazy do wyklikania.
import styled from 'styled-components';
import { CalendarCheck, CalendarPlus, Phone, Reply } from 'lucide-react';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { formatVehicle } from '../utils/leadFormat';
import { leadPrimaryAction, type LeadPrimaryAction } from '../utils/leadPrimaryAction';
import type { LeadUrgency, ReplyTone } from '../utils/leadUrgency';
import type { Lead } from '../types';
import { LeadSourceIcon } from './LeadSourceIcon';
import { formatGrosze } from './shared';

const Card = styled.div<{ $tone: ReplyTone; $active: boolean }>`
    position: relative;
    display: flex;
    align-items: stretch;
    min-height: 88px;
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : theme.colors.surface)};
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    transition: background ${p => p.theme.transitions.fast};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    /*
     * Pasek pilności przy lewej krawędzi. Zaległość jest cechą całej sprawy,
     * a nie zawartością którejś linijki, i - co ważniejsze - pasek nie zabiera
     * ani piksela szerokości. Skanuje się go jednym spojrzeniem w dół listy.
     * Sam kolor niczego nie niesie: to samo mówi etykieta wieku po prawej.
     */
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: ${({ $tone, theme }) =>
            $tone === 'due' ? theme.colors.error
            : $tone === 'stale' ? theme.colors.warning
            : 'transparent'};
    }
`;

/** Cały obszar karty poza przyciskiem otwiera szczegóły. */
const OpenArea = styled.button`
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 14px 0 14px 17px;
    border: none;
    background: transparent;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    color: inherit;

    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: -2px;
    }
`;

const Line = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
`;

const Headline = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 15px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const Age = styled.span<{ $tone: ReplyTone }>`
    flex-shrink: 0;
    font-size: 12.5px;
    white-space: nowrap;
    font-weight: ${({ $tone, theme }) =>
        $tone === 'neutral' ? theme.fontWeights.normal : theme.fontWeights.semibold};
    color: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.textMuted};
`;

const Services = styled.span`
    min-width: 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Money = styled.span<{ $empty?: boolean }>`
    flex-shrink: 0;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-weight: ${({ $empty, theme }) => ($empty ? theme.fontWeights.normal : theme.fontWeights.semibold)};
    color: ${({ $empty, theme }) => ($empty ? theme.colors.textMuted : theme.colors.text)};
`;

const Who = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const ActionSlot = styled.div`
    display: flex;
    align-items: center;
    padding: 0 12px;
    flex-shrink: 0;
`;

/**
 * Cel dotykowy 48x48 - minimum, przy którym da się trafić w rękawicy nitrylowej.
 * Bez gestów: swipe w mokrym ekranie wykonuje się sam, a przerwany w połowie
 * nie zostawia śladu, po którym dałoby się poznać, czy zadziałał.
 */
const ActionButton = styled.a<{ $emphasis: 'primary' | 'quiet' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: ${p => p.theme.radii.lg};
    cursor: pointer;
    text-decoration: none;
    transition: all ${p => p.theme.transitions.fast};

    background: ${({ $emphasis, theme }) =>
        $emphasis === 'primary' ? theme.colors.primary : theme.colors.surface};
    border: 1px solid ${({ $emphasis, theme }) =>
        $emphasis === 'primary' ? 'transparent' : theme.colors.border};
    color: ${({ $emphasis, theme }) => ($emphasis === 'primary' ? '#ffffff' : theme.colors.textSecondary)};

    &:hover {
        background: ${({ $emphasis, theme }) =>
            $emphasis === 'primary' ? '#0284c7' : theme.colors.surfaceHover};
    }

    svg { width: 18px; height: 18px; }
`;

const ACTION_ICONS = {
    REPLY: <Reply />,
    CALL: <Phone />,
    BOOK: <CalendarPlus />,
    APPOINTMENT: <CalendarCheck />,
} as const;

interface LeadQueueCardProps {
    lead: Lead;
    urgency: LeadUrgency;
    active: boolean;
    onOpen: () => void;
    /** Wykonanie akcji innej niż `tel:` - te wychodzą linkiem, bez pośrednictwa CRM. */
    onAction: (action: LeadPrimaryAction) => void;
}

export function LeadQueueCard({ lead, urgency, active, onOpen, onAction }: LeadQueueCardProps) {
    const action = leadPrimaryAction(lead, urgency);
    const vehicle = formatVehicle(lead);
    const person = lead.customerName ?? lead.contactIdentifier;
    /*
     * Nagłówkiem jest auto, bo detailer myśli autami („ten X5 od ceramiki").
     * Gdy auta nie rozpoznano, nazwisko awansuje na nagłówek - pusty nagłówek
     * i wiersz „-" nie niosą nic, a kosztują tę samą wysokość. Wtedy w trzeciej
     * linijce zostaje sam identyfikator, żeby nie powtarzać nazwiska dwa razy.
     */
    const subtitle = vehicle ? person : lead.customerName ? lead.contactIdentifier : null;

    return (
        <Card $tone={urgency.tone} $active={active}>
            <OpenArea type="button" onClick={onOpen}>
                <Line>
                    <Headline>
                        {lead.vehicleBrand && <CarLogoImage brand={lead.vehicleBrand} size="xs" />}
                        <span>{vehicle ?? person}</span>
                    </Headline>
                    {urgency.label && <Age $tone={urgency.tone}>{urgency.label}</Age>}
                </Line>

                <Line>
                    <Services>
                        {lead.tagLabels.length > 0 ? lead.tagLabels.join(', ') : 'Bez opisu usługi'}
                    </Services>
                    {lead.estimatedValue > 0 ? (
                        <Money>{formatGrosze(lead.estimatedValue)}</Money>
                    ) : (
                        <Money $empty>bez wyceny</Money>
                    )}
                </Line>

                {subtitle && (
                    <Who>
                        <LeadSourceIcon source={lead.source} />
                        <span>{subtitle}</span>
                    </Who>
                )}
            </OpenArea>

            <ActionSlot>
                <ActionButton
                    as={action.href ? 'a' : 'button'}
                    href={action.href}
                    type={action.href ? undefined : 'button'}
                    $emphasis={action.emphasis}
                    title={action.label}
                    aria-label={action.label}
                    onClick={(event: React.MouseEvent) => {
                        event.stopPropagation();
                        // Link `tel:` obsługuje przeglądarka - nie odbieramy jej tego,
                        // bo tylko tak dialer otwiera się jednym tapnięciem.
                        if (!action.href) onAction(action);
                    }}
                >
                    {ACTION_ICONS[action.kind]}
                </ActionButton>
            </ActionSlot>
        </Card>
    );
}
