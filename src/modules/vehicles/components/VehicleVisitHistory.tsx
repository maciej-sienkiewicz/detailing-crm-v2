// src/modules/vehicles/components/VehicleVisitHistory.tsx

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { VehicleVisit, VehicleAppointment } from '../types';
import { formatDateTime, formatCurrency } from '@/common/utils';

/* ─── Types ──────────────────────────────────────────── */

type HistoryEntry =
    | { kind: 'visit'; data: VehicleVisit; sortDate: Date }
    | { kind: 'appointment'; data: VehicleAppointment; sortDate: Date };

function isAbandoned(entry: HistoryEntry): boolean {
    return entry.kind === 'appointment' && entry.data.status.toUpperCase() === 'ABANDONED';
}

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
    min-width: 180px;

    svg {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 14px;
        height: 14px;
        color: ${props => props.theme.colors.textMuted};
        pointer-events: none;
    }

    input {
        width: 100%;
        padding: 7px 10px 7px 30px;
        border: 1px solid ${props => props.theme.colors.border};
        border-radius: ${props => props.theme.radii.md};
        font-size: ${props => props.theme.fontSizes.sm};
        background: white;
        color: ${props => props.theme.colors.text};
        box-sizing: border-box;

        &:focus {
            outline: none;
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        &::placeholder { color: ${props => props.theme.colors.textMuted}; }
    }
`;

const FilterSelect = styled.select`
    padding: 7px 10px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

const VisitList = styled.div`
    overflow-y: auto;
    flex: 1;
`;

const EntryWrapper = styled.div<{ $isAbandoned: boolean }>`
    display: grid;
    grid-template-columns: 4px 1fr auto auto;
    align-items: stretch;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.$isAbandoned ? '#fff5f5' : 'white'};
    transition: background 0.15s ease;

    &:last-child { border-bottom: none; }

    &:hover {
        background: ${props => props.$isAbandoned ? '#fee2e2' : props.theme.colors.surfaceHover};
    }
`;

const Accent = styled.div<{ $status: string; $kind: string }>`
    background: ${({ $status, $kind }) => {
        if ($kind === 'appointment') {
            const s = $status.toUpperCase();
            if (s === 'ABANDONED') return '#ef4444';
            if (s === 'CANCELLED') return '#94a3b8';
            return '#f59e0b';
        }
        if ($status === 'completed') return '#10b981';
        if ($status === 'in-progress') return 'var(--brand-primary)';
        if ($status === 'scheduled') return '#f59e0b';
        if ($status === 'cancelled') return '#94a3b8';
        return '#cbd5e1';
    }};
`;

const VisitRow = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const VisitTop = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const VisitTitle = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 260px;
`;

const StatusBadge = styled.span<{ $status: string; $kind: string }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    flex-shrink: 0;

    ${({ $status, $kind }) => {
        if ($kind === 'appointment') {
            const s = $status.toUpperCase();
            if (s === 'ABANDONED') return 'background: #fee2e2; color: #dc2626;';
            if (s === 'CANCELLED') return 'background: #f3f4f6; color: #6b7280;';
            return 'background: #fef3c7; color: #92400e;';
        }
        if ($status === 'completed') return 'background: #dcfce7; color: #166534;';
        if ($status === 'in-progress') return 'background: #dbeafe; color: #1e40af;';
        if ($status === 'scheduled') return 'background: #fef3c7; color: #92400e;';
        if ($status === 'cancelled') return 'background: #f3f4f6; color: #6b7280;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const KindBadge = styled.span<{ $kind: string }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    flex-shrink: 0;
    background: ${props => props.$kind === 'appointment' ? '#f0f9ff' : '#f8fafc'};
    color: ${props => props.$kind === 'appointment' ? '#0369a1' : '#64748b'};
`;

const MetaText = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 ${props => props.theme.spacing.sm};
    opacity: 0;
    transform: translateX(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;

    ${EntryWrapper}:hover & {
        opacity: 1;
        transform: translateX(0);
    }
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    ${props => props.$primary ? `
        background: var(--brand-primary);
        color: white;
        border: none;
        &:hover { opacity: 0.85; }
    ` : `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 1px solid ${props.theme.colors.border};
        &:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
    `}
`;

const VisitRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    gap: 2px;
    min-width: 100px;
`;

const DateText = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
`;

const CostText = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

/* ─── Helpers ──────────────────────────────────────────── */

const statusLabels: Record<string, string> = {
    completed: 'Zakończona',
    'in-progress': 'W trakcie',
    scheduled: 'Zaplanowana',
    cancelled: 'Anulowana',
    CREATED: 'Zaplanowana',
    ABANDONED: 'Porzucona',
    CANCELLED: 'Anulowana',
    CONVERTED: 'Zakończona',
};

/* ─── Component ──────────────────────────────────────────── */

interface VehicleVisitHistoryProps {
    visits: VehicleVisit[];
    appointments: VehicleAppointment[];
}

export const VehicleVisitHistory = ({ visits, appointments }: VehicleVisitHistoryProps) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'visits' | 'appointments'>('all');
    const [statusFilter, setStatusFilter] = useState('');

    const entries = useMemo((): HistoryEntry[] => {
        const visitEntries: HistoryEntry[] = visits.map(v => ({
            kind: 'visit',
            data: v,
            sortDate: new Date(v.date),
        }));
        const apptEntries: HistoryEntry[] = appointments.map(a => ({
            kind: 'appointment',
            data: a,
            sortDate: new Date(a.startDateTime),
        }));
        return [...visitEntries, ...apptEntries].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    }, [visits, appointments]);

    const filtered = useMemo(() => {
        return entries.filter(entry => {
            if (typeFilter === 'visits' && entry.kind !== 'visit') return false;
            if (typeFilter === 'appointments' && entry.kind !== 'appointment') return false;

            if (search) {
                const q = search.toLowerCase();
                const text = entry.kind === 'visit'
                    ? `${entry.data.description} ${entry.data.customerName}`
                    : `${entry.data.title} ${entry.data.customerName}`;
                if (!text.toLowerCase().includes(q)) return false;
            }

            if (statusFilter) {
                if (entry.data.status.toLowerCase() !== statusFilter.toLowerCase() &&
                    entry.data.status !== statusFilter) return false;
            }

            return true;
        });
    }, [entries, typeFilter, search, statusFilter]);

    const total = visits.length + appointments.length;

    return (
        <Container>
            <Header>
                <div>
                    <Title>Historia i nadchodzące wizyty</Title>
                    <Subtitle>
                        {visits.length} {visits.length === 1 ? 'wizyta' : 'wizyt'} · {appointments.length} {appointments.length === 1 ? 'rezerwacja' : 'rezerwacji'}
                    </Subtitle>
                </div>
            </Header>

            <FilterBar>
                <SearchInput>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Szukaj..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchInput>

                <FilterSelect value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}>
                    <option value="all">Wszystkie</option>
                    <option value="visits">Wizyty</option>
                    <option value="appointments">Rezerwacje</option>
                </FilterSelect>

                <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">Każdy status</option>
                    <option value="completed">Zakończona</option>
                    <option value="in-progress">W trakcie</option>
                    <option value="scheduled">Zaplanowana</option>
                    <option value="cancelled">Anulowana</option>
                    <option value="ABANDONED">Porzucona</option>
                </FilterSelect>
            </FilterBar>

            <VisitList>
                {filtered.length === 0 ? (
                    <EmptyState>
                        {total === 0
                            ? 'Brak wizyt przypisanych do tego pojazdu'
                            : 'Brak wyników dla wybranych filtrów'}
                    </EmptyState>
                ) : (
                    filtered.map(entry => {
                        const abandoned = isAbandoned(entry);
                        const status = entry.data.status;
                        const label = statusLabels[status] ?? status;
                        const title = entry.kind === 'visit' ? entry.data.description : entry.data.title;
                        const customer = entry.data.customerName;
                        const date = entry.kind === 'visit' ? entry.data.date : entry.data.startDateTime;
                        const cost = entry.data.totalCost;

                        return (
                            <EntryWrapper key={`${entry.kind}-${entry.data.id}`} $isAbandoned={abandoned}>
                                <Accent $status={status} $kind={entry.kind} />

                                <VisitRow>
                                    <VisitTop>
                                        <VisitTitle title={title}>{title}</VisitTitle>
                                        <StatusBadge $status={status} $kind={entry.kind}>
                                            {label}
                                        </StatusBadge>
                                        <KindBadge $kind={entry.kind}>
                                            {entry.kind === 'visit' ? 'Wizyta' : 'Rezerwacja'}
                                        </KindBadge>
                                    </VisitTop>
                                    <MetaText>{customer}</MetaText>
                                </VisitRow>

                                <RowActions>
                                    {entry.kind === 'visit' && (
                                        <ActionBtn onClick={() => navigate(`/visits/${entry.data.id}`)}>
                                            Podgląd
                                        </ActionBtn>
                                    )}
                                    {entry.kind === 'appointment' && (
                                        <>
                                            {(status.toUpperCase() === 'CREATED' || status === 'scheduled') && (
                                                <ActionBtn $primary onClick={() => navigate(`/reservations/${entry.data.id}/checkin`)}>
                                                    Rozpocznij
                                                </ActionBtn>
                                            )}
                                            <ActionBtn onClick={() => navigate(`/appointments/${entry.data.id}/edit`)}>
                                                Edytuj
                                            </ActionBtn>
                                        </>
                                    )}
                                </RowActions>

                                <VisitRight>
                                    <DateText>{formatDateTime(date)}</DateText>
                                    {cost && (
                                        <CostText>{formatCurrency(cost.grossAmount, cost.currency)}</CostText>
                                    )}
                                </VisitRight>
                            </EntryWrapper>
                        );
                    })
                )}
            </VisitList>
        </Container>
    );
};
