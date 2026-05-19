// src/common/components/AuditTimeline/AuditTimeline.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuditLog } from '../../hooks/useAuditLog';
import type { AuditEntry } from '../../types/audit';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/* ─── Action config ───────────────────────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
    CREATE:                 'Dodano do systemu',
    UPDATE:                 'Dane zaktualizowane',
    DELETE:                 'Usunięto',
    STATUS_CHANGE:          'Zmiana statusu',
    STATUS_CHANGED:         'Zmiana statusu',
    PHOTO_ADDED:            'Dodano zdjęcie',
    PHOTO_DELETED:          'Usunięto zdjęcie',
    PHOTO_REMOVED:          'Usunięto zdjęcie',
    DOCUMENT_ADDED:         'Dodano dokument',
    DOCUMENT_DELETED:       'Usunięto dokument',
    DOCUMENT_REMOVED:       'Usunięto dokument',
    COMMENT_ADDED:          'Dodano komentarz',
    COMMENT_UPDATED:        'Zaktualizowano komentarz',
    COMMENT_DELETED:        'Usunięto komentarz',
    NOTE_ADDED:             'Dodano notatkę',
    NOTE_UPDATED:           'Zaktualizowano notatkę',
    NOTE_DELETED:           'Usunięto notatkę',
    NOTE_REMOVED:           'Usunięto notatkę',
    SERVICE_ADDED:          'Dodano usługę',
    SERVICE_UPDATED:        'Zaktualizowano usługę',
    SERVICE_REMOVED:        'Usunięto usługę',
    SERVICES_UPDATED:       'Zaktualizowano usługi',
    VISIT_CONFIRMED:        'Wizyta potwierdzona',
    VISIT_CANCELLED:        'Wizyta anulowana',
    VISIT_COMPLETED:        'Wizyta zakończona',
    VISIT_REJECTED:         'Wizyta odrzucona',
    VISIT_MARKED_READY:     'Pojazd gotowy do odbioru',
    VISIT_ARCHIVED:         'Wizyta zarchiwizowana',
    VISIT_ADDED:            'Dodano wizytę',
    APPOINTMENT_CANCELLED:  'Termin anulowany',
    APPOINTMENT_CONVERTED:  'Termin przekształcony w wizytę',
    APPOINTMENT_ADDED:      'Dodano termin',
    PROTOCOL_GENERATED:     'Wygenerowano protokół',
    PROTOCOL_SIGNED:        'Podpisano protokół',
    CONSENT_GRANTED:        'Udzielono zgody',
    CONSENT_REVOKED:        'Cofnięto zgodę',
    LEAD_CONVERTED:         'Lead przekształcony w klienta',
    LEAD_ABANDONED:         'Lead porzucony',
    CALL_ACCEPTED:          'Połączenie przyjęte',
    CALL_REJECTED:          'Połączenie odrzucone',
    OWNER_ADDED:            'Dodano właściciela',
    OWNER_REMOVED:          'Usunięto właściciela',
    COMPANY_UPDATED:        'Dane firmy zaktualizowane',
    COMPANY_DELETED:        'Firma usunięta',
};

const ACTION_COLORS: Record<string, string> = {
    CREATE:                 st.accentGreen,
    UPDATE:                 st.accentBlue,
    DELETE:                 st.accentRed,
    STATUS_CHANGE:          st.accentBlue,
    STATUS_CHANGED:         st.accentBlue,
    PHOTO_ADDED:            '#7c3aed',
    PHOTO_DELETED:          '#7c3aed',
    PHOTO_REMOVED:          '#7c3aed',
    DOCUMENT_ADDED:         '#0284c7',
    DOCUMENT_DELETED:       '#0284c7',
    DOCUMENT_REMOVED:       '#0284c7',
    COMMENT_ADDED:          st.textSecondary,
    COMMENT_UPDATED:        st.textSecondary,
    COMMENT_DELETED:        st.textSecondary,
    NOTE_ADDED:             st.textSecondary,
    NOTE_UPDATED:           st.textSecondary,
    NOTE_DELETED:           st.textSecondary,
    NOTE_REMOVED:           st.textSecondary,
    SERVICE_ADDED:          st.accentGreen,
    SERVICE_UPDATED:        st.accentBlue,
    SERVICE_REMOVED:        st.accentRed,
    SERVICES_UPDATED:       st.accentBlue,
    VISIT_CONFIRMED:        st.accentGreen,
    VISIT_CANCELLED:        st.accentRed,
    VISIT_COMPLETED:        st.accentGreen,
    VISIT_REJECTED:         st.accentRed,
    VISIT_MARKED_READY:     st.accentAmber,
    VISIT_ARCHIVED:         st.textMuted,
    VISIT_ADDED:            st.accentGreen,
    APPOINTMENT_CANCELLED:  st.accentRed,
    APPOINTMENT_CONVERTED:  st.accentGreen,
    APPOINTMENT_ADDED:      st.accentGreen,
    PROTOCOL_GENERATED:     '#0284c7',
    PROTOCOL_SIGNED:        st.accentGreen,
    CONSENT_GRANTED:        st.accentGreen,
    CONSENT_REVOKED:        st.accentRed,
    LEAD_CONVERTED:         st.accentGreen,
    LEAD_ABANDONED:         st.textMuted,
    CALL_ACCEPTED:          st.accentGreen,
    CALL_REJECTED:          st.accentRed,
    OWNER_ADDED:            st.accentAmber,
    OWNER_REMOVED:          st.accentAmber,
    COMPANY_UPDATED:        st.accentBlue,
    COMPANY_DELETED:        st.accentRed,
};

const FIELD_LABELS: Record<string, string> = {
    mileage:             'Przebieg',
    currentMileage:      'Przebieg',
    color:               'Kolor',
    licensePlate:        'Nr rejestracyjny',
    brand:               'Marka',
    model:               'Model',
    yearOfProduction:    'Rok produkcji',
    status:              'Status',
    technicalNotes:      'Notatki techniczne',
    mileageAtArrival:    'Przebieg przy przyjęciu',
    keysHandedOver:      'Klucze przekazane',
    documentsHandedOver: 'Dokumenty przekazane',
    description:         'Opis',
    title:               'Tytuł',
};

/* ─── Styled components ───────────────────────────────────────────────────── */

