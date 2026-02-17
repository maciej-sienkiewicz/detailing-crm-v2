// src/modules/vehicles/components/VehicleAuditTimeline.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { useVehicleAudit } from '../hooks/useVehicleAudit';
import type { AuditEntry } from '../types';

/* ─── Action config ────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
    CREATE: 'Pojazd dodany do systemu',
    UPDATE: 'Dane pojazdu zaktualizowane',
    DELETE: 'Pojazd usunięty',
    PHOTO_ADDED: 'Dodano zdjęcie',
    PHOTO_REMOVED: 'Usunięto zdjęcie',
    OWNER_ADDED: 'Dodano właściciela',
    OWNER_REMOVED: 'Usunięto właściciela',
    DOCUMENT_ADDED: 'Dodano dokument',
    DOCUMENT_REMOVED: 'Usunięto dokument',
    NOTE_ADDED: 'Dodano notatkę',
    NOTE_UPDATED: 'Zaktualizowano notatkę',
    NOTE_REMOVED: 'Usunięto notatkę',
};

const ACTION_COLORS: Record<string, string> = {
    CREATE: '#10b981',
    UPDATE: 'var(--brand-primary)',
    DELETE: '#ef4444',
    PHOTO_ADDED: '#8b5cf6',
    PHOTO_REMOVED: '#8b5cf6',
    OWNER_ADDED: '#f59e0b',
    OWNER_REMOVED: '#f59e0b',
    DOCUMENT_ADDED: '#0ea5e9',
    DOCUMENT_REMOVED: '#0ea5e9',
    NOTE_ADDED: '#64748b',
    NOTE_UPDATED: '#64748b',
    NOTE_REMOVED: '#64748b',
};

const FIELD_LABELS: Record<string, string> = {
    mileage: 'Przebieg',
    currentMileage: 'Przebieg',
    color: 'Kolor',
    licensePlate: 'Nr rejestracyjny',
    brand: 'Marka',
    model: 'Model',
    yearOfProduction: 'Rok produkcji',
    paintType: 'Rodzaj lakieru',
    status: 'Status',
    technicalNotes: 'Notatki techniczne',
};

/* ─── Styled components ────────────────────────────────── */

const Container = styled.div`
    background: white;
    overflow: hidden;
`;

const Header = styled.header`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid ${props => props.theme.colors.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const HeaderLeft = styled.div``;

const Title = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const Content = styled.div`
    padding: ${props => props.theme.spacing.lg};
`;

/* ─── Timeline ─────────────────────────────────────────── */

const TimelineList = styled.div`
    position: relative;
    padding-left: 32px;

    &::before {
        content: '';
        position: absolute;
        left: 15px;
        top: 8px;
        bottom: 8px;
        width: 2px;
        background: linear-gradient(180deg, var(--brand-primary) 0%, #e2e8f0 100%);
    }
`;

const TimelineItem = styled.div`
    position: relative;
    margin-bottom: ${props => props.theme.spacing.lg};

    &:last-child {
        margin-bottom: 0;
    }
`;

const TimelineDot = styled.div<{ $color: string }>`
    position: absolute;
    left: -24px;
    top: 6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${props => props.$color};
    box-shadow: 0 0 0 3px white, 0 0 0 4px ${props => props.$color};
    z-index: 2;
`;

const ItemCard = styled.div`
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
    transition: box-shadow 0.15s ease;

    &:hover {
        box-shadow: ${props => props.theme.shadows.sm};
    }
`;

const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
`;

const ItemLeft = styled.div`
    flex: 1;
    min-width: 0;
`;

const ActionBadge = styled.span<{ $color: string }>`
    display: inline-block;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.$color};
    background: ${props => `${props.$color}14`};
    border: 1px solid ${props => `${props.$color}33`};
    border-radius: 4px;
    padding: 2px 6px;
    margin-bottom: 4px;
`;

const ItemTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const ItemRight = styled.div`
    flex-shrink: 0;
    text-align: right;
`;

const ItemDate = styled.time`
    display: block;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
`;

const ItemUser = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

/* ─── Changes table ────────────────────────────────────── */

const ChangesSection = styled.div`
    margin-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${props => props.theme.colors.border};
    padding-top: ${props => props.theme.spacing.sm};
`;

const ChangesLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.theme.colors.textMuted};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const ChangeRow = styled.div`
    display: grid;
    grid-template-columns: minmax(80px, auto) 1fr auto 1fr;
    align-items: center;
    gap: 6px;
    font-size: ${props => props.theme.fontSizes.xs};
    padding: 3px 0;
    border-bottom: 1px solid #f1f5f9;

    &:last-child {
        border-bottom: none;
    }
`;

