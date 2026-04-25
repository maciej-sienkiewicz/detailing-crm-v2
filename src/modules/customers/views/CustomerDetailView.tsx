// src/modules/customers/views/CustomerDetailView.tsx

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { useCustomerVehicles } from '../hooks/useCustomerVehicles';
import { useCustomerVisits } from '../hooks/useCustomerVisits';
import { useCustomerReservations } from '../hooks/useCustomerReservations';
import { useCustomerCommunication } from '../hooks/useCustomerCommunication';
import { useUpdateConsent } from '../hooks/useUpdateConsent';
import { CustomerNotes } from '../components/CustomerNotes';
import { DocumentsManager } from '../components/DocumentsManager';
import { ConsentManager } from '../components/ConsentManager';
import { AuditTimeline } from '@/common/components/AuditTimeline';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { SharedButton } from '@/common/styles/sharedButtonStyles';
import { formatCurrency } from '../utils/customerMappers';
import { formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Vehicle, Visit, Reservation, MarketingConsent, CommunicationLog, CustomerCommunicationEntry } from '../types';

import {
    ViewContainer, PageContent,
    BreadcrumbNav, BreadcrumbLink, BreadcrumbSep, BreadcrumbCurrent,
    PageHeader, HeaderLeft, HeaderMetaRow, PageTitle, MetaText, HeaderActions,
    TierBadge,
    TwoColGrid, LeftRail, MainCol,
    Panel, PanelHead, PanelTitle, PanelBody, PanelBodyFlush, PanelCountBadge, PanelLinkBtn,
    IdentityRow, Avatar, IdentityMeta, IdentityName, IdentityId,
    ContactList, ContactRow,
    VehicleItem, VehicleInfo, VehicleName, VehicleSub,
    SummaryStrip, SumCell, SumCellActive, KpiEyebrow, KpiValue, KpiDelta,
    ChartGrid, ChartBars, ChartBarCol, ChartBarWrap, ChartBar, ChartBarLabel,
    UpcomingItem, UpcomingDateBox, UpcomingDateNum, UpcomingInfo, UpcomingTitle, UpcomingSub,
    VisitRow, VisitDateCol, VisitDateMain, VisitDateSub, VisitInfo, VisitTitle, VisitSub, VisitAmount,
    StatusBadge,
    PrefRow, PrefKey, PrefVal,
    NoteText,
    CollapsibleSection, CollapsibleHeader, CollapsibleHeaderLeft,
    SectionIconWrap, CollapsibleTitle, CollapsibleBadge, ChevronIcon, CollapsibleBody,
    CenteredBox, SpinnerEl, LoadingText, ErrorTitle, ErrorMsg,
} from './CustomerDetailView.styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function getInitials(firstName: string | null, lastName: string | null): string {
    const f = firstName?.[0] ?? '';
    const l = lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '?';
}

function formatShortDate(dateStr: string): { day: string; month: string; time: string } {
    const d = new Date(dateStr);
    return {
        day:   d.getDate().toString().padStart(2, '0'),
        month: MONTH_LABELS[d.getMonth()].toUpperCase(),
        time:  d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    };
}

function visitStatusBadge(status: Visit['status']): { label: string; kind: 'success' | 'info' | 'warn' | 'neutral' | 'error' } {
    switch (status) {
        case 'completed':   return { label: 'Zakończona',  kind: 'success' };
        case 'in-progress':       return { label: 'W trakcie',          kind: 'info' };
        case 'ready-for-pickup':  return { label: 'Gotowa do odbioru', kind: 'warn' };
        case 'scheduled':         return { label: 'Zaplanowana',       kind: 'neutral' };
        case 'cancelled':         return { label: 'Anulowana',         kind: 'error' };
        default:            return { label: status,        kind: 'neutral' };
    }
}

function reservationStatusBadge(status: Reservation['status']): { label: string; kind: 'success' | 'info' | 'warn' | 'neutral' | 'error' } {
    switch (status) {
        case 'CREATED':   return { label: 'Rezerwacja', kind: 'neutral' };
        case 'CONVERTED': return { label: 'Aktywna',    kind: 'info' };
        case 'CANCELLED': return { label: 'Anulowana',  kind: 'error' };
        case 'ABANDONED': return { label: 'Porzucona',  kind: 'warn' };
        default:          return { label: status,        kind: 'neutral' };
    }
}