const Container = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

/* Header — mirrors TableHeader from ServicesTable */

const AuditHeader = styled.div`
    padding: 20px 24px;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const HeaderLeft = styled.div``;

const AuditTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const AuditSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

/* ─── Timeline ────────────────────────────────────────────────────────────── */

const TimelineWrap = styled.div`
    padding: 20px 24px;
`;

const Track = styled.div`
    position: relative;
    padding-left: 28px;

    &::before {
        content: '';
        position: absolute;
        left: 11px;
        top: 8px;
        bottom: 16px;
        width: 1px;
        background: ${st.border};
    }
`;

const EntryWrap = styled.div`
    position: relative;
    margin-bottom: 12px;

    &:last-child { margin-bottom: 0; }
`;

const DotRing = styled.div<{ $color: string }>`
    position: absolute;
    left: -25px;
    top: 11px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid ${p => p.$color};
    background: ${st.bgCard};
    z-index: 2;

    &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: ${p => p.$color};
    }
`;

/* Entry card — same border/radius pattern as rest of visit module */

const EntryCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
    transition: box-shadow ${st.transition};

    &:hover { box-shadow: ${st.shadowXs}; }
`;

const CardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
`;

const CardLeft = styled.div`
    flex: 1;
    min-width: 0;
`;

/* Action badge — same pattern as ServiceStatusBadge from ServicesTable */

const ActionBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    background: ${p => `${p.$color}18`};
    color: ${p => p.$color};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    margin-bottom: 3px;
`;

const EntityName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const CardRight = styled.div`
    flex-shrink: 0;
    text-align: right;
`;

const EntryDate = styled.time`
    display: block;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

const EntryUser = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 1px;
`;

/* Changes section */

const ChangesPanel = styled.div`
    border-top: 1px solid ${st.border};
    background: ${st.bg};
    padding: 8px 14px;
`;

const ChangesLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: ${st.textMuted};
    margin-bottom: 6px;
`;

const ChangeTable = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ChangeRow = styled.div`
    display: grid;
    grid-template-columns: minmax(90px, auto) 1fr 14px 1fr;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
`;

const FieldName = styled.span`
    font-weight: 700;
    color: ${st.textSecondary};
`;

const FieldVal = styled.span<{ $variant: 'old' | 'new' }>`
    padding: 2px 6px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    word-break: break-word;
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    background: ${p => p.$variant === 'old' ? st.accentRedDim : st.accentGreenDim};
    color: ${p => p.$variant === 'old' ? st.accentRed : st.accentGreen};
    text-decoration: ${p => p.$variant === 'old' ? 'line-through' : 'none'};
`;

const Arrow = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
    text-align: center;
    opacity: 0.5;
`;

/* Metadata */

const MetaPanel = styled.div`
    border-top: 1px solid ${st.border};
    background: ${st.bg};
    padding: 6px 14px 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const MetaChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const MetaKey = styled.span`
    font-weight: 700;
    color: ${st.textMuted};
