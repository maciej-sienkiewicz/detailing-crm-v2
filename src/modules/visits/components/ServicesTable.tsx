import styled from 'styled-components';
import { useState } from 'react';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import { formatCurrency } from '@/common/utils';
import type { ServiceLineItem, VisitStatus } from '../types';
import { useApproveServiceChange, useRejectServiceChange } from '../hooks';

const TableContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const TableHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 2px solid ${props => props.theme.colors.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const TableHeaderLeft = styled.div``;

const TableTitle = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const TableSubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const EditButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};

    &:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Thead = styled.thead`
    background: ${props => props.theme.colors.surfaceAlt};
`;

const Th = styled.th`
    padding: ${props => props.theme.spacing.md};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ActionsCell = styled.td`
    padding: ${props => props.theme.spacing.md};
    text-align: right;
`;

const RowActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.sm};
`;

// Minimalist confirm modal
const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalCard = styled.div`
    width: 100%;
    max-width: 440px;
    background: #fff;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: 0 20px 50px rgba(2,6,23,0.15);
    overflow: hidden;
`;

const ModalHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ModalTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
`;

const ModalBody = styled.div`
    padding: ${props => props.theme.spacing.lg};
    color: ${props => props.theme.colors.textSecondary};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const ModalFooter = styled.div`
    padding: ${props => props.theme.spacing.md};
    display: flex;
    justify-content: flex-end;
    gap: ${props => props.theme.spacing.sm};
    background: ${props => props.theme.colors.surfaceAlt};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const SecondaryBtn = styled.button`
    padding: 6px 10px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: transparent;
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.xs};
    cursor: pointer;

    &:hover { background: ${props => props.theme.colors.surfaceAlt}; }
`;

const PrimaryBtn = styled.button<{ $danger?: boolean }>`
    padding: 6px 10px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surfaceAlt};
    color: ${props => props.$danger ? props.theme.colors.error : 'var(--brand-primary)'};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;

    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    color: ${p => p.$variant === 'danger' ? p.theme.colors.error : p.theme.colors.text};
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

    &:hover:not(:disabled) {
        background: ${props => props.theme.colors.surfaceAlt};
    }

    &:active:not(:disabled) {
        background: ${props => (props.theme.colors as any).surfaceHover || props.theme.colors.surfaceAlt};
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $pendingOp?: 'ADD' | 'EDIT' | 'DELETE' | null }>`
    transition: background-color 0.2s ease;
    background: ${props => props.$pendingOp === 'DELETE' ? '#fff1f2'
        : props.$pendingOp === 'EDIT' ? '#fffbeb'
        : props.$pendingOp === 'ADD' ? '#f0fdf4'
        : 'transparent'};

    &:hover {
        background: ${props => props.$pendingOp ? 'inherit' : props.theme.colors.surfaceAlt};
    }

    &:not(:last-child) {
        border-bottom: 1px solid ${props => props.theme.colors.border};
    }
`;

const Td = styled.td`
    padding: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
`;

const ServiceName = styled.div`
    font-weight: 500;
    margin-bottom: 4px;
`;

const ServiceNote = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
`;

const ServiceStatusBadge = styled.div<{ $status: 'CONFIRMED' | 'PENDING' }>`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: ${props => props.$status === 'PENDING' ? '#fef3c7' : '#dcfce7'};
    color: ${props => props.$status === 'PENDING' ? '#92400e' : '#166534'};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    margin-left: ${props => props.theme.spacing.xs};
`;

const PriceStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PriceValue = styled.div<{ $strikethrough?: boolean; $secondary?: boolean }>`
    font-weight: 500;
    ${props => props.$strikethrough && `
        text-decoration: line-through;
        opacity: 0.6;
        font-size: ${props.theme.fontSizes.xs};
    `}
    ${props => props.$secondary && `
        color: ${props.theme.colors.textSecondary};
        font-size: ${props.theme.fontSizes.xs};
        font-weight: 500;
    `}
