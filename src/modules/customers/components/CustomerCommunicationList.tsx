// src/modules/customers/components/CustomerCommunicationList.tsx
//
// Wiadomości wysłane do klienta (SMS, e-mail) - płaski panel z tym samym wierszem
// co komunikacja w karcie wizyty: kafelek kanału, co to było, do kogo i kiedy
// zwykłym zdaniem, a z prawej plakietka stanu.
//
// Wcześniej była to oś czasu z kropkami łączącymi „SMS · +48 601… · 22.09"
// (CLAUDE.md §4), schowana w zwijanym bloku z kafelkiem w gradiencie
// i stronicowaniem „← Poprzednie / Następne →" po pięć pozycji.

import { useState } from 'react';
import styled from 'styled-components';
import { Mail, MessageSquare } from 'lucide-react';
import {
    CommunicationPreviewModal,
    formatCommDate,
} from '@/common/components/CommunicationPreviewModal';
import { COMMUNICATION_STATUS_LABEL, communicationTone, queuedHint } from '@/common/utils/communicationStatus';
import { Button, Panel, PanelBody, PanelHead, SectionTitle, StatusPill, ui, type PillTone } from '@/common/components/ui';
import type { CommunicationEntry } from '@/common/types/communication';

const COLLAPSED = 5;

const List = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;

    li:first-child > button { border-top: none; padding-top: 0; }
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
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const TONE: Record<ReturnType<typeof communicationTone>, PillTone> = {
    sent: 'ok',
    received: 'info',
    queued: 'neutral',
    failed: 'danger',
};

interface Props {
    entries: CommunicationEntry[];
    isLoading?: boolean;
    id?: string;
}

export const CustomerCommunicationList = ({ entries, isLoading, id }: Props) => {
    const [selected, setSelected] = useState<CommunicationEntry | null>(null);
    const [expanded, setExpanded] = useState(false);

    const sorted = [...entries].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    const shown = expanded ? sorted : sorted.slice(0, COLLAPSED);

    return (
        <Panel id={id} aria-labelledby="customer-comm-title">
            <PanelHead>
                <SectionTitle id="customer-comm-title" count={entries.length || undefined}>Wiadomości do klienta</SectionTitle>
            </PanelHead>
            <PanelBody>
                {isLoading ? (
                    <Empty>Wczytywanie wiadomości...</Empty>
                ) : sorted.length === 0 ? (
                    <Empty>Do klienta nie wyszła jeszcze żadna wiadomość.</Empty>
                ) : (
                    <List>
                        {shown.map(entry => {
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
                )}

                {sorted.length > COLLAPSED && (
                    <Button variant="ghost" size="sm" style={{ marginTop: 6, marginLeft: -11 }} onClick={() => setExpanded(v => !v)}>
                        {expanded ? 'Pokaż mniej' : `Pokaż wszystkie (${sorted.length})`}
                    </Button>
                )}
            </PanelBody>

            {selected && <CommunicationPreviewModal entry={selected} onClose={() => setSelected(null)} />}
        </Panel>
    );
};
