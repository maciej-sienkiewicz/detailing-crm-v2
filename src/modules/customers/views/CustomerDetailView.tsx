// src/modules/customers/views/CustomerDetailView.tsx
//
// Karta klienta - ten sam układ i te same klocki co karta pojazdu i wizyty
// (common/components/ui): ciemny nagłówek bez powtórzonych danych, jedna
// wyniesiona karta („Wizyty", z przychodem od klienta jako nagłówkiem), reszta
// jako płaskie panele, a z prawej szyna z danymi, pojazdami, notatkami i zgodami.
//
// Przed przebudową karta miała:
//   - awatar z inicjałami i cały kontakt w nagłówku, a pod nim cztery kafle
//     statystyk z etykietami 11px wersalikami - „Łączny przychód" i „Wizyty"
//     pokazywały tę samą liczbę wizyt dwa razy;
//   - dokumenty, zgody, komunikację i historię za czterema zwijanymi blokami
//     z kafelkami ikon w czterech różnych gradientach;
//   - kropki klejące fakty („WX 4821K · 2022", „BMW · Marek"), CLAUDE.md §4;
//   - na telefonie pasek trzech zakładek nad globalną nawigacją.
//
// Telefon: jedna kolumna i przypięte skróty do sekcji, jak w wizycie i pojeździe.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { CalendarDays, ChevronDown, ChevronRight, Pencil, Phone, Plus } from 'lucide-react';
import { PiiValue, isPiiMasked, joinPiiName } from '@/common/pii';
import { ReservationContextMenu } from '@/common/components/ReservationContextMenu';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { PageContainer } from '@/common/components/PageContainer';
import { EntityActivityTimeline } from '@/modules/activity';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { useClickToCall } from '@/modules/push';
import { useMediaQuery } from '@/common/hooks';
import { t } from '@/common/i18n';
import {
    Button, Card, FieldList, FieldRow, Notice, Panel, PanelBody, PanelHead, SectionChips, SectionTitle,
    StatusPill, SummaryStrip, ui, type PillTone,
} from '@/common/components/ui';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { useDeleteCustomer } from '../hooks/useDeleteCustomer';
import { useCustomerVehicles } from '../hooks/useCustomerVehicles';
import { useCustomerActiveData, useCustomerDeletedVisits } from '../hooks/useCustomerVisits';
import { useCustomerCommunication } from '../hooks/useCustomerCommunication';
import { useCustomerRevenue } from '../hooks/useCustomerRevenue';
import { CustomerDetailHeader } from '../components/CustomerDetailHeader';
import { CustomerNotes } from '../components/CustomerNotes';
import { CustomerCommunicationList } from '../components/CustomerCommunicationList';
import { DocumentsManager } from '../components/DocumentsManager';
import { CustomerConsentsSection } from '../components/CustomerConsentsSection';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { AddVehicleModal } from '../components/AddVehicleModal';
import { SendSmsModal } from '../components/SendSmsModal';
import { formatCurrency } from '../utils/customerMappers';
import type { Reservation, Vehicle, Visit } from '../types';

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
    container: customer-layout / inline-size;
    min-width: 0;
`;

const MainColumn = styled.div`display: contents;`;
const Rail = styled.aside`display: contents;`;

const Columns = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;

    @container customer-layout (min-width: 960px) {
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

const RowList = styled.ul`
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
`;

const EventRow = styled.button<{ $muted?: boolean }>`
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

/* Wiersz rezerwacji w płaskim panelu: bez własnego tła i z odstępem panelu. */
const FlatRow = styled(EventRow)`
    padding: 11px 0;
    background: transparent;

    li:first-child > & { border-top: none; padding-top: 0; }
    &:hover:not(:disabled) { background: transparent; }
    &:hover strong { color: ${ui.brandInk}; }

    @media (max-width: 640px) { padding: 11px 0; }
`;

const DateCol = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-variant-numeric: tabular-nums;

    strong { font-size: 14px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 12px; color: ${ui.textMuted}; }
`;

const EventText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    > span { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 2px 10px; font-size: 12.5px; color: ${ui.textMuted}; }
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

const EmptyCard = styled.p`
    margin: 14px 22px 18px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

