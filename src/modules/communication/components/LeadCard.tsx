// src/modules/communication/components/LeadCard.tsx
// Anatomia karty wg specyfikacji §2.2: pojazd jako nagłówek, usługi, klient,
// wskaźnik piłki (kropka akcentowa gdy piłka u nas), warunkowy wiersz wyceny.
import styled from 'styled-components';
import type { LeadCard as LeadCardData } from '../types';
import { formatAge, formatPln, formatSentAgo, vehicleTitle } from '../utils/format';

const Card = styled.article<{ $unread: boolean }>`
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    ${({ $unread, theme }) => $unread && `border-left: 3px solid ${theme.colors.primary};`}

    &:hover {
        border-color: #d1d5db;
    }

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

const TopRow = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
`;

const Vehicle = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const BallIndicator = styled.span<{ $ours: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${({ $ours, theme }) => ($ours ? theme.colors.text : '#6b7280')};
`;

const AccentDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
`;

const ClockGlyph = styled.span`
    color: #9ca3af;
    font-size: 12px;
    line-height: 1;
`;

const Services = styled.div`
    font-size: 13px;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CustomerRow = styled.div`
    font-size: 13px;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Returning = styled.span`
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const QuoteRow = styled.div`
    font-size: 13px;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
`;

const QuoteAmount = styled.span`
    font-weight: 600;
    color: #1a1a1a;
`;

interface LeadCardProps {
    lead: LeadCardData;
    onOpen: (id: number) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, id: number) => void;
}

export const LeadCard = ({ lead, onOpen, draggable, onDragStart }: LeadCardProps) => {
    const ballOurs = lead.lastDirection === 'INBOUND';
    return (
        <Card
            $unread={lead.unread}
            tabIndex={0}
            draggable={draggable}
            onDragStart={(e) => onDragStart?.(e, lead.id)}
            onClick={() => onOpen(lead.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onOpen(lead.id);
            }}
        >
            <TopRow>
                <Vehicle>{vehicleTitle(lead)}</Vehicle>
                <BallIndicator $ours={ballOurs} title={ballOurs ? 'Klient czeka na odpowiedź' : 'Czekamy na klienta'}>
                    {ballOurs ? <AccentDot /> : <ClockGlyph aria-hidden>◷</ClockGlyph>}
                    {formatAge(lead.lastMessageAt)}
                </BallIndicator>
            </TopRow>
            {lead.services.length > 0 && <Services>{lead.services.join(', ')}</Services>}
            <CustomerRow>
                {lead.customerName ?? lead.contactEmail}
                {lead.returningCustomer && <Returning> · ↩ Stały klient</Returning>}
            </CustomerRow>
            {lead.quoteTotal != null && (
                <QuoteRow>
                    <QuoteAmount>{formatPln(lead.quoteTotal)}</QuoteAmount>
                    {' · '}
                    {formatSentAgo(lead.lastMessageAt)}
                </QuoteRow>
            )}
        </Card>
    );
};
