// src/modules/visits/components/VisitCommunicationHistory.tsx
//
// Wiadomości wysłane do klienta w ramach wizyty. Każda pozycja to jeden przycisk:
// kafelek kanału, co to było, do kogo i kiedy, a z prawej plakietka stanu.
//
// Linia pod tytułem jest zwykłym zdaniem - „SMS na +48 601 234 567, 22.09 o 10:15"
// - a nie trzema faktami sklejonymi kropkami (CLAUDE.md §4).

import { useState } from 'react';
import styled from 'styled-components';
import { Mail, MessageSquare } from 'lucide-react';
import {
    CommunicationPreviewModal,
    formatCommDate,
} from '@/common/components/CommunicationPreviewModal';
import { COMMUNICATION_STATUS_LABEL, communicationTone, queuedHint } from '@/common/utils/communicationStatus';
import { StatusPill, ui, type PillTone } from '@/common/components/ui';
import type { CommunicationEntry } from '../types';

const List = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0 18px 12px;
    list-style: none;

    @media (max-width: 640px) { padding: 0 16px 10px; }
`;

const Entry = styled.button`
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    width: 100%;
    padding: 10px 0;
    border: none;
    border-top: 1px solid ${ui.lineFaint};
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;

    &:hover > span:nth-child(2) > span:first-child { color: ${ui.brandInk}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; border-radius: 8px; }
`;

const Channel = styled.span<{ $failed: boolean }>`
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: ${p => p.$failed ? ui.dangerTint : ui.brandTint};
    color: ${p => p.$failed ? ui.dangerInk : ui.brandInk};

    svg { width: 16px; height: 16px; }
`;

const Text = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const Label = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Meta = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const Empty = styled.p`
    margin: 0;
    padding: 0 18px 16px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const TONE: Record<ReturnType<typeof communicationTone>, PillTone> = {
    sent: 'ok',
    received: 'info',
    queued: 'neutral',
    failed: 'danger',
};

interface VisitCommunicationHistoryProps {
    entries: CommunicationEntry[];
    isLoading?: boolean;
}

export const VisitCommunicationHistory = ({ entries, isLoading }: VisitCommunicationHistoryProps) => {
    const [selected, setSelected] = useState<CommunicationEntry | null>(null);

    if (isLoading) return <Empty>Wczytywanie komunikacji...</Empty>;
    if (entries.length === 0) return <Empty>Do klienta nie wyszła jeszcze żadna wiadomość w tej wizycie.</Empty>;

    return (
        <>
            <List>
                {entries.map(entry => {
                    const tone = communicationTone(entry.status);
                    const channel = entry.channel === 'EMAIL' ? 'E-mail' : 'SMS';
                    const when = queuedHint(entry) ?? formatCommDate(entry.sentAt);
                    return (
                        <li key={entry.id}>
                            <Entry type="button" onClick={() => setSelected(entry)} aria-label={`Podgląd: ${entry.messageTypeLabel}`}>
                                <Channel $failed={tone === 'failed'} aria-hidden="true">
                                    {entry.channel === 'EMAIL' ? <Mail /> : <MessageSquare />}
                                </Channel>
                                <Text>
                                    <Label>{entry.messageTypeLabel}</Label>
                                    <Meta>{channel} na {entry.recipientAddress}, {when}</Meta>
                                </Text>
                                <StatusPill $tone={TONE[tone]}>{COMMUNICATION_STATUS_LABEL[tone]}</StatusPill>
                            </Entry>
                        </li>
                    );
                })}
            </List>

            {selected && <CommunicationPreviewModal entry={selected} onClose={() => setSelected(null)} />}
        </>
    );
};
