// src/common/components/AuditTimeline/AuditTimeline.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuditLog } from '../../hooks/useAuditLog';
import type { AuditEntry } from '../../types/audit';

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

/* Semantic palette */
const C_GREEN  = '#16a34a';
const C_BLUE   = 'var(--brand-primary, #3b82f6)';
const C_RED    = '#dc2626';
const C_AMBER  = '#d97706';
const C_PURPLE = '#7c3aed';
const C_SKY    = '#0284c7';
const C_CYAN   = '#0891b2';
const C_SLATE  = '#475569';
const C_GRAY   = '#94a3b8';

const ACTION_COLORS: Record<string, string> = {
    CREATE:                 C_GREEN,
    UPDATE:                 C_BLUE,
    DELETE:                 C_RED,
    STATUS_CHANGE:          C_CYAN,
    STATUS_CHANGED:         C_CYAN,
    PHOTO_ADDED:            C_PURPLE,
    PHOTO_DELETED:          C_PURPLE,
    PHOTO_REMOVED:          C_PURPLE,
    DOCUMENT_ADDED:         C_SKY,
    DOCUMENT_DELETED:       C_SKY,
    DOCUMENT_REMOVED:       C_SKY,
    COMMENT_ADDED:          C_SLATE,
    COMMENT_UPDATED:        C_SLATE,
    COMMENT_DELETED:        C_SLATE,
    NOTE_ADDED:             C_SLATE,
    NOTE_UPDATED:           C_SLATE,
    NOTE_DELETED:           C_SLATE,
    NOTE_REMOVED:           C_SLATE,
    SERVICE_ADDED:          C_GREEN,
    SERVICE_UPDATED:        C_BLUE,
    SERVICE_REMOVED:        C_RED,
    SERVICES_UPDATED:       C_BLUE,
    VISIT_CONFIRMED:        C_GREEN,
    VISIT_CANCELLED:        C_RED,
    VISIT_COMPLETED:        C_GREEN,
    VISIT_REJECTED:         C_RED,
    VISIT_MARKED_READY:     C_AMBER,
    VISIT_ARCHIVED:         C_GRAY,
    VISIT_ADDED:            C_GREEN,
    APPOINTMENT_CANCELLED:  C_RED,
    APPOINTMENT_CONVERTED:  C_GREEN,
    APPOINTMENT_ADDED:      C_GREEN,
    PROTOCOL_GENERATED:     C_SKY,
    PROTOCOL_SIGNED:        C_GREEN,
    CONSENT_GRANTED:        C_GREEN,
    CONSENT_REVOKED:        C_RED,
    LEAD_CONVERTED:         C_GREEN,
    LEAD_ABANDONED:         C_GRAY,
    CALL_ACCEPTED:          C_GREEN,
    CALL_REJECTED:          C_RED,
    OWNER_ADDED:            C_AMBER,
    OWNER_REMOVED:          C_AMBER,
    COMPANY_UPDATED:        C_BLUE,
    COMPANY_DELETED:        C_RED,
};

const FIELD_LABELS: Record<string, string> = {
    mileage:             'Przebieg',
    currentMileage:      'Przebieg',
    color:               'Kolor',
    licensePlate:        'Nr rejestracyjny',
    brand:               'Marka',
    model:               'Model',
    yearOfProduction:    'Rok produkcji',
    paintType:           'Rodzaj lakieru',
    status:              'Status',
    technicalNotes:      'Notatki techniczne',
    mileageAtArrival:    'Przebieg przy przyjęciu',
    keysHandedOver:      'Klucze przekazane',
    documentsHandedOver: 'Dokumenty przekazane',
    description:         'Opis',
    title:               'Tytuł',
};

/* ─── Styled components ───────────────────────────────────────────────────── */

const Wrapper = styled.div`
    background: #fff;
    overflow: hidden;
`;

/* Header */

const AuditHeader = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px 18px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const HeaderIcon = styled.div`
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
        width: 16px;
        height: 16px;
        color: var(--brand-primary);
    }
`;

const HeaderTitle = styled.h3`
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.01em;
`;

const HeaderSub = styled.p`
    margin: 0;
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
`;

/* Timeline */

const TimelineWrap = styled.div`
    padding: 24px 24px 8px;
`;

const Track = styled.div`
    position: relative;
    padding-left: 28px;

    &::before {
        content: '';
        position: absolute;
        left: 11px;
        top: 6px;
        bottom: 16px;
        width: 1px;
        background: ${p => p.theme.colors.border};
    }
`;

/* Individual entry */

const EntryWrap = styled.div`
    position: relative;
    margin-bottom: 16px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const DotRing = styled.div<{ $color: string }>`
    position: absolute;
    left: -25px;
    top: 10px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid ${p => p.$color};
    background: #fff;
    z-index: 2;

    &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${p => p.$color};
    }
`;

const Card = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
    transition: box-shadow 0.15s;

    &:hover {
        box-shadow: ${p => p.theme.shadows.sm};
    }
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

const ActionTag = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: ${p => `${p.$color}18`};
    color: ${p => p.$color};
    border: 1px solid ${p => `${p.$color}28`};
    margin-bottom: 4px;
`;

const CardTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const CardRight = styled.div`
    flex-shrink: 0;
    text-align: right;
`;

const CardDate = styled.time`
    display: block;
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
`;

const CardUser = styled.div`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    margin-top: 1px;
`;

/* Changes section */

const ChangesPanel = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    background: #fafbfc;
    padding: 8px 14px;
`;

const ChangesTitle = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 6px;
`;

const ChangeTable = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ChangeRow = styled.div`
    display: grid;
    grid-template-columns: minmax(90px, auto) 1fr 12px 1fr;
    align-items: center;
    gap: 6px;
    font-size: 11px;
`;

