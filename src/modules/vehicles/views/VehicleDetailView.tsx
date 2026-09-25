// src/modules/vehicles/views/VehicleDetailView.tsx
//
// Karta pojazdu - ten sam układ i te same klocki co karta wizyty
// (common/components/ui): ciemny nagłówek z faktami o aucie, jedna wyniesiona
// karta („Wizyty", z kwotą wydaną na auto jako nagłówkiem), reszta jako płaskie
// panele, a z prawej szyna z właścicielami, danymi i notatkami.
//
// Przed przebudową karta miała:
//   - trzy wyniesione kafle statystyk z etykietami 11px wersalikami,
//   - kolorowe gradientowe kafelki ikon przy każdej zwijanej sekcji,
//   - awatary z inicjałami przy właścicielach,
//   - kilka wypełnionych przycisków naraz („Nowa wizyta", „Dodaj dokument",
//     „Dodaj zdjęcie") - żaden nie był krokiem następnym (CLAUDE.md §2),
//   - na telefonie pasek zakładek nad globalną nawigacją.
//
// Telefon: jedna kolumna i przypięte skróty do sekcji, jak w wizycie.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { CalendarDays, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useDeleteVehicle } from '../hooks/useDeleteVehicle';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useVehicleDetail } from '../hooks/useVehicleDetail';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import type { VehicleHistoryEvent } from '../hooks/useVehicleHistory';
import { useVehicleDeletedVisits } from '../hooks/useVehicleDeletedVisits';
import { VehicleDocuments } from '../components/VehicleDocuments';
import { VehiclePhotoGallery } from '../components/VehiclePhotoGallery';
import { VehicleNotes } from '../components/VehicleNotes';
import { VehicleComments } from '../components/VehicleComments';
import { VehicleDetailHeader } from '../components/VehicleDetailHeader';
import { EditVehicleModal } from '../components/EditVehicleModal';
import { EditOwnersModal } from '../components/EditOwnersModal';
import { EntityActivityTimeline } from '@/modules/activity';
import { PageContainer } from '@/common/components/PageContainer';
import { formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';
import { useMediaQuery } from '@/common/hooks';
import {
    Button, Card, FieldList, FieldRow, Notice, Panel, PanelBody, SectionChips, SectionTitle,
    StatusPill, SummaryStrip, ui, type PillTone,
} from '@/common/components/ui';
import type { VehicleOwner } from '../types';
import { toCalendarDate } from '../utils/calendarDeepLink';

// ─── Układ ────────────────────────────────────────────────────────────────────

// Opacity-only: animacja z transformem na przodku psuje modale z position: fixed.
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const spin = keyframes`to { transform: rotate(360deg); }`;

const ViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    max-width: 100%;
    overflow-x: clip;
    background: ${ui.bg};
    animation: ${fadeIn} 0.3s ease both;
`;

const ContentArea = styled(PageContainer)`
    flex: 1;
    min-width: 0;
    padding-block-end: 40px;

    @media (min-width: ${props => props.theme.breakpoints.md}) { padding-block-end: 48px; }
`;

/**
 * Dwie kolumny od 960px szerokości TREŚCI (zapytanie kontenerowe), nie okna. W jednej
 * kolumnie kolumny się rozpadają (`display: contents`), a kolejność ustawia `order`.
 */
const Layout = styled.div`
    container: vehicle-layout / inline-size;
    min-width: 0;
`;

const MainColumn = styled.div`display: contents;`;
const Rail = styled.aside`display: contents;`;

const Columns = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;

    @container vehicle-layout (min-width: 960px) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 344px;
        gap: 20px;
        align-items: start;

        ${MainColumn}, ${Rail} {
            display: flex;
            flex-direction: column;
            gap: 14px;
            min-width: 0;
        }
    }
`;

const Slot = styled.div<{ $order: number }>`
    order: ${p => p.$order};
    min-width: 0;
    scroll-margin-top: 64px;
`;

const Breadcrumb = styled.nav`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: ${ui.textMuted};

    a { color: ${ui.textSecondary}; text-decoration: none; }
    a:hover { color: ${ui.brandInk}; text-decoration: underline; }
    svg { width: 13px; height: 13px; }
    span[aria-current] { color: ${ui.ink}; font-weight: 600; }
`;

// ─── Karta wizyt ──────────────────────────────────────────────────────────────

const VisitsCard = styled(Card)`
    display: flex;
    flex-direction: column;
`;

const CardHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 22px 0;

    @media (max-width: 640px) { padding: 14px 16px 0; }
`;

const Strip = styled(SummaryStrip)`
    margin: 14px 22px 0;

    @media (max-width: 640px) { margin: 10px 16px 0; }
`;

const VisitList = styled.ul`
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
`;

const VisitRow = styled.button<{ $muted?: boolean }>`
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto auto 16px;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 22px;
    border: none;
    border-top: 1px solid ${ui.lineFaint};
    background: ${ui.surface};
    font-family: inherit;
    text-align: left;
    color: inherit;
    cursor: ${p => p.$muted ? 'default' : 'pointer'};
    opacity: ${p => p.$muted ? 0.55 : 1};

    &:hover:not(:disabled) { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
    > svg { width: 16px; height: 16px; color: ${ui.textFaint}; }

    @media (max-width: 640px) {
        grid-template-columns: 52px minmax(0, 1fr) auto 16px;
        gap: 10px;
        padding: 12px 12px 12px 16px;
        .pill { display: none; }
    }
`;

const DateCol = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-variant-numeric: tabular-nums;

    strong { font-size: 14px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 12px; color: ${ui.textMuted}; }
`;

const VisitText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    span { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: ${ui.textMuted}; }
    span svg { width: 13px; height: 13px; }
`;

const Amount = styled.span`
    font-size: 14.5px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const CardFoot = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px 14px;
    border-top: 1px solid ${ui.lineFaint};

    @media (max-width: 640px) { padding: 10px 16px 12px; }
`;

const EmptyVisits = styled.p`
    margin: 14px 22px 18px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

// ─── Szyna ────────────────────────────────────────────────────────────────────

const RailPanel = styled(Panel)`
    padding: 16px 18px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const RailHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const Owners = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
`;

/* Właściciel jako wiersz-odnośnik: nazwa, rola, strzałka. Bez awatara z inicjałami -
   powtarzał tylko to, co stoi obok literami. */
const OwnerLink = styled.a`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-top: 1px solid ${ui.lineFaint};
    text-decoration: none;
    color: inherit;

    li:first-child > & { border-top: none; }
    &:hover strong { color: ${ui.brandInk}; }
    > svg { width: 15px; height: 15px; color: ${ui.textFaint}; flex-shrink: 0; }
`;

const OwnerText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const Muted = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const HistoryToggle = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 14px 18px;
    border: none;
    border-radius: ${ui.radiusPanel};
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    > svg { width: 16px; height: 16px; color: ${ui.textMuted}; transition: transform 200ms ease; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
    @media (max-width: 640px) { padding: 14px 16px; }
`;

const Centered = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 400px;
    text-align: center;

    h2 { margin: 0; font-size: 20px; color: ${ui.dangerInk}; }
    p { margin: 0; color: ${ui.textSecondary}; font-size: 14px; }
`;

const Spinner = styled.div`
    width: 38px;
    height: 38px;
    border: 3px solid ${ui.line};
    border-top-color: ${ui.brand};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
    PRIMARY: 'Właściciel',
    CO_OWNER: 'Współwłaściciel',
    COMPANY: 'Firma',
};

const VISITS_COLLAPSED = 6;

function visitStatus(status: string): { label: string; tone: PillTone } {
    switch (status.toUpperCase()) {
        case 'COMPLETED': return { label: 'Zakończona', tone: 'ok' };
        case 'CONVERTED': return { label: 'Zrealizowana', tone: 'ok' };
        case 'IN_PROGRESS': return { label: 'W realizacji', tone: 'info' };
        case 'READY_FOR_PICKUP': return { label: 'Do odbioru', tone: 'warn' };
        case 'CREATED':
        case 'SCHEDULED': return { label: 'Rezerwacja', tone: 'neutral' };
        case 'ABANDONED': return { label: 'Porzucona', tone: 'danger' };
        case 'CANCELLED': return { label: 'Anulowana', tone: 'danger' };
        default: return { label: status, tone: 'neutral' };
    }
}

const pad = (n: number) => String(n).padStart(2, '0');


const LastVisitAgo = styled.span`
    color: ${ui.textMuted};
    font-weight: 400;
`;

function daysAgo(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'dziś';
    if (days === 1) return 'wczoraj';
    return `${days} dni temu`;
}

// ─── Widok ────────────────────────────────────────────────────────────────────

export const VehicleDetailView = () => {
    const { vehicleId } = useParams<{ vehicleId: string }>();
    const navigate = useNavigate();
    const isPhone = useMediaQuery('(max-width: 767px)');

    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditOwnersModalOpen, setIsEditOwnersModalOpen] = useState(false);
    const [showDeletedVisits, setShowDeletedVisits] = useState(false);
    const [showAllVisits, setShowAllVisits] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { deleteVehicle, isDeleting } = useDeleteVehicle();
    const { vehicleDetail, isLoading, isError, refetch } = useVehicleDetail(vehicleId!);
    const { events: historyEvents } = useVehicleHistory(vehicleId!);
    const { events: deletedVisitEvents } = useVehicleDeletedVisits(vehicleId!, showDeletedVisits);

    if (isLoading) {
        return (
            <ViewContainer>
                <ContentArea>
                    <Centered>
                        <Spinner />
                        <p>Ładowanie danych pojazdu...</p>
                    </Centered>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isError || !vehicleDetail) {
        return (
            <ViewContainer>
                <ContentArea>
                    <Centered>
                        <h2>{t.common.error}</h2>
                        <p>{t.vehicles.error.detailLoadFailed}</p>
                        <Button variant="primary" onClick={() => refetch()}>{t.common.retry}</Button>
                    </Centered>
                </ContentArea>
            </ViewContainer>
        );
    }

    const { vehicle, photos } = vehicleDetail;
    const vehicleName = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Pojazd';
    const isArchived = vehicle.status === 'archived' || !!vehicle.deletedAt;
    const deletedAtFormatted = vehicle.deletedAt
        ? new Date(vehicle.deletedAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;

    const totalSpent = vehicle.stats?.totalSpent ?? { grossAmount: 0, currency: 'PLN' };
    const totalVisits = vehicle.stats?.totalVisits ?? 0;
    const lastVisit = vehicle.stats?.lastVisitDate ?? null;
    const avgCost = vehicle.stats?.averageVisitCost ?? { grossAmount: 0, currency: 'PLN' };

    const allEvents = showDeletedVisits
        ? [...historyEvents, ...deletedVisitEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : historyEvents;
    const shownEvents = showAllVisits ? allEvents : allEvents.slice(0, VISITS_COLLAPSED);

    const startVisit = () => {
        const singleOwner = vehicle.owners.length === 1 ? vehicle.owners[0] : null;
        const nameParts = singleOwner?.customerName.split(' ') ?? [];
        navigate('/checkin/new', {
            state: {
                prefillVehicle: {
                    id: vehicle.id,
                    brand: vehicle.brand,
                    model: vehicle.model,
                    yearOfProduction: vehicle.yearOfProduction,
                    licensePlate: vehicle.licensePlate,
                    color: vehicle.color ?? undefined,
                },
                ...(singleOwner ? {
                    prefillCustomer: {
                        id: singleOwner.customerId,
                        firstName: nameParts[0] ?? '',
                        lastName: nameParts.slice(1).join(' '),
                        phone: '',
                        email: '',
                    },
                } : {}),
            },
        });
    };

    const openEvent = (event: VehicleHistoryEvent) => {
        if (event.type === 'VISIT') {
            navigate(`/visits/${event.id}`);
            return;
        }
        // Rezerwacja nie ma własnego widoku - żyje w kalendarzu. Ten sam kontrakt co
        // deep-link z Aktywności: podświetl zdarzenie i otwórz jego podsumowanie.
        navigate('/calendar', {
            state: {
                highlightEventId: event.id,
                highlightDate: toCalendarDate(event.date),
                openEventPopover: true,
            },
        });
    };

    const chips = [
        { id: 'vehicle-visits', label: 'Wizyty', count: historyEvents.length },
        { id: 'vehicle-photos', label: 'Zdjęcia', count: photos.length },
        { id: 'vehicle-docs', label: 'Dokumenty' },
        { id: 'vehicle-owners', label: 'Właściciele', count: vehicle.owners.length },
        { id: 'vehicle-notes', label: 'Notatki' },
        { id: 'vehicle-history', label: 'Historia' },
    ];

    return (
        <ViewContainer>
            <ContentArea>
                <Breadcrumb aria-label="Nawigacja">
                    <a href="/vehicles" onClick={e => { e.preventDefault(); navigate('/vehicles'); }}>Pojazdy</a>
                    <ChevronRight aria-hidden="true" />
                    <span aria-current="page">{vehicle.licensePlate || vehicleName}</span>
                </Breadcrumb>

                {isArchived && (
                    <Notice
                        tone="danger"
                        role="alert"
                        title={`Ten pojazd został usunięty${deletedAtFormatted ? ` ${deletedAtFormatted}` : ''}${vehicle.deletedBy ? ` przez ${vehicle.deletedBy}` : ''}`}
                    >
                        Operacja jest nieodwracalna. Nie można wprowadzać zmian w tym pojeździe.
                    </Notice>
                )}
                {isArchived && <div style={{ height: 14 }} />}

                <VehicleDetailHeader
                    vehicle={vehicle}
                    isArchived={isArchived}
                    onNewVisit={startVisit}
                    onEdit={() => setIsEditModalOpen(true)}
                    onOwners={() => setIsEditOwnersModalOpen(true)}
                    onDelete={() => setShowDeleteConfirm(true)}
                    isDeleting={isDeleting}
                />

                {isPhone && (
                    <SectionChips
                        label="Sekcje pojazdu"
                        items={chips}
                        onOpen={id => { if (id === 'vehicle-history') setIsAuditOpen(true); }}
                    />
                )}

                <Layout>
                    <Columns>
                        <MainColumn>
                            {/* Jedyna wyniesiona karta: to po historię wizyt i kwotę się tu wraca. */}
                            <Slot id="vehicle-visits" $order={1}>
                                <VisitsCard aria-labelledby="vehicle-visits-title">
                                    <CardHead>
                                        <SectionTitle
                                            id="vehicle-visits-title"
                                            size="lg"
                                            count={historyEvents.length || undefined}
                                        >
                                            Wizyty
                                        </SectionTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            aria-pressed={showDeletedVisits}
                                            onClick={() => setShowDeletedVisits(v => !v)}
                                        >
                                            {showDeletedVisits ? 'Ukryj usunięte' : 'Pokaż usunięte'}
                                        </Button>
                                    </CardHead>

                                    <Strip
                                        label="Łącznie wydano na ten pojazd"
                                        amount={formatCurrency(totalSpent.grossAmount, totalSpent.currency)}
                                        details={totalVisits > 0
                                            ? `${totalVisits} ${totalVisits === 1 ? 'zakończona wizyta' : 'zakończone wizyty'}, średnio ${formatCurrency(avgCost.grossAmount, avgCost.currency)}`
                                            : 'żadna wizyta nie jest jeszcze zakończona'}
                                    />

                                    {shownEvents.length === 0 ? (
                                        <EmptyVisits>Ten pojazd nie ma jeszcze wizyt ani rezerwacji.</EmptyVisits>
                                    ) : (
                                        <VisitList>
                                            {shownEvents.map((event: VehicleHistoryEvent & { deletedAt?: string }) => {
                                                const d = new Date(event.date);
                                                const isDeleted = !!event.deletedAt;
                                                const status = isDeleted ? { label: 'Usunięta', tone: 'danger' as const } : visitStatus(event.status);
                                                const sameYear = d.getFullYear() === new Date().getFullYear();
                                                return (
                                                    <li key={`${event.type}-${event.id}`}>
                                                        <VisitRow
                                                            type="button"
                                                            $muted={isDeleted}
                                                            disabled={isDeleted}
                                                            onClick={() => openEvent(event)}
                                                            title={event.type === 'APPOINTMENT' ? 'Pokaż w kalendarzu' : 'Otwórz wizytę'}
                                                        >
                                                            <DateCol>
                                                                <strong>{pad(d.getDate())}.{pad(d.getMonth() + 1)}</strong>
                                                                <span>{sameYear ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : d.getFullYear()}</span>
                                                            </DateCol>
                                                            <VisitText>
                                                                <strong>{event.title}</strong>
                                                                <span>
                                                                    {event.type === 'APPOINTMENT' && <CalendarDays aria-hidden="true" />}
                                                                    {event.customerName}
                                                                </span>
                                                            </VisitText>
                                                            <StatusPill className="pill" $tone={status.tone}>{status.label}</StatusPill>
                                                            <Amount>{formatCurrency(event.grossAmount, event.currency)}</Amount>
                                                            <ChevronRight aria-hidden="true" />
                                                        </VisitRow>
                                                    </li>
                                                );
                                            })}
                                        </VisitList>
                                    )}

                                    {allEvents.length > VISITS_COLLAPSED && (
                                        <CardFoot>
                                            <Button variant="ghost" size="sm" onClick={() => setShowAllVisits(v => !v)}>
                                                {showAllVisits ? 'Pokaż mniej' : `Pokaż wszystkie (${allEvents.length})`}
                                            </Button>
                                        </CardFoot>
                                    )}
                                    {allEvents.length <= VISITS_COLLAPSED && <div style={{ height: 8 }} />}
                                </VisitsCard>
                            </Slot>

                            <Slot $order={2}>
                                <VehiclePhotoGallery id="vehicle-photos" vehicleId={vehicleId!} readOnly={isArchived} />
                            </Slot>

                            <Slot $order={3}>
                                <VehicleDocuments id="vehicle-docs" vehicleId={vehicleId!} readOnly={isArchived} />
                            </Slot>

                            <Slot $order={7}>
                                <VehicleComments id="vehicle-comments" vehicleId={vehicleId!} />
                            </Slot>

                            <Slot id="vehicle-history" $order={8}>
                                <Panel>
                                    <HistoryToggle
                                        type="button"
                                        onClick={() => setIsAuditOpen(v => !v)}
                                        aria-expanded={isAuditOpen}
                                        aria-controls="vehicle-history-body"
                                    >
                                        <SectionTitle as="span">Historia zmian</SectionTitle>
                                        <ChevronDown aria-hidden="true" style={{ transform: isAuditOpen ? 'rotate(180deg)' : undefined }} />
                                    </HistoryToggle>
                                    {isAuditOpen && (
                                        <PanelBody id="vehicle-history-body">
                                            <EntityActivityTimeline scope={{ vehicleId: vehicleId! }} />
                                        </PanelBody>
                                    )}
                                </Panel>
                            </Slot>
                        </MainColumn>

                        <Rail>
                            <Slot $order={4}>
                                <RailPanel id="vehicle-owners" aria-labelledby="vehicle-owners-title">
                                    <RailHead>
                                        <SectionTitle id="vehicle-owners-title" count={vehicle.owners.length || undefined}>Właściciele</SectionTitle>
                                        {!isArchived && (
                                            <Button variant="ghost" size="sm" onClick={() => setIsEditOwnersModalOpen(true)}>Zarządzaj</Button>
                                        )}
                                    </RailHead>
                                    {vehicle.owners.length === 0 ? (
                                        <Muted>Pojazd nie ma przypisanego właściciela.</Muted>
                                    ) : (
                                        <Owners>
                                            {vehicle.owners.map((owner: VehicleOwner) => (
                                                <li key={owner.customerId}>
                                                    <OwnerLink
                                                        href={`/customers/${owner.customerId}`}
                                                        onClick={e => { e.preventDefault(); navigate(`/customers/${owner.customerId}`); }}
                                                    >
                                                        <OwnerText>
                                                            <strong>{owner.customerName}</strong>
                                                            <span>{ROLE_LABEL[owner.role] ?? owner.role}</span>
                                                        </OwnerText>
                                                        <ChevronRight aria-hidden="true" />
                                                    </OwnerLink>
                                                </li>
                                            ))}
                                        </Owners>
                                    )}
                                </RailPanel>
                            </Slot>

                            <Slot $order={5}>
                                <RailPanel aria-labelledby="vehicle-data-title">
                                    <RailHead>
                                        <SectionTitle id="vehicle-data-title">Dane pojazdu</SectionTitle>
                                        {!isArchived && (
                                            <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(true)}><Pencil />Edytuj</Button>
                                        )}
                                    </RailHead>
                                    <FieldList style={{ marginTop: 10 }}>
                                        <FieldRow label="Marka">{vehicle.brand || '-'}</FieldRow>
                                        <FieldRow label="Model">{vehicle.model || '-'}</FieldRow>
                                        {vehicle.licensePlate && <FieldRow label="Tablica">{vehicle.licensePlate}</FieldRow>}
                                        {vehicle.yearOfProduction && <FieldRow label="Rocznik">{vehicle.yearOfProduction}</FieldRow>}
                                        {vehicle.color && <FieldRow label="Kolor">{vehicle.color}</FieldRow>}
                                        {vehicle.currentMileage ? (
                                            <FieldRow label="Przebieg"><strong>{vehicle.currentMileage.toLocaleString('pl-PL')} km</strong></FieldRow>
                                        ) : null}
                                        {/* Ostatnia wizyta stała w nagłówku jako jedyny fakt, którego nie ma
                                            nigdzie indziej - dla jednej daty nie warto było rozciągać ciemnego
                                            bloku, więc siedzi tu, obok reszty danych auta. */}
                                        <FieldRow label="Ostatnia wizyta">
                                            {lastVisit ? (
                                                <span>
                                                    {new Date(lastVisit).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    <LastVisitAgo>, {daysAgo(lastVisit)}</LastVisitAgo>
                                                </span>
                                            ) : 'jeszcze nie było'}
                                        </FieldRow>
                                        <FieldRow label="Numer w systemie">{vehicle.id.slice(0, 8).toUpperCase()}</FieldRow>
                                    </FieldList>
                                </RailPanel>
                            </Slot>

                            <Slot $order={6}>
                                <VehicleNotes id="vehicle-notes" vehicleId={vehicleId!} readOnly={isArchived} />
                            </Slot>
                        </Rail>
                    </Columns>
                </Layout>
            </ContentArea>

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

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Usunąć pojazd?"
                message={`${vehicleName}${vehicle.licensePlate ? `, ${vehicle.licensePlate},` : ''} trafi do archiwum. Wizyty, dokumenty i zdjęcia zostaną nienaruszone.`}
                variant="danger"
                confirmText="Usuń pojazd"
                cancelText="Zostaw"
                onConfirm={() => {
                    deleteVehicle(vehicleId!, { onSuccess: () => navigate('/vehicles') });
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </ViewContainer>
    );
};