const ChangeFieldName = styled.span`
    font-weight: 600;
    color: ${props => props.theme.colors.textSecondary};
`;

const ChangeValue = styled.span<{ $type: 'old' | 'new' }>`
    font-family: monospace;
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 3px;
    word-break: break-all;
    ${props => props.$type === 'old' ? `
        background: #fee2e2;
        color: #991b1b;
        text-decoration: line-through;
    ` : `
        background: #dcfce7;
        color: #166534;
    `}
`;

const ChangeArrow = styled.span`
    color: ${props => props.theme.colors.textMuted};
    font-size: 10px;
    text-align: center;
`;

/* ─── Metadata section ─────────────────────────────────── */

const MetaSection = styled.div`
    margin-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${props => props.theme.colors.border};
    padding-top: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const MetaTag = styled.span`
    background: #f1f5f9;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    color: ${props => props.theme.colors.textSecondary};
`;

/* ─── Pagination ───────────────────────────────────────── */

const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const PageButton = styled.button<{ $active?: boolean }>`
    min-width: 36px;
    height: 36px;
    padding: 0 ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.$active ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => props.$active ? 'var(--brand-primary)' : 'white'};
    color: ${props => props.$active ? 'white' : props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.$active ? '600' : '400'};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--brand-primary);
        color: ${props => props.$active ? 'white' : 'var(--brand-primary)'};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const PageInfo = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