const FieldName = styled.span`
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    font-size: 11px;
`;

const FieldVal = styled.span<{ $variant: 'old' | 'new' }>`
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    word-break: break-word;
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    background: ${p => p.$variant === 'old' ? '#fee2e2' : '#dcfce7'};
    color: ${p => p.$variant === 'old' ? '#991b1b' : '#166534'};
    text-decoration: ${p => p.$variant === 'old' ? 'line-through' : 'none'};
`;

const ArrowGlyph = styled.span`
    color: ${p => p.theme.colors.textMuted};
    font-size: 10px;
    text-align: center;
    opacity: 0.6;
`;

/* Metadata section */

const MetaPanel = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    background: #fafbfc;
    padding: 6px 14px 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const MetaChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: 5px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    font-size: 10px;
    color: ${p => p.theme.colors.textSecondary};
`;

const MetaKey = styled.span`
    font-weight: 600;
    margin-right: 3px;
    opacity: 0.7;
`;

/* Pagination */

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14px 24px 18px;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    border-radius: 7px;
    border: 1px solid ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.border};
    background: ${p => p.$active ? 'var(--brand-primary)' : '#fff'};
    color: ${p => p.$active ? '#fff' : p.theme.colors.textSecondary};
    font-size: 12px;
    font-weight: ${p => p.$active ? 700 : 400};
    cursor: pointer;
    transition: all 0.15s;

    &:hover:not(:disabled) {
        border-color: var(--brand-primary);
        color: ${p => p.$active ? '#fff' : 'var(--brand-primary)'};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
`;

const PageLabel = styled.span`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    padding: 0 4px;
`;

/* Loading / empty / error */

const CenterBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 2px solid ${p => p.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: auditSpin 0.7s linear infinite;

    @keyframes auditSpin {
        to { transform: rotate(360deg); }
    }
`;

const EmptyCircle = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 20px;
        height: 20px;
        opacity: 0.4;
    }
`;

const StateTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const StateHint = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

const RetryBtn = styled.button`
    padding: 6px 14px;
    border-radius: 7px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: var(--brand-primary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    margin-top: 4px;

    &:hover {
        background: ${p => p.theme.colors.surface};
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
    } else if (['VISIT_CONFIRMED','VISIT_CANCELLED','VISIT_COMPLETED','VISIT_REJECTED','VISIT_MARKED_READY','VISIT_ARCHIVED','VISIT_ADDED'].includes(action)) {
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
                <HeaderIcon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                </HeaderIcon>
                <div>
                    <HeaderTitle>Historia zmian</HeaderTitle>
                    <HeaderSub>
                        {isLoading ? 'Ładowanie…' : pluralEntries(total)}
                    </HeaderSub>
                </div>
            </HeaderLeft>
        </AuditHeader>
    );

    if (isLoading) {
        return (
            <Wrapper>
                {header}
                <CenterBox>
                    <Spinner />
                    <StateHint>Ładowanie historii zmian…</StateHint>
                </CenterBox>
            </Wrapper>
        );
    }

    if (isError) {
        return (
            <Wrapper>
                {header}
                <CenterBox>
                    <EmptyCircle>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </EmptyCircle>
                    <StateTitle>Błąd ładowania</StateTitle>
                    <StateHint>Nie udało się załadować historii zmian.</StateHint>
                    <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
                </CenterBox>
            </Wrapper>
        );
    }

    if (items.length === 0) {
        return (
            <Wrapper>
                {header}
                <CenterBox>
                    <EmptyCircle>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </EmptyCircle>
                    <StateTitle>Brak zdarzeń audytu</StateTitle>
                    <StateHint>Historia zmian jest pusta.</StateHint>
                </CenterBox>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            {header}

            <TimelineWrap>
                <Track>
                    {items.map(entry => {
                        const color = getActionColor(entry.action);
                        const hasChanges  = entry.changes.length > 0;
                        const hasMeta     = renderMetadata(entry) !== null;

                        return (
                            <EntryWrap key={entry.id}>
                                <DotRing $color={color} />
                                <Card>
                                    <CardTop>
                                        <CardLeft>
                                            <ActionTag $color={color}>
                                                {getActionLabel(entry.action)}
                                            </ActionTag>
                                            {entry.entityDisplayName && (
                                            <CardTitle>{entry.entityDisplayName}</CardTitle>
                                        )}
                                        </CardLeft>
                                        <CardRight>
                                            <CardDate>
                                                {formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}
                                            </CardDate>
                                            <CardUser>{entry.userDisplayName}</CardUser>
                                        </CardRight>
                                    </CardTop>

                                    {hasChanges && (
                                        <ChangesPanel>
                                            <ChangesTitle>Zmiany</ChangesTitle>
                                            <ChangeTable>
                                                {entry.changes.map((change, idx) => (
                                                    <ChangeRow key={idx}>
                                                        <FieldName>{getFieldLabel(change.field)}</FieldName>
                                                        <FieldVal $variant="old">{change.oldValue ?? '—'}</FieldVal>
                                                        <ArrowGlyph>→</ArrowGlyph>
                                                        <FieldVal $variant="new">{change.newValue ?? '—'}</FieldVal>
                                                    </ChangeRow>
                                                ))}
                                            </ChangeTable>
                                        </ChangesPanel>
                                    )}

                                    {hasMeta && renderMetadata(entry)}
                                </Card>
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
                        title="Poprzednia strona"
                    >
                        ‹
                    </PageBtn>

                    <PageLabel>Strona {page} z {totalPages}</PageLabel>

                    <PageBtn
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        title="Następna strona"
                    >
                        ›
                    </PageBtn>
                </PaginationBar>
            )}
        </Wrapper>
    );
};
