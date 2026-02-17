// src/modules/customers/components/CustomerVisitHistory.tsx

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { Visit, Reservation } from '../types';
import { formatDateTime } from '@/common/utils';
import { formatCurrency } from '../utils/customerMappers';

/* ─── Styled Components ──────────────────────────────── */

const Container = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const Header = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const HeaderLeft = styled.div``;

const Title = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 4px 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: #f8fafc;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    flex-wrap: wrap;
`;

const SearchInput = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;

    svg {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: ${props => props.theme.colors.textMuted};
        pointer-events: none;
    }

    input {
        width: 100%;
        padding: 8px 12px 8px 34px;
        border: 1px solid ${props => props.theme.colors.border};
        border-radius: ${props => props.theme.radii.md};
        font-size: ${props => props.theme.fontSizes.sm};
        background: white;
        color: ${props => props.theme.colors.text};
        transition: border-color 0.2s ease;

        &:focus {
            outline: none;
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        &::placeholder {
            color: ${props => props.theme.colors.textMuted};
        }
    }
`;

const FilterSelect = styled.select`
    padding: 8px 32px 8px 12px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

const ResultCount = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
    padding: 0 ${props => props.theme.spacing.xs};
`;

const VisitList = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const VisitRow = styled.div<{ $status: string; $isAbandoned?: boolean }>`
    display: grid;
    grid-template-columns: 4px 1fr auto auto;
    gap: 0;
    align-items: center;
    transition: background 0.15s ease;
    cursor: default;

    &:hover {
        background: ${props => props.$isAbandoned ? '#fee2e2' : '#f8fafc'};
    }
`;

const VisitAccent = styled.div<{ $status: string }>`
    background: ${props => {
        if (props.$status === 'scheduled' || props.$status === 'CREATED') return '#f59e0b';
        if (props.$status === 'in-progress') return 'var(--brand-primary)';
        if (props.$status === 'completed') return '#10b981';
        if (props.$status === 'cancelled' || props.$status === 'CANCELLED') return '#ef4444';
        if (props.$status === 'ABANDONED') return '#ef4444';
        if (props.$status === 'CONVERTED') return '#10b981';
        return '#94a3b8';
    }};
`;

const VisitContent = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const VisitTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const LicensePlate = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 8px 3px 18px;
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
    border: 2px solid #000000;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #000000;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    position: relative;
    text-transform: uppercase;
    width: fit-content;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 14px;
        background: linear-gradient(180deg, #003399 0%, #002266 100%);
        border-right: 1px solid #000000;
        border-radius: 2px 0 0 2px;
    }

    &::after {
        content: 'PL';
        position: absolute;
        left: 2px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 7px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.3px;
    }
