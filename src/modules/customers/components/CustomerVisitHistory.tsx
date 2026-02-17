// src/modules/customers/components/CustomerVisitHistory.tsx

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Visit, Reservation } from '../types';
import { formatDateTime } from '@/common/utils';
import { formatCurrency } from '../utils/customerMappers';
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

/* ─── Customer-specific styled components ────────────── */

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

const HeaderLeft = styled.div``;

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

                <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Wszystkie statusy</option>
                    <option value="completed">Zakończona</option>
                    <option value="in-progress">W trakcie</option>
                    <option value="scheduled">Zaplanowana</option>
                    <option value="cancelled">Anulowana</option>
                    <option value="CREATED">Rezerwacja aktywna</option>
                    <option value="ABANDONED">Rezerwacja porzucona</option>
                </FilterSelect>

                <FilterSelect value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="all">Wizyty i rezerwacje</option>
                    <option value="visit">Tylko wizyty</option>
                    <option value="reservation">Tylko rezerwacje</option>
                </FilterSelect>

                {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <ResultCount>{filtered.length} z {totalCount}</ResultCount>
                )}
            </FilterBar>

            <VisitList>
                {filtered.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>{totalCount === 0 ? '📋' : '🔍'}</EmptyIcon>
                        <EmptyTitle>{totalCount === 0 ? 'Brak wizyt' : 'Brak wyników'}</EmptyTitle>
                        <EmptyText>
                            {totalCount === 0
                                ? 'Nie znaleziono wizyt ani rezerwacji przypisanych do tego klienta'
                                : 'Spróbuj zmienić kryteria wyszukiwania'}
                        </EmptyText>
                    </EmptyState>
                ) : (
                    filtered.map(entry => {
                        const isReservation = entry.kind === 'reservation';
                        const status = entry.data.status;
                        const isAbandoned = status === 'ABANDONED';

                        return (
                            <EntryWrapper key={`${entry.kind}-${entry.data.id}`} $isAbandoned={isAbandoned}>
                                <VisitRow $isAbandoned={isAbandoned}>
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
