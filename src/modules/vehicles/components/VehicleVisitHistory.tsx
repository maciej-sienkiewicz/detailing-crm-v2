import { useState, useMemo } from 'react';
import styled from 'styled-components';
import type { VehicleVisitSummary } from '../types';
import { formatDateTime, formatCurrency } from '@/common/utils';

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

const VisitRow = styled.div<{ $status: string }>`
    display: grid;
    grid-template-columns: 4px 1fr auto;
    gap: 0;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background 0.15s ease;
    cursor: pointer;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #f8fafc;
    }
`;

const VisitAccent = styled.div<{ $status: string }>`
    background: ${props => {
        if (props.$status === 'scheduled') return '#f59e0b';
        if (props.$status === 'in-progress') return 'var(--brand-primary)';
        if (props.$status === 'completed') return '#10b981';
        if (props.$status === 'cancelled') return '#ef4444';
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
`;

const VisitTitle = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const VisitTypeBadge = styled.span`
    display: inline-flex;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: 11px;
    font-weight: 500;
    background: ${props => props.theme.colors.surfaceHover};
    color: ${props => props.theme.colors.textSecondary};
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
        if (props.$status === 'completed') return 'background: #dcfce7; color: #166534;';
        if (props.$status === 'in-progress') return 'background: #dbeafe; color: #1e40af;';
        if (props.$status === 'scheduled') return 'background: #fef3c7; color: #92400e;';
        if (props.$status === 'cancelled') return 'background: #fee2e2; color: #991b1b;';
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

/* ─── Translations ────────────────────────────────────── */

const visitTypeTranslations: Record<string, string> = {
    service: 'Serwis',
    repair: 'Naprawa',
    inspection: 'Przegląd',
    consultation: 'Konsultacja',
};

const visitStatusTranslations: Record<string, string> = {
    completed: 'Zakończono',
    'in-progress': 'W trakcie',
    scheduled: 'Zaplanowano',
    cancelled: 'Anulowano',
};

/* ─── Component ────────────────────────────────────────── */

interface VehicleVisitHistoryProps {
    visits: VehicleVisitSummary[];
}

export const VehicleVisitHistory = ({ visits }: VehicleVisitHistoryProps) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const filteredVisits = useMemo(() => {
        let result = [...visits].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter(v =>
                v.description.toLowerCase().includes(query) ||
                v.technician?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(v => v.status === statusFilter);
        }

        if (typeFilter !== 'all') {
            result = result.filter(v => v.type === typeFilter);
        }

        return result;
    }, [visits, search, statusFilter, typeFilter]);

    const uniqueStatuses = useMemo(() => [...new Set(visits.map(v => v.status))], [visits]);
    const uniqueTypes = useMemo(() => [...new Set(visits.map(v => v.type))], [visits]);

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <Title>Historia wizyt</Title>
                    <Subtitle>
                        {visits.length} {visits.length === 1 ? 'wizyta' : visits.length < 5 ? 'wizyty' : 'wizyt'} w systemie
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
                        placeholder="Szukaj wizyt..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchInput>

                <FilterSelect
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="all">Wszystkie statusy</option>
                    {uniqueStatuses.map(status => (
                        <option key={status} value={status}>
                            {visitStatusTranslations[status] || status}
                        </option>
                    ))}
                </FilterSelect>

                <FilterSelect
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                >
                    <option value="all">Wszystkie typy</option>
                    {uniqueTypes.map(type => (
                        <option key={type} value={type}>
                            {visitTypeTranslations[type] || type}
                        </option>
                    ))}
                </FilterSelect>

                {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <ResultCount>
                        {filteredVisits.length} z {visits.length}
                    </ResultCount>
                )}
            </FilterBar>

            <VisitList>
                {filteredVisits.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>
                            {visits.length === 0 ? '📋' : '🔍'}
                        </EmptyIcon>
                        <EmptyTitle>
                            {visits.length === 0 ? 'Brak wizyt' : 'Brak wyników'}
                        </EmptyTitle>
                        <EmptyText>
                            {visits.length === 0
                                ? 'Nie znaleziono wizyt przypisanych do tego pojazdu'
                                : 'Spróbuj zmienić kryteria wyszukiwania'
                            }
                        </EmptyText>
                    </EmptyState>
                ) : (
                    filteredVisits.map(visit => (
                        <VisitRow key={visit.id} $status={visit.status}>
                            <VisitAccent $status={visit.status} />
                            <VisitContent>
                                <VisitTitleRow>
                                    <VisitTitle>{visit.description}</VisitTitle>
                                    <VisitTypeBadge>
                                        {visitTypeTranslations[visit.type] || visit.type}
                                    </VisitTypeBadge>
                                </VisitTitleRow>
                                <VisitDetails>
                                    <span>{formatDateTime(visit.date)}</span>
                                    {visit.technician && (
                                        <>
                                            <span>·</span>
                                            <span>{visit.technician}</span>
                                        </>
                                    )}
                                </VisitDetails>
                            </VisitContent>
                            <VisitRight>
                                <VisitCost>
                                    {formatCurrency(visit.totalCost.grossAmount, visit.totalCost.currency)}
                                </VisitCost>
                                <VisitStatusBadge $status={visit.status}>
                                    {visitStatusTranslations[visit.status] || visit.status}
                                </VisitStatusBadge>
                            </VisitRight>
                        </VisitRow>
                    ))
                )}
            </VisitList>
        </Container>
    );
};
