// src/modules/communication/components/KanbanBoard.tsx
// Kanban 5 kolumn (WYGRANE nie ma kolumny). HTML5 drag&drop; ruch do PRZEGRANE
// lub "wstecz" pyta o powód lekkim popoverem (nie modalem) — §2.6 specyfikacji.
import { useState } from 'react';
import styled from 'styled-components';
import type { LeadCard as LeadCardData, LeadStage } from '../types';
import { BOARD_STAGES, STAGE_LABELS, STAGE_ORDER } from '../utils/format';
import { LeadCard } from './LeadCard';

const Board = styled.div`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    overflow-x: auto;
    padding: 16px;
    min-height: 100%;
`;

const Column = styled.section<{ $dropActive: boolean }>`
    flex: 1 1 0;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: ${({ $dropActive }) => ($dropActive ? '#f3f4f6' : 'transparent')};
    border-radius: 8px;
    padding: 4px;
    transition: background 120ms ease-out;
`;

const ColumnHeader = styled.header`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.4px;
    color: #6b7280;
    text-transform: uppercase;
`;

const Count = styled.span`
    font-weight: 400;
    font-variant-numeric: tabular-nums;
`;

const CardStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 60px;
`;

const ReasonPopover = styled.div`
    position: fixed;
    z-index: 60;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 12px;
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const PopoverTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
`;

const ReasonChips = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const ReasonChip = styled.button`
    height: 28px;
    padding: 0 10px;
    font-size: 13px;
    background: #f3f4f6;
    color: #1a1a1a;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
        background: #e5e7eb;
    }
`;

const ReasonInput = styled.input`
    height: 32px;
    padding: 0 8px;
    font-size: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

const QUICK_REASONS = ['Za drogo', 'Brak odpowiedzi', 'Termin'];

interface PendingMove {
    leadId: string;
    stage: LeadStage;
    x: number;
    y: number;
}

interface KanbanBoardProps {
    leads: LeadCardData[];
    onOpenLead: (id: string) => void;
    onStageChange: (leadId: string, stage: LeadStage, reason?: string) => void;
}

/** Sortowanie kolumny: piłka u nas najpierw, w obrębie grupy najstarsza pierwsza (kolejka, nie stos). */
const columnSort = (a: LeadCardData, b: LeadCardData): number => {
    const aOurs = a.hasNewActivity ? 0 : 1;
    const bOurs = b.hasNewActivity ? 0 : 1;
    if (aOurs !== bOurs) return aOurs - bOurs;
    return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
};

export const KanbanBoard = ({ leads, onOpenLead, onStageChange }: KanbanBoardProps) => {
    const [dropStage, setDropStage] = useState<LeadStage | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [reasonText, setReasonText] = useState('');

    const confirmMove = (reason?: string) => {
        if (!pendingMove) return;
        onStageChange(pendingMove.leadId, pendingMove.stage, reason || undefined);
        setPendingMove(null);
        setReasonText('');
    };

    const handleDrop = (e: React.DragEvent, stage: LeadStage) => {
        e.preventDefault();
        setDropStage(null);
        const leadId = e.dataTransfer.getData('text/plain');
        if (!leadId) return;
        const lead = leads.find((l) => l.id === leadId);
        if (!lead || lead.stage === stage) return;
        const backwards = STAGE_ORDER[stage] < STAGE_ORDER[lead.stage];
        if (stage === 'LOST' || backwards) {
            // Ruch wstecz zawsze ma powód wart zapisania — popover, nie modal.
            setPendingMove({ leadId, stage, x: Math.min(e.clientX, window.innerWidth - 300), y: Math.min(e.clientY, window.innerHeight - 180) });
        } else {
            onStageChange(leadId, stage);
        }
    };

    return (
        <Board>
            {BOARD_STAGES.map((stage) => {
                const columnLeads = leads.filter((l) => l.stage === stage).sort(columnSort);
                return (
                    <Column
                        key={stage}
                        $dropActive={dropStage === stage}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDropStage(stage);
                        }}
                        onDragLeave={() => setDropStage((current) => (current === stage ? null : current))}
                        onDrop={(e) => handleDrop(e, stage)}
                    >
                        <ColumnHeader>
                            {STAGE_LABELS[stage]} <Count>{columnLeads.length}</Count>
                        </ColumnHeader>
                        <CardStack>
                            {columnLeads.map((lead) => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onOpen={onOpenLead}
                                    draggable
                                    onDragStart={(e, id) => {
                                        e.dataTransfer.setData('text/plain', String(id));
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                />
                            ))}
                        </CardStack>
                    </Column>
                );
            })}
            {pendingMove && (
                <ReasonPopover style={{ left: pendingMove.x, top: pendingMove.y }}>
                    <PopoverTitle>
                        {pendingMove.stage === 'LOST' ? 'Powód przegranej' : 'Powód cofnięcia etapu'}
                    </PopoverTitle>
                    <ReasonChips>
                        {QUICK_REASONS.map((reason) => (
                            <ReasonChip key={reason} onClick={() => confirmMove(reason)}>
                                {reason}
                            </ReasonChip>
                        ))}
                    </ReasonChips>
                    <ReasonInput
                        autoFocus
                        placeholder="Inny powód (opcjonalnie) — Enter zapisuje"
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmMove(reasonText.trim());
                            if (e.key === 'Escape') setPendingMove(null);
                        }}
                    />
                </ReasonPopover>
            )}
        </Board>
    );
};
