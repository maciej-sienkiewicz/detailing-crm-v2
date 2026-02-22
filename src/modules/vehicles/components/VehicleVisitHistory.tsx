// src/modules/vehicles/components/VehicleVisitHistory.tsx

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { VehicleVisit, VehicleAppointment } from '../types';
import { formatDateTime, formatCurrency } from '@/common/utils';
import {
    Container,
    Header,
    Title,
    Subtitle,
    FilterBar,
    SearchInput,
    FilterSelect,
    ResultCount,
    VisitList,
    EntryWrapper,
    VisitRow,
    VisitAccent,
    VisitContent,
    VisitTitleRow,
    VisitTypeBadge,
    VisitDetails,
    RowActions,
    ActionBtn,
    VisitRight,
    VisitCost,
    VisitStatusBadge,
    EmptyState,
    EmptyIcon,
    EmptyTitle,
    EmptyText,
} from '@/common/components/VisitHistory/VisitHistoryStyles';

/* ─── Vehicle-specific styled components ─────────────── */

const CustomerName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const HeaderLeft = styled.div``;

/* ─── Types ──────────────────────────────────────────── */

type HistoryEntry =
    | { kind: 'visit'; data: VehicleVisit; sortDate: Date }
    | { kind: 'appointment'; data: VehicleAppointment; sortDate: Date };

/* ─── Translations ────────────────────────────────────── */

const statusTranslations: Record<string, string> = {
    completed: 'Zakończona',
    'in-progress': 'W trakcie',
    'in_progress': 'W trakcie',
    'ready_for_pickup': 'Gotowe do odbioru',
    scheduled: 'Zaplanowana',
    created: 'Zaplanowana',
    cancelled: 'Anulowana',
    CREATED: 'Zaplanowana',
    ABANDONED: 'Porzucona',
    CANCELLED: 'Anulowana',
    CONVERTED: 'Zrealizowana',
};

/* ─── Component ──────────────────────────────────────── */

interface VehicleVisitHistoryProps {
    visits: VehicleVisit[];
    appointments: VehicleAppointment[];
}

export const VehicleVisitHistory = ({ visits, appointments }: VehicleVisitHistoryProps) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'visits' | 'appointments'>('all');
    const [statusFilter, setStatusFilter] = useState('all');

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

            if (search.trim()) {
                const q = search.toLowerCase();
                const text = entry.data.customerName;
                if (!text.toLowerCase().includes(q)) return false;
            }

            if (statusFilter !== 'all') {
                if (entry.data.status.toLowerCase() !== statusFilter.toLowerCase() &&
                    entry.data.status !== statusFilter) return false;
            }

            return true;
        });
    }, [entries, typeFilter, search, statusFilter]);

    const totalCount = visits.length + appointments.length;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <Title>Historia i nadchodzące wizyty</Title>
                    <Subtitle>
                        {visits.length} {visits.length === 1 ? 'wizyta' : visits.length < 5 ? 'wizyty' : 'wizyt'}
                        {appointments.length > 0 && ` · ${appointments.length} ${appointments.length === 1 ? 'rezerwacja' : appointments.length < 5 ? 'rezerwacje' : 'rezerwacji'}`}
                    </Subtitle>
                </HeaderLeft>
            </Header>

            <VisitList>
                {filtered.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>{totalCount === 0 ? '📋' : '🔍'}</EmptyIcon>
                        <EmptyTitle>{totalCount === 0 ? 'Brak wizyt' : 'Brak wyników'}</EmptyTitle>
                        <EmptyText>
                            {totalCount === 0
                                ? 'Brak wizyt przypisanych do tego pojazdu'
                                : 'Spróbuj zmienić kryteria wyszukiwania'}
                        </EmptyText>
                    </EmptyState>
                ) : (
                    filtered.map(entry => {
                        const isAppointment = entry.kind === 'appointment';
                        const status = entry.data.status;
                        const isAbandoned = status === 'ABANDONED';
                        const date = entry.kind === 'visit' ? entry.data.date : entry.data.startDateTime;
                        const cost = entry.data.totalCost;

                        return (
                            <EntryWrapper key={`${entry.kind}-${entry.data.id}`} $isAbandoned={isAbandoned}>
                                <VisitRow $isAbandoned={isAbandoned}>
                                    <VisitAccent $status={status} />

                                    <VisitContent>
                                        <VisitTitleRow>
                                            <CustomerName>{entry.data.customerName}</CustomerName>
                                            <VisitTypeBadge $isReservation={isAppointment}>
                                                {isAppointment ? 'Rezerwacja' : 'Wizyta'}
                                            </VisitTypeBadge>
                                        </VisitTitleRow>
                                        <VisitDetails>
                                            <span>{formatDateTime(date)}</span>
                                            {isAppointment && entry.data.title && (
                                                <>
                                                    <span>·</span>
                                                    <span>{entry.data.title}</span>
                                                </>
                                            )}
                                        </VisitDetails>
                                    </VisitContent>

                                    <RowActions>
                                        {isAppointment ? (
                                            <>
                                                {(status.toUpperCase() === 'CREATED' || status === 'scheduled') && (
                                                    <ActionBtn
                                                        $primary
                                                        onClick={() => navigate(`/reservations/${entry.data.id}/checkin`)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M5 3l14 9-14 9V3z"/>
                                                        </svg>
                                                        Rozpocznij wizytę
                                                    </ActionBtn>
                                                )}
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
                                        {cost && cost.grossAmount > 0 ? (
                                            <VisitCost>
                                                {formatCurrency(cost.grossAmount, cost.currency)}
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