`;

const PriceLabel = styled.span`
    display: inline-block;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-left: 6px;
`;

const ChangePill = styled.span<{ $trend: 'up' | 'down' | 'neutral' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    margin-left: 8px;
    background: ${p => p.$trend === 'up' ? '#fee2e2' : p.$trend === 'down' ? '#ecfdf5' : '#f3f4f6'};
    color: ${p => p.$trend === 'up' ? '#991b1b' : p.$trend === 'down' ? '#065f46' : '#374151'};
`;


const DiscountBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: #fef3c7;
    color: #92400e;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    margin-top: 4px;
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-top: 2px solid ${props => props.theme.colors.border};
`;

const TotalLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const TotalValue = styled.span`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: var(--brand-primary);
`;

const TotalBreakdown = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
`;

const BreakdownItem = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

interface ServicesTableProps {
    services: ServiceLineItem[];
    visitStatus?: VisitStatus;
    visitId?: string;
    onEditClick?: () => void;
}

export const ServicesTable = ({ services, visitStatus, visitId, onEditClick }: ServicesTableProps) => {
    const { calculateServicePrice } = useServicePricing();

    // Confirm modal state
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<null | 'approve' | 'reject'>(null);
    const [targetService, setTargetService] = useState<ServiceLineItem | null>(null);

    const openConfirm = (service: ServiceLineItem, action: 'approve' | 'reject') => {
        setTargetService(service);
        setConfirmAction(action);
        setIsConfirmOpen(true);
    };

    const closeConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction(null);
        setTargetService(null);
    };

    // Totals should use previous (approved) price if an EDIT is pending
    const totals = (() => {
        let totalFinalNet = 0;
        let totalFinalGross = 0;
        let totalVat = 0;
        let totalOriginalGross = 0; // for hasTotalDiscount flag

        services.forEach(service => {
            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceNet ?? null) !== null && (service.previousPriceGross ?? null) !== null;
            if (isEditPending) {
                const net = service.previousPriceNet as number;
                const gross = service.previousPriceGross as number;
                totalFinalNet += net;
                totalFinalGross += gross;
                totalVat += Math.max(gross - net, 0);
                // originalGross for discount comparison: use gross (we don't track 'original' vs 'final' here)
                totalOriginalGross += gross;
            } else {
                const pricing = calculateServicePrice(service);
                totalFinalNet += pricing.finalPriceNet;
                totalFinalGross += pricing.finalPriceGross;
                totalVat += pricing.vatAmount;
                totalOriginalGross += pricing.originalPriceGross;
            }
        });

        return {
            totalFinalNet,
            totalFinalGross,
            totalVat,
            hasTotalDiscount: totalFinalGross < totalOriginalGross,
        };
    })();

    const { approveServiceChange, isApproving } = useApproveServiceChange(visitId || '');
    const { rejectServiceChange, isRejecting } = useRejectServiceChange(visitId || '');

    const canEdit = visitStatus === 'IN_PROGRESS' || visitStatus === 'READY_FOR_PICKUP';
    const hasPendingServices = services.some(s => (s.hasPendingChange ?? (s.status === 'PENDING')));

    return (
        <>
        <TableContainer>
            <TableHeader>
                <TableHeaderLeft>
                    <TableTitle>Wykaz usług</TableTitle>
                    <TableSubtitle>
                        {services.length} pozycji
                        {hasPendingServices && ' • Zawiera usługi oczekujące na potwierdzenie'}
                    </TableSubtitle>
                </TableHeaderLeft>
                {canEdit && onEditClick && (
                    <EditButton onClick={onEditClick}>
                        Edytuj usługi
                    </EditButton>
                )}
            </TableHeader>

            <Table>
                <Thead>
                    <Tr>
                    <Th>Usługa</Th>
                    <Th>Cena netto</Th>
                    <Th>VAT</Th>
                    <Th>Cena brutto</Th>
                    <Th style={{ textAlign: 'right' }}>Akcje</Th>
                </Tr>
                </Thead>
                <Tbody>
                    {services.map(service => {
                        const pricing = calculateServicePrice(service);
                        const showDiscount = pricing.hasDiscount && service.basePriceNet !== 0;

                        return (
                            <Tr key={service.id} $pendingOp={(service.hasPendingChange ?? (service.status === 'PENDING')) ? (service.pendingOperation || 'EDIT') : null}>
                                <Td>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <ServiceName>{service.serviceName}</ServiceName>
                                            {service.note && <ServiceNote>{service.note}</ServiceNote>}
                                            {showDiscount && (
                                                <DiscountBadge>{pricing.discountLabel}</DiscountBadge>
                                            )}
                                        </div>
                                        <ServiceStatusBadge $status={service.status}>
                                            {(service.hasPendingChange ?? (service.status === 'PENDING'))
                                                ? (service.pendingOperation === 'ADD' ? 'Nowa (oczekuje)'
                                                    : service.pendingOperation === 'EDIT' ? 'Edycja (oczekuje)'
                                                    : service.pendingOperation === 'DELETE' ? 'Usunięcie (oczekuje)'
                                                    : 'Oczekuje')
                                                : 'Potwierdzona'}
                                        </ServiceStatusBadge>
                                    </div>
                                </Td>
                                <Td>
                                    <PriceStack>
                                        {(() => {
                                            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
                                            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceNet ?? null) !== null;
                                            if (isEditPending) {
                                                const prevNet = service.previousPriceNet as number;
                                                const proposedNet = pricing.finalPriceNet;
                                                const trendNet: 'up' | 'down' | 'neutral' = proposedNet > prevNet ? 'up' : proposedNet < prevNet ? 'down' : 'neutral';
                                                return (
                                                    <>
                                                        <div>
                                                            <PriceValue>
                                                                {formatCurrency(prevNet / 100)}
                                                                <PriceLabel>Obowiązująca</PriceLabel>
                                                            </PriceValue>
                                                        </div>
                                                        <div>
                                                            <PriceValue $secondary>
                                                                {formatCurrency(proposedNet / 100)}
                                                                <PriceLabel>Proponowana</PriceLabel>
                                                                <ChangePill $trend={trendNet}>
                                                                    {trendNet === 'up' ? '▲' : trendNet === 'down' ? '▼' : '▬'}
                                                                </ChangePill>
                                                            </PriceValue>
                                                        </div>
                                                    </>
                                                );
                                            }

                                            return (
                                                <>
                                                    {showDiscount && (
                                                        <PriceValue $strikethrough>
                                                            {formatCurrency(pricing.originalPriceNet / 100)}
                                                        </PriceValue>
                                                    )}
                                                    <PriceValue>
                                                        {formatCurrency(pricing.finalPriceNet / 100)}
                                                    </PriceValue>
                                                </>
                                            );
                                        })()}
                                    </PriceStack>
                                </Td>
                                <Td>
                                    <PriceValue>{service.vatRate}%</PriceValue>
                                </Td>
                                <Td>
                                    <PriceStack>
                                        {(() => {
                                            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
                                            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceGross ?? null) !== null;
                                            if (isEditPending) {
                                                const prevGross = service.previousPriceGross as number;
                                                const proposedGross = pricing.finalPriceGross;
                                                const trendGross: 'up' | 'down' | 'neutral' = proposedGross > prevGross ? 'up' : proposedGross < prevGross ? 'down' : 'neutral';
                                                return (
                                                    <>
                                                        <div>
                                                            <PriceValue>
                                                                {formatCurrency(prevGross / 100)}
                                                                <PriceLabel>Obowiązująca</PriceLabel>
                                                            </PriceValue>
                                                        </div>
                                                        <div>
                                                            <PriceValue $secondary>
                                                                {formatCurrency(proposedGross / 100)}
                                                                <PriceLabel>Proponowana</PriceLabel>
                                                                <ChangePill $trend={trendGross}>
                                                                    {trendGross === 'up' ? '▲' : trendGross === 'down' ? '▼' : '▬'}
                                                                </ChangePill>
                                                            </PriceValue>
                                                        </div>
                                                    </>
                                                );
                                            }

                                            return (
                                                <>
                                                    {showDiscount && (
                                                        <PriceValue $strikethrough>
                                                            {formatCurrency(pricing.originalPriceGross / 100)}
                                                        </PriceValue>
                                                    )}
                                                    <PriceValue>
                                                        {formatCurrency(pricing.finalPriceGross / 100)}
                                                    </PriceValue>
                                                </>
                                            );
                                        })()}
                                    </PriceStack>
                                </Td>
                                <ActionsCell>
                                    <RowActions>
                                        {(service.hasPendingChange ?? (service.status === 'PENDING')) && (
                                            <>
                                                <ActionButton
                                                    onClick={() => {
                                                        if (!visitId) return;
                                                        openConfirm(service, 'approve');
                                                    }}
                                                    disabled={!visitId || isApproving}
                                                >
                                                    Zatwierdź zmianę
                                                </ActionButton>
                                                <ActionButton
                                                    $variant="danger"
                                                    onClick={() => {
                                                        if (!visitId) return;
                                                        openConfirm(service, 'reject');
                                                    }}
                                                    disabled={!visitId || isRejecting}
                                                >
                                                    Wycofaj zmianę
                                                </ActionButton>
                                            </>
                                        )}
                                    </RowActions>
                                </ActionsCell>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>

            <TotalRow>
                <div>
                    <TotalLabel>Razem do zapłaty</TotalLabel>
                    {totals.hasTotalDiscount && (
                        <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                            Uwzględniono rabaty
                        </div>
                    )}
                </div>
                <TotalBreakdown>
                    <BreakdownItem>
                        Netto: {formatCurrency(totals.totalFinalNet / 100)}
                    </BreakdownItem>
                    <BreakdownItem>
                        VAT: {formatCurrency(totals.totalVat / 100)}
                    </BreakdownItem>
                    <TotalValue>
                        {formatCurrency(totals.totalFinalGross / 100)}
                    </TotalValue>
                </TotalBreakdown>
            </TotalRow>
        </TableContainer>

        {isConfirmOpen && targetService && (
            <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
                <ModalCard role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                    <ModalHeader>
                        <ModalTitle id="confirm-title">
                            {confirmAction === 'approve' ? 'Potwierdź zmianę' : 'Wycofać zmianę?'}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {confirmAction === 'approve' ? (
                            <>
                                {targetService.pendingOperation === 'DELETE'
                                    ? 'Zatwierdzenie spowoduje trwałe usunięcie tej usługi z wizyty. Czy na pewno chcesz kontynuować?'
                                    : 'Zatwierdzenie zmiany spowoduje jej wejście w życie. Czy na pewno chcesz kontynuować?'}
                            </>
                        ) : (
                            <>Odrzucenie spowoduje przywrócenie ostatniego zatwierdzonego stanu tej usługi. Kontynuować?</>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <SecondaryBtn onClick={closeConfirm}>Anuluj</SecondaryBtn>
                        <PrimaryBtn
                            $danger={confirmAction === 'reject'}
                            disabled={(confirmAction === 'approve' && isApproving) || (confirmAction === 'reject' && isRejecting)}
                            onClick={() => {
                                if (!visitId || !targetService) return;
                                if (confirmAction === 'approve') {
                                    approveServiceChange(targetService.id, { onSettled: closeConfirm });
                                } else if (confirmAction === 'reject') {
                                    rejectServiceChange(targetService.id, { onSettled: closeConfirm });
                                }
                            }}
                        >
                            {confirmAction === 'approve' ? 'Zatwierdź' : 'Wycofaj'}
                        </PrimaryBtn>
                    </ModalFooter>
                </ModalCard>
            </ModalOverlay>
        )}
        </>
    );
};
