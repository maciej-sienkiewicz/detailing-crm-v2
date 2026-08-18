// src/modules/communication/components/LeadListTable.tsx
// Widok listy: wiersze 52 px, etap edytowalny inline dropdownem bez otwierania drawera.
import styled from 'styled-components';
import type { LeadCard as LeadCardData, LeadStage } from '../types';
import { formatAge, formatDateTime, formatPln, vehicleTitle } from '../utils/format';
import { StageSelect } from './StageSelect';

const TableWrapper = styled.div`
    overflow-x: auto;
    padding: 16px;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
`;

const Th = styled.th`
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #6b7280;
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
    background: #fafafa;
    white-space: nowrap;
`;

const Tr = styled.tr`
    height: 52px;
    cursor: pointer;

    &:hover {
        background: #f8fafc;
    }

    &:not(:last-child) td {
        border-bottom: 1px solid #f3f4f6;
    }
`;

const Td = styled.td`
    padding: 4px 12px;
    font-size: 13px;
    color: #1a1a1a;
    white-space: nowrap;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const VehicleCell = styled.div`
    font-weight: 600;
    font-size: 14px;
`;

const ServicesCell = styled.div`
    font-size: 12px;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Muted = styled.span`
    color: #6b7280;
`;

const Amount = styled.span`
    font-variant-numeric: tabular-nums;
    font-weight: 600;
`;

const BallCell = styled.span<{ $ours: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-variant-numeric: tabular-nums;
    color: ${({ $ours }) => ($ours ? '#1a1a1a' : '#6b7280')};
`;

const AccentDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
`;

interface LeadListTableProps {
    leads: LeadCardData[];
    onOpenLead: (id: string) => void;
    onStageChange: (leadId: string, stage: LeadStage) => void;
}

/** Sortowanie listy: piłka u nas → najstarsze pierwsze. */
const listSort = (a: LeadCardData, b: LeadCardData): number => {
    const aOurs = a.hasNewActivity ? 0 : 1;
    const bOurs = b.hasNewActivity ? 0 : 1;
    if (aOurs !== bOurs) return aOurs - bOurs;
    return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
};

export const LeadListTable = ({ leads, onOpenLead, onStageChange }: LeadListTableProps) => (
    <TableWrapper>
        <Table>
            <thead>
                <tr>
                    <Th>Pojazd / Usługi</Th>
                    <Th>Klient</Th>
                    <Th>Etap</Th>
                    <Th>Wycena</Th>
                    <Th>Ostatnia aktywność</Th>
                    <Th>Piłka</Th>
                </tr>
            </thead>
            <tbody>
                {[...leads].sort(listSort).map((lead) => {
                    const ballOurs = lead.hasNewActivity;
                    return (
                        <Tr key={lead.id} onClick={() => onOpenLead(lead.id)}>
                            <Td>
                                <VehicleCell>{vehicleTitle(lead)}</VehicleCell>
                                {lead.services.length > 0 && (
                                    <ServicesCell>{lead.services.join(', ')}</ServicesCell>
                                )}
                            </Td>
                            <Td>
                                {lead.customerName ?? lead.contactIdentifier}
                                {lead.requiresVerification && <Muted> · do sprawdzenia</Muted>}
                            </Td>
                            <Td>
                                <StageSelect
                                    compact
                                    value={lead.stage}
                                    onChange={(stage) => onStageChange(lead.id, stage)}
                                    ariaLabel={`Etap: ${vehicleTitle(lead)}`}
                                />
                            </Td>
                            <Td>
                                {lead.estimatedValue > 0
                                    ? <Amount>{formatPln(lead.estimatedValue)}</Amount>
                                    : <Muted>—</Muted>}
                            </Td>
                            <Td><Muted>{formatDateTime(lead.lastActivityAt)}</Muted></Td>
                            <Td>
                                <BallCell $ours={ballOurs}>
                                    {ballOurs ? <AccentDot /> : <span aria-hidden>◷</span>}
                                    {formatAge(lead.lastActivityAt)}
                                </BallCell>
                            </Td>
                        </Tr>
                    );
                })}
            </tbody>
        </Table>
    </TableWrapper>
);
