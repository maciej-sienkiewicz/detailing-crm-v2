// src/modules/operations/components/OperationalDataTable.tsx

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useOperations } from '../hooks/useOperations';
import { useDeleteOperation } from '../hooks/useDeleteOperation';
import { useUpdateReservationDate, useCancelReservation, useUpdateOperationTitle } from '../hooks/useReservationActions';
import { OperationStatusBadge, getStatusAccentColor, getStatusIcon } from './OperationStatusBadge';
import { DeleteOperationModal } from './DeleteOperationModal';
import { DeleteRecurringModal } from './DeleteRecurringModal';
import { ChangeDateModal } from './ChangeDateModal';
import { CancelReservationModal } from './CancelReservationModal';
import type { RecurrenceEditScope } from '@/modules/appointments/types';
import { formatCurrency, formatDate } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Operation, OperationType, OperationStatus, SmsSendStatus } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (iso: string): string => {
    try {
        return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const smsStatusLabel = (status: SmsSendStatus | null | undefined): string => {
    if (status === 'SENT') return 'Wysłany';
    if (status === 'FAILED') return 'Błąd';
    if (status === 'PENDING') return 'Oczekuje';
    return '';
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

const COLS = '1fr 160px 160px 148px 138px 44px';

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

const DataRow = styled.div<{ $accentColor: string; $clickable?: boolean; $menuOpen?: boolean }>`
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
    position: relative;
    z-index: ${props => props.$menuOpen ? 10 : 0};

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

const TypeBubble = styled.div<{ $color: string }>`
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: ${props => props.$color}18;
    color: ${props => props.$color};
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

    &:hover [data-pencil] {
        opacity: 1;
    }
`;

const VehicleName = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
    line-height: 1.4;
    word-break: break-word;
`;

const PlaceholderText = styled.div`
    font-size: 14px;
    font-weight: 500;
    color: ${st.textMuted};
    font-style: italic;
`;

const TitleEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const TitleInput = styled.input`
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
    background: ${st.bgCardAlt};
    border: 1.5px solid rgba(59, 130, 246, 0.45);
    border-radius: 5px;
    padding: 2px 6px;
    outline: none;
    min-width: 0;
    width: 180px;
    max-width: 100%;

    &:focus { border-color: rgba(59, 130, 246, 0.8); }
`;

const TitleActionBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 5px;
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: all 140ms ease;
    svg { width: 12px; height: 12px; }
`;

const TitleSaveBtn = styled(TitleActionBtn)`
    color: #059669;
    border-color: rgba(16,185,129,0.3);
    background: rgba(16,185,129,0.08);
    &:hover { background: rgba(16,185,129,0.18); }
`;

const TitleCancelBtn = styled(TitleActionBtn)`
    color: ${st.textMuted};
    border-color: ${st.border};
    background: ${st.bgCardAlt};
    &:hover { color: ${st.text}; }
`;

const PencilIconBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: none;
    cursor: pointer;
    color: ${st.textMuted};
    border-radius: 4px;
    padding: 0;
    opacity: 0;
    flex-shrink: 0;
    transition: opacity 140ms ease, color 140ms ease;
    svg { width: 12px; height: 12px; }
    &:hover { color: ${st.text}; }
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

const SmsBadge = styled.span<{ $status: SmsSendStatus | 'NOT_SENT' }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
    background: ${props => {
        if (props.$status === 'SENT') return 'rgba(5, 150, 105, 0.10)';
        if (props.$status === 'FAILED') return 'rgba(220, 38, 38, 0.09)';
        if (props.$status === 'PENDING') return 'rgba(234, 179, 8, 0.10)';
        return 'rgba(148, 163, 184, 0.12)';
    }};
    color: ${props => {
        if (props.$status === 'SENT') return '#059669';
        if (props.$status === 'FAILED') return '#DC2626';
        if (props.$status === 'PENDING') return '#B45309';
        return '#64748B';
    }};
`;

const SmsDot = styled.span<{ $status: SmsSendStatus | 'NOT_SENT' }>`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${props => {
        if (props.$status === 'SENT') return '#059669';
        if (props.$status === 'FAILED') return '#DC2626';
        if (props.$status === 'PENDING') return '#D97706';
        return '#94A3B8';
    }};
    flex-shrink: 0;
`;

const SmsInfoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    flex-wrap: wrap;
`;

const CustomerName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CustomerPhone = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    margin-top: 2px;
    white-space: nowrap;
`;

const VehicleSubInfo = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 5px;
    margin-top: 3px;
    font-size: 12px;
    font-weight: 600;
    color: ${st.text};
    line-height: 1.5;
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

const DeletedAtLabel = styled.span`
    font-size: 11px;
    color: #9F1239;
    white-space: nowrap;
    opacity: 0.8;
`;

const DropdownMenu = styled.div`
    position: fixed;
    min-width: 188px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 1000;
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

// Recurrence badge
const RecurrencePill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2px;
    background: rgba(139, 92, 246, 0.10);
    color: #7C3AED;
    flex-shrink: 0;
`;

const DetachedDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #D97706;
    flex-shrink: 0;
    display: inline-block;
    margin-left: 2px;
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

const RepeatIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
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
    seriesId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OperationalDataTable = ({
    search,
    page,
    limit,
    type,
    status,
    scheduledDate,
    seriesId,
}: OperationalDataTableProps) => {
    const navigate = useNavigate();

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });
    const [deleteRecurringModal, setDeleteRecurringModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });
    const [changeDateModal, setChangeDateModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; op: Operation | null }>({
        isOpen: false, op: null,
    });

    const { operations: rawOperations, isLoading } = useOperations({
        search,
        page,
        limit,
        type,
        status,
        scheduledDate,
        sortBy: 'startDateTime',
        sortDirection: 'desc',
    });

    // Client-side filter by seriesId until backend supports ?seriesId param
    const operations = seriesId
        ? rawOperations.filter(op => op.recurrenceInfo?.seriesId === seriesId)
        : rawOperations;

    const { deleteVisit, deleteReservation, deleteWithScope, isDeleting } = useDeleteOperation();
    const { updateDate, isUpdating } = useUpdateReservationDate();
    const { cancelReservation, isCancelling } = useCancelReservation();
    const { updateOperationTitle, isUpdatingTitle, updatingId } = useUpdateOperationTitle();

    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        if (!openMenuId) return;
        const handler = () => setOpenMenuId(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openMenuId]);

    useEffect(() => {
        if (editingTitleId) titleInputRef.current?.focus();
    }, [editingTitleId]);

    const startEditTitle = (op: Operation, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraftTitle(op.title ?? '');
        setEditingTitleId(op.id);
    };

    const saveTitle = async (op: Operation, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await updateOperationTitle({ id: op.id, type: op.type, title: draftTitle.trim() });
        setEditingTitleId(null);
    };

    const cancelEditTitle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingTitleId(null);
    };

    const handleRowClick = useCallback((op: Operation) => {
        if (op.type === 'VISIT') {
            navigate(`/visits/${op.id}`);
        } else if (op.type === 'RESERVATION' && op.status === 'CREATED') {
            navigate(`/appointments/${op.id}/edit`, { state: { recurrenceInfo: op.recurrenceInfo ?? null } });
        }
    }, [navigate]);

    const isRowClickable = (op: Operation) =>
        !op.deletedAt && (op.type === 'VISIT' || (op.type === 'RESERVATION' && op.status === 'CREATED'));

    const toggleMenu = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (openMenuId === id) {
            setOpenMenuId(null);
            setMenuPos(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
            setOpenMenuId(id);
        }
    };

    // Delete (single or recurring)
    const openDelete = (op: Operation) => {
        setOpenMenuId(null);
        if (op.recurrenceInfo) {
            setDeleteRecurringModal({ isOpen: true, op });
        } else {
            setDeleteModal({ isOpen: true, op });
        }
    };
    const confirmDelete = () => {
        if (!deleteModal.op) return;
        const op = deleteModal.op;
        const onSuccess = () => setDeleteModal({ isOpen: false, op: null });
        if (op.type === 'VISIT') {
            deleteVisit(op.id, { onSuccess });
        } else {
            deleteReservation(op.id, { onSuccess });
        }
    };
    const confirmDeleteRecurring = (scope: RecurrenceEditScope) => {
        if (!deleteRecurringModal.op) return;
        deleteWithScope(deleteRecurringModal.op.id, scope, {
            onSuccess: () => setDeleteRecurringModal({ isOpen: false, op: null }),
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
                        <HeaderCell>Tytuł</HeaderCell>
                        <HeaderCell>Pojazd</HeaderCell>
                        <HeaderCell>Klient</HeaderCell>
                        <HeaderCell>Data przyjazdu</HeaderCell>
                        <HeaderCell>Wartość</HeaderCell>
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
                            const isDeleted = !!op.deletedAt;
                            const accentColor = isDeleted ? '#94A3B8' : getStatusAccentColor(op.status);
                            const isVisit = op.type === 'VISIT';
                            const hasName = !!(op.customerFirstName?.trim() || op.customerLastName?.trim());
                            const customerLabel = hasName
                                ? `${op.customerFirstName ?? ''} ${op.customerLastName ?? ''}`.trim()
                                : 'Brak danych klienta';
                            const phoneLabel = op.customerPhone ? ` · ${op.customerPhone}` : '';
                            const isReservationCreated = op.type === 'RESERVATION' && op.status === 'CREATED';
                            const isMidnight = formatTime(op.endDateTime) == '00:00'

                            return (
                                <DataRow
                                    key={op.id}
                                    $accentColor={accentColor}
                                    $clickable={clickable}
                                    $menuOpen={openMenuId === op.id}
                                    onClick={() => clickable && handleRowClick(op)}
                                >
                                    {/* Title */}
                                    <MainCell onClick={e => editingTitleId === op.id && e.stopPropagation()}>
                                        <TypeBubble $color={accentColor}>
                                            {(() => { const Icon = getStatusIcon(op.status); return <Icon />; })()}
                                        </TypeBubble>

                                        <VehicleBlock>
                                            {editingTitleId === op.id ? (
                                                <TitleEditRow>
                                                    <TitleInput
                                                        ref={titleInputRef}
                                                        value={draftTitle}
                                                        onChange={e => setDraftTitle(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveTitle(op, e as any);
                                                            if (e.key === 'Escape') { e.stopPropagation(); setEditingTitleId(null); }
                                                        }}
                                                        onClick={e => e.stopPropagation()}
                                                        disabled={isUpdatingTitle && updatingId === op.id}
                                                    />
                                                    <TitleSaveBtn
                                                        onClick={e => saveTitle(op, e)}
                                                        title="Zapisz tytuł"
                                                        disabled={isUpdatingTitle}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </TitleSaveBtn>
                                                    <TitleCancelBtn onClick={cancelEditTitle} title="Anuluj">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                    </TitleCancelBtn>
                                                </TitleEditRow>
                                            ) : (
                                                <TitleEditRow>
                                                    {op.title ? (
                                                        <VehicleName>{op.title}</VehicleName>
                                                    ) : (
                                                        <PlaceholderText>Brak tytułu</PlaceholderText>
                                                    )}
                                                    <PencilIconBtn
                                                        data-pencil
                                                        onClick={e => startEditTitle(op, e)}
                                                        title="Edytuj tytuł"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </PencilIconBtn>
                                                </TitleEditRow>
                                            )}
                                            <RowMeta>
                                                <OperationStatusBadge status={op.status} />
                                                {op.recurrenceInfo && (
                                                    <RecurrencePill title={op.recurrenceInfo.isDetached ? 'Odłączona od serii' : 'Wizyta cykliczna'}>
                                                        <RepeatIcon />
                                                        {op.recurrenceInfo.recurrenceIndex + 1}/{op.recurrenceInfo.totalInSeries}
                                                        {op.recurrenceInfo.isDetached && <DetachedDot title="Odłączona od serii" />}
                                                    </RecurrencePill>
                                                )}
                                            </RowMeta>
                                            {!isVisit && op.smsInfo && (
                                                <SmsInfoRow>
                                                    {/* Confirmation SMS badge */}
                                                    {op.smsInfo.confirmationSms ? (
                                                        <SmsBadge $status={op.smsInfo.confirmationSms.status} title="SMS potwierdzenia">
                                                            <SmsDot $status={op.smsInfo.confirmationSms.status} />
                                                            Potwierdzenie: {smsStatusLabel(op.smsInfo.confirmationSms.status)}
                                                        </SmsBadge>
                                                    ) : null}
                                                    {/* Reminder SMS badge */}
                                                    {op.smsInfo.reminderSms.requested && op.smsInfo.reminderSms.status ? (
                                                        <SmsBadge $status={op.smsInfo.reminderSms.status} title="SMS przypomnienia">
                                                            <SmsDot $status={op.smsInfo.reminderSms.status} />
                                                            Przypomnienie: {smsStatusLabel(op.smsInfo.reminderSms.status)}
                                                        </SmsBadge>
                                                    ) : null}
                                                </SmsInfoRow>
                                            )}
                                        </VehicleBlock>
                                    </MainCell>

                                    {/* Vehicle */}
                                    <div>
                                        {op.vehicle ? (
                                            <>
                                                {op.vehicle.licensePlate && (
                                                    <LicensePlate>{op.vehicle.licensePlate}</LicensePlate>
                                                )}
                                                <VehicleSubInfo>
                                                    {op.vehicle.brand && <span>{op.vehicle.brand}</span>}
                                                    {op.vehicle.model && <span>{op.vehicle.model}</span>}
                                                </VehicleSubInfo>
                                            </>
                                        ) : (
                                            <PlaceholderText>Brak pojazdu</PlaceholderText>
                                        )}
                                    </div>

                                    {/* Customer */}
                                    <div>
                                        <CustomerName>{customerLabel}</CustomerName>
                                        {op.customerPhone && (
                                            <CustomerPhone>{op.customerPhone}</CustomerPhone>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <DateCellWrap>
                                        <DateMain>{formatDate(op.startDateTime)}</DateMain>
                                        {isMidnight && (<DateSub>{formatTime(op.startDateTime)}</DateSub>)}
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

                                    {/* Actions */}
                                    <ActionsCellWrap onClick={e => e.stopPropagation()}>
                                        {isDeleted && op.deletedAt ? (
                                            <DeletedAtLabel title={`Usunięto: ${new Date(op.deletedAt).toLocaleString('pl-PL')}`}>
                                                usunięto {new Date(op.deletedAt).toLocaleDateString('pl-PL')}
                                            </DeletedAtLabel>
                                        ) : (
                                        <MenuBtn
                                            onClick={e => toggleMenu(op.id, e)}
                                            title="Akcje"
                                        >
                                            <DotsIcon />
                                        </MenuBtn>
                                        )}

                                        {!isDeleted && openMenuId === op.id && menuPos && createPortal(
                                            <DropdownMenu style={{ top: menuPos.top, right: menuPos.right }}>
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
                                                        {op.recurrenceInfo && (
                                                            <DropdownItem onClick={() => {
                                                                setOpenMenuId(null);
                                                                navigate(`/operations?seriesId=${op.recurrenceInfo!.seriesId}`);
                                                            }}>
                                                                <RepeatIcon />
                                                                Pokaż całą serię
                                                            </DropdownItem>
                                                        )}
                                                        <DropdownDivider />
                                                    </>
                                                )}
                                                <DropdownItem $danger onClick={() => openDelete(op)}>
                                                    <TrashIcon />
                                                    Usuń {isVisit ? 'wizytę' : 'rezerwację'}
                                                </DropdownItem>
                                            </DropdownMenu>,
                                            document.body
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

            {deleteRecurringModal.op && (
                <DeleteRecurringModal
                    isOpen={deleteRecurringModal.isOpen}
                    onClose={() => setDeleteRecurringModal({ isOpen: false, op: null })}
                    onConfirm={confirmDeleteRecurring}
                    isDeleting={isDeleting}
                    operation={deleteRecurringModal.op}
                />
            )}
        </>
    );
};
