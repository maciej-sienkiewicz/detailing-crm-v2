// src/modules/comms/components/LeadTimeline.tsx
//
// Przebieg sprawy w oknie leada: statusy, korespondencja i odnotowane telefony
// na jednej nitce czasu.
//
// Wcześniej stała tu sama wędrówka po statusach, więc lead po wymianie trzech maili
// opisany był dwiema linijkami — „Nowy", „W kontakcie" — i milczał o tym, co w nim
// najważniejsze: o co klient pytał, kiedy odpisaliśmy i co odpowiedział. Fakty
// istniały, tylko w wątku poczty, czyli wszędzie, byle nie tam, gdzie się ich szuka.

import { useState } from 'react';
import styled, { type DefaultTheme } from 'styled-components';
import { ChevronDown, Mail, PhoneCall, Reply } from 'lucide-react';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type LeadTimelineEntry } from '../types';
import { formatDateTime } from './shared';

/**
 * Kolor kropki. Statusy zachowują kolor swojego etapu — ten sam, którym etap
 * oznaczony jest w tabeli i w wybieraku, więc oś czasu czyta się bez legendy.
 * Zdarzenia kontaktu dostają kolory kierunku: klient i my.
 */
const colorOf = (entry: LeadTimelineEntry, theme: DefaultTheme): string => {
    switch (entry.kind) {
        case 'INBOUND_MESSAGE': return theme.colors.warning;
        case 'OUTBOUND_MESSAGE':
        case 'CALLBACK': return theme.colors.success;
        case 'STATUS':
        default:
            return entry.toStatus ? LEAD_STATUS_COLORS[entry.toStatus].fg : theme.colors.textMuted;
    }
};

/**
 * Oś czasu, nie lista linijek. Zdarzenia są ciągiem („klient napisał, odpisaliśmy,
 * klient się targował"), a płaskie zdania z datą na początku każą ten ciąg złożyć
 * w głowie, bo wszystkie ważą tyle samo. Pionowa nitka z kropkami pokazuje go wprost.
 */
const Timeline = styled.ol`
    position: relative;
    list-style: none;
    margin: 0;
    padding: 2px 0 0 16px;

    &::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: ${p => p.theme.colors.border};
    }
`;

const Item = styled.li<{ $entry: LeadTimelineEntry }>`
    position: relative;
    padding-bottom: 10px;
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;

    &:last-child { padding-bottom: 0; }

    &::before {
        content: '';
        position: absolute;
        left: -16px;
        top: 4px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${p => colorOf(p.$entry, p.theme)};
        /* Obwódka w kolorze tła panelu wycina nitkę pod kropką. */
        box-shadow: 0 0 0 2px ${p => p.theme.colors.surfaceAlt};
    }
`;

const Headline = styled.strong`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};

    svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const Toggle = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-top: 3px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font: inherit;
    font-size: 11.5px;
    color: ${p => p.theme.colors.primary};

    &:hover { text-decoration: underline; }

    svg {
        width: 11px;
        height: 11px;
        transition: transform 150ms ease;
        transform: rotate(${p => (p.$open ? '180deg' : '0deg')});
    }
`;

/**
 * Treść wiadomości rozwinięta w miejscu, a nie w kolejnym oknie. Podgląd leada sam
 * jest oknem, więc modal nad modalem kazałby zamknąć dwie rzeczy, żeby wrócić do
 * listy — a chodzi o zerknięcie na trzy zdania.
 */
const Body = styled.blockquote`
    margin: 6px 0 0;
    padding: 8px 10px;
    max-height: 200px;
    overflow-y: auto;
    border-left: 2px solid ${p => p.theme.colors.border};
    border-radius: 0 6px 6px 0;
    background: ${p => p.theme.colors.surface};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.55;
    font-size: 12.5px;
    color: ${p => p.theme.colors.text};
`;

const Note = styled.div`
    margin-top: 3px;
    font-size: 12px;
    font-style: italic;
    color: ${p => p.theme.colors.textSecondary};
    overflow-wrap: anywhere;
`;

const Empty = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Nagłówek zdarzenia. Pierwsza wiadomość klienta dostaje własną nazwę, bo to ona
 * jest początkiem sprawy — „Klient odpisał" na samej górze osi brzmiałoby jak
 * odpowiedź na coś, czego nie było.
 */
const headlineOf = (entry: LeadTimelineEntry, isFirstInbound: boolean): string => {
    switch (entry.kind) {
        case 'INBOUND_MESSAGE':
            return isFirstInbound ? 'Pierwszy kontakt klienta' : 'Klient odpisał';
        case 'OUTBOUND_MESSAGE':
            return 'Odpisaliśmy';
        case 'CALLBACK':
            return 'Oddzwoniliśmy';
        case 'STATUS':
        default:
            return entry.toStatus ? LEAD_STATUS_LABELS[entry.toStatus] : 'Zmiana statusu';
    }
};

const iconOf = (kind: LeadTimelineEntry['kind']) => {
    switch (kind) {
        case 'INBOUND_MESSAGE': return <Mail />;
        case 'OUTBOUND_MESSAGE': return <Reply />;
        case 'CALLBACK': return <PhoneCall />;
        default: return null;
    }
};

interface LeadTimelineProps {
    entries: LeadTimelineEntry[];
}

export function LeadTimeline({ entries }: LeadTimelineProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggle = (id: string) =>
        setExpanded((open) => {
            const next = new Set(open);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    if (entries.length === 0) {
        return <Empty>Nic się jeszcze nie wydarzyło.</Empty>;
    }

    const firstInboundId = entries.find((entry) => entry.kind === 'INBOUND_MESSAGE')?.id;

    return (
        <Timeline>
            {entries.map((entry) => {
                const open = expanded.has(entry.id);
                const hasBody = Boolean(entry.body);
                return (
                    <Item key={entry.id} $entry={entry}>
                        <Headline>
                            {iconOf(entry.kind)}
                            {headlineOf(entry, entry.id === firstInboundId)}
                            {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                        </Headline>
                        {formatDateTime(entry.at)}
                        {entry.actorName && <>, {entry.actorName}</>}
                        {entry.note && <Note>{entry.note}</Note>}
                        {hasBody && (
                            <>
                                <Toggle
                                    type="button"
                                    $open={open}
                                    onClick={() => toggle(entry.id)}
                                    aria-expanded={open}
                                >
                                    {open ? 'Ukryj wiadomość' : 'Pokaż wiadomość'}
                                    <ChevronDown />
                                </Toggle>
                                {open && <Body>{entry.body}</Body>}
                            </>
                        )}
                    </Item>
                );
            })}
        </Timeline>
    );
}
