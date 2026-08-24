import { PiiValue, joinPiiName, isPiiMasked } from '@/common/pii';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ReservationContextMenu } from '@/common/components/ReservationContextMenu';
import styled from 'styled-components';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { useDeleteCustomer } from '../hooks/useDeleteCustomer';
import { useCustomerVehicles } from '../hooks/useCustomerVehicles';
import { useCustomerActiveData, useCustomerDeletedVisits } from '../hooks/useCustomerVisits';
import { useCustomerCommunication } from '../hooks/useCustomerCommunication';
import { useCustomerRevenue } from '../hooks/useCustomerRevenue';
import { CustomerNotes } from '../components/CustomerNotes';
import { CustomerCommunicationList } from '../components/CustomerCommunicationList';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { DocumentsManager } from '../components/DocumentsManager';
import { CustomerConsentsSection } from '../components/CustomerConsentsSection';
import { EntityActivityTimeline } from '@/modules/activity';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { AddVehicleModal } from '../components/AddVehicleModal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { MobileSectionNav, MobileSectionPanel } from '@/common/components/MobileSectionNav';
import { SendSmsModal } from '../components/SendSmsModal';
import { SharedButton } from '@/common/styles/sharedButtonStyles';
import { formatCurrency } from '../utils/customerMappers';
import { formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Vehicle, Visit, Reservation, MarketingConsent } from '../types';

import {
    ViewContainer, PageContent,
    TwoColGrid, LeftRail, MainCol,
    Panel, PanelHead, PanelTitle, PanelBody, PanelBodyFlush, PanelCountBadge, PanelLinkBtn, PanelActionBtn,
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

type CustomerMobileTab = 'visits' | 'stats' | 'other';

// ─── Local styled components ──────────────────────────────────────────────────

const AddVehicleButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1.5px solid ${st.accentBlue};
    border-radius: ${st.radiusFull};
    background: transparent;
    color: ${st.accentBlue};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlue};
        color: white;
    }

    svg { width: 12px; height: 12px; }
`;


const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-top: 1px solid ${st.bgCardAlt};
`;

const PaginationInfo = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 6px;
`;

const PaginationBtn = styled.button<{ $disabled?: boolean }>`
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid ${st.border};
  background: ${p => p.$disabled ? st.bgCardAlt : '#fff'};
  color: ${p => p.$disabled ? st.textMuted : st.text};
  font-size: 12px;
  font-weight: 500;
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  font-family: inherit;
  transition: background 140ms ease;
  &:hover:not([disabled]) { background: ${st.bgCardAlt}; }
`;

const DeletedToggleWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
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

const VehicleHeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const ArchiveToggleBtn = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1.5px solid ${p => p.$active ? '#9F1239' : '#e2e8f0'};
    background: ${p => p.$active ? '#FFF1F2' : 'transparent'};
    color: ${p => p.$active ? '#9F1239' : '#94a3b8'};
    cursor: pointer;
    transition: all 150ms ease;
    flex-shrink: 0;
    svg { width: 13px; height: 13px; }
    &:hover {
        border-color: #9F1239;
        color: #9F1239;
        background: #FFF1F2;
    }
`;

// ─── Hero header ──────────────────────────────────────────────────────────────

const HeroHeader = styled.header`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1f35 100%);
    border-radius: 16px;
    margin-bottom: 22px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 28px rgba(0,0,0,0.14);

    &::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -60px;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 60%);
        pointer-events: none;
    }

    @media (max-width: 640px) {
        border-radius: 12px;
        margin-bottom: 14px;
    }
`;

const HeroContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 22px 28px 20px;

    @media (max-width: 900px) {
        padding: 18px 20px 16px;
    }

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
        padding: 14px 16px 14px;
    }
`;

const HeroLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) {
        width: 100%;
    }
`;

const HeroAvatarLg = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: -0.3px;
    border: 2px solid rgba(255,255,255,0.12);
    box-shadow: 0 4px 16px rgba(14,165,233,0.25);
`;

const HeroNameBlock = styled.div`
    min-width: 0;
    flex: 1;
`;

const HeroName = styled.h1`
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.15;
    color: #fff;
    word-break: break-word;

    @media (max-width: 900px) { font-size: 20px; }
    @media (max-width: 640px) { font-size: 18px; letter-spacing: -0.2px; }
`;

const HeroMetaRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 13px;
    color: #94a3b8;

    @media (max-width: 640px) { gap: 8px; font-size: 12px; }
`;

const HeroMetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    svg { width: 13px; height: 13px; opacity: 0.65; flex-shrink: 0; }
`;

/**
 * Telefon i e-mail w nagłówku to nie etykiety, tylko skróty do kontaktu:
 * numer wybiera połączenie, adres otwiera nową wiadomość z wpisanym odbiorcą.
 */
const HeroMetaAction = styled(HeroMetaItem).attrs({ as: 'button', type: 'button' })`
    background: none;
    border: none;
    padding: 2px 6px;
    margin: -2px -6px;
    border-radius: ${st.radiusFull};
    font: inherit;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition}, color ${st.transition};

    &:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    &:hover svg { opacity: 1; }
`;


const HeroRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 4px;

    @media (max-width: 640px) {
        width: 100%;
        padding-top: 0;
    }
`;

const HeroPrimaryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    background: #0ea5e9;
    color: #fff;
    border: 1px solid #0ea5e9;
    box-shadow: 0 2px 8px rgba(14,165,233,0.35);
    svg { width: 15px; height: 15px; }

    &:hover {
        background: #0284c7;
        box-shadow: 0 4px 14px rgba(14,165,233,0.45);
        transform: translateY(-1px);
    }

    @media (max-width: 640px) { flex: 1; justify-content: center; padding: 11px 18px; font-size: 14px; }
`;

const HeroKebabWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

const HeroKebabBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.08);
    color: #f1f5f9;
    cursor: pointer;
    transition: background 180ms ease;
    svg { width: 4px; height: 18px; }
    &:hover { background: rgba(255,255,255,0.15); }
`;

const HeroKebabMenu = styled.div`
    position: fixed;
    min-width: 200px;
    background: #1e293b;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.45);
    z-index: 9000;
    overflow: hidden;
`;

const HeroKebabItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 140ms ease;
    color: ${p => p.$danger ? '#fca5a5' : '#e2e8f0'};

    &:last-child { border-bottom: none; }
    &:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.8; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function getInitials(firstName: string | null, lastName: string | null): string {
    if (isPiiMasked(firstName) || isPiiMasked(lastName)) return '•';
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

// ─── Main view ────────────────────────────────────────────────────────────────

export const CustomerDetailView = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();

    const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
    const [isAddVehicleOpen,  setIsAddVehicleOpen]  = useState(false);
    const [editModalInitialTab, setEditModalInitialTab] = useState<'basic' | 'address' | 'company'>('basic');
    // Karta klienta jest długa — na telefonie dzielimy ją na trzy sekcje
    // przełączane paskiem przy dolnej krawędzi, tak jak kartę wizyty.
    const [mobileTab, setMobileTab] = useState<CustomerMobileTab>('visits');
    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const deleteCustomer = useDeleteCustomer();
    const [isKebabOpen,  setIsKebabOpen]  = useState(false);
    const [kebabPos,     setKebabPos]     = useState<{ top: number; right: number } | null>(null);
    const kebabRef = useRef<HTMLDivElement>(null);

    const openKebab = () => {
        if (kebabRef.current) {
            const rect = kebabRef.current.getBoundingClientRect();
            setKebabPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setIsKebabOpen(v => !v);
    };

    useEffect(() => {
        if (!isKebabOpen) return;
        const handler = (e: MouseEvent) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setIsKebabOpen(false);
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [isKebabOpen]);

    const [isDocsOpen,             setIsDocsOpen]             = useState(false);
    const [isCommOpen,             setIsCommOpen]             = useState(false);
    const [isConsentsOpen,         setIsConsentsOpen]         = useState(false);
    const [isAuditOpen,            setIsAuditOpen]            = useState(false);
    const [reservationMenu, setReservationMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [visitsPage, setVisitsPage] = useState(0);
    const [showDeletedVisits, setShowDeletedVisits] = useState(false);
    const [showDeletedVehicles, setShowDeletedVehicles] = useState(false);

    const VISITS_PAGE_SIZE = 4;

    const { customerDetail, isLoading, isError, refetch }   = useCustomerDetail(customerId!);
    const { vehicles, isLoading: vehiclesLoading }           = useCustomerVehicles(customerId!, showDeletedVehicles);
    const { visits: regularVisits, reservations }            = useCustomerActiveData(customerId!);
    const { visits: deletedVisits }                          = useCustomerDeletedVisits(customerId!, showDeletedVisits);
    const { entries: commEntries }                           = useCustomerCommunication(customerId!);
    const { data: revenueSummary }                           = useCustomerRevenue(customerId!);

    const visits = useMemo(() => {
        const base = regularVisits.map(v => ({
            ...v,
            licensePlate: v.licensePlate || vehicles.find(vh => vh.id === v.vehicleId)?.licensePlate,
            _deleted: false,
        }));
        if (!showDeletedVisits) return base;
        const deleted = deletedVisits.map(v => ({
            ...v,
            licensePlate: v.licensePlate || vehicles.find(vh => vh.id === v.vehicleId)?.licensePlate,
            _deleted: true,
        }));
        return [...base, ...deleted].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [regularVisits, deletedVisits, vehicles, showDeletedVisits]);

    const monthlyRevenue = useMemo(
        () => revenueSummary?.buckets.map(b => b.grossAmount) ?? Array(12).fill(0),
        [revenueSummary],
    );
    const monthLabels = useMemo(
        () => revenueSummary?.buckets.map(b => MONTH_LABELS[b.month - 1]) ?? Array(12).fill(''),
        [revenueSummary],
    );
    const revenueMax = useMemo(() => Math.max(...monthlyRevenue, 1), [monthlyRevenue]);

    const activeVisit = useMemo(
        () => visits.find(v => v.status === 'in-progress' && !(v as any)._deleted),
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
    const fullName = joinPiiName(customer.firstName, customer.lastName) ?? 'Nieznany klient';
    const initials = getInitials(customer.firstName, customer.lastName);

    const visitsTotalPages = Math.ceil(visits.length / VISITS_PAGE_SIZE);
    const recentVisits = visits.slice(visitsPage * VISITS_PAGE_SIZE, (visitsPage + 1) * VISITS_PAGE_SIZE);

    return (
        <ViewContainer>
            <PageContent>

                {/* ─── Hero header ───────────────────────────────── */}
                <HeroHeader>
                    <HeroContent>
                        <HeroLeft>
                            <HeroAvatarLg aria-hidden="true">{initials}</HeroAvatarLg>
                            <HeroNameBlock>
                                <HeroName><PiiValue value={fullName} kind="name" /></HeroName>
                                <HeroMetaRow>
                                    {customer.contact.phone && (
                                        <HeroMetaAction
                                            onClick={() => { window.location.href = `tel:${customer.contact.phone!.replace(/[^+\d]/g, '')}`; }}
                                            title="Zadzwoń do klienta"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.93a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 18"/>
                                            </svg>
                                            <PiiValue value={customer.contact.phone} kind="phone" />
                                        </HeroMetaAction>
                                    )}
                                    {customer.contact.email && (
                                        <HeroMetaAction
                                            onClick={() => navigate(`/communication?compose=1&to=${encodeURIComponent(customer.contact.email!)}`)}
                                            title="Napisz wiadomość"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                                <path d="M2 7l10 7 10-7"/>
                                            </svg>
                                            <PiiValue value={customer.contact.email} kind="email" />
                                        </HeroMetaAction>
                                    )}
                                    <HeroMetaItem>
                                        ID: {customer.id.slice(0, 8).toUpperCase()}
                                    </HeroMetaItem>
                                    {customer.homeAddress && (
                                        <HeroMetaItem>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                                <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            <PiiValue value={customer.homeAddress.city} kind="text" />
                                            {customer.homeAddress.street && (
                                                <>, <PiiValue value={customer.homeAddress.street} kind="text" /></>
                                            )}
                                        </HeroMetaItem>
                                    )}
                                </HeroMetaRow>
                            </HeroNameBlock>
                        </HeroLeft>

                        <HeroRight>
                            <HeroPrimaryBtn
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                    <line x1="12" y1="14" x2="12" y2="18"/>
                                    <line x1="10" y1="16" x2="14" y2="16"/>
                                </svg>
                                Nowa wizyta
                            </HeroPrimaryBtn>

                            <HeroKebabWrap ref={kebabRef}>
                                <HeroKebabBtn onClick={openKebab} title="Więcej opcji">
                                    <svg viewBox="0 0 4 18" fill="currentColor">
                                        <circle cx="2" cy="2" r="2" />
                                        <circle cx="2" cy="9" r="2" />
                                        <circle cx="2" cy="16" r="2" />
                                    </svg>
                                </HeroKebabBtn>
                            </HeroKebabWrap>
                        </HeroRight>
                    </HeroContent>
                </HeroHeader>

                {isKebabOpen && kebabPos && createPortal(
                    <HeroKebabMenu style={{ top: kebabPos.top, right: kebabPos.right }}>
                        <HeroKebabItem onClick={() => { setIsKebabOpen(false); setIsEditModalOpen(true); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edytuj dane
                        </HeroKebabItem>
                        <HeroKebabItem
                            disabled={!customer.contact.phone}
                            title={customer.contact.phone ? undefined : 'Ten klient nie ma zapisanego numeru telefonu'}
                            onClick={() => { setIsKebabOpen(false); setIsSmsModalOpen(true); }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Wyślij SMS
                        </HeroKebabItem>
                        <HeroKebabItem $danger onClick={() => { setIsKebabOpen(false); setShowDeleteConfirm(true); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M9 6V4h6v2"/>
                            </svg>
                            Usuń klienta
                        </HeroKebabItem>
                    </HeroKebabMenu>,
                    document.body
                )}

                {/* ─── Two-column layout ─────────────────────────── */}
                <TwoColGrid>

                    {/* ── LEFT RAIL ────────────────────────────────── */}
                    <LeftRail>
                      <MobileSectionPanel $visible={mobileTab === 'other'} $desktopContents>

                        {/* Company */}
                        {customer.company && (
                            <Panel>
                                <PanelHead>
                                    <PanelTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                            <polyline points="9,22 9,12 15,12 15,22"/>
                                        </svg>
                                        Dane firmy
                                    </PanelTitle>
                                    <SharedButton
                                        $variant="ghost"
                                        $size="sm"
                                        onClick={() => {
                                            setEditModalInitialTab('company');
                                            setIsEditModalOpen(true);
                                        }}
                                    >
                                        Edytuj
                                    </SharedButton>
                                </PanelHead>
                                <PanelBody>
                                    <PrefRow>
                                        <PrefKey>Nazwa</PrefKey>
                                        <PrefVal>{customer.company.name}</PrefVal>
                                    </PrefRow>
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
                                    <PanelCountBadge>{vehicles.length}</PanelCountBadge>
                                </PanelTitle>
                                <VehicleHeaderActions>
                                    <ArchiveToggleBtn
                                        $active={showDeletedVehicles}
                                        onClick={() => setShowDeletedVehicles(v => !v)}
                                        title={showDeletedVehicles ? 'Ukryj usunięte pojazdy' : 'Pokaż usunięte pojazdy'}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"/>
                                            <path d="M19 6l-1 14H6L5 6"/>
                                            <path d="M9 6V4h6v2"/>
                                        </svg>
                                    </ArchiveToggleBtn>
                                    <AddVehicleButton onClick={() => setIsAddVehicleOpen(true)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Dodaj
                                    </AddVehicleButton>
                                </VehicleHeaderActions>
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
                                    vehicles.map((vehicle: Vehicle) => {
                                        const isDeleted = vehicle.status === 'archived';
                                        return (
                                            <VehicleItem
                                                key={vehicle.id}
                                                onClick={() => !isDeleted && navigate(`/vehicles/${vehicle.id}`)}
                                                style={{ opacity: isDeleted ? 0.5 : 1, cursor: isDeleted ? 'default' : 'pointer' }}
                                            >
                                                <CarLogoImage brand={vehicle.make} size="sm" />
                                                <VehicleInfo>
                                                    <VehicleName>
                                                        {vehicle.make} {vehicle.model}
                                                        {isDeleted && (
                                                            <StatusBadge $kind="error" style={{ marginLeft: 6, fontSize: 10 }}>
                                                                Usunięty
                                                            </StatusBadge>
                                                        )}
                                                    </VehicleName>
                                                    <VehicleSub>
                                                        {vehicle.licensePlate}
                                                        {vehicle.year ? ` · ${vehicle.year}` : ''}
                                                    </VehicleSub>
                                                </VehicleInfo>
                                            </VehicleItem>
                                        );
                                    })
                                )}
                            </PanelBodyFlush>
                        </Panel>


                        {/* Notes */}
                        <CustomerNotes customerId={customerId!} />

                      </MobileSectionPanel>
                    </LeftRail>

                    {/* ── MAIN COLUMN ──────────────────────────────── */}
                    <MainCol>

                        {/* KPI summary strip */}
                        <MobileSectionPanel $visible={mobileTab === 'stats'} $desktopContents>
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
                                        : '-'} / wizyta
                                </KpiDelta>
                            </SumCell>

                            <SumCell>
                                <KpiEyebrow>Ostatnia wizyta</KpiEyebrow>
                                <KpiValue>
                                    {customer.lastVisitDate
                                        ? formatDate(customer.lastVisitDate)
                                        : '-'}
                                </KpiValue>
                                <KpiDelta>
                                    {customer.lastVisitDate
                                        ? `${Math.floor((Date.now() - new Date(customer.lastVisitDate).getTime()) / 86400000)} dni temu`
                                        : 'Brak wizyt'}
                                </KpiDelta>
                            </SumCell>

                            {activeVisit ? (
                                <SumCellActive
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/visits/${activeVisit.id}`)}
                                >
                                    <KpiEyebrow $light>Aktywna wizyta</KpiEyebrow>
                                    <KpiValue $light>{activeVisit.vehicleName}</KpiValue>
                                    <KpiDelta $light>W trakcie · kliknij aby przejść</KpiDelta>
                                </SumCellActive>
                            ) : (
                                <SumCell>
                                    <KpiEyebrow>Pojazdy</KpiEyebrow>
                                    <KpiValue>{customer.vehicleCount}</KpiValue>
                                    <KpiDelta>zarejestrowanych</KpiDelta>
                                </SumCell>
                            )}
                        </SummaryStrip>
                        </MobileSectionPanel>

                        {/* Revenue chart + Upcoming visits */}
                        <ChartGrid>

                            {/* Revenue chart */}
                            <MobileSectionPanel $visible={mobileTab === 'stats'} $desktopContents>
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
                                                revenueSummary?.total.grossAmount ?? 0,
                                                revenueSummary?.total.currency ?? lifetimeValue.currency,
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
                                                        title={formatCurrency(val, revenueSummary?.total.currency ?? lifetimeValue.currency)}
                                                    />
                                                </ChartBarWrap>
                                                <ChartBarLabel>{monthLabels[i]}</ChartBarLabel>
                                            </ChartBarCol>
                                        ))}
                                    </ChartBars>
                                </PanelBody>
                            </Panel>
                            </MobileSectionPanel>

                            {/* Upcoming reservations */}
                            <MobileSectionPanel $visible={mobileTab === 'visits'} $desktopContents>
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
                                                <UpcomingItem
                                                    key={r.id}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={e => setReservationMenu({ id: r.id, x: e.clientX, y: e.clientY })}
                                                >
                                                    <UpcomingDateBox>
                                                        <UpcomingDateNum>{day}</UpcomingDateNum>
                                                        {month}
                                                    </UpcomingDateBox>
                                                    <UpcomingInfo>
                                                        <UpcomingTitle>{r.vehicleName}</UpcomingTitle>
                                                        <UpcomingSub>
                                                            {r.licensePlate ?? '-'}
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
                            </MobileSectionPanel>

                        </ChartGrid>

                        {/* Recent visits */}
                        <MobileSectionPanel $visible={mobileTab === 'visits'} $desktopContents>
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
                                {visits.length > 0 && (
                                    <PanelCountBadge>{visits.length}</PanelCountBadge>
                                )}
                                <DeletedToggleWrap>
                                    <DeletedToggleLabel>Wyświetl usunięte</DeletedToggleLabel>
                                    <ToggleSwitch
                                        $active={showDeletedVisits}
                                        onClick={() => { setShowDeletedVisits(v => !v); setVisitsPage(0); }}
                                        title={showDeletedVisits ? 'Pokaż aktywne wizyty' : 'Pokaż usunięte wizyty'}
                                    >
                                        <ToggleThumb $active={showDeletedVisits} />
                                    </ToggleSwitch>
                                </DeletedToggleWrap>
                            </PanelHead>
                            <PanelBodyFlush>
                                {visits.length === 0 ? (
                                    <PanelBody>
                                        <NoteText>Brak historii wizyt.</NoteText>
                                    </PanelBody>
                                ) : (
                                    recentVisits.map((visit: Visit & { licensePlate?: string; _deleted?: boolean }) => {
                                        const d = new Date(visit.date);
                                        const isDeleted = !!visit._deleted;
                                        const { label, kind } = isDeleted
                                            ? { label: 'Usunięta', kind: 'error' as const }
                                            : visitStatusBadge(visit.status);
                                        return (
                                            <VisitRow
                                                key={visit.id}
                                                $active={!isDeleted && visit.status === 'in-progress'}
                                                onClick={() => !isDeleted && navigate(`/visits/${visit.id}`)}
                                                style={isDeleted ? { opacity: 0.4, cursor: 'default' } : undefined}
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
                            {visitsTotalPages > 1 && (
                                <PaginationBar>
                                    <PaginationInfo>
                                        {visitsPage * VISITS_PAGE_SIZE + 1}-{Math.min((visitsPage + 1) * VISITS_PAGE_SIZE, visits.length)} z {visits.length}
                                    </PaginationInfo>
                                    <PaginationBtns>
                                        <PaginationBtn
                                            $disabled={visitsPage === 0}
                                            disabled={visitsPage === 0}
                                            onClick={() => setVisitsPage(p => p - 1)}
                                        >
                                            ← Poprzednie
                                        </PaginationBtn>
                                        <PaginationBtn
                                            $disabled={visitsPage >= visitsTotalPages - 1}
                                            disabled={visitsPage >= visitsTotalPages - 1}
                                            onClick={() => setVisitsPage(p => p + 1)}
                                        >
                                            Następne →
                                        </PaginationBtn>
                                    </PaginationBtns>
                                </PaginationBar>
                            )}
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

                        {/* Consents */}
                        <CollapsibleSection>
                            <CollapsibleHeader
                                onClick={() => setIsConsentsOpen(v => !v)}
                                aria-expanded={isConsentsOpen}
                                aria-controls="consents-section"
                            >
                                <CollapsibleHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <CollapsibleTitle>Zgody klienta</CollapsibleTitle>
                                </CollapsibleHeaderLeft>
                                <ChevronIcon $open={isConsentsOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </ChevronIcon>
                            </CollapsibleHeader>
                            <CollapsibleBody $visible={isConsentsOpen} $flush id="consents-section">
                                <CustomerConsentsSection customerId={customerId!} noCard />
                            </CollapsibleBody>
                        </CollapsibleSection>
                        </MobileSectionPanel>

                        <MobileSectionPanel $visible={mobileTab === 'other'} $desktopContents>
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
                                <CustomerCommunicationList entries={commEntries} />
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
                                <EntityActivityTimeline scope={{ customerId: customerId! }} />
                            </CollapsibleBody>
                        </CollapsibleSection>
                        </MobileSectionPanel>

                    </MainCol>
                </TwoColGrid>
            </PageContent>

            {/* ─── Modals ─────────────────────────────────────── */}
            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditModalInitialTab('basic'); }}
                customer={customer}
                initialTab={editModalInitialTab}
            />

            {isAddVehicleOpen && (
                <AddVehicleModal
                    customerId={customerId!}
                    onClose={() => setIsAddVehicleOpen(false)}
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

            {isSmsModalOpen && customer.contact.phone && (
                <SendSmsModal
                    customerId={customerId!}
                    customerName={fullName}
                    phone={customer.contact.phone}
                    onClose={() => setIsSmsModalOpen(false)}
                />
            )}

            <MobileSectionNav
                ariaLabel="Nawigacja sekcji klienta"
                active={mobileTab}
                onChange={setMobileTab}
                items={[
                    {
                        key: 'visits', label: 'Wizyty', ariaLabel: 'Wizyty, dokumenty i zgody', icon: (
                            <>
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </>
                        ),
                    },
                    {
                        key: 'stats', label: 'Statystyki', icon: (
                            <>
                                <line x1="18" y1="20" x2="18" y2="10"/>
                                <line x1="12" y1="20" x2="12" y2="4"/>
                                <line x1="6" y1="20" x2="6" y2="14"/>
                            </>
                        ),
                    },
                    {
                        key: 'other', label: 'Inne', ariaLabel: 'Dane, pojazdy, notatki i historia', icon: (
                            <>
                                <circle cx="12" cy="12" r="1.6"/>
                                <circle cx="5" cy="12" r="1.6"/>
                                <circle cx="19" cy="12" r="1.6"/>
                            </>
                        ),
                    },
                ]}
            />

            {/* Usunięcie = anonimizacja RODO. Komunikat mówi wprost, co znika,
                a co zostaje — „nie można cofnąć" bez tej informacji brzmiałoby
                jak skasowanie całej historii współpracy. */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={`Usunąć klienta ${fullName}?`}
                message="Dane osobowe (imię i nazwisko, kontakt, adresy) zostaną nieodwracalnie wymazane, a powiązania z pojazdami usunięte. Historia wizyt, statystyki i podpisane dokumenty zostaną zachowane — wymaga tego prawo."
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