// ─── Wykres przychodu ────────────────────────────────────────────────────────

const Bars = styled.ol`
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: end;
    gap: 6px;
    height: 132px;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (max-width: 480px) { gap: 3px; }
`;

const BarCol = styled.li`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    gap: 6px;
    height: 100%;
    min-width: 0;

    span { font-size: 11.5px; color: ${ui.textMuted}; text-align: center; }
`;

const Bar = styled.div<{ $h: number; $current: boolean }>`
    height: ${p => p.$h}%;
    min-height: 3px;
    border-radius: 6px 6px 3px 3px;
    background: ${p => p.$current ? ui.brand : ui.brandLineSoft};
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

const RailActions = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
`;

const ContactActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;

    > * { flex: 1; }
`;

const Muted = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const Faint = styled.span`
    color: ${ui.textMuted};
    font-weight: 400;
`;

const VehicleList = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
`;

/* Pojazd jako wiersz-odnośnik: logo marki, nazwa, tablica i rocznik obok siebie. */
const VehicleLink = styled.a<{ $muted?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-top: 1px solid ${ui.lineFaint};
    text-decoration: none;
    color: inherit;
    opacity: ${p => p.$muted ? 0.55 : 1};
    pointer-events: ${p => p.$muted ? 'none' : 'auto'};

    li:first-child > & { border-top: none; }
    &:hover strong { color: ${ui.brandInk}; }
    > svg { width: 15px; height: 15px; color: ${ui.textFaint}; flex-shrink: 0; }
`;

const VehicleText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    strong { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
    > span { display: flex; flex-wrap: wrap; gap: 2px 10px; font-size: 12.5px; color: ${ui.textMuted}; }
`;

const Plate = styled.span`
    font-family: ${ui.mono};
    letter-spacing: 0.04em;
    color: ${ui.inkSoft};
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

const MONTH_LABELS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const VISITS_COLLAPSED = 6;

function visitStatus(status: Visit['status']): { label: string; tone: PillTone } {
    switch (status) {
        case 'completed': return { label: 'Zakończona', tone: 'ok' };
        case 'in-progress': return { label: 'W realizacji', tone: 'info' };
        case 'ready-for-pickup': return { label: 'Do odbioru', tone: 'warn' };
        case 'scheduled': return { label: 'Zaplanowana', tone: 'neutral' };
        case 'cancelled': return { label: 'Anulowana', tone: 'danger' };
        default: return { label: status, tone: 'neutral' };
    }
}

function reservationStatus(status: Reservation['status']): { label: string; tone: PillTone } {
    switch (status) {
        case 'CREATED': return { label: 'Rezerwacja', tone: 'neutral' };
        case 'CONVERTED': return { label: 'Przyjęta', tone: 'info' };
        case 'CANCELLED': return { label: 'Anulowana', tone: 'danger' };
        case 'ABANDONED': return { label: 'Porzucona', tone: 'warn' };
        default: return { label: status, tone: 'neutral' };
    }
}

/** 1 wizyta, 2 wizyty, 5 wizyt, 22 wizyty. */
function visitsWord(n: number): string {
    if (n === 1) return 'wizyta';
    const u = n % 10;
    const t2 = n % 100;
    return u >= 2 && u <= 4 && (t2 < 12 || t2 > 14) ? 'wizyty' : 'wizyt';
}

function daysAgo(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'dziś';
    if (days === 1) return 'wczoraj';
    return `${days} dni temu`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

function DateCell({ iso }: { iso: string }) {
    const d = new Date(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return (
        <DateCol>
            <strong>{pad(d.getDate())}.{pad(d.getMonth() + 1)}</strong>
            <span>{sameYear ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : d.getFullYear()}</span>
        </DateCol>
    );
}

type VisitRowData = Visit & { licensePlate?: string; _deleted: boolean };

// ─── Widok ────────────────────────────────────────────────────────────────────

export const CustomerDetailView = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();
    const isPhone = useMediaQuery('(max-width: 767px)');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editModalInitialTab, setEditModalInitialTab] = useState<'basic' | 'address' | 'company'>('basic');
    const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
    const [isSmsOpen, setIsSmsOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [reservationMenu, setReservationMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [showAllVisits, setShowAllVisits] = useState(false);
    const [showDeletedVisits, setShowDeletedVisits] = useState(false);
    const [showDeletedVehicles, setShowDeletedVehicles] = useState(false);

    const deleteCustomer = useDeleteCustomer();
    const { requestCall, isRequesting: isRequestingCall } = useClickToCall();
    const { customerDetail, isLoading, isError, refetch } = useCustomerDetail(customerId!);
    const { vehicles, isLoading: vehiclesLoading } = useCustomerVehicles(customerId!, showDeletedVehicles);
    const { visits: regularVisits, reservations } = useCustomerActiveData(customerId!);
    const { visits: deletedVisits } = useCustomerDeletedVisits(customerId!, showDeletedVisits);
    const { entries: commEntries } = useCustomerCommunication(customerId!);
    const { data: revenueSummary } = useCustomerRevenue(customerId!);

    const visits: VisitRowData[] = useMemo(() => {
        const withPlate = (v: Visit, deleted: boolean) => ({
            ...v,
            licensePlate: v.licensePlate || vehicles.find(vh => vh.id === v.vehicleId)?.licensePlate,
            _deleted: deleted,
        });
        const base = regularVisits.map(v => withPlate(v, false));
        if (!showDeletedVisits) return base;
        return [...base, ...deletedVisits.map(v => withPlate(v, true))]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [regularVisits, deletedVisits, vehicles, showDeletedVisits]);

    const activeVisit = useMemo(() => visits.find(v => v.status === 'in-progress' && !v._deleted), [visits]);

    const upcoming = useMemo(
        () => [...reservations]
            .filter(r => r.status === 'CREATED' || r.status === 'CONVERTED')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3),
        [reservations],
    );

    if (isLoading) {
        return (
            <ViewContainer>
                <ContentArea>
                    <Centered>
                        <Spinner />
                        <p>Ładowanie danych klienta...</p>
                    </Centered>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isError || !customerDetail) {
        return (
            <ViewContainer>
                <ContentArea>
                    <Centered>
                        <h2>{t.common.error}</h2>
                        <p>{t.customers.error.detailLoadFailed}</p>
                        <Button variant="primary" onClick={() => refetch()}>{t.common.retry}</Button>
                    </Centered>
                </ContentArea>
            </ViewContainer>
        );
    }

    const { customer, lifetimeValue } = customerDetail;
    const fullName = joinPiiName(customer.firstName, customer.lastName) ?? 'Nieznany klient';
    const phone = customer.contact.phone;
    const phoneUsable = !!phone && !isPiiMasked(phone);
    const currency = lifetimeValue.currency;

    const shownVisits = showAllVisits ? visits : visits.slice(0, VISITS_COLLAPSED);
    const monthly = revenueSummary?.buckets ?? [];
    const revenueMax = Math.max(...monthly.map(b => b.grossAmount), 1);

    const startVisit = () => navigate('/checkin/new', {
        state: {
            prefillCustomer: {
                id: customer.id,
                firstName: customer.firstName ?? '',
                lastName: customer.lastName ?? '',
                phone: customer.contact.phone ?? '',
                email: customer.contact.email ?? '',
            },
        },
    });

    const openEdit = (tab: 'basic' | 'address' | 'company' = 'basic') => {
        setEditModalInitialTab(tab);
        setIsEditModalOpen(true);
    };

    const chips = [
        { id: 'customer-visits', label: 'Wizyty', count: regularVisits.length },
        { id: 'customer-data', label: 'Dane' },
        { id: 'customer-vehicles', label: 'Pojazdy', count: customer.vehicleCount },
        { id: 'customer-upcoming', label: 'Nadchodzące', count: upcoming.length },
        { id: 'customer-notes', label: 'Notatki' },
        { id: 'customer-docs', label: 'Dokumenty' },
        { id: 'customer-consents', label: 'Zgody' },
        { id: 'customer-comm', label: 'Wiadomości', count: commEntries.length },
        { id: 'customer-history', label: 'Historia' },
    ];

    return (
        <ViewContainer>
            <ContentArea>
                <Breadcrumb aria-label="Nawigacja">
                    <a href="/customers" onClick={e => { e.preventDefault(); navigate('/customers'); }}>Klienci</a>
                    <ChevronRight aria-hidden="true" />
                    <span aria-current="page"><PiiValue value={fullName} kind="name" /></span>
                </Breadcrumb>

                <CustomerDetailHeader
                    fullName={fullName}
                    companyName={customer.company?.name}
                    createdAt={customer.createdAt}
                    canSms={phoneUsable}
                    onNewVisit={startVisit}
                    onEdit={() => openEdit()}
                    onSms={() => setIsSmsOpen(true)}
                    onDelete={() => setShowDeleteConfirm(true)}
                />

                {/* Auto klienta stoi teraz w studiu - to jedyna rzecz, z którą ktoś wchodzi
                    na kartę klienta i wychodzi od razu dalej. Wcześniej był to czwarty,
                    wypełniony kafel statystyk z dopiskiem „W trakcie · kliknij aby przejść". */}
                {activeVisit && (
                    <div style={{ marginBottom: 14 }}>
                        <Notice
                            tone="info"
                            title={`${activeVisit.vehicleName} jest teraz w studiu`}
                            action={<Button variant="tinted" size="sm" onClick={() => navigate(`/visits/${activeVisit.id}`)}>Otwórz wizytę</Button>}
                        >
                            {activeVisit.description || 'Wizyta w realizacji'}, przyjęta {shortDate(activeVisit.date)}.
                        </Notice>
                    </div>
                )}

                {isPhone && (
                    <SectionChips
                        label="Sekcje klienta"
                        items={chips}
                        onOpen={id => { if (id === 'customer-history') setIsAuditOpen(true); }}
                    />
                )}

                <Layout>
                    <Columns>
                        <MainColumn>
                            {/* Jedyna wyniesiona karta: po historię wizyt i przychód wraca się tu najczęściej. */}
                            <Slot id="customer-visits" $order={1}>
                                <VisitsCard aria-labelledby="customer-visits-title">
                                    <CardHead>
                                        <SectionTitle id="customer-visits-title" size="lg" count={regularVisits.length || undefined}>
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
                                        label="Łączny przychód od klienta"
                                        amount={formatCurrency(lifetimeValue.grossAmount, currency)}
                                        details={customer.totalVisits > 0
                                            ? `${customer.totalVisits} ${visitsWord(customer.totalVisits)}, średnio ${formatCurrency(lifetimeValue.grossAmount / customer.totalVisits, currency)}`
                                            : 'klient nie ma jeszcze zakończonej wizyty'}
                                    />

                                    {shownVisits.length === 0 ? (
                                        <EmptyCard>Ten klient nie ma jeszcze wizyt.</EmptyCard>
                                    ) : (
                                        <RowList>
                                            {shownVisits.map(visit => {
                                                const status = visit._deleted ? { label: 'Usunięta', tone: 'danger' as const } : visitStatus(visit.status);
                                                return (
                                                    <li key={visit.id}>
                                                        <EventRow
                                                            type="button"
                                                            $muted={visit._deleted}
                                                            disabled={visit._deleted}
                                                            onClick={() => navigate(`/visits/${visit.id}`)}
                                                        >
                                                            <DateCell iso={visit.date} />
                                                            <EventText>
                                                                <strong>{visit.description || visit.type || 'Wizyta'}</strong>
                                                                <span>
                                                                    <span>{visit.vehicleName}</span>
                                                                    {visit.licensePlate && <Plate>{visit.licensePlate}</Plate>}
                                                                </span>
                                                            </EventText>
                                                            <StatusPill className="pill" $tone={status.tone}>{status.label}</StatusPill>
                                                            <Amount>{formatCurrency(visit.totalCost.grossAmount, visit.totalCost.currency)}</Amount>
                                                            <ChevronRight aria-hidden="true" />
                                                        </EventRow>
                                                    </li>
                                                );
                                            })}
                                        </RowList>
                                    )}

                                    {visits.length > VISITS_COLLAPSED ? (
                                        <CardFoot>
                                            <Button variant="ghost" size="sm" onClick={() => setShowAllVisits(v => !v)}>
                                                {showAllVisits ? 'Pokaż mniej' : `Pokaż wszystkie (${visits.length})`}
                                            </Button>
                                        </CardFoot>
                                    ) : <div style={{ height: 8 }} />}
                                </VisitsCard>
                            </Slot>

                            <Slot id="customer-upcoming" $order={4}>
                                <Panel aria-labelledby="customer-upcoming-title">
                                    <PanelHead>
                                        <SectionTitle id="customer-upcoming-title" count={upcoming.length || undefined}>Nadchodzące</SectionTitle>
                                    </PanelHead>
                                    <PanelBody>
                                        {upcoming.length === 0 ? (
                                            <Muted style={{ marginTop: 0 }}>Nic nie jest zaplanowane.</Muted>
                                        ) : (
                                            <RowList style={{ marginTop: 0 }}>
                                                {upcoming.map(r => {
                                                    const status = reservationStatus(r.status);
                                                    return (
                                                        <li key={r.id}>
                                                            <FlatRow
                                                                type="button"
                                                                aria-haspopup="menu"
                                                                onClick={e => setReservationMenu({ id: r.id, x: e.clientX, y: e.clientY })}
                                                            >
                                                                <DateCell iso={r.date} />
                                                                <EventText>
                                                                    <strong>{r.vehicleName}</strong>
                                                                    <span>
                                                                        <CalendarDays aria-hidden="true" style={{ width: 13, height: 13 }} />
                                                                        {r.licensePlate && <Plate>{r.licensePlate}</Plate>}
                                                                    </span>
                                                                </EventText>
                                                                <StatusPill className="pill" $tone={status.tone}>{status.label}</StatusPill>
                                                                <Amount>{formatCurrency(r.totalCost.grossAmount, r.totalCost.currency)}</Amount>
                                                                <ChevronRight aria-hidden="true" />
                                                            </FlatRow>
                                                        </li>
                                                    );
                                                })}
                                            </RowList>
                                        )}
                                    </PanelBody>
                                </Panel>
                            </Slot>

                            <Slot $order={6}>
                                <DocumentsManager id="customer-docs" customerId={customerId!} />
                            </Slot>

                            <Slot $order={8}>
                                <CustomerCommunicationList id="customer-comm" entries={commEntries} />
                            </Slot>

                            {/* Suma za 12 miesięcy jest nagłówkiem, słupki są dowodem pod nią. */}
                            <Slot $order={9}>
                                <Panel aria-labelledby="customer-revenue-title">
                                    <PanelHead>
                                        <SectionTitle
                                            id="customer-revenue-title"
                                            count={formatCurrency(revenueSummary?.total.grossAmount ?? 0, revenueSummary?.total.currency ?? currency)}
                                        >
                                            Przychód w ostatnich 12 miesiącach
                                        </SectionTitle>
                                    </PanelHead>
                                    <PanelBody>
                                        {monthly.length === 0 ? (
                                            <Muted style={{ marginTop: 0 }}>Brak danych o przychodzie.</Muted>
                                        ) : (
                                            <Bars aria-label="Przychód miesięcznie">
                                                {monthly.map((b, i) => (
                                                    <BarCol
                                                        key={`${b.month}-${i}`}
                                                        title={`${MONTH_LABELS[b.month - 1]}: ${formatCurrency(b.grossAmount, revenueSummary?.total.currency ?? currency)}`}
                                                    >
                                                        <Bar $h={Math.max(2, Math.round((b.grossAmount / revenueMax) * 100))} $current={i === monthly.length - 1} />
                                                        <span>{MONTH_LABELS[b.month - 1]}</span>
                                                    </BarCol>
                                                ))}
                                            </Bars>
                                        )}
                                    </PanelBody>
                                </Panel>
                            </Slot>

                            <Slot id="customer-history" $order={10}>
                                <Panel>
                                    <HistoryToggle
                                        type="button"
                                        onClick={() => setIsAuditOpen(v => !v)}
                                        aria-expanded={isAuditOpen}
                                        aria-controls="customer-history-body"
                                    >
                                        <SectionTitle as="span">Historia zmian</SectionTitle>
                                        <ChevronDown aria-hidden="true" style={{ transform: isAuditOpen ? 'rotate(180deg)' : undefined }} />
                                    </HistoryToggle>
                                    {isAuditOpen && (
                                        <PanelBody id="customer-history-body">
                                            <EntityActivityTimeline scope={{ customerId: customerId! }} />
                                        </PanelBody>
                                    )}
                                </Panel>
                            </Slot>
                        </MainColumn>

                        <Rail>
                            <Slot $order={2}>
                                <RailPanel id="customer-data" aria-labelledby="customer-data-title">
                                    <RailHead>
                                        <SectionTitle id="customer-data-title">Dane klienta</SectionTitle>
                                        <Button variant="ghost" size="sm" onClick={() => openEdit()}><Pencil />Edytuj</Button>
                                    </RailHead>
                                    <FieldList style={{ marginTop: 10 }}>
                                        <FieldRow label="Telefon">
                                            {phone ? <PiiValue value={phone} kind="phone" /> : <Faint>brak</Faint>}
                                        </FieldRow>
                                        <FieldRow label="E-mail">
                                            {customer.contact.email ? <PiiValue value={customer.contact.email} kind="email" /> : <Faint>brak</Faint>}
                                        </FieldRow>
                                        {customer.homeAddress && (
                                            <FieldRow label="Adres">
                                                <span style={{ textAlign: 'right' }}>
                                                    <PiiValue value={customer.homeAddress.street} kind="text" />
                                                    {customer.homeAddress.street && ', '}
                                                    {customer.homeAddress.postalCode} <PiiValue value={customer.homeAddress.city} kind="text" />
                                                </span>
                                            </FieldRow>
                                        )}
                                        <FieldRow label="Ostatnia wizyta">
                                            {customer.lastVisitDate ? (
                                                <span>{shortDate(customer.lastVisitDate)}<Faint>, {daysAgo(customer.lastVisitDate)}</Faint></span>
                                            ) : 'jeszcze nie było'}
                                        </FieldRow>
                                        <FieldRow label="Numer w systemie">{customer.id.slice(0, 8).toUpperCase()}</FieldRow>
                                    </FieldList>
                                    {phoneUsable && (
                                        <ContactActions>
                                            <Button
                                                size="sm"
                                                disabled={isRequestingCall}
                                                title="Telefon sparowany z kontem zadzwoni do klienta"
                                                onClick={() => requestCall(phone!, fullName)}
                                            >
                                                <Phone />Zadzwoń
                                            </Button>
                                            <Button size="sm" onClick={() => setIsSmsOpen(true)}>Wyślij SMS</Button>
                                        </ContactActions>
                                    )}
                                </RailPanel>
                            </Slot>

                            {customer.company && (
                                <Slot $order={5}>
                                    <RailPanel aria-labelledby="customer-company-title">
                                        <RailHead>
                                            <SectionTitle id="customer-company-title">Dane firmy</SectionTitle>
                                            <Button variant="ghost" size="sm" onClick={() => openEdit('company')}><Pencil />Edytuj</Button>
                                        </RailHead>
                                        <FieldList style={{ marginTop: 10 }}>
                                            <FieldRow label="Nazwa"><span style={{ textAlign: 'right' }}>{customer.company.name}</span></FieldRow>
                                            {customer.company.nip && <FieldRow label="NIP">{customer.company.nip}</FieldRow>}
                                            {customer.company.regon && <FieldRow label="REGON">{customer.company.regon}</FieldRow>}
                                            {customer.company.address?.city && (
                                                <FieldRow label="Adres">
                                                    <span style={{ textAlign: 'right' }}>
                                                        {customer.company.address.street}{customer.company.address.street && ', '}
                                                        {customer.company.address.postalCode} {customer.company.address.city}
                                                    </span>
                                                </FieldRow>
                                            )}
                                        </FieldList>
                                    </RailPanel>
                                </Slot>
                            )}

                            <Slot $order={3}>
                                <RailPanel id="customer-vehicles" aria-labelledby="customer-vehicles-title">
                                    <RailHead>
                                        <SectionTitle id="customer-vehicles-title" count={vehicles.length || undefined}>Pojazdy</SectionTitle>
                                        <RailActions>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                aria-pressed={showDeletedVehicles}
                                                onClick={() => setShowDeletedVehicles(v => !v)}
                                            >
                                                {showDeletedVehicles ? 'Ukryj usunięte' : 'Usunięte'}
                                            </Button>
                                            <Button size="sm" onClick={() => setIsAddVehicleOpen(true)}><Plus />Dodaj</Button>
                                        </RailActions>
                                    </RailHead>
                                    {vehiclesLoading ? (
                                        <Muted>Wczytywanie pojazdów...</Muted>
                                    ) : vehicles.length === 0 ? (
                                        <Muted>Klient nie ma jeszcze przypisanego pojazdu.</Muted>
                                    ) : (
                                        <VehicleList>
                                            {vehicles.map((vehicle: Vehicle) => {
                                                const archived = vehicle.status === 'archived';
                                                return (
                                                    <li key={vehicle.id}>
                                                        <VehicleLink
                                                            href={`/vehicles/${vehicle.id}`}
                                                            $muted={archived}
                                                            aria-disabled={archived || undefined}
                                                            onClick={e => { e.preventDefault(); if (!archived) navigate(`/vehicles/${vehicle.id}`); }}
                                                        >
                                                            <CarLogoImage brand={vehicle.make} size="sm" />
                                                            <VehicleText>
                                                                <strong>
                                                                    {vehicle.make} {vehicle.model}
                                                                    {archived && <StatusPill $tone="neutral">Usunięty</StatusPill>}
                                                                </strong>
                                                                <span>
                                                                    {vehicle.licensePlate && <Plate>{vehicle.licensePlate}</Plate>}
                                                                    {vehicle.year ? <span>{vehicle.year}</span> : null}
                                                                </span>
                                                            </VehicleText>
                                                            {!archived && <ChevronRight aria-hidden="true" />}
                                                        </VehicleLink>
                                                    </li>
                                                );
                                            })}
                                        </VehicleList>
                                    )}
                                </RailPanel>
                            </Slot>

                            <Slot $order={5}>
                                <CustomerNotes id="customer-notes" customerId={customerId!} />
                            </Slot>

                            <Slot $order={7}>
                                <CustomerConsentsSection id="customer-consents" customerId={customerId!} />
                            </Slot>
                        </Rail>
                    </Columns>
                </Layout>
            </ContentArea>

            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditModalInitialTab('basic'); }}
                customer={customer}
                initialTab={editModalInitialTab}
            />

            {isAddVehicleOpen && (
                <AddVehicleModal
                    customerId={customerId!}
                    customerName={isPiiMasked(fullName) ? undefined : fullName}
                    onClose={() => setIsAddVehicleOpen(false)}
                />
            )}

            {isSmsOpen && phoneUsable && (
                <SendSmsModal
                    customerId={customerId!}
                    customerName={fullName}
                    phone={phone!}
                    onClose={() => setIsSmsOpen(false)}
                />
            )}

            {reservationMenu && (
                <ReservationContextMenu
                    appointmentId={reservationMenu.id}
                    x={reservationMenu.x}
                    y={reservationMenu.y}
                    onClose={() => setReservationMenu(null)}
                />
            )}

            {/* Usunięcie = anonimizacja RODO. Komunikat mówi wprost, co znika,
                a co zostaje - „nie można cofnąć" bez tej informacji brzmiałoby
                jak skasowanie całej historii współpracy. */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={`Usunąć klienta ${fullName}?`}
                message="Dane osobowe (imię i nazwisko, kontakt, adresy) zostaną nieodwracalnie wymazane, a powiązania z pojazdami usunięte. Historia wizyt, statystyki i podpisane dokumenty zostaną zachowane - wymaga tego prawo."
                variant="danger"
                confirmText="Usuń dane klienta"
                cancelText="Anuluj"
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    // Nawigacja od razu: widok odpytuje szczegóły klienta, którego
                    // za chwilę nie będzie. Toasty mieszkają w useDeleteCustomer,
                    // więc przeżyją odmontowanie tego widoku.
                    navigate('/customers');
                    if (customerId) deleteCustomer.mutate(customerId);
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </ViewContainer>
    );
};
