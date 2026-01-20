// src/modules/operations/components/OperationalDataTable.tsx

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useOperations } from '../hooks/useOperations';
import { useDeleteOperation } from '../hooks/useDeleteOperation';
import { useUpdateReservationDate, useCancelReservation } from '../hooks/useReservationActions';
import { OperationStatusBadge } from './OperationStatusBadge';
import { DeleteOperationModal } from './DeleteOperationModal';
import { ReservationOptionsModal } from './ReservationOptionsModal';
import { ChangeDateModal } from './ChangeDateModal';
import { CancelReservationModal } from './CancelReservationModal';
import { formatCurrency, formatDateTime, formatDate } from '@/common/utils';
import type { Operation, OperationType, OperationStatus } from '../types';

const TableContainer = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const TableHead = styled.thead`
    background-color: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
`;

const TableHeaderCell = styled.th`
    padding: 12px 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $isClickable?: boolean }>`
    border-bottom: 1px solid #e2e8f0;
    transition: background-color 0.15s ease;
    cursor: ${props => props.$isClickable ? 'pointer' : 'default'};

    &:hover {
        background-color: ${props => props.$isClickable ? '#f8fafc' : 'transparent'};
    }

    &:last-child {
        border-bottom: none;
    }
`;

const TableCell = styled.td`
    padding: 16px;
    font-size: 14px;
    color: #0f172a;
`;

const CustomerCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const CustomerName = styled.div`
    font-weight: 600;
    color: #0f172a;
`;

const VehicleCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const VehicleName = styled.div`
    font-weight: 500;
    color: #0f172a;
`;

const LicensePlateBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background-color: #1e293b;
    color: white;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    font-family: monospace;
    width: fit-content;
`;

const DateTimeCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DateTimeLabel = styled.div`
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const DateTimeValue = styled.div`
    font-size: 13px;
    color: #0f172a;
    font-weight: 500;
`;

const FinancialsCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const AmountRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const AmountLabel = styled.span`
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    min-width: 45px;
`;

const AmountValue = styled.span<{ $isPrimary?: boolean }>`
    font-size: ${props => props.$isPrimary ? '15px' : '13px'};
    font-weight: ${props => props.$isPrimary ? '700' : '500'};
    color: #0f172a;
`;

const LastModificationCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ModificationTime = styled.div`
    font-size: 13px;
    color: #0f172a;
    font-weight: 500;
`;

const ModificationPerson = styled.div`
    font-size: 12px;
    color: #64748b;
`;

const ActionsCell = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
`;

const ActionButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        border-color: #dc2626;
        color: #dc2626;
        background: #fef2f2;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const SkeletonRow = styled(TableRow)`
    cursor: default;

    &:hover {
        background-color: transparent;
    }
