// src/common/components/AuditTimeline/AuditTimeline.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuditLog } from '../../hooks/useAuditLog';
import type { AuditEntry } from '../../types/audit';

/* ─── Action config ────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
    // CRUD
    CREATE:                 'Dodano do systemu',
    UPDATE:                 'Dane zaktualizowane',
    DELETE:                 'Usunięto',

    // Status transitions
    STATUS_CHANGE:          'Zmiana statusu',
    STATUS_CHANGED:         'Zmiana statusu',  // legacy alias

    // Photos
    PHOTO_ADDED:            'Dodano zdjęcie',
    PHOTO_DELETED:          'Usunięto zdjęcie',
    PHOTO_REMOVED:          'Usunięto zdjęcie', // legacy alias

    // Documents
    DOCUMENT_ADDED:         'Dodano dokument',
    DOCUMENT_DELETED:       'Usunięto dokument',
    DOCUMENT_REMOVED:       'Usunięto dokument', // legacy alias

    // Comments
    COMMENT_ADDED:          'Dodano komentarz',
    COMMENT_UPDATED:        'Zaktualizowano komentarz',
    COMMENT_DELETED:        'Usunięto komentarz',

    // Notes
    NOTE_ADDED:             'Dodano notatkę',
    NOTE_UPDATED:           'Zaktualizowano notatkę',
    NOTE_DELETED:           'Usunięto notatkę',
    NOTE_REMOVED:           'Usunięto notatkę', // legacy alias

    // Services (visit)
    SERVICE_ADDED:          'Dodano usługę',
    SERVICE_UPDATED:        'Zaktualizowano usługę',
    SERVICE_REMOVED:        'Usunięto usługę',
    SERVICES_UPDATED:       'Zaktualizowano usługi',

    // Visit lifecycle
    VISIT_CONFIRMED:        'Wizyta potwierdzona',
    VISIT_CANCELLED:        'Wizyta anulowana',
    VISIT_COMPLETED:        'Wizyta zakończona',
    VISIT_REJECTED:         'Wizyta odrzucona',
    VISIT_MARKED_READY:     'Pojazd gotowy do odbioru',
    VISIT_ARCHIVED:         'Wizyta zarchiwizowana',
    VISIT_ADDED:            'Dodano wizytę',

    // Appointment
    APPOINTMENT_CANCELLED:  'Termin anulowany',
    APPOINTMENT_CONVERTED:  'Termin przekształcony w wizytę',
    APPOINTMENT_ADDED:      'Dodano termin',

    // Protocol
    PROTOCOL_GENERATED:     'Wygenerowano protokół',
    PROTOCOL_SIGNED:        'Podpisano protokół',

    // Consent
    CONSENT_GRANTED:        'Udzielono zgody',
    CONSENT_REVOKED:        'Cofnięto zgodę',

    // Lead
    LEAD_CONVERTED:         'Lead przekształcony w klienta',
    LEAD_ABANDONED:         'Lead porzucony',

    // Inbound
    CALL_ACCEPTED:          'Połączenie przyjęte',
    CALL_REJECTED:          'Połączenie odrzucone',

    // Vehicle
    OWNER_ADDED:            'Dodano właściciela',
    OWNER_REMOVED:          'Usunięto właściciela',

    // Company
    COMPANY_UPDATED:        'Dane firmy zaktualizowane',
    COMPANY_DELETED:        'Firma usunięta',
};

// Semantic color palette
const C_GREEN   = '#10b981'; // positive: create, complete, add, confirm
const C_BLUE    = 'var(--brand-primary, #3b82f6)'; // neutral edit / update
const C_RED     = '#ef4444'; // negative: delete, cancel, reject, revoke
const C_AMBER   = '#f59e0b'; // milestone / ownership
const C_PURPLE  = '#8b5cf6'; // media / photos
const C_SKY     = '#0ea5e9'; // documents / protocols
const C_CYAN    = '#06b6d4'; // status transitions
const C_SLATE   = '#64748b'; // notes / comments
const C_GRAY    = '#94a3b8'; // archived / abandoned / inactive

const ACTION_COLORS: Record<string, string> = {
    // CRUD
    CREATE:                 C_GREEN,
    UPDATE:                 C_BLUE,
    DELETE:                 C_RED,

    // Status transitions
    STATUS_CHANGE:          C_CYAN,
    STATUS_CHANGED:         C_CYAN,

    // Photos
    PHOTO_ADDED:            C_PURPLE,
    PHOTO_DELETED:          C_PURPLE,
    PHOTO_REMOVED:          C_PURPLE,

    // Documents
    DOCUMENT_ADDED:         C_SKY,
    DOCUMENT_DELETED:       C_SKY,
    DOCUMENT_REMOVED:       C_SKY,

    // Comments
    COMMENT_ADDED:          C_SLATE,
    COMMENT_UPDATED:        C_SLATE,
    COMMENT_DELETED:        C_SLATE,

    // Notes
    NOTE_ADDED:             C_SLATE,
    NOTE_UPDATED:           C_SLATE,
    NOTE_DELETED:           C_SLATE,
    NOTE_REMOVED:           C_SLATE,

    // Services
    SERVICE_ADDED:          C_GREEN,
    SERVICE_UPDATED:        C_BLUE,
    SERVICE_REMOVED:        C_RED,
    SERVICES_UPDATED:       C_BLUE,

    // Visit lifecycle
    VISIT_CONFIRMED:        C_GREEN,
    VISIT_CANCELLED:        C_RED,
    VISIT_COMPLETED:        C_GREEN,
    VISIT_REJECTED:         C_RED,
    VISIT_MARKED_READY:     C_AMBER,
    VISIT_ARCHIVED:         C_GRAY,
    VISIT_ADDED:            C_GREEN,

    // Appointment
    APPOINTMENT_CANCELLED:  C_RED,
    APPOINTMENT_CONVERTED:  C_GREEN,
    APPOINTMENT_ADDED:      C_GREEN,

    // Protocol
    PROTOCOL_GENERATED:     C_SKY,
    PROTOCOL_SIGNED:        C_GREEN,

    // Consent
    CONSENT_GRANTED:        C_GREEN,
    CONSENT_REVOKED:        C_RED,

    // Lead
    LEAD_CONVERTED:         C_GREEN,
    LEAD_ABANDONED:         C_GRAY,

    // Inbound
    CALL_ACCEPTED:          C_GREEN,
    CALL_REJECTED:          C_RED,

    // Vehicle
    OWNER_ADDED:            C_AMBER,
    OWNER_REMOVED:          C_AMBER,

    // Company
    COMPANY_UPDATED:        C_BLUE,
    COMPANY_DELETED:        C_RED,
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
    mileageAtArrival: 'Przebieg przy przyjęciu',
    keysHandedOver: 'Klucze przekazane',
    documentsHandedOver: 'Dokumenty przekazane',
    description: 'Opis',
    title: 'Tytuł',
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
`;

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
        background: linear-gradient(180deg, var(--brand-primary, #3b82f6) 0%, #e2e8f0 100%);
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
    border: 1px solid ${props => props.$active ? 'var(--brand-primary, #3b82f6)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    background: ${props => props.$active ? 'var(--brand-primary, #3b82f6)' : 'white'};
    color: ${props => props.$active ? 'white' : props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.$active ? '600' : '400'};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        border-color: var(--brand-primary, #3b82f6);
        color: ${props => props.$active ? 'white' : 'var(--brand-primary, #3b82f6)'};
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
    border-top-color: var(--brand-primary, #3b82f6);
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

const RetryButton = styled.button`
    background: none;
    border: none;
    color: var(--brand-primary, #3b82f6);
    font-size: 14px;
    cursor: pointer;
    margin-top: 8px;
`;

/* ─── Helpers ──────────────────────────────────────────── */

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
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

