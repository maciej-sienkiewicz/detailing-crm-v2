// src/modules/vehicles/views/VehicleDetailView.tsx

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVehicleDetail } from '../hooks/useVehicleDetail';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import type { VehicleHistoryEvent } from '../hooks/useVehicleHistory';
import { useVehicleDeletedVisits } from '../hooks/useVehicleDeletedVisits';
import { VehicleDocuments } from '../components/VehicleDocuments';
import { VehiclePhotoGallery } from '../components/VehiclePhotoGallery';
import { VehicleNotes } from '../components/VehicleNotes';
import { VehicleAuditTimeline } from '../components/VehicleAuditTimeline';
import { VehicleComments } from '../components/VehicleComments';
import { EditVehicleModal } from '../components/EditVehicleModal';
import { EditOwnersModal } from '../components/EditOwnersModal';
import { SharedButton } from '@/common/styles/sharedButtonStyles';
import { formatCurrency, formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import type { VehicleOwner } from '../types';

import { CarLogoImage } from '../components/CarLogoImage';
import {
    ViewContainer, PageContent,
    BreadcrumbNav, BreadcrumbLink, BreadcrumbSep, BreadcrumbCurrent,
    PageHeader, HeaderLeft, HeaderMetaRow, PageTitle, MetaText, HeaderActions,
    VehicleStatusBadge, StatusDot,
    TwoColGrid, LeftRail, MainCol,
    Panel, PanelHead, PanelTitle, PanelBody, PanelBodyFlush, PanelCountBadge, PanelAction,
    IdentityRow, IdentityMeta, IdentityName, IdentityId, LicensePlateBadge,
    OwnerItem, OwnerAvatar, OwnerInfo, OwnerName, OwnerRole,
    SummaryStrip, SumCell, KpiEyebrow, KpiValue, KpiDelta,
    VisitRow, VisitDateCol, VisitDateMain, VisitDateSub, VisitInfo, VisitTitle, VisitSub, VisitAmount,
    StatusBadge,
    PrefRow, PrefKey, PrefVal,
    NoteText,
    CollapsibleSection, CollapsibleHeader, CollapsibleHeaderLeft,
    SectionIconWrap, CollapsibleTitle, CollapsibleBadge, ChevronIcon, CollapsibleBody,
    CenteredBox, SpinnerEl, LoadingText, ErrorTitle, ErrorMsg,
} from './VehicleDetailView.styles';
import styled from 'styled-components';

const DeletedToggleWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
`;

const DeletedToggleLabel = styled.span`
    font-size: 12px;
    color: #64748b;
    white-space: nowrap;
`;

const ToggleSwitch = styled.button<{ $active: boolean }>`
    width: 36px;
    height: 20px;
    border-radius: 10px;
    border: none;
    background: ${p => p.$active ? '#9F1239' : '#cbd5e1'};
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    transition: background 150ms ease;
    flex-shrink: 0;
`;

const ToggleThumb = styled.span<{ $active: boolean }>`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transform: translateX(${p => p.$active ? '16px' : '0'});
    transition: transform 150ms ease;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const roleLabels: Record<string, string> = {
    PRIMARY:  'Właściciel',
    CO_OWNER: 'Współwłaściciel',
    COMPANY:  'Firma',
};

const statusLabels: Record<string, string> = {
    active:   'Aktywny',
    sold:     'Sprzedany',
    archived: 'Archiwum',
};

function getOwnerInitials(owner: VehicleOwner): string {
    return owner.customerName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function visitStatusBadge(status: string): { label: string; kind: 'success' | 'info' | 'warn' | 'neutral' | 'error' } {
    switch (status.toUpperCase()) {
        case 'COMPLETED':         return { label: 'Zakończona',        kind: 'success' };
        case 'CONVERTED':         return { label: 'Zrealizowana',      kind: 'success' };
        case 'IN_PROGRESS':       return { label: 'W trakcie',         kind: 'info' };
        case 'READY_FOR_PICKUP':  return { label: 'Gotowa do odbioru', kind: 'warn' };
        case 'CREATED':
        case 'SCHEDULED':         return { label: 'Rezerwacja',        kind: 'neutral' };
        case 'ABANDONED':         return { label: 'Porzucona',         kind: 'error' };
        case 'CANCELLED':         return { label: 'Anulowana',         kind: 'error' };
        default:                  return { label: status,              kind: 'neutral' };
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const VehicleDetailView = () => {
    const { vehicleId } = useParams<{ vehicleId: string }>();
    const navigate = useNavigate();

    const [isDocsOpen,      setIsDocsOpen]      = useState(true);
    const [isPhotosOpen,    setIsPhotosOpen]    = useState(false);
    const [isAuditOpen,     setIsAuditOpen]     = useState(false);
    const [isCommentsOpen,  setIsCommentsOpen]  = useState(false);
    const [isEditModalOpen,       setIsEditModalOpen]       = useState(false);
    const [isEditOwnersModalOpen, setIsEditOwnersModalOpen] = useState(false);
    const [showDeletedVisits, setShowDeletedVisits] = useState(false);

    const { vehicleDetail, isLoading, isError, refetch } = useVehicleDetail(vehicleId!);
    const { events: historyEvents } = useVehicleHistory(vehicleId!);
    const { events: deletedVisitEvents } = useVehicleDeletedVisits(vehicleId!, showDeletedVisits);

    // ── Loading ──────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <ViewContainer>
                <PageContent>
                    <CenteredBox>
                        <SpinnerEl />
                        <LoadingText>Ładowanie danych pojazdu...</LoadingText>
                    </CenteredBox>
                </PageContent>
            </ViewContainer>
        );
    }

    if (isError || !vehicleDetail) {
        return (
            <ViewContainer>
                <PageContent>
                    <CenteredBox>
                        <ErrorTitle>{t.common.error}</ErrorTitle>
                        <ErrorMsg>{t.vehicles.error.detailLoadFailed}</ErrorMsg>
                        <SharedButton $variant="primary" onClick={() => refetch()}>
                            {t.common.retry}
                        </SharedButton>
                    </CenteredBox>
                </PageContent>
            </ViewContainer>
        );
    }

    const { vehicle, photos } = vehicleDetail;
    const vehicleName = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Pojazd';
    const yearSuffix  = vehicle.yearOfProduction ? ` (${vehicle.yearOfProduction})` : '';

    const totalSpent   = vehicle.stats?.totalSpent  ?? { grossAmount: 0, currency: 'PLN' };
    const totalVisits  = vehicle.stats?.totalVisits ?? 0;
    const lastVisit    = vehicle.stats?.lastVisitDate ?? null;
    const avgCost      = vehicle.stats?.averageVisitCost ?? { grossAmount: 0, currency: 'PLN' };

    const activeEvents = showDeletedVisits ? deletedVisitEvents : historyEvents;
    const recentVisits = activeEvents.slice(0, 6);

    return (
        <ViewContainer>
            <PageContent>

                {/* ─── Breadcrumb ────────────────────────────────── */}
                <BreadcrumbNav aria-label="Nawigacja">
                    <BreadcrumbLink to="/vehicles">Pojazdy</BreadcrumbLink>
                    <BreadcrumbSep>›</BreadcrumbSep>
                    <BreadcrumbCurrent>{vehicle.licensePlate || vehicleName}</BreadcrumbCurrent>
                </BreadcrumbNav>

                {/* ─── Page header ───────────────────────────────── */}
                <PageHeader>
                    <HeaderLeft>
                        <HeaderMetaRow>
                            <VehicleStatusBadge $status={vehicle.status}>
                                <StatusDot $status={vehicle.status} />
                                {statusLabels[vehicle.status] ?? vehicle.status}
                            </VehicleStatusBadge>
                            {vehicle.yearOfProduction && (
                                <MetaText>rocznik {vehicle.yearOfProduction}</MetaText>
                            )}
                        </HeaderMetaRow>
                        <PageTitle>{vehicleName}</PageTitle>
                    </HeaderLeft>

                    <HeaderActions>
                        <SharedButton
                            $variant="secondary"
                            $size="sm"
                            onClick={() => setIsEditOwnersModalOpen(true)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Właściciele
                        </SharedButton>
                        <SharedButton
                            $variant="secondary"
                            $size="sm"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edytuj dane
                        </SharedButton>
                        <SharedButton
                            $variant="primary"
                            $size="sm"
                            onClick={() => {
                                const singleOwner = vehicle.owners.length === 1 ? vehicle.owners[0] : null;
                                const nameParts = singleOwner?.customerName.split(' ') ?? [];
                                navigate('/checkin/new', {
                                    state: {
                                        prefillVehicle: {
                                            id:              vehicle.id,
                                            brand:           vehicle.brand,
                                            model:           vehicle.model,
                                            yearOfProduction: vehicle.yearOfProduction,
                                            licensePlate:    vehicle.licensePlate,
                                            color:           vehicle.color ?? undefined,
                                        },
                                        ...(singleOwner ? {
                                            prefillCustomer: {
                                                id:        singleOwner.customerId,
                                                firstName: nameParts[0] ?? '',
                                                lastName:  nameParts.slice(1).join(' '),
                                                phone:     '',
                                                email:     '',
                                            },
                                        } : {}),
                                    },
                                });
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                                <line x1="12" y1="14" x2="12" y2="18"/>
                                <line x1="10" y1="16" x2="14" y2="16"/>
                            </svg>
                            Nowa wizyta
                        </SharedButton>
                    </HeaderActions>
                </PageHeader>

                {/* ─── Two-column layout ─────────────────────────── */}
                <TwoColGrid>

                    {/* ── LEFT RAIL ────────────────────────────────── */}
                    <LeftRail>

                        {/* Vehicle identity card */}
                        <Panel>
                            <PanelBody>
                                <IdentityRow>
                                    <CarLogoImage brand={vehicle.brand} size="lg" />
                                    <IdentityMeta>
                                        <IdentityName>{vehicleName}{yearSuffix}</IdentityName>
                                        <IdentityId>ID: {vehicle.id.slice(0, 8).toUpperCase()}</IdentityId>
                                    </IdentityMeta>
                                </IdentityRow>

                                {vehicle.licensePlate && (
                                    <LicensePlateBadge>{vehicle.licensePlate}</LicensePlateBadge>
                                )}
                            </PanelBody>
                        </Panel>

                        {/* Technical specs */}
                        <Panel>
                            <PanelHead>
                                <PanelTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3"/>
                                        <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93A10 10 0 0 1 19.07 19.07"/>
                                    </svg>
                                    Dane techniczne
                                </PanelTitle>
                            </PanelHead>
                            <PanelBody>
                                <PrefRow>
                                    <PrefKey>Marka</PrefKey>
                                    <PrefVal>{vehicle.brand || '—'}</PrefVal>
                                </PrefRow>
                                <PrefRow>
                                    <PrefKey>Model</PrefKey>
                                    <PrefVal>{vehicle.model || '—'}</PrefVal>
                                </PrefRow>
                                {vehicle.yearOfProduction && (
                                    <PrefRow>
                                        <PrefKey>Rocznik</PrefKey>
                                        <PrefVal>{vehicle.yearOfProduction}</PrefVal>
                                    </PrefRow>
                                )}
                                {vehicle.color && (
                                    <PrefRow>
                                        <PrefKey>Kolor</PrefKey>
                                        <PrefVal>{vehicle.color}</PrefVal>
                                    </PrefRow>
                                )}
                                {vehicle.currentMileage != null && (
                                    <PrefRow>
                                        <PrefKey>Przebieg</PrefKey>
                                        <PrefVal>{vehicle.currentMileage.toLocaleString('pl-PL')} km</PrefVal>
                                    </PrefRow>
                                )}
                                <PrefRow>
                                    <PrefKey>W systemie</PrefKey>
                                    <PrefVal>
                                        {new Date(vehicle.createdAt).toLocaleDateString('pl-PL', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                        })}
                                    </PrefVal>
                                </PrefRow>
                            </PanelBody>
                        </Panel>

                        {/* Owners */}
                        <Panel>
                            <PanelHead>
                                <PanelTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    Właściciele
                                </PanelTitle>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PanelCountBadge>{vehicle.owners.length}</PanelCountBadge>
                                    <PanelAction onClick={() => setIsEditOwnersModalOpen(true)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="12" y1="5" x2="12" y2="19"/>
                                            <line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                        Zarządzaj
                                    </PanelAction>
                                </div>
                            </PanelHead>
                            <PanelBodyFlush>
                                {vehicle.owners.length === 0 ? (
                                    <PanelBody>
                                        <NoteText>Brak przypisanych właścicieli.</NoteText>
                                    </PanelBody>
                                ) : (
                                    vehicle.owners.map((owner: VehicleOwner) => (
                                        <OwnerItem key={owner.customerId} to={`/customers/${owner.customerId}`}>
                                            <OwnerAvatar>{getOwnerInitials(owner)}</OwnerAvatar>
                                            <OwnerInfo>
                                                <OwnerName>{owner.customerName}</OwnerName>
                                                <OwnerRole>{roleLabels[owner.role] ?? owner.role}</OwnerRole>
                                            </OwnerInfo>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </OwnerItem>
                                    ))
                                )}
                            </PanelBodyFlush>
                        </Panel>

                        {/* Notes */}
                        <VehicleNotes vehicleId={vehicleId!} />

                    </LeftRail>

                    {/* ── MAIN COLUMN ──────────────────────────────── */}
                    <MainCol>

                        {/* KPI summary strip */}
                        <SummaryStrip>
                            <SumCell>
                                <KpiEyebrow>Łączny przychód</KpiEyebrow>
                                <KpiValue>
                                    {formatCurrency(totalSpent.grossAmount, totalSpent.currency)}
                                </KpiValue>
                                <KpiDelta>{totalVisits} wizyt łącznie</KpiDelta>
                            </SumCell>

                            <SumCell>
                                <KpiEyebrow>Wizyty</KpiEyebrow>
                                <KpiValue>{totalVisits}</KpiValue>
                                <KpiDelta>
                                    śr. {totalVisits > 0
                                        ? formatCurrency(avgCost.grossAmount, avgCost.currency)
                                        : '—'} / wizyta
                                </KpiDelta>
                            </SumCell>

                            <SumCell>
                                <KpiEyebrow>Ostatnia wizyta</KpiEyebrow>
                                <KpiValue>
                                    {lastVisit ? formatDate(lastVisit) : '—'}
                                </KpiValue>
                                <KpiDelta>
                                    {lastVisit
                                        ? `${Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)} dni temu`
                                        : 'Brak wizyt'}
                                </KpiDelta>
                            </SumCell>

                            <SumCell>
                                <KpiEyebrow>Przebieg</KpiEyebrow>
                                <KpiValue>
                                    {vehicle.currentMileage != null
                                        ? vehicle.currentMileage.toLocaleString('pl-PL')
                                        : '—'}
                                </KpiValue>
                                <KpiDelta>km</KpiDelta>
                            </SumCell>
                        </SummaryStrip>

                        {/* Recent visits */}
                        <Panel>
                            <PanelHead>
                                <PanelTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    {showDeletedVisits ? 'Usunięte wizyty' : 'Historia wizyt'}
                                </PanelTitle>
                                {!showDeletedVisits && activeEvents.length > 6 && (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                        Łącznie: <strong style={{ color: '#0f172a' }}>{activeEvents.length}</strong>
                                    </span>
                                )}
                                <DeletedToggleWrap>
                                    <DeletedToggleLabel>Wyświetl usunięte</DeletedToggleLabel>
                                    <ToggleSwitch
                                        $active={showDeletedVisits}
                                        onClick={() => setShowDeletedVisits(v => !v)}
                                        title={showDeletedVisits ? 'Pokaż aktywne wizyty' : 'Pokaż usunięte wizyty'}
                                    >
                                        <ToggleThumb $active={showDeletedVisits} />
                                    </ToggleSwitch>
                                </DeletedToggleWrap>
                            </PanelHead>
                            <PanelBodyFlush>
                                {recentVisits.length === 0 ? (
                                    <PanelBody>
                                        <NoteText>Brak historii wizyt dla tego pojazdu.</NoteText>
                                    </PanelBody>
                                ) : (
                                    recentVisits.map((event: VehicleHistoryEvent & { deletedAt?: string }) => {
                                        const d = new Date(event.date);
                                        const isDeleted = !!event.deletedAt;
                                        const { label, kind } = isDeleted
                                            ? { label: 'Usunięta', kind: 'error' as const }
                                            : visitStatusBadge(event.status);
                                        return (
                                            <VisitRow
                                                key={event.id}
                                                $active={event.status === 'IN_PROGRESS'}
                                                onClick={() => !isDeleted && event.type === 'VISIT'
                                                    ? navigate(`/visits/${event.id}`)
                                                    : undefined
                                                }
                                                style={isDeleted ? { opacity: 0.55, cursor: 'default' } : undefined}
                                            >
                                                <VisitDateCol>
                                                    <VisitDateMain>
                                                        {d.getDate().toString().padStart(2, '0')}.{(d.getMonth() + 1).toString().padStart(2, '0')}
                                                    </VisitDateMain>
                                                    <VisitDateSub>
                                                        {d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                    </VisitDateSub>
                                                </VisitDateCol>

                                                <VisitInfo>
                                                    <VisitTitle>{event.title}</VisitTitle>
                                                    <VisitSub>{event.customerName}</VisitSub>
                                                </VisitInfo>

                                                <StatusBadge $kind={kind} className="visit-hide-sm">{label}</StatusBadge>

                                                <VisitAmount>
                                                    {formatCurrency(event.grossAmount, event.currency)}
                                                </VisitAmount>

                                                <svg
                                                    className="visit-hide-sm"
                                                    width="16" height="16"
                                                    viewBox="0 0 24 24" fill="none"
                                                    stroke="#cbd5e1" strokeWidth="2"
                                                >
                                                    <path d="M9 18l6-6-6-6"/>
                                                </svg>
                                            </VisitRow>
                                        );
                                    })
                                )}
                            </PanelBodyFlush>
                        </Panel>

                        {/* ── Collapsible sections ───────────────── */}

                        {/* Documents */}
                        <CollapsibleSection>
                            <CollapsibleHeader
                                onClick={() => setIsDocsOpen(v => !v)}
                                aria-expanded={isDocsOpen}
                                aria-controls="docs-section"
                            >
                                <CollapsibleHeaderLeft>
                                    <SectionIconWrap>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <CollapsibleTitle>Dokumenty</CollapsibleTitle>
                                </CollapsibleHeaderLeft>
                                <ChevronIcon $open={isDocsOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </ChevronIcon>
                            </CollapsibleHeader>
                            <CollapsibleBody $visible={isDocsOpen} $flush id="docs-section">
                                <VehicleDocuments vehicleId={vehicleId!} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                        {/* Photos */}
                        <CollapsibleSection>
                            <CollapsibleHeader
                                onClick={() => setIsPhotosOpen(v => !v)}
                                aria-expanded={isPhotosOpen}
                                aria-controls="photos-section"
                            >
                                <CollapsibleHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                            <polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <CollapsibleTitle>Zdjęcia</CollapsibleTitle>
                                    {photos.length > 0 && (
                                        <CollapsibleBadge>{photos.length}</CollapsibleBadge>
                                    )}
                                </CollapsibleHeaderLeft>
                                <ChevronIcon $open={isPhotosOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </ChevronIcon>
                            </CollapsibleHeader>
                            <CollapsibleBody $visible={isPhotosOpen} $flush id="photos-section">
                                <VehiclePhotoGallery vehicleId={vehicleId!} photos={photos} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                        {/* Audit trail */}
                        <CollapsibleSection>
                            <CollapsibleHeader
                                onClick={() => setIsAuditOpen(v => !v)}
                                aria-expanded={isAuditOpen}
                                aria-controls="audit-section"
                            >
                                <CollapsibleHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <CollapsibleTitle>Historia zmian</CollapsibleTitle>
                                </CollapsibleHeaderLeft>
                                <ChevronIcon $open={isAuditOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </ChevronIcon>
                            </CollapsibleHeader>
                            <CollapsibleBody $visible={isAuditOpen} id="audit-section">
                                <VehicleAuditTimeline vehicleId={vehicleId!} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                        {/* Comments */}
                        <CollapsibleSection>
                            <CollapsibleHeader
                                onClick={() => setIsCommentsOpen(v => !v)}
                                aria-expanded={isCommentsOpen}
                                aria-controls="comments-section"
                            >
                                <CollapsibleHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <CollapsibleTitle>Komentarze z wizyt</CollapsibleTitle>
                                </CollapsibleHeaderLeft>
                                <ChevronIcon $open={isCommentsOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </ChevronIcon>
                            </CollapsibleHeader>
                            <CollapsibleBody $visible={isCommentsOpen} $flush id="comments-section">
                                <VehicleComments vehicleId={vehicleId!} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                    </MainCol>
                </TwoColGrid>
            </PageContent>

            {/* ─── Modals ─────────────────────────────────────── */}
            <EditVehicleModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                vehicle={vehicle}
            />
            <EditOwnersModal
                isOpen={isEditOwnersModalOpen}
                onClose={() => setIsEditOwnersModalOpen(false)}
                vehicleId={vehicleId!}
                owners={vehicle.owners}
            />
        </ViewContainer>
    );
};