function deriveContactPreference(consents: MarketingConsent[]): string {
    const granted = consents.filter(c => c.granted).map(c => c.type);
    if (granted.length === 0) return 'Brak zgód';
    const labels: Record<string, string> = { email: 'E-mail', sms: 'SMS', phone: 'Telefon', postal: 'Poczta' };
    return granted.map(t => labels[t] ?? t).join(', ');
}

// ─── Compute monthly revenue buckets from visits (12 trailing months) ────────

function buildMonthlyRevenue(visits: Visit[]): number[] {
    const buckets = Array(12).fill(0) as number[];
    const now = new Date();
    visits.forEach(v => {
        const d = new Date(v.date);
        const monthsAgo =
            (now.getFullYear() - d.getFullYear()) * 12 +
            now.getMonth() - d.getMonth();
        if (monthsAgo >= 0 && monthsAgo < 12) {
            buckets[11 - monthsAgo] += v.totalCost.grossAmount;
        }
    });
    return buckets;
}

function buildMonthLabels(): string[] {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        return MONTH_LABELS[m.getMonth()];
    });
}

// ─── Main view ────────────────────────────────────────────────────────────────

export const CustomerDetailView = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();

    const [isEditModalOpen,        setIsEditModalOpen]        = useState(false);
    const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
    const [isDocsOpen,             setIsDocsOpen]             = useState(false);
    const [isCommOpen,             setIsCommOpen]             = useState(false);
    const [isAuditOpen,            setIsAuditOpen]            = useState(false);

    const { customerDetail, isLoading, isError, refetch }   = useCustomerDetail(customerId!);
    const { vehicles, isLoading: vehiclesLoading }           = useCustomerVehicles(customerId!);
    const { visits: rawVisits, communications }              = useCustomerVisits(customerId!, 1, 50);
    const { reservations }                                   = useCustomerReservations(customerId!);
    const { entries: commEntries }                           = useCustomerCommunication(customerId!);
    const { updateConsent, isUpdating: consentUpdating }     = useUpdateConsent({ customerId: customerId! });

    const visits = useMemo(() => rawVisits.map(v => ({
        ...v,
        licensePlate: v.licensePlate || vehicles.find(vh => vh.id === v.vehicleId)?.licensePlate,
    })), [rawVisits, vehicles]);

    const monthlyRevenue = useMemo(() => buildMonthlyRevenue(visits), [visits]);
    const monthLabels    = useMemo(() => buildMonthLabels(), []);
    const revenueMax     = useMemo(() => Math.max(...monthlyRevenue, 1), [monthlyRevenue]);

    const activeVisit = useMemo(
        () => visits.find(v => v.status === 'in-progress'),
        [visits],
    );

    const upcomingReservations = useMemo(
        () => [...reservations]
            .filter(r => r.status === 'CREATED' || r.status === 'CONVERTED')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3),
        [reservations],
    );

    // ── Loading ──────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <ViewContainer>
                <PageContent>
                    <CenteredBox>
                        <SpinnerEl />
                        <LoadingText>Ładowanie danych klienta...</LoadingText>
                    </CenteredBox>
                </PageContent>
            </ViewContainer>
        );
    }

    if (isError || !customerDetail) {
        return (
            <ViewContainer>
                <PageContent>
                    <CenteredBox>
                        <ErrorTitle>{t.common.error}</ErrorTitle>
                        <ErrorMsg>{t.customers.error.detailLoadFailed}</ErrorMsg>
                        <SharedButton $variant="primary" onClick={() => refetch()}>
                            {t.common.retry}
                        </SharedButton>
                    </CenteredBox>
                </PageContent>
            </ViewContainer>
        );
    }

    const { customer, marketingConsents, loyaltyTier, lifetimeValue } = customerDetail;
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Nieznany klient';
    const initials = getInitials(customer.firstName, customer.lastName);

    const recentVisits = visits.slice(0, 5);

    return (
        <ViewContainer>
            <PageContent>

                {/* ─── Breadcrumb ────────────────────────────────── */}
                <BreadcrumbNav aria-label="Nawigacja">
                    <BreadcrumbLink to="/customers">Klienci</BreadcrumbLink>
                    <BreadcrumbSep>›</BreadcrumbSep>
                    <BreadcrumbCurrent>{fullName}</BreadcrumbCurrent>
                </BreadcrumbNav>

                {/* ─── Page header ───────────────────────────────── */}
                <PageHeader>
                    <HeaderLeft>
                    </HeaderLeft>

                    <HeaderActions>
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
                            $variant="secondary"
                            $size="sm"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            SMS
                        </SharedButton>
                        <SharedButton
                            $variant="primary"
                            $size="sm"
                            onClick={() => navigate('/checkin/new', {
                                state: {
                                    prefillCustomer: {
                                        id:        customer.id,
                                        firstName: customer.firstName ?? '',
                                        lastName:  customer.lastName  ?? '',
                                        phone:     customer.contact.phone ?? '',
                                        email:     customer.contact.email ?? '',
                                    },
                                },
                            })}
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

                        {/* Identity card */}
                        <Panel>
                            <PanelBody>
                                <IdentityRow>
                                    <Avatar aria-hidden="true">{initials}</Avatar>
                                    <IdentityMeta>
                                        <IdentityName>{fullName}</IdentityName>
                                        <IdentityId>ID: {customer.id.slice(0, 8).toUpperCase()}</IdentityId>
                                    </IdentityMeta>
                                </IdentityRow>

                                <ContactList>
                                    {customer.contact.phone && (
                                        <ContactRow href={`tel:${customer.contact.phone}`}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.93a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 18"/>
                                            </svg>
                                            {customer.contact.phone}
                                        </ContactRow>
                                    )}
                                    {customer.contact.email && (
                                        <ContactRow href={`mailto:${customer.contact.email}`}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                                <path d="M2 7l10 7 10-7"/>
                                            </svg>
                                            {customer.contact.email}
                                        </ContactRow>
                                    )}
                                    {customer.homeAddress && (
                                        <ContactRow as="div">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                                <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            {customer.homeAddress.city}
                                            {customer.homeAddress.street ? ` · ${customer.homeAddress.street}` : ''}
                                        </ContactRow>
                                    )}
                                </ContactList>
                            </PanelBody>
                        </Panel>

                        {/* Vehicles */}
                        <Panel>
                            <PanelHead>
                                <PanelTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.4L19 11"/>
                                        <rect x="2" y="11" width="20" height="6" rx="1"/>
                                        <circle cx="7" cy="17" r="2"/>
                                        <circle cx="17" cy="17" r="2"/>
                                        <path d="M5 11h14"/>
                                    </svg>
                                    Pojazdy
                                </PanelTitle>
                                <PanelCountBadge>{vehicles.length}</PanelCountBadge>
                            </PanelHead>
                            <PanelBodyFlush>
                                {vehiclesLoading ? (
                                    <PanelBody>
                                        <LoadingText>Ładowanie...</LoadingText>
                                    </PanelBody>
                                ) : vehicles.length === 0 ? (
                                    <PanelBody>
                                        <NoteText>Brak przypisanych pojazdów.</NoteText>
                                    </PanelBody>
                                ) : (
                                    vehicles.map((vehicle: Vehicle) => (
                                        <VehicleItem
                                            key={vehicle.id}
                                            onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                                        >
                                            <VehicleInfo>
                                                <VehicleName>{vehicle.make} {vehicle.model}</VehicleName>
                                                <VehicleSub>
                                                    {vehicle.licensePlate}
                                                    {vehicle.year ? ` · ${vehicle.year}` : ''}
                                                </VehicleSub>
                                            </VehicleInfo>
                                        </VehicleItem>
                                    ))
                                )}
                            </PanelBodyFlush>
                        </Panel>


                        {/* Notes */}
                        <CustomerNotes customerId={customerId!} />

                    </LeftRail>

                    {/* ── MAIN COLUMN ──────────────────────────────── */}
                    <MainCol>

                        {/* KPI summary strip */}
                        <SummaryStrip>
                            <SumCell>
                                <KpiEyebrow>Łączny przychód</KpiEyebrow>
                                <KpiValue>
                                    {formatCurrency(lifetimeValue.grossAmount, lifetimeValue.currency)}
                                </KpiValue>
                                <KpiDelta>
                                    {customer.totalVisits} wizyt łącznie
                                </KpiDelta>
                            </SumCell>

                            <SumCell>
                                <KpiEyebrow>Wizyty</KpiEyebrow>
                                <KpiValue>{customer.totalVisits}</KpiValue>
                                <KpiDelta>
                                    śr. {customer.totalVisits > 0
                                        ? formatCurrency(
                                              lifetimeValue.grossAmount / customer.totalVisits,
                                              lifetimeValue.currency,
                                          )
                                        : '—'} / wizyta
                                </KpiDelta>
                            </SumCell>

                            <SumCell>
                                <KpiEyebrow>Ostatnia wizyta</KpiEyebrow>
                                <KpiValue>
                                    {customer.lastVisitDate
                                        ? formatDate(customer.lastVisitDate)
                                        : '—'}
                                </KpiValue>
                                <KpiDelta>
                                    {customer.lastVisitDate
                                        ? `${Math.floor((Date.now() - new Date(customer.lastVisitDate).getTime()) / 86400000)} dni temu`
                                        : 'Brak wizyt'}
                                </KpiDelta>
                            </SumCell>

                            {activeVisit ? (
                                <SumCellActive>
                                    <KpiEyebrow $light>Aktywna wizyta</KpiEyebrow>
                                    <KpiValue $light>#{activeVisit.id.slice(0, 6).toUpperCase()}</KpiValue>
                                    <KpiDelta $light>W trakcie · {activeVisit.vehicleName}</KpiDelta>
                                </SumCellActive>
                            ) : (
                                <SumCell>
                                    <KpiEyebrow>Pojazdy</KpiEyebrow>
                                    <KpiValue>{customer.vehicleCount}</KpiValue>
                                    <KpiDelta>zarejestrowanych</KpiDelta>
                                </SumCell>
                            )}
                        </SummaryStrip>

                        {/* Revenue chart + Upcoming visits */}
                        <ChartGrid>

                            {/* Revenue chart */}
                            <Panel>
                                <PanelHead>
                                    <PanelTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="20" x2="18" y2="10"/>
                                            <line x1="12" y1="20" x2="12" y2="4"/>
                                            <line x1="6" y1="20" x2="6" y2="14"/>
                                        </svg>
                                        Przychód · 12 miesięcy
                                    </PanelTitle>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                        Suma: <strong style={{ color: '#0f172a' }}>
                                            {formatCurrency(
                                                monthlyRevenue.reduce((a, b) => a + b, 0),
                                                lifetimeValue.currency,
                                            )}
                                        </strong>
                                    </span>
                                </PanelHead>
                                <PanelBody>
                                    <ChartBars>
                                        {monthlyRevenue.map((val, i) => (
                                            <ChartBarCol key={i}>
                                                <ChartBarWrap>
                                                    <ChartBar
                                                        $h={Math.max(3, Math.round((val / revenueMax) * 100))}
                                                        $active={i === 11}
                                                        title={formatCurrency(val, lifetimeValue.currency)}
                                                    />
                                                </ChartBarWrap>
                                                <ChartBarLabel>{monthLabels[i]}</ChartBarLabel>
                                            </ChartBarCol>
                                        ))}
                                    </ChartBars>
                                </PanelBody>
                            </Panel>

                            {/* Upcoming reservations */}
                            <Panel>
                                <PanelHead>
                                    <PanelTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                        Nadchodzące
                                    </PanelTitle>
                                </PanelHead>
                                <PanelBodyFlush>
                                    {upcomingReservations.length === 0 ? (
                                        <PanelBody>
                                            <NoteText>Brak zaplanowanych wizyt.</NoteText>
                                        </PanelBody>
                                    ) : (
                                        upcomingReservations.map((r: Reservation) => {
                                            const { day, month } = formatShortDate(r.date);
                                            const { label, kind } = reservationStatusBadge(r.status);
                                            return (
                                                <UpcomingItem key={r.id}>
                                                    <UpcomingDateBox>
                                                        <UpcomingDateNum>{day}</UpcomingDateNum>
                                                        {month}
                                                    </UpcomingDateBox>
                                                    <UpcomingInfo>
                                                        <UpcomingTitle>{r.vehicleName}</UpcomingTitle>
                                                        <UpcomingSub>
                                                            {r.licensePlate ?? '—'}
                                                            {' · '}
                                                            {formatCurrency(r.totalCost.grossAmount, r.totalCost.currency)}
                                                        </UpcomingSub>
                                                    </UpcomingInfo>
                                                    <StatusBadge $kind={kind}>{label}</StatusBadge>
                                                </UpcomingItem>
                                            );
                                        })
                                    )}
                                </PanelBodyFlush>
                            </Panel>

                        </ChartGrid>

                        {/* Recent visits */}
                        <Panel>
                            <PanelHead>
                                <PanelTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 3h18v18H3z" fill="none"/>
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    Ostatnie wizyty
                                </PanelTitle>
                                {visits.length > 5 && (
                                    <PanelLinkBtn to={`/customers/${customerId}`}>
                                        Wszystkie {visits.length}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6"/>
                                        </svg>
                                    </PanelLinkBtn>
                                )}
                            </PanelHead>
                            <PanelBodyFlush>
                                {recentVisits.length === 0 ? (
                                    <PanelBody>
                                        <NoteText>Brak historii wizyt.</NoteText>
                                    </PanelBody>
                                ) : (
                                    recentVisits.map((visit: Visit & { licensePlate?: string }) => {
                                        const d = new Date(visit.date);
                                        const { label, kind } = visitStatusBadge(visit.status);
                                        return (
                                            <VisitRow
                                                key={visit.id}
                                                $active={visit.status === 'in-progress'}
                                                onClick={() => navigate(`/visits/${visit.id}`)}
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
                                                    <VisitTitle>{visit.description || visit.type || 'Wizyta'}</VisitTitle>
                                                    <VisitSub>
                                                        {visit.vehicleName}
                                                        {visit.technician ? ` · ${visit.technician}` : ''}
                                                    </VisitSub>
                                                </VisitInfo>

                                                <StatusBadge $kind={kind} className="visit-hide-sm">{label}</StatusBadge>

                                                <VisitAmount>
                                                    {formatCurrency(visit.totalCost.grossAmount, visit.totalCost.currency)}
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
                                <DocumentsManager customerId={customerId!} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                        {/* Communication */}
                        <CollapsibleSection>
                            <CollapsibleHeader
                                onClick={() => setIsCommOpen(v => !v)}
                                aria-expanded={isCommOpen}
                                aria-controls="comm-section"
                            >
                                <CollapsibleHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                                            <path d="M2 7l10 7 10-7"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <CollapsibleTitle>Komunikacja</CollapsibleTitle>
                                    {commEntries.length > 0 && (
                                        <CollapsibleBadge>{commEntries.length}</CollapsibleBadge>
                                    )}
                                </CollapsibleHeaderLeft>
                                <ChevronIcon $open={isCommOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </ChevronIcon>
                            </CollapsibleHeader>
                            <CollapsibleBody $visible={isCommOpen} $flush id="comm-section">
                                <CommunicationList entries={commEntries} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                        {/* Consents */}
                        {marketingConsents.length > 0 && (
                            <ConsentManager
                                consents={marketingConsents}
                                onConsentToggle={(id, granted) => updateConsent({ consentId: id, granted })}
                                isUpdating={consentUpdating}
                            />
                        )}

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
                                <AuditTimeline module="CUSTOMER" entityId={customerId!} />
                            </CollapsibleBody>
                        </CollapsibleSection>

                        {/* Company invoice data */}
                        {customer.company && (
                            <Panel>
                                <PanelHead>
                                    <PanelTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                            <polyline points="9,22 9,12 15,12 15,22"/>
                                        </svg>
                                        Dane do faktury
                                    </PanelTitle>
                                    <SharedButton
                                        $variant="ghost"
                                        $size="sm"
                                        onClick={() => setIsEditCompanyModalOpen(true)}
                                    >
                                        Edytuj
                                    </SharedButton>
                                </PanelHead>
                                <PanelBody>
                                    {customer.company.nip && (
                                        <PrefRow>
                                            <PrefKey>NIP</PrefKey>
                                            <PrefVal>{customer.company.nip}</PrefVal>
                                        </PrefRow>
                                    )}
                                    {customer.company.regon && (
                                        <PrefRow>
                                            <PrefKey>REGON</PrefKey>
                                            <PrefVal>{customer.company.regon}</PrefVal>
                                        </PrefRow>
                                    )}
                                    {customer.company.address && (
                                        <PrefRow>
                                            <PrefKey>Adres</PrefKey>
                                            <PrefVal>
                                                {customer.company.address.street}, {customer.company.address.postalCode} {customer.company.address.city}
                                            </PrefVal>
                                        </PrefRow>
                                    )}
                                </PanelBody>
                            </Panel>
                        )}

                    </MainCol>
                </TwoColGrid>
            </PageContent>

            {/* ─── Modals ─────────────────────────────────────── */}
            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customer={customer}
            />
            <EditCompanyModal
                isOpen={isEditCompanyModalOpen}
                onClose={() => setIsEditCompanyModalOpen(false)}
                customerId={customerId!}
                company={customer.company}
            />
        </ViewContainer>
    );
};

// ─── Communication list (inline sub-component) ────────────────────────────────

const CommList = styled.div``;
const CommItem = styled.div`
    padding: 13px 20px;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;
const CommHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 4px;
`;
const CommSubject = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
`;
const CommDate = styled.time`
    font-size: 11px;
    color: ${st.textMuted};
    white-space: nowrap;
    flex-shrink: 0;
`;
const CommSummary = styled.p`
    margin: 0 0 8px;
    font-size: 13px;
    color: ${st.textSecondary};
    line-height: 1.5;
`;
const CommBadges = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;
const CommBadge = styled.span<{ $v?: string }>`
    display: inline-flex;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${p => {
        const map: Record<string, string> = {
            email:    `background: ${st.accentBlueDim}; color: ${st.accentBlue};`,
            sms:      `background: ${st.accentAmberDim}; color: ${st.accentAmber};`,
            phone:    `background: ${st.accentGreenDim}; color: ${st.accentGreen};`,
            inbound:  `background: ${st.accentBlueDim}; color: ${st.accentBlue};`,
            outbound: `background: ${st.accentGreenDim}; color: ${st.accentGreen};`,
            sent:     `background: #dcfce7; color: #166534;`,
            failed:   `background: #fee2e2; color: #991b1b;`,
        };
        return map[p.$v ?? ''] ?? `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
    }}
`;
const CommEmpty = styled.div`
    padding: 28px 20px;
    text-align: center;
    font-size: 13px;
    color: ${st.textMuted};
`;

function CommunicationList({ entries }: { entries: CustomerCommunicationEntry[] }) {
    if (entries.length === 0) return <CommEmpty>Brak historii komunikacji z klientem.</CommEmpty>;

    return (
        <CommList>
            {[...entries]
                .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                .map(entry => (
                    <CommItem key={entry.id}>
                        <CommHeader>
                            <CommSubject>{entry.messageTypeLabel}</CommSubject>
                            <CommDate>
                                {new Date(entry.sentAt).toLocaleString('pl-PL', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </CommDate>
                        </CommHeader>
                        {entry.subject && (
                            <CommSummary style={{ fontStyle: 'italic' }}>{entry.subject}</CommSummary>
                        )}
                        <CommSummary>{entry.recipientAddress}</CommSummary>
                        <CommBadges>
                            <CommBadge $v={entry.channel.toLowerCase()}>
                                {entry.channel === 'EMAIL' ? 'E-mail' : 'SMS'}
                            </CommBadge>
                            <CommBadge $v={entry.status === 'SENT' ? 'sent' : 'failed'}>
                                {entry.status === 'SENT' ? 'Wysłano' : 'Błąd'}
                            </CommBadge>
                        </CommBadges>
                        {entry.status === 'FAILED' && entry.errorMessage && (
                            <CommSummary style={{ color: '#ef4444', marginTop: 4, fontSize: 12 }}>
                                {entry.errorMessage}
                            </CommSummary>
                        )}
                    </CommItem>
                ))}
        </CommList>
    );
}