`;

const VehicleName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const VisitTypeBadge = styled.span<{ $isReservation?: boolean }>`
    display: inline-flex;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: 11px;
    font-weight: 500;
    background: ${props => props.$isReservation ? '#ede9fe' : props.theme.colors.surfaceHover};
    color: ${props => props.$isReservation ? '#5b21b6' : props.theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

const VisitDetails = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const VisitRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    gap: 4px;
`;

const VisitCost = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const VisitStatusBadge = styled.span<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: 11px;
    font-weight: 600;

    ${props => {
        if (props.$status === 'completed' || props.$status === 'CONVERTED') return 'background: #dcfce7; color: #166534;';
        if (props.$status === 'in-progress') return 'background: #dbeafe; color: #1e40af;';
        if (props.$status === 'scheduled' || props.$status === 'CREATED') return 'background: #fef3c7; color: #92400e;';
        if (props.$status === 'cancelled' || props.$status === 'CANCELLED') return 'background: #fee2e2; color: #991b1b;';
        if (props.$status === 'ABANDONED') return 'background: #fee2e2; color: #991b1b;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl} ${props => props.theme.spacing.lg};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    min-height: 200px;
`;

const EmptyIcon = styled.div`
    width: 56px;
    height: 56px;
    border-radius: ${props => props.theme.radii.full};
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.md};
    font-size: 24px;
`;

const EmptyTitle = styled.p`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.textSecondary};
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
`;

/* ─── Row wrapper & hover actions ────────────────────────── */

const EntryWrapper = styled.div<{ $isAbandoned?: boolean }>`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.$isAbandoned ? '#fff5f5' : 'transparent'};

    &:last-child {
        border-bottom: none;
    }
`;

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 ${props => props.theme.spacing.md};
    opacity: 0;
    pointer-events: none;
    transform: translateX(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;

    ${EntryWrapper}:hover & {
        opacity: 1;
        pointer-events: all;
        transform: translateX(0);
    }
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: ${props => props.theme.radii.md};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    ${props => props.$primary ? `
        background: var(--brand-primary);
        color: white;
        border: 1px solid var(--brand-primary);
        &:hover { opacity: 0.85; }
    ` : `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 1px solid ${props.theme.colors.border};
        &:hover {
            border-color: var(--brand-primary);
            color: var(--brand-primary);
            background: rgba(14, 165, 233, 0.04);
        }
    `}

    svg {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }
`;

/* ─── Unified entry type ──────────────────────────────── */

type HistoryEntry =
    | { kind: 'visit'; data: Visit }
    | { kind: 'reservation'; data: Reservation };

/* ─── Translations ────────────────────────────────────── */

const statusTranslations: Record<string, string> = {
    completed: 'Zakończona',
    'in-progress': 'W trakcie',
    scheduled: 'Zaplanowana',
    cancelled: 'Anulowana',
    CREATED: 'Zaplanowana',
    ABANDONED: 'Porzucona',
    CANCELLED: 'Anulowana',
    CONVERTED: 'Zrealizowana',
};

/* ─── Component ────────────────────────────────────────── */

interface CustomerVisitHistoryProps {
    visits: Visit[];
    reservations?: Reservation[];
}

export const CustomerVisitHistory = ({ visits, reservations = [] }: CustomerVisitHistoryProps) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const allEntries: HistoryEntry[] = useMemo(() => {
        const visitEntries: HistoryEntry[] = visits.map(v => ({ kind: 'visit', data: v }));
        const reservationEntries: HistoryEntry[] = reservations.map(r => ({ kind: 'reservation', data: r }));
        return [...visitEntries, ...reservationEntries].sort(
            (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
        );
    }, [visits, reservations]);

    const filtered = useMemo(() => {
        let result = [...allEntries];

        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter(entry => {
                const plate = entry.data.licensePlate?.toLowerCase() ?? '';
                const vehicle = entry.data.vehicleName?.toLowerCase() ?? '';
                if (entry.kind === 'visit') {
                    const tech = entry.data.technician?.toLowerCase() ?? '';
                    return plate.includes(query) || vehicle.includes(query) || tech.includes(query);
                }
                return plate.includes(query) || vehicle.includes(query);
            });
        }

        if (statusFilter !== 'all') {
            result = result.filter(entry => entry.data.status === statusFilter);
        }

        if (typeFilter !== 'all') {
            if (typeFilter === 'reservation') {
                result = result.filter(entry => entry.kind === 'reservation');
            } else if (typeFilter === 'visit') {
                result = result.filter(entry => entry.kind === 'visit');
            }
        }

        return result;
    }, [allEntries, search, statusFilter, typeFilter]);

    const totalCount = visits.length + reservations.length;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <Title>Historia wizyt i rezerwacji</Title>
                    <Subtitle>
                        {visits.length} {visits.length === 1 ? 'wizyta' : visits.length < 5 ? 'wizyty' : 'wizyt'}
                        {reservations.length > 0 && ` · ${reservations.length} ${reservations.length === 1 ? 'rezerwacja' : reservations.length < 5 ? 'rezerwacje' : 'rezerwacji'}`}
                    </Subtitle>
                </HeaderLeft>
            </Header>

            <FilterBar>
                <SearchInput>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Szukaj po tablicy, pojeździe..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchInput>

                <FilterSelect
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="all">Wszystkie statusy</option>
                    <option value="completed">Zakończona</option>
                    <option value="in-progress">W trakcie</option>
                    <option value="scheduled">Zaplanowana</option>
                    <option value="cancelled">Anulowana</option>
                    <option value="CREATED">Rezerwacja aktywna</option>
                    <option value="ABANDONED">Rezerwacja porzucona</option>
                </FilterSelect>

                <FilterSelect
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                >
                    <option value="all">Wizyty i rezerwacje</option>
                    <option value="visit">Tylko wizyty</option>
                    <option value="reservation">Tylko rezerwacje</option>
                </FilterSelect>

                {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <ResultCount>
                        {filtered.length} z {totalCount}
                    </ResultCount>
                )}
            </FilterBar>

            <VisitList>
                {filtered.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>
                            {totalCount === 0 ? '📋' : '🔍'}
                        </EmptyIcon>
                        <EmptyTitle>
                            {totalCount === 0 ? 'Brak wizyt' : 'Brak wyników'}
                        </EmptyTitle>
                        <EmptyText>
                            {totalCount === 0
                                ? 'Nie znaleziono wizyt ani rezerwacji przypisanych do tego klienta'
                                : 'Spróbuj zmienić kryteria wyszukiwania'
                            }
                        </EmptyText>
                    </EmptyState>
                ) : (
                    filtered.map(entry => {
                        const isReservation = entry.kind === 'reservation';
                        const status = entry.data.status;
                        const isAbandoned = status === 'ABANDONED';
                        const entryKey = `${entry.kind}-${entry.data.id}`;

                        return (
                            <EntryWrapper key={entryKey} $isAbandoned={isAbandoned}>
                                <VisitRow $status={status} $isAbandoned={isAbandoned}>
                                    <VisitAccent $status={status} />
                                    <VisitContent>
                                        <VisitTitleRow>
                                            {entry.data.licensePlate ? (
                                                <LicensePlate>{entry.data.licensePlate}</LicensePlate>
                                            ) : (
                                                <VehicleName>{entry.data.vehicleName || '—'}</VehicleName>
                                            )}
                                            <VisitTypeBadge $isReservation={isReservation}>
                                                {isReservation ? 'Rezerwacja' : 'Wizyta'}
                                            </VisitTypeBadge>
                                        </VisitTitleRow>
                                        <VisitDetails>
                                            <span>{formatDateTime(entry.data.date)}</span>
                                            {entry.data.licensePlate && entry.data.vehicleName && (
                                                <>
                                                    <span>·</span>
                                                    <span>{entry.data.vehicleName}</span>
                                                </>
                                            )}
                                            {entry.kind === 'visit' && entry.data.technician && (
                                                <>
                                                    <span>·</span>
                                                    <span>{entry.data.technician}</span>
                                                </>
                                            )}
                                        </VisitDetails>
                                    </VisitContent>

                                    <RowActions>
                                        {isReservation ? (
                                            <>
                                                <ActionBtn
                                                    $primary
                                                    onClick={() => navigate(`/reservations/${entry.data.id}/checkin`)}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M5 3l14 9-14 9V3z"/>
                                                    </svg>
                                                    Rozpocznij wizytę
                                                </ActionBtn>
                                                <ActionBtn onClick={() => navigate(`/appointments/${entry.data.id}/edit`)}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                    Edytuj
                                                </ActionBtn>
                                            </>
                                        ) : (
                                            <ActionBtn onClick={() => navigate(`/visits/${entry.data.id}`)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </svg>
                                                Podgląd
                                            </ActionBtn>
                                        )}
                                    </RowActions>

                                    <VisitRight>
                                        {entry.data.totalCost.grossAmount > 0 ? (
                                            <VisitCost>
                                                {formatCurrency(entry.data.totalCost.grossAmount, entry.data.totalCost.currency)}
                                            </VisitCost>
                                        ) : (
                                            <VisitCost style={{ color: '#94a3b8' }}>—</VisitCost>
                                        )}
                                        <VisitStatusBadge $status={status}>
                                            {statusTranslations[status] || status}
                                        </VisitStatusBadge>
                                    </VisitRight>
                                </VisitRow>
                            </EntryWrapper>
                        );
                    })
                )}
            </VisitList>
        </Container>
    );
};