`;

/* ─── Pagination ──────────────────────────────────────────────────────────── */

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    border-top: 1px solid ${st.border};
    background: ${st.bg};
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 10px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => p.$active ? `${st.accentBlue}44` : st.border};
    background: ${p => p.$active ? st.accentBlueDim : st.bgCard};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    font-size: ${st.fontXs};
    font-weight: ${p => p.$active ? 700 : 500};
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${p => p.$active ? 'none' : st.shadowXs};

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
`;

const PageInfo = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    padding: 0 4px;
`;

/* ─── States ──────────────────────────────────────────────────────────────── */

const CenterBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 24px;
    color: ${st.textMuted};
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 2px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: auditSpin 0.7s linear infinite;

    @keyframes auditSpin {
        to { transform: rotate(360deg); }
    }
`;

const StateTitle = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const StateHint = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const RetryBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.accentBlue};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${st.shadowXs};
    margin-top: 4px;

    &:hover {
        background: ${st.accentBlueDim};
        border-color: ${st.accentBlue};
    }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getActionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
}

function getActionColor(action: string): string {
    return ACTION_COLORS[action] ?? st.textSecondary;
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
    const pairs: Array<{ key: string; value: string }> = [];

    if (action === 'PHOTO_ADDED' || action === 'PHOTO_DELETED' || action === 'PHOTO_REMOVED') {
        if (meta.fileName)  pairs.push({ key: 'Plik', value: meta.fileName });
        if (meta.photoId)   pairs.push({ key: 'ID', value: meta.photoId });
    } else if (action === 'DOCUMENT_ADDED' || action === 'DOCUMENT_DELETED' || action === 'DOCUMENT_REMOVED') {
        if (meta.documentName) pairs.push({ key: 'Nazwa', value: meta.documentName });
        if (meta.fileName)     pairs.push({ key: 'Plik', value: meta.fileName });
    } else if (action === 'COMMENT_ADDED' || action === 'COMMENT_UPDATED' || action === 'COMMENT_DELETED') {
        if (meta.commentType) pairs.push({ key: 'Typ', value: meta.commentType });
    } else if (action === 'NOTE_ADDED' || action === 'NOTE_UPDATED' || action === 'NOTE_DELETED' || action === 'NOTE_REMOVED') {
        if (meta.noteId) pairs.push({ key: 'ID', value: meta.noteId });
    } else if (action === 'OWNER_ADDED' || action === 'OWNER_REMOVED') {
        if (meta.customerName) pairs.push({ key: 'Klient', value: meta.customerName });
        if (meta.role)         pairs.push({ key: 'Rola', value: meta.role });
    } else if (action === 'STATUS_CHANGE' || action === 'STATUS_CHANGED') {
        if (meta.fromStatus) pairs.push({ key: 'Z', value: meta.fromStatus });
        if (meta.toStatus)   pairs.push({ key: 'Na', value: meta.toStatus });
    } else if (action === 'SERVICE_ADDED' || action === 'SERVICE_UPDATED' || action === 'SERVICE_REMOVED') {
        if (meta.serviceName) pairs.push({ key: 'Usługa', value: meta.serviceName });
        if (meta.serviceId)   pairs.push({ key: 'ID', value: meta.serviceId });
    } else if (action === 'SERVICES_UPDATED') {
        if (meta.count !== undefined) pairs.push({ key: 'Zmiany', value: String(meta.count) });
    } else if (['VISIT_CONFIRMED','VISIT_CANCELLED','VISIT_COMPLETED','VISIT_REJECTED',
                'VISIT_MARKED_READY','VISIT_ARCHIVED','VISIT_ADDED'].includes(action)) {
        if (meta.visitNumber) pairs.push({ key: 'Nr wizyty', value: meta.visitNumber });
    } else if (action === 'APPOINTMENT_CANCELLED' || action === 'APPOINTMENT_CONVERTED' || action === 'APPOINTMENT_ADDED') {
        if (meta.appointmentTitle) pairs.push({ key: 'Temat', value: meta.appointmentTitle });
        if (meta.appointmentId)    pairs.push({ key: 'ID', value: meta.appointmentId });
    } else if (action === 'PROTOCOL_GENERATED' || action === 'PROTOCOL_SIGNED') {
        if (meta.protocolId)   pairs.push({ key: 'ID', value: meta.protocolId });
        if (meta.protocolType) pairs.push({ key: 'Typ', value: meta.protocolType });
    } else if (action === 'CONSENT_GRANTED' || action === 'CONSENT_REVOKED') {
        if (meta.consentType) pairs.push({ key: 'Rodzaj', value: meta.consentType });
    } else if (action === 'LEAD_CONVERTED' || action === 'LEAD_ABANDONED') {
        if (meta.leadName) pairs.push({ key: 'Lead', value: meta.leadName });
    } else if (action === 'CALL_ACCEPTED' || action === 'CALL_REJECTED') {
        if (meta.phoneNumber) pairs.push({ key: 'Numer', value: meta.phoneNumber });
        if (meta.duration)    pairs.push({ key: 'Czas', value: meta.duration });
    } else {
        Object.entries(meta).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') {
                pairs.push({ key: k, value: String(v) });
            }
        });
    }

    if (pairs.length === 0) return null;

    return (
        <MetaPanel>
            {pairs.map((p, i) => (
                <MetaChip key={i}>
                    <MetaKey>{p.key}</MetaKey>
                    {p.value}
                </MetaChip>
            ))}
        </MetaPanel>
    );
}