function pluralEntries(count: number): string {
    if (count === 1) return '1 zdarzenie';
    if (count >= 2 && count <= 4) return `${count} zdarzenia`;
    return `${count} zdarzeń`;
}

function renderMetadata(entry: AuditEntry): React.ReactNode {
    const meta = entry.metadata;
    if (!meta || Object.keys(meta).length === 0) return null;

    const { action } = entry;
    const tags: string[] = [];

    if (action === 'PHOTO_ADDED' || action === 'PHOTO_DELETED' || action === 'PHOTO_REMOVED') {
        if (meta.fileName) tags.push(`Plik: ${meta.fileName}`);
        if (meta.photoId) tags.push(`ID: ${meta.photoId}`);
    } else if (action === 'DOCUMENT_ADDED' || action === 'DOCUMENT_DELETED' || action === 'DOCUMENT_REMOVED') {
        if (meta.documentName) tags.push(`Nazwa: ${meta.documentName}`);
        if (meta.fileName) tags.push(`Plik: ${meta.fileName}`);
    } else if (action === 'COMMENT_ADDED' || action === 'COMMENT_UPDATED' || action === 'COMMENT_DELETED') {
        if (meta.commentType) tags.push(`Typ: ${meta.commentType}`);
    } else if (action === 'NOTE_ADDED' || action === 'NOTE_UPDATED' || action === 'NOTE_DELETED' || action === 'NOTE_REMOVED') {
        if (meta.noteId) tags.push(`ID: ${meta.noteId}`);
    } else if (action === 'OWNER_ADDED' || action === 'OWNER_REMOVED') {
        if (meta.customerName) tags.push(`Klient: ${meta.customerName}`);
        if (meta.role) tags.push(`Rola: ${meta.role}`);
    } else if (action === 'STATUS_CHANGE' || action === 'STATUS_CHANGED') {
        if (meta.fromStatus) tags.push(`Z: ${meta.fromStatus}`);
        if (meta.toStatus) tags.push(`Na: ${meta.toStatus}`);
    } else if (action === 'SERVICE_ADDED' || action === 'SERVICE_UPDATED' || action === 'SERVICE_REMOVED') {
        if (meta.serviceName) tags.push(`Usługa: ${meta.serviceName}`);
        if (meta.serviceId) tags.push(`ID: ${meta.serviceId}`);
    } else if (action === 'SERVICES_UPDATED') {
        if (meta.count !== undefined) tags.push(`Liczba zmian: ${meta.count}`);
    } else if (action === 'VISIT_CONFIRMED' || action === 'VISIT_CANCELLED' || action === 'VISIT_COMPLETED'
            || action === 'VISIT_REJECTED' || action === 'VISIT_MARKED_READY' || action === 'VISIT_ARCHIVED'
            || action === 'VISIT_ADDED') {
        if (meta.visitNumber) tags.push(`Nr wizyty: ${meta.visitNumber}`);
    } else if (action === 'APPOINTMENT_CANCELLED' || action === 'APPOINTMENT_CONVERTED' || action === 'APPOINTMENT_ADDED') {
        if (meta.appointmentTitle) tags.push(`Temat: ${meta.appointmentTitle}`);
        if (meta.appointmentId) tags.push(`ID: ${meta.appointmentId}`);
    } else if (action === 'PROTOCOL_GENERATED' || action === 'PROTOCOL_SIGNED') {
        if (meta.protocolId) tags.push(`ID: ${meta.protocolId}`);
        if (meta.protocolType) tags.push(`Typ: ${meta.protocolType}`);
    } else if (action === 'CONSENT_GRANTED' || action === 'CONSENT_REVOKED') {
        if (meta.consentType) tags.push(`Rodzaj: ${meta.consentType}`);
    } else if (action === 'LEAD_CONVERTED' || action === 'LEAD_ABANDONED') {
        if (meta.leadName) tags.push(`Lead: ${meta.leadName}`);
    } else if (action === 'CALL_ACCEPTED' || action === 'CALL_REJECTED') {
        if (meta.phoneNumber) tags.push(`Numer: ${meta.phoneNumber}`);
        if (meta.duration) tags.push(`Czas: ${meta.duration}`);
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
            {tags.map((tag, i) => <MetaTag key={i}>{tag}</MetaTag>)}
        </MetaSection>
    );
}

/* ─── Props ────────────────────────────────────────────── */

export interface AuditTimelineProps {
    module: string;
    entityId: string;
}

/* ─── Component ────────────────────────────────────────── */

export const AuditTimeline = ({ module, entityId }: AuditTimelineProps) => {
    const [page, setPage] = useState(1);
    const { items, pagination, isLoading, isError, refetch } = useAuditLog(module, entityId, page);

    const totalPages = pagination?.totalPages ?? 1;
    const total = pagination?.total ?? 0;

    const header = (
        <Header>
            <Title>Historia zmian</Title>
            <Subtitle>
                {isLoading ? 'Ładowanie...' : pluralEntries(total)}
            </Subtitle>
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
                    <RetryButton onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
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
                        <div style={{ fontSize: 13 }}>Historia zmian jest pusta.</div>
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
                    <PageInfo>Strona {page} z {totalPages}</PageInfo>
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
