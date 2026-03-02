// src/modules/operations/components/OperationalDataTable.tsx

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useOperations } from '../hooks/useOperations';
import { useDeleteOperation } from '../hooks/useDeleteOperation';
import { useUpdateReservationDate, useCancelReservation } from '../hooks/useReservationActions';
import { OperationStatusBadge, getStatusAccentColor } from './OperationStatusBadge';
import { DeleteOperationModal } from './DeleteOperationModal';
import { ChangeDateModal } from './ChangeDateModal';
import { CancelReservationModal } from './CancelReservationModal';
import { formatCurrency, formatDate } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Operation, OperationType, OperationStatus } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (iso: string): string => {
    try {
        return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
`;

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout constants ─────────────────────────────────────────────────────────

const COLS = '1fr 148px 138px 162px 44px';

// ─── Styled components ────────────────────────────────────────────────────────

const Outer = styled.div`
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const ListWrap = styled.div`
    min-width: 700px;
`;

const HeaderRow = styled.div`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 10px 20px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
`;

const HeaderCell = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
`;

const DataRow = styled.div<{ $accentColor: string; $clickable?: boolean }>`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 15px 20px;
    border-bottom: 1px solid ${st.border};
    box-shadow: inset 3px 0 0 ${props => props.$accentColor};
    cursor: ${props => props.$clickable ? 'pointer' : 'default'};
    transition: background ${st.transition};
    animation: ${fadeIn} 200ms ease both;
    align-items: center;

    &:hover {
        background: ${props => props.$clickable ? st.bgCardAlt : 'transparent'};
    }

    &:last-child {
        border-bottom: none;
    }
`;

// Main cell (vehicle + customer)
const MainCell = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const TypeBubble = styled.div<{ $isVisit: boolean }>`
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: ${props => props.$isVisit
        ? 'rgba(5, 150, 105, 0.10)'
        : 'rgba(37, 99, 235, 0.10)'};
    color: ${props => props.$isVisit ? '#059669' : '#2563EB'};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
        width: 18px;
        height: 18px;
    }
`;

const VehicleBlock = styled.div`
    min-width: 0;
    flex: 1;
`;

const VehicleName = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
`;

const PlaceholderText = styled.div`
    font-size: 14px;
    font-weight: 500;
    color: ${st.textMuted};
    font-style: italic;
`;

const RowMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 4px;
    flex-wrap: wrap;
`;

const LicensePlate = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    background: #1E293B;
    color: #fff;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
    line-height: 1.4;
`;

const TypeTag = styled.span<{ $isVisit: boolean }>`
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.$isVisit ? '#059669' : '#2563EB'};
    letter-spacing: 0.2px;
`;

const CustomerInfo = styled.div`
    font-size: 12px;
    color: ${st.textSecondary};
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

// Date cell
const DateCellWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DateMain = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
`;

const DateSub = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
`;

// Amount cell
const AmountCellWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const GrossAmt = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    white-space: nowrap;
`;

const NetAmt = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    white-space: nowrap;
`;

// Actions cell
const ActionsCellWrap = styled.div`
    display: flex;
    justify-content: flex-end;
    position: relative;
`;

const MenuBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1.5px solid ${st.border};
    border-radius: 8px;
    background: ${st.bgCard};
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
        background: ${st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

const DropdownMenu = styled.div`
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    min-width: 188px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 200;
    overflow: hidden;
    animation: ${fadeIn} 120ms ease both;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: ${props => props.$danger ? '#DC2626' : st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover {
        background: ${props => props.$danger ? 'rgba(220, 38, 38, 0.07)' : st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        opacity: 0.75;
    }
`;

const DropdownDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

// Empty state
const EmptyWrap = styled.div`
    padding: 60px 24px;
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: ${st.bgCardAlt};
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 26px;
        height: 26px;
        color: ${st.textMuted};
    }
`;

const EmptyTitle = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: ${st.text};
    margin-bottom: 6px;
`;

const EmptyDesc = styled.div`
    font-size: 13px;
    color: ${st.textMuted};
`;

// Skeleton
const SkeletonBox = styled.div<{ $w?: string; $h?: string }>`
    width: ${props => props.$w ?? '100%'};
    height: ${props => props.$h ?? '14px'};
    border-radius: 6px;
    background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
    background-size: 400px 100%;
    animation: ${shimmer} 1.4s infinite linear;
`;

// ─── Skeleton row ─────────────────────────────────────────────────────────────

const SkeletonRow = () => (
    <DataRow $accentColor="#E2E8F0" style={{ cursor: 'default' }}>
        <MainCell>
            <SkeletonBox $w="38px" $h="38px" style={{ borderRadius: '10px', flexShrink: 0 }} />
            <VehicleBlock>
                <SkeletonBox $w="140px" $h="16px" />
                <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                    <SkeletonBox $w="64px" $h="20px" style={{ borderRadius: '4px' }} />
                    <SkeletonBox $w="48px" $h="14px" />
                </div>
                <SkeletonBox $w="120px" $h="12px" style={{ marginTop: '5px' }} />
            </VehicleBlock>
        </MainCell>
        <DateCellWrap>
            <SkeletonBox $w="96px" $h="14px" />
            <SkeletonBox $w="48px" $h="12px" style={{ marginTop: '4px' }} />
        </DateCellWrap>
        <AmountCellWrap>
            <SkeletonBox $w="88px" $h="17px" />
            <SkeletonBox $w="72px" $h="12px" style={{ marginTop: '4px' }} />
        </AmountCellWrap>
        <SkeletonBox $w="110px" $h="26px" style={{ borderRadius: '20px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SkeletonBox $w="32px" $h="32px" style={{ borderRadius: '8px' }} />
        </div>
    </DataRow>
);

// ─── SVG icons ────────────────────────────────────────────────────────────────

const CarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M19 17H5a2 2 0 0 1-2-2V9l2-4h10l4 4v4a2 2 0 0 1-2 2Z" />
        <circle cx="7.5" cy="17" r="1.5" />
        <circle cx="16.5" cy="17" r="1.5" />
    </svg>
);

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const DotsIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5"  r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const EditDateIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface OperationalDataTableProps {
    search: string;
    page: number;
    limit: number;
    type?: OperationType;
    status?: OperationStatus;
    scheduledDate?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OperationalDataTable = ({
    search,
    page,
    limit,
    type,
    status,
    scheduledDate,
}: OperationalDataTableProps) => {
    const navigate = useNavigate();

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });
    const [changeDateModal, setChangeDateModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });

    const { operations, isLoading } = useOperations({
        search,
        page,
        limit,
        type,
        status,
        scheduledDate,
        sortBy: 'startDateTime',
        sortDirection: 'desc',
    });

    const { deleteOperation, isDeleting } = useDeleteOperation();
    const { updateDate, isUpdating } = useUpdateReservationDate();
    const { cancelReservation, isCancelling } = useCancelReservation();

    // Close dropdown on outside click
    useEffect(() => {
        if (!openMenuId) return;
        const handler = () => setOpenMenuId(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openMenuId]);

    const handleRowClick = useCallback((op: Operation) => {
        if (op.type === 'VISIT') {
            navigate(`/visits/${op.id}`);
        } else if (op.type === 'RESERVATION' && op.status === 'CREATED') {
            navigate(`/appointments/${op.id}/edit`);
        }
    }, [navigate]);

    const isRowClickable = (op: Operation) =>
        op.type === 'VISIT' || (op.type === 'RESERVATION' && op.status === 'CREATED');

    const toggleMenu = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenMenuId(prev => prev === id ? null : id);
    };

    // Delete
    const openDelete = (op: Operation) => {
        setOpenMenuId(null);
        setDeleteModal({ isOpen: true, op });
    };
    const confirmDelete = () => {
        if (!deleteModal.op) return;
        deleteOperation(deleteModal.op.id, {
            onSuccess: () => setDeleteModal({ isOpen: false, op: null }),
        });
    };

    // Change date
    const openChangeDate = (op: Operation) => {
        setOpenMenuId(null);
        setChangeDateModal({ isOpen: true, op });
    };
    const confirmChangeDate = (start: string, end: string) => {
        if (!changeDateModal.op) return;
        updateDate({ reservationId: changeDateModal.op.id, startDateTime: start, endDateTime: end }, {
            onSuccess: () => setChangeDateModal({ isOpen: false, op: null }),
        });
    };

    // Cancel
    const openCancel = (op: Operation) => {
        setOpenMenuId(null);
        setCancelModal({ isOpen: true, op });
    };
    const confirmCancel = () => {
        if (!cancelModal.op) return;
        cancelReservation(cancelModal.op.id, {
            onSuccess: () => setCancelModal({ isOpen: false, op: null }),
        });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <Outer>
                <ListWrap>
                    <HeaderRow>
                        <HeaderCell>Pojazd / Klient</HeaderCell>
                        <HeaderCell>Data przyjazdu</HeaderCell>
                        <HeaderCell>Wartość</HeaderCell>
                        <HeaderCell>Status</HeaderCell>
                        <HeaderCell />
                    </HeaderRow>

                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : operations.length === 0 ? (
                        <EmptyWrap>
                            <EmptyIcon>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                    <rect x="9" y="3" width="6" height="4" rx="1" />
                                    <line x1="9" y1="12" x2="15" y2="12" />
                                    <line x1="9" y1="16" x2="12" y2="16" />
                                </svg>
                            </EmptyIcon>
                            <EmptyTitle>Brak wyników</EmptyTitle>
                            <EmptyDesc>Nie znaleziono wizyt ani rezerwacji spełniających kryteria wyszukiwania.</EmptyDesc>
                        </EmptyWrap>
                    ) : (
                        operations.map(op => {
                            const clickable = isRowClickable(op);
                            const accentColor = getStatusAccentColor(op.status);
                            const isVisit = op.type === 'VISIT';
                            const hasName = !!(op.customerFirstName?.trim() || op.customerLastName?.trim());
                            const customerLabel = hasName
                                ? `${op.customerFirstName ?? ''} ${op.customerLastName ?? ''}`.trim()
                                : 'Brak danych klienta';
                            const phoneLabel = op.customerPhone ? ` · ${op.customerPhone}` : '';
                            const isReservationCreated = op.type === 'RESERVATION' && op.status === 'CREATED';

                            return (
                                <DataRow
                                    key={op.id}
                                    $accentColor={accentColor}
                                    $clickable={clickable}
                                    onClick={() => clickable && handleRowClick(op)}
                                >
                                    {/* Vehicle + customer */}
                                    <MainCell>
                                        <TypeBubble $isVisit={isVisit}>
                                            {isVisit ? <CarIcon /> : <CalendarIcon />}
                                        </TypeBubble>

                                        <VehicleBlock>
                                            {op.vehicle ? (
                                                <>
                                                    <VehicleName>
                                                        {op.vehicle.brand} {op.vehicle.model}
                                                    </VehicleName>
                                                    <RowMeta>
                                                        {op.vehicle.licensePlate && (
                                                            <LicensePlate>{op.vehicle.licensePlate}</LicensePlate>
                                                        )}
                                                        <TypeTag $isVisit={isVisit}>
                                                            {isVisit ? 'Wizyta' : 'Rezerwacja'}
                                                        </TypeTag>
                                                    </RowMeta>
                                                </>
                                            ) : (
                                                <>
                                                    <PlaceholderText>Brak pojazdu</PlaceholderText>
                                                    <RowMeta>
                                                        <TypeTag $isVisit={isVisit}>
                                                            {isVisit ? 'Wizyta' : 'Rezerwacja'}
                                                        </TypeTag>
                                                    </RowMeta>
                                                </>
                                            )}
                                            <CustomerInfo>
                                                {customerLabel}{phoneLabel}
                                            </CustomerInfo>
                                        </VehicleBlock>
                                    </MainCell>

                                    {/* Date */}
                                    <DateCellWrap>
                                        <DateMain>{formatDate(op.startDateTime)}</DateMain>
                                        <DateSub>{formatTime(op.startDateTime)}</DateSub>
                                    </DateCellWrap>

                                    {/* Amount */}
                                    <AmountCellWrap>
                                        <GrossAmt>
                                            {formatCurrency(op.financials.grossAmount, op.financials.currency)}
                                        </GrossAmt>
                                        <NetAmt>
                                            netto {formatCurrency(op.financials.netAmount, op.financials.currency)}
                                        </NetAmt>
                                    </AmountCellWrap>

                                    {/* Status */}
                                    <div>
                                        <OperationStatusBadge status={op.status} />
                                    </div>

                                    {/* Actions */}
                                    <ActionsCellWrap onClick={e => e.stopPropagation()}>
                                        <MenuBtn
                                            onClick={e => toggleMenu(op.id, e)}
                                            title="Akcje"
                                        >
                                            <DotsIcon />
                                        </MenuBtn>

                                        {openMenuId === op.id && (
                                            <DropdownMenu>
                                                {isReservationCreated && (
                                                    <>
                                                        <DropdownItem onClick={() => openChangeDate(op)}>
                                                            <EditDateIcon />
                                                            Zmień datę
                                                        </DropdownItem>
                                                        <DropdownItem onClick={() => openCancel(op)}>
                                                            <XIcon />
                                                            Anuluj rezerwację
                                                        </DropdownItem>
                                                        <DropdownDivider />
                                                    </>
                                                )}
                                                <DropdownItem $danger onClick={() => openDelete(op)}>
                                                    <TrashIcon />
                                                    Usuń {isVisit ? 'wizytę' : 'rezerwację'}
                                                </DropdownItem>
                                            </DropdownMenu>
                                        )}
                                    </ActionsCellWrap>
                                </DataRow>
                            );
                        })
                    )}
                </ListWrap>
            </Outer>

            <DeleteOperationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, op: null })}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
                operationName={
                    deleteModal.op
                        ? `${deleteModal.op.customerFirstName} ${deleteModal.op.customerLastName}`
                        : ''
                }
            />

            <ChangeDateModal
                isOpen={changeDateModal.isOpen}
                onClose={() => setChangeDateModal({ isOpen: false, op: null })}
                reservation={changeDateModal.op}
                onConfirm={confirmChangeDate}
                isUpdating={isUpdating}
            />

            <CancelReservationModal
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ isOpen: false, op: null })}
                onConfirm={confirmCancel}
                isCancelling={isCancelling}
                reservation={cancelModal.op}
            />
        </>
    );
};
