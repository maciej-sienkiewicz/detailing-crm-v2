// src/modules/communication/components/LeadDrawer.tsx
// Drawer szczegółów (§2.3): prawa strona 56% / min 560 px, overlay, Esc zamyka.
// Header sticky z faktami-chipami i etapem, wątek, composer sticky bottom.
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { LeadStage, QuoteItem } from '../types';
import {
    useAddNote,
    useLeadDetail,
    useReply,
    useStageChange,
    useUpdateFact,
    useVerifyFacts,
} from '../hooks';
import { vehicleTitle } from '../utils/format';
import { Composer } from './Composer';
import { FactChip } from './FactChip';
import { StageSelect } from './StageSelect';
import { ThreadTimeline } from './ThreadTimeline';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.24);
`;

const Panel = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    width: 56%;
    min-width: 560px;
    max-width: 100%;
    background: #fafafa;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;

    @media (max-width: 640px) {
        width: 100%;
        min-width: 0;
    }
`;

const Header = styled.header`
    position: sticky;
    top: 0;
    z-index: 41;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const HeaderTop = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const CustomerName = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
`;

const ContactInfo = styled.span`
    font-size: 13px;
    color: #6b7280;
`;

const CallLink = styled.a`
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
`;

const CloseButton = styled.button`
    margin-left: auto;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    font-size: 16px;
    color: #6b7280;
    cursor: pointer;
    border-radius: 6px;

    &:hover {
        background: #f3f4f6;
        color: #1a1a1a;
    }
`;

const FactsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

const VerifyAllButton = styled.button`
    height: 28px;
    padding: 0 8px;
    background: none;
    border: none;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
`;

const StageRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6b7280;
`;

const ThreadScroll = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const CenterInfo = styled.div`
    padding: 32px 16px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
`;

const NoteBar = styled.div`
    padding: 4px 16px;
    display: flex;
    justify-content: flex-end;
`;

const NoteToggle = styled.button`
    background: none;
    border: none;
    font-size: 13px;
    color: #6b7280;
    cursor: pointer;

    &:hover {
        color: #1a1a1a;
    }
`;

const NoteBox = styled.div`
    margin: 0 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const NoteTextarea = styled.textarea`
    min-height: 64px;
    padding: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #fffbeb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    resize: vertical;
`;

const NoteSaveButton = styled.button`
    align-self: flex-end;
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    background: #f3f4f6;
    color: #1a1a1a;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SkeletonBlock = styled.div`
    height: 80px;
    margin: 16px;
    background: #f3f4f6;
    border-radius: 8px;
`;

interface LeadDrawerProps {
    leadId: number;
    onClose: () => void;
}

export const LeadDrawer = ({ leadId, onClose }: LeadDrawerProps) => {
    const { data: lead, isLoading, isError } = useLeadDetail(leadId);
    const replyMutation = useReply(leadId);
    const stageMutation = useStageChange();
    const noteMutation = useAddNote(leadId);
    const factMutation = useUpdateFact(leadId);
    const verifyMutation = useVerifyFacts(leadId);

    const [noteOpen, setNoteOpen] = useState(false);
    const [noteText, setNoteText] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSend = useCallback(
        (bodyText: string, quote: { items: QuoteItem[] } | undefined, nextStage: LeadStage | undefined) => {
            replyMutation.mutate({ bodyText, quote, nextStage });
        },
        [replyMutation],
    );

    const saveNote = () => {
        const text = noteText.trim();
        if (!text) return;
        noteMutation.mutate(text, {
            onSuccess: () => {
                setNoteText('');
                setNoteOpen(false);
            },
        });
    };

    const hasUnverified = lead?.facts.some((f) => !f.verified) ?? false;

    return (
        <>
            <Overlay onClick={onClose} />
            <Panel role="dialog" aria-modal="true" aria-label="Szczegóły zapytania">
                <Header>
                    <HeaderTop>
                        <CustomerName>{lead ? (lead.customerName ?? vehicleTitle(lead)) : '…'}</CustomerName>
                        {lead?.phone && (
                            <>
                                <ContactInfo>{lead.phone}</ContactInfo>
                                <CallLink href={`tel:${lead.phone.replace(/\s/g, '')}`}>Zadzwoń</CallLink>
                            </>
                        )}
                        {lead && <ContactInfo>{lead.contactEmail}</ContactInfo>}
                        <CloseButton onClick={onClose} aria-label="Zamknij">✕</CloseButton>
                    </HeaderTop>
                    {lead && lead.facts.length > 0 && (
                        <FactsRow>
                            {lead.facts.map((fact) => (
                                <FactChip
                                    key={fact.id}
                                    fact={fact}
                                    onSave={(factId, value) => factMutation.mutate({ factId, value })}
                                />
                            ))}
                            {hasUnverified && (
                                <VerifyAllButton onClick={() => verifyMutation.mutate()}>
                                    Zatwierdź wszystkie
                                </VerifyAllButton>
                            )}
                        </FactsRow>
                    )}
                    {lead && (
                        <StageRow>
                            Etap:
                            <StageSelect
                                value={lead.stage}
                                onChange={(stage) => stageMutation.mutate({ leadId, stage })}
                            />
                        </StageRow>
                    )}
                </Header>
                <ThreadScroll>
                    {isLoading && <SkeletonBlock />}
                    {isError && (
                        <CenterInfo>
                            Nie udało się pobrać wątku. Sprawdź połączenie i spróbuj ponownie.
                        </CenterInfo>
                    )}
                    {lead && <ThreadTimeline timeline={lead.timeline} />}
                </ThreadScroll>
                {lead && (
                    <>
                        <NoteBar>
                            <NoteToggle onClick={() => setNoteOpen((o) => !o)}>
                                {noteOpen ? 'Ukryj notatkę' : 'Dodaj notatkę'}
                            </NoteToggle>
                        </NoteBar>
                        {noteOpen && (
                            <NoteBox>
                                <NoteTextarea
                                    autoFocus
                                    placeholder="Notatka wewnętrzna — klient jej nie zobaczy"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                />
                                <NoteSaveButton
                                    disabled={!noteText.trim() || noteMutation.isPending}
                                    onClick={saveNote}
                                >
                                    Zapisz notatkę
                                </NoteSaveButton>
                            </NoteBox>
                        )}
                        <Composer
                            customerName={lead.customerName}
                            contactEmail={lead.contactEmail}
                            currentStage={lead.stage}
                            sending={replyMutation.isPending}
                            onSend={handleSend}
                        />
                    </>
                )}
            </Panel>
        </>
    );
};