/* ─── States ───────────────────────────────────────────── */

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl};
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: auditSpin 0.7s linear infinite;

    @keyframes auditSpin {
        to { transform: rotate(360deg); }
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyIcon = styled.div`
    width: 48px;
    height: 48px;
    margin: 0 auto ${props => props.theme.spacing.md};
    border-radius: 50%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 24px;
        height: 24px;
        color: #94a3b8;
    }
`;

const ErrorState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.error};
`;

/* ─── Helpers ──────────────────────────────────────────── */

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getActionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
}

function getActionColor(action: string): string {
    return ACTION_COLORS[action] ?? '#64748b';
}

function getFieldLabel(field: string): string {
    return FIELD_LABELS[field] ?? field;
}

function renderMetadata(entry: AuditEntry): React.ReactNode {
    const meta = entry.metadata;
    if (!meta || Object.keys(meta).length === 0) return null;

    const tags: string[] = [];

    if (entry.action === 'PHOTO_ADDED' || entry.action === 'PHOTO_REMOVED') {
        if (meta.fileName) tags.push(`Plik: ${meta.fileName}`);
        if (meta.photoId) tags.push(`ID: ${meta.photoId}`);
    } else if (entry.action === 'OWNER_ADDED' || entry.action === 'OWNER_REMOVED') {
        if (meta.customerName) tags.push(`Klient: ${meta.customerName}`);
    } else if (entry.action === 'DOCUMENT_ADDED' || entry.action === 'DOCUMENT_REMOVED') {
        if (meta.fileName) tags.push(`Plik: ${meta.fileName}`);
    } else {
        Object.entries(meta).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') {
                tags.push(`${k}: ${v}`);
            }
        });
    }

    if (tags.length === 0) return null;

    return (
        <MetaSection>
            {tags.map((tag, i) => (
                <MetaTag key={i}>{tag}</MetaTag>
            ))}
        </MetaSection>
    );
}

/* ─── Main Component ───────────────────────────────────── */

interface VehicleAuditTimelineProps {
    vehicleId: string;
}

export const VehicleAuditTimeline = ({ vehicleId }: VehicleAuditTimelineProps) => {
    const [page, setPage] = useState(1);
    const { items, pagination, isLoading, isError, refetch } = useVehicleAudit(vehicleId, page);

    const totalPages = pagination?.totalPages ?? 1;
    const total = pagination?.total ?? 0;

    const header = (
        <Header>
            <HeaderLeft>
                <Title>Historia zmian</Title>
                <Subtitle>
                    {isLoading
                        ? 'Ładowanie...'
                        : `${total} ${total === 1 ? 'zdarzenie' : total < 5 ? 'zdarzenia' : 'zdarzeń'}`
                    }
                </Subtitle>
            </HeaderLeft>
        </Header>
    );

    if (isLoading) {
        return (
            <Container>
                {header}
                <LoadingContainer><Spinner /></LoadingContainer>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container>
                {header}
                <ErrorState>
                    <p>Nie udało się załadować historii zmian.</p>
                    <button onClick={() => refetch()} style={{ cursor: 'pointer', color: 'var(--brand-primary)', background: 'none', border: 'none', fontSize: '14px' }}>
                        Spróbuj ponownie
                    </button>
                </ErrorState>
            </Container>
        );
    }

    if (items.length === 0) {
        return (
            <Container>
                {header}
                <Content>
                    <EmptyState>
                        <EmptyIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                        </EmptyIcon>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Brak zdarzeń audytu</div>
                        <div style={{ fontSize: 13 }}>Historia zmian dla tego pojazdu jest pusta.</div>
                    </EmptyState>
                </Content>
            </Container>
        );
    }

    return (
        <Container>
            {header}

            <Content>
                <TimelineList>
                    {items.map(entry => {
                        const color = getActionColor(entry.action);
                        return (
                            <TimelineItem key={entry.id}>
                                <TimelineDot $color={color} />
                                <ItemCard>
                                    <ItemHeader>
                                        <ItemLeft>
                                            <ActionBadge $color={color}>{entry.action}</ActionBadge>
                                            <ItemTitle>{getActionLabel(entry.action)}</ItemTitle>
                                        </ItemLeft>
                                        <ItemRight>
                                            <ItemDate>{formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}</ItemDate>
                                            <ItemUser>{entry.userDisplayName}</ItemUser>
                                        </ItemRight>
                                    </ItemHeader>

                                    {entry.changes.length > 0 && (
                                        <ChangesSection>
                                            <ChangesLabel>Zmiany</ChangesLabel>
                                            {entry.changes.map((change, idx) => (
                                                <ChangeRow key={idx}>
                                                    <ChangeFieldName>{getFieldLabel(change.field)}</ChangeFieldName>
                                                    <ChangeValue $type="old">{change.oldValue ?? '—'}</ChangeValue>
                                                    <ChangeArrow>→</ChangeArrow>
                                                    <ChangeValue $type="new">{change.newValue ?? '—'}</ChangeValue>
                                                </ChangeRow>
                                            ))}
                                        </ChangesSection>
                                    )}

                                    {renderMetadata(entry)}
                                </ItemCard>
                            </TimelineItem>
                        );
                    })}
                </TimelineList>
            </Content>

            {totalPages > 1 && (
                <Pagination>
                    <PageButton
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        ‹
                    </PageButton>

                    <PageInfo>
                        Strona {page} z {totalPages}
                    </PageInfo>

                    <PageButton
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        ›
                    </PageButton>
                </Pagination>
            )}
        </Container>
    );
};