/* ─── Props ───────────────────────────────────────────────────────────────── */

export interface AuditTimelineProps {
    module: string;
    entityId: string;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export const AuditTimeline = ({ module, entityId }: AuditTimelineProps) => {
    const [page, setPage] = useState(1);
    const { items, pagination, isLoading, isError, refetch } = useAuditLog(module, entityId, page);

    const totalPages = pagination?.totalPages ?? 1;
    const total      = pagination?.total ?? 0;

    const header = (
        <AuditHeader>
            <HeaderLeft>
                <AuditTitle>Historia zmian</AuditTitle>
                <AuditSubtitle>
                    {isLoading ? 'Ładowanie…' : pluralEntries(total)}
                </AuditSubtitle>
            </HeaderLeft>
        </AuditHeader>
    );

    if (isLoading) {
        return (
            <Container>
                {header}
                <CenterBox>
                    <Spinner />
                    <StateHint>Ładowanie historii zmian…</StateHint>
                </CenterBox>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container>
                {header}
                <CenterBox>
                    <StateTitle>Nie udało się załadować historii zmian.</StateTitle>
                    <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
                </CenterBox>
            </Container>
        );
    }

    if (items.length === 0) {
        return (
            <Container>
                {header}
                <CenterBox>
                    <StateTitle>Brak zdarzeń audytu</StateTitle>
                    <StateHint>Historia zmian jest pusta.</StateHint>
                </CenterBox>
            </Container>
        );
    }

    return (
        <Container>
            {header}

            <TimelineWrap>
                <Track>
                    {items.map(entry => {
                        const color      = getActionColor(entry.action);
                        const hasChanges = entry.changes.length > 0;
                        const hasMeta    = renderMetadata(entry) !== null;

                        return (
                            <EntryWrap key={entry.id}>
                                <DotRing $color={color} />
                                <EntryCard>
                                    <CardTop>
                                        <CardLeft>
                                            <ActionBadge $color={color}>
                                                {getActionLabel(entry.action)}
                                            </ActionBadge>
                                            {entry.entityDisplayName && (
                                                <EntityName>{entry.entityDisplayName}</EntityName>
                                            )}
                                        </CardLeft>
                                        <CardRight>
                                            <EntryDate>
                                                {formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}
                                            </EntryDate>
                                            <EntryUser>{entry.userDisplayName}</EntryUser>
                                        </CardRight>
                                    </CardTop>

                                    {hasChanges && (
                                        <ChangesPanel>
                                            <ChangesLabel>Zmiany</ChangesLabel>
                                            <ChangeTable>
                                                {entry.changes.map((change, idx) => (
                                                    <ChangeRow key={idx}>
                                                        <FieldName>{getFieldLabel(change.field)}</FieldName>
                                                        <FieldVal $variant="old">{change.oldValue ?? '—'}</FieldVal>
                                                        <Arrow>→</Arrow>
                                                        <FieldVal $variant="new">{change.newValue ?? '—'}</FieldVal>
                                                    </ChangeRow>
                                                ))}
                                            </ChangeTable>
                                        </ChangesPanel>
                                    )}

                                    {hasMeta && renderMetadata(entry)}
                                </EntryCard>
                            </EntryWrap>
                        );
                    })}
                </Track>
            </TimelineWrap>

            {totalPages > 1 && (
                <PaginationBar>
                    <PageBtn
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        ‹
                    </PageBtn>
                    <PageInfo>Strona {page} z {totalPages}</PageInfo>
                    <PageBtn
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        ›
                    </PageBtn>
                </PaginationBar>
            )}
        </Container>
    );
};