`;

const SkeletonCell = styled(TableCell)``;

const Skeleton = styled.div<{ $width?: string; $height?: string }>`
    width: ${props => props.$width || '100%'};
    height: ${props => props.$height || '16px'};
    background: linear-gradient(
            90deg,
            #f1f5f9 0%,
            #e2e8f0 50%,
            #f1f5f9 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;

    @keyframes shimmer {
        0% {
            background-position: -200% 0;
        }
        100% {
            background-position: 200% 0;
        }
    }
`;

const EmptyState = styled.div`
    padding: 48px 24px;
    text-align: center;
    color: #64748b;
`;

const EmptyTitle = styled.h3`
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: #0f172a;
`;

const EmptyDescription = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
`;

interface OperationalDataTableProps {
    search: string;
    page: number;
    limit: number;
    type?: OperationType;
    status?: OperationStatus;
}

export const OperationalDataTable = ({ search, page, limit, type, status }: OperationalDataTableProps) => {
    const navigate = useNavigate();
    const [deleteModalState, setDeleteModalState] = useState<{
        isOpen: boolean;
        operation: Operation | null;
    }>({ isOpen: false, operation: null });

    const [reservationOptionsModalState, setReservationOptionsModalState] = useState<{
        isOpen: boolean;
        reservation: Operation | null;
    }>({ isOpen: false, reservation: null });

    const [changeDateModalState, setChangeDateModalState] = useState<{
        isOpen: boolean;
        reservation: Operation | null;
    }>({ isOpen: false, reservation: null });

    const [cancelModalState, setCancelModalState] = useState<{
        isOpen: boolean;
        reservation: Operation | null;
    }>({ isOpen: false, reservation: null });

    const { operations, isLoading } = useOperations({
        search,
        page,
        limit,
        type,
        status,
        sortBy: 'startDateTime',
        sortDirection: 'desc',
    });

    const { deleteOperation, isDeleting } = useDeleteOperation();
    const { updateDate, isUpdating } = useUpdateReservationDate();
    const { cancelReservation, isCancelling } = useCancelReservation();

    const handleRowClick = useCallback((operation: Operation) => {
        // Dla wizyt - przekieruj do widoku szczegółów
        if (operation.type === 'VISIT') {
            navigate(`/visits/${operation.id}`);
            return;
        }

        // Dla rezerwacji - otwórz modal z opcjami tylko dla statusu CREATED
        if (operation.type === 'RESERVATION' && operation.status === 'CREATED') {
            setReservationOptionsModalState({ isOpen: true, reservation: operation });
        }
    }, [navigate]);

    const handleDeleteClick = useCallback((operation: Operation, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModalState({ isOpen: true, operation });
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        if (deleteModalState.operation) {
            deleteOperation(deleteModalState.operation.id, {
                onSuccess: () => {
                    setDeleteModalState({ isOpen: false, operation: null });
                },
            });
        }
    }, [deleteModalState.operation, deleteOperation]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteModalState({ isOpen: false, operation: null });
    }, []);

    // Handlery dla modala opcji rezerwacji
    const handleReservationOptionsClose = useCallback(() => {
        setReservationOptionsModalState({ isOpen: false, reservation: null });
    }, []);

    const handleChangeDateClick = useCallback(() => {
        setChangeDateModalState({
            isOpen: true,
            reservation: reservationOptionsModalState.reservation,
        });
        setReservationOptionsModalState({ isOpen: false, reservation: null });
    }, [reservationOptionsModalState.reservation]);

    const handleEditServicesClick = useCallback(() => {
        if (reservationOptionsModalState.reservation) {
            navigate(`/appointments/${reservationOptionsModalState.reservation.id}/edit`);
            setReservationOptionsModalState({ isOpen: false, reservation: null });
        }
    }, [reservationOptionsModalState.reservation, navigate]);

    const handleEditDetailsClick = useCallback(() => {
        if (reservationOptionsModalState.reservation) {
            navigate(`/appointments/${reservationOptionsModalState.reservation.id}/edit`);
            setReservationOptionsModalState({ isOpen: false, reservation: null });
        }
    }, [reservationOptionsModalState.reservation, navigate]);

    const handleCancelReservationClick = useCallback(() => {
        setCancelModalState({
            isOpen: true,
            reservation: reservationOptionsModalState.reservation,
        });
        setReservationOptionsModalState({ isOpen: false, reservation: null });
    }, [reservationOptionsModalState.reservation]);

    const handleStartVisitClick = useCallback(() => {
        if (reservationOptionsModalState.reservation) {
            navigate(`/reservations/${reservationOptionsModalState.reservation.id}/checkin`);
            setReservationOptionsModalState({ isOpen: false, reservation: null });
        }
    }, [reservationOptionsModalState.reservation, navigate]);

    // Handlery dla modala zmiany daty
    const handleChangeDateClose = useCallback(() => {
        setChangeDateModalState({ isOpen: false, reservation: null });
    }, []);

    const handleChangeDateConfirm = useCallback((startDateTime: string, endDateTime: string) => {
        if (changeDateModalState.reservation) {
            updateDate(
                {
                    reservationId: changeDateModalState.reservation.id,
                    startDateTime,
                    endDateTime,
                },
                {
                    onSuccess: () => {
                        setChangeDateModalState({ isOpen: false, reservation: null });
                    },
                }
            );
        }
    }, [changeDateModalState.reservation, updateDate]);

    // Handlery dla modala anulowania
    const handleCancelReservationClose = useCallback(() => {
        setCancelModalState({ isOpen: false, reservation: null });
    }, []);

    const handleCancelReservationConfirm = useCallback(() => {
        if (cancelModalState.reservation) {
            cancelReservation(cancelModalState.reservation.id, {
                onSuccess: () => {
                    setCancelModalState({ isOpen: false, reservation: null });
                },
            });
        }
    }, [cancelModalState.reservation, cancelReservation]);

    const renderSkeletonRows = () => (
        <>
            {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index}>
                    <SkeletonCell>
                        <Skeleton $width="140px" $height="20px" />
                        <Skeleton $width="80px" $height="16px" style={{ marginTop: '8px' }} />
                    </SkeletonCell>
                    <SkeletonCell>
                        <Skeleton $width="120px" $height="18px" />
                        <Skeleton $width="70px" $height="16px" style={{ marginTop: '6px' }} />
                    </SkeletonCell>
                    <SkeletonCell>
                        <Skeleton $width="140px" $height="16px" />
                        <Skeleton $width="140px" $height="16px" style={{ marginTop: '4px' }} />
                    </SkeletonCell>
                    <SkeletonCell>
                        <Skeleton $width="100px" $height="18px" />
                        <Skeleton $width="100px" $height="16px" style={{ marginTop: '4px' }} />
                    </SkeletonCell>
                    <SkeletonCell>
                        <Skeleton $width="120px" $height="16px" />
                        <Skeleton $width="100px" $height="14px" style={{ marginTop: '4px' }} />
                    </SkeletonCell>
                    <SkeletonCell>
                        <Skeleton $width="36px" $height="36px" />
                    </SkeletonCell>
                </SkeletonRow>
            ))}
        </>
    );

    return (
        <>
            <TableContainer>
                <Table>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>Klient</TableHeaderCell>
                            <TableHeaderCell>Pojazd</TableHeaderCell>
                            <TableHeaderCell>Terminy</TableHeaderCell>
                            <TableHeaderCell>Wartość</TableHeaderCell>
                            <TableHeaderCell>Ostatnia edycja</TableHeaderCell>
                            <TableHeaderCell style={{ textAlign: 'right' }}>Akcje</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            renderSkeletonRows()
                        ) : operations.length === 0 ? (
                            <tr>
                                <TableCell colSpan={6}>
                                    <EmptyState>
                                        <EmptyTitle>Nie znaleziono operacji</EmptyTitle>
                                        <EmptyDescription>
                                            Nie znaleziono aktywnych wizyt lub rezerwacji
                                        </EmptyDescription>
                                    </EmptyState>
                                </TableCell>
                            </tr>
                        ) : (
                            operations.map(operation => (
                                <TableRow
                                    key={operation.id}
                                    $isClickable
                                    onClick={() => handleRowClick(operation)}
                                >
                                    <TableCell>
                                        <CustomerCell>
                                            <CustomerName>
                                                {operation.customerFirstName} {operation.customerLastName}
                                            </CustomerName>
                                            <OperationStatusBadge status={operation.status} />
                                        </CustomerCell>
                                    </TableCell>
                                    <TableCell>
                                        <VehicleCell>
                                            {operation.vehicle ? (
                                                <>
                                                    <VehicleName>
                                                        {operation.vehicle.brand} {operation.vehicle.model}
                                                    </VehicleName>
                                                    {operation.vehicle.licensePlate ? (
                                                    <LicensePlateBadge>
                                                        {operation.vehicle.licensePlate}
                                                    </LicensePlateBadge>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <VehicleName style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                                    Brak pojazdu
                                                </VehicleName>
                                            )}
                                        </VehicleCell>
                                    </TableCell>
                                    <TableCell>
                                        <DateTimeCell>
                                            <DateTimeLabel>Przyjazd</DateTimeLabel>
                                            <DateTimeValue>
                                                {formatDateTime(operation.startDateTime)}
                                            </DateTimeValue>
                                            <DateTimeLabel style={{ marginTop: '8px' }}>Koniec</DateTimeLabel>
                                            <DateTimeValue>
                                                {formatDate(operation.endDateTime)}
                                            </DateTimeValue>
                                        </DateTimeCell>
                                    </TableCell>
                                    <TableCell>
                                        <FinancialsCell>
                                            <AmountRow>
                                                <AmountLabel>Brutto:</AmountLabel>
                                                <AmountValue $isPrimary>
                                                    {formatCurrency(
                                                        operation.financials.grossAmount,
                                                        operation.financials.currency
                                                    )}
                                                </AmountValue>
                                            </AmountRow>
                                            <AmountRow>
                                                <AmountLabel>Netto:</AmountLabel>
                                                <AmountValue>
                                                    {formatCurrency(
                                                        operation.financials.netAmount,
                                                        operation.financials.currency
                                                    )}
                                                </AmountValue>
                                            </AmountRow>
                                        </FinancialsCell>
                                    </TableCell>
                                    <TableCell>
                                        <LastModificationCell>
                                            <ModificationTime>
                                                {formatDateTime(operation.lastModification.timestamp)}
                                            </ModificationTime>
                                            <ModificationPerson>
                                                {operation.lastModification.performedBy.firstName}{' '}
                                                {operation.lastModification.performedBy.lastName}
                                            </ModificationPerson>
                                        </LastModificationCell>
                                    </TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <ActionsCell>
                                            <ActionButton
                                                onClick={e => handleDeleteClick(operation, e)}
                                                title="Usuń operację"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <line x1="10" y1="11" x2="10" y2="17" />
                                                    <line x1="14" y1="11" x2="14" y2="17" />
                                                </svg>
                                            </ActionButton>
                                        </ActionsCell>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <DeleteOperationModal
                isOpen={deleteModalState.isOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                isDeleting={isDeleting}
                operationName={
                    deleteModalState.operation
                        ? `${deleteModalState.operation.customerFirstName} ${deleteModalState.operation.customerLastName}`
                        : ''
                }
            />

            <ReservationOptionsModal
                isOpen={reservationOptionsModalState.isOpen}
                onClose={handleReservationOptionsClose}
                reservation={reservationOptionsModalState.reservation}
                onChangeDateClick={handleChangeDateClick}
                onEditServicesClick={handleEditServicesClick}
                onEditDetailsClick={handleEditDetailsClick}
                onCancelReservationClick={handleCancelReservationClick}
                onStartVisitClick={handleStartVisitClick}
            />

            <ChangeDateModal
                isOpen={changeDateModalState.isOpen}
                onClose={handleChangeDateClose}
                reservation={changeDateModalState.reservation}
                onConfirm={handleChangeDateConfirm}
                isUpdating={isUpdating}
            />

            <CancelReservationModal
                isOpen={cancelModalState.isOpen}
                onClose={handleCancelReservationClose}
                onConfirm={handleCancelReservationConfirm}
                isCancelling={isCancelling}
                reservation={cancelModalState.reservation}
            />
        </>
    );
};