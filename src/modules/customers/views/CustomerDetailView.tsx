// src/modules/customers/views/CustomerDetailView.tsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { useCustomerVehicles } from '../hooks/useCustomerVehicles';
import { useCustomerVisits } from '../hooks/useCustomerVisits';
import { useCustomerReservations } from '../hooks/useCustomerReservations';
import { useUpdateConsent } from '../hooks/useUpdateConsent';
import { CustomerHeader } from '../components/CustomerHeader';
import { CustomerVisitHistory } from '../components/CustomerVisitHistory';
import { DocumentsManager } from '../components/DocumentsManager';
import { ConsentManager } from '../components/ConsentManager';
import { CustomerNotes } from '../components/CustomerNotes';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { AuditTimeline } from '@/common/components/AuditTimeline';
import { formatCurrency } from '../utils/customerMappers';
import { formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Vehicle, CommunicationLog } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: ${st.bg};
    animation: ${fadeIn} 0.3s ease both;
`;

const ContentArea = styled.div`
    flex: 1;
    padding: 20px 24px 40px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 24px 32px 48px;
    }
`;

// ─── Metrics ──────────────────────────────────────────────────────────────────

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 20px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
    }
`;

const MetricCard = styled.div<{ $highlight?: boolean }>`
    background: ${props => props.$highlight ? st.gradientBlue : st.bgCard};
    border: 1px solid ${props => props.$highlight ? 'transparent' : st.border};
    border-radius: ${st.radius};
    padding: 18px 20px;
    box-shadow: ${props => props.$highlight
        ? '0 4px 16px rgba(59, 130, 246, 0.25)'
        : st.shadowSm};
    transition: transform ${st.transition}, box-shadow ${st.transition};

    &:hover {
        transform: translateY(-2px);
        box-shadow: ${props => props.$highlight
            ? '0 6px 20px rgba(59, 130, 246, 0.35)'
            : st.shadowMd};
    }
`;

const MetricIcon = styled.div<{ $highlight?: boolean }>`
    width: 36px;
    height: 36px;
    border-radius: ${st.radiusSm};
    background: ${props => props.$highlight ? 'rgba(255,255,255,0.2)' : st.bgCardAlt};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;

    svg {
        width: 18px;
        height: 18px;
        color: ${props => props.$highlight ? 'white' : st.accentBlue};
    }
`;

const MetricLabel = styled.div<{ $highlight?: boolean }>`
    font-size: ${st.fontXs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.$highlight ? 'rgba(255,255,255,0.75)' : st.textMuted};
    margin-bottom: 4px;
`;

const MetricValue = styled.div<{ $highlight?: boolean }>`
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${props => props.$highlight ? 'white' : st.text};
    letter-spacing: -0.02em;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${st.fontLg};
    }
`;

const MetricSubvalue = styled.div<{ $highlight?: boolean }>`
    font-size: ${st.fontXs};
    color: ${props => props.$highlight ? 'rgba(255,255,255,0.65)' : st.textMuted};
    margin-top: 2px;
`;

// ─── Main grid ────────────────────────────────────────────────────────────────

const MainGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: start;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 320px;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        grid-template-columns: 1fr 340px;
    }
`;

const MainColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const SidebarColumn = styled.aside`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

// ─── Collapsible section ──────────────────────────────────────────────────────

const Section = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const SectionHeader = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: ${st.bg};
    border: none;
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};
    text-align: left;

    &:hover { background: ${st.bgCardAlt}; }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const SectionIconWrap = styled.div<{ $gradient?: string }>`
    width: 30px;
    height: 30px;
    border-radius: ${st.radiusSm};
    background: ${props => props.$gradient || st.gradientBlue};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const SectionTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const SectionCount = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    padding: 1px 8px;
    border-radius: ${st.radiusFull};
`;

const ChevronIcon = styled.svg<{ $open: boolean }>`
    width: 16px;
    height: 16px;
    color: ${st.textMuted};
    transition: transform 250ms ease;
    transform: ${props => props.$open ? 'rotate(180deg)' : 'rotate(0deg)'};
    flex-shrink: 0;
`;

const SectionBody = styled.div<{ $visible: boolean; $flush?: boolean }>`
    display: ${props => props.$visible ? 'block' : 'none'};
    padding: ${props => props.$flush ? '0' : '20px'};
    animation: ${fadeUp} 0.2s ease;
`;

// ─── Sidebar cards ────────────────────────────────────────────────────────────

const SidebarCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const SidebarCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 18px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const SidebarCardTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
        width: 15px;
        height: 15px;
        color: ${st.accentBlue};
        flex-shrink: 0;
    }
`;

const SidebarCardBadge = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    padding: 1px 8px;
    border-radius: ${st.radiusFull};
`;

// ─── Info grid ────────────────────────────────────────────────────────────────

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
`;

const InfoItem = styled.div<{ $span?: boolean; $noBorder?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 18px;
    border-bottom: ${props => props.$noBorder ? 'none' : `1px solid ${st.border}`};
    ${props => props.$span && 'grid-column: 1 / -1;'}

    &:last-child {
        border-bottom: none;
    }
`;

const InfoLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${st.textMuted};
`;

const InfoValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
`;

// ─── Vehicles list ────────────────────────────────────────────────────────────

const VehiclesList = styled.div`
    display: flex;
    flex-direction: column;
`;

const VehicleLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 18px;
    text-decoration: none;
    transition: background ${st.transition};
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bgCardAlt}; }
`;

const VehicleIcon = styled.div`
    width: 34px;
    height: 34px;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${st.textMuted};

    svg { width: 16px; height: 16px; }
`;

const VehicleInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const VehicleName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const VehicleMeta = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const VehicleArrow = styled.div`
    color: ${st.textMuted};
    flex-shrink: 0;
    svg { width: 14px; height: 14px; }
`;

// ─── Communication list ───────────────────────────────────────────────────────

const CommList = styled.div`
    display: flex;
    flex-direction: column;
`;

const CommItem = styled.div`
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }
`;

const CommHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
    gap: 12px;
`;

const CommSubject = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const CommDate = styled.time`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    flex-shrink: 0;
`;

const CommSummary = styled.p`
    margin: 0 0 8px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

const CommBadges = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const CommBadge = styled.span<{ $variant?: string }>`
    display: inline-flex;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;

    ${props => {
        const variants: Record<string, string> = {
            email:    `background: ${st.accentBlueDim}; color: ${st.accentBlue};`,
            sms:      `background: ${st.accentAmberDim}; color: ${st.accentAmber};`,
            phone:    `background: ${st.accentGreenDim}; color: ${st.accentGreen};`,
            meeting:  'background: rgba(139,92,246,0.12); color: #7c3aed;',
            inbound:  `background: ${st.accentBlueDim}; color: ${st.accentBlue};`,
            outbound: `background: ${st.accentGreenDim}; color: ${st.accentGreen};`,
        };
        return variants[props.$variant || ''] || `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
    }}
`;

const CommEmpty = styled.div`
    padding: 32px 20px;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Loading / Error ──────────────────────────────────────────────────────────

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 16px;
`;

const Spinner = styled.div`
    width: 38px;
    height: 38px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const LoadingText = styled.p`
    margin: 0;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const ErrorContainer = styled.div`
    padding: 48px 32px;
    text-align: center;
`;

const ErrorTitle = styled.h2`
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: ${st.accentRed};
`;

const ErrorMessage = styled.p`
    margin: 0 0 20px;
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
`;

const RetryButton = styled.button`
    padding: 9px 22px;
    background: ${st.accentBlue};
    color: white;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${st.shadowSm};
    &:hover { background: #2563EB; box-shadow: ${st.shadowMd}; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const commTypeLabels: Record<string, string> = {
    email:   'E-mail',
    sms:     'SMS',
    phone:   'Telefon',
    meeting: 'Spotkanie',
};

const commDirectionLabels: Record<string, string> = {
    inbound:  'Przychodzący',
    outbound: 'Wychodzący',
};

function formatAddress(address: { street: string; postalCode: string; city: string } | null): string {
    if (!address) return '—';
    return `${address.street}, ${address.postalCode} ${address.city}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CustomerDetailView = () => {
    const { customerId } = useParams<{ customerId: string }>();

    const [isEditModalOpen, setIsEditModalOpen]          = useState(false);
    const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen]                    = useState(true);
    const [isCommOpen, setIsCommOpen]                    = useState(false);
    const [isAuditOpen, setIsAuditOpen]                  = useState(false);
    const [visitsPage, setVisitsPage]                    = useState(1);
    const visitsLimit = 50;

    const { customerDetail, isLoading, isError, refetch } = useCustomerDetail(customerId!);
    const { vehicles, isLoading: isVehiclesLoading }      = useCustomerVehicles(customerId!);
    const { visits: rawVisits, communications }            = useCustomerVisits(customerId!, visitsPage, visitsLimit);
    const { reservations }                                 = useCustomerReservations(customerId!);
    const { updateConsent, isUpdating: isConsentUpdating } = useUpdateConsent({ customerId: customerId! });

    const visits = useMemo(() => rawVisits.map(v => ({
        ...v,
        licensePlate: v.licensePlate || vehicles.find(vh => vh.id === v.vehicleId)?.licensePlate,
    })), [rawVisits, vehicles]);

    useEffect(() => { setVisitsPage(1); }, [customerId]);

    if (isLoading) {
        return (
            <ViewContainer>
                <ContentArea>
                    <LoadingContainer>
                        <Spinner />
                        <LoadingText>Ładowanie danych klienta...</LoadingText>
                    </LoadingContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isError || !customerDetail) {
        return (
            <ViewContainer>
                <ContentArea>
                    <ErrorContainer>
                        <ErrorTitle>{t.common.error}</ErrorTitle>
                        <ErrorMessage>{t.customers.error.detailLoadFailed}</ErrorMessage>
                        <RetryButton onClick={() => refetch()}>{t.common.retry}</RetryButton>
                    </ErrorContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    const { customer, marketingConsents, lifetimeValue } = customerDetail;

    return (
        <ViewContainer>
            {/* ─── Hero header ────────────────────────────── */}
            <CustomerHeader
                data={customerDetail}
                onEditCustomer={() => setIsEditModalOpen(true)}
                onEditCompany={() => setIsEditCompanyModalOpen(true)}
            />

            <ContentArea>
                {/* ─── Metrics row ────────────────────────── */}
                <MetricsGrid>
                    <MetricCard $highlight>
                        <MetricIcon $highlight>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </MetricIcon>
                        <MetricLabel $highlight>{t.customers.detail.totalRevenue}</MetricLabel>
                        <MetricValue $highlight>
                            {formatCurrency(lifetimeValue.grossAmount, lifetimeValue.currency)}
                        </MetricValue>
                        <MetricSubvalue $highlight>
                            {formatCurrency(lifetimeValue.netAmount, lifetimeValue.currency)} netto
                        </MetricSubvalue>
                    </MetricCard>

                    <MetricCard>
                        <MetricIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </MetricIcon>
                        <MetricLabel>{t.customers.detail.numberOfVisits}</MetricLabel>
                        <MetricValue>{customer.totalVisits}</MetricValue>
                    </MetricCard>

                    <MetricCard>
                        <MetricIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </MetricIcon>
                        <MetricLabel>{t.customers.detail.lastVisitDate}</MetricLabel>
                        <MetricValue>
                            {customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '—'}
                        </MetricValue>
                    </MetricCard>
                </MetricsGrid>

                {/* ─── Two-column layout ──────────────────── */}
                <MainGrid>
                    {/* ─── Left column ────────────────────── */}
                    <MainColumn>
                        <CustomerVisitHistory visits={visits} reservations={reservations} />

                        {/* Dokumenty ─────────────────────────── */}
                        <Section>
                            <SectionHeader
                                onClick={() => setIsDocsOpen(v => !v)}
                                aria-expanded={isDocsOpen}
                                aria-controls="docs-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconWrap>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <SectionTitle>Dokumenty</SectionTitle>
                                </SectionHeaderLeft>
                                <ChevronIcon $open={isDocsOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </ChevronIcon>
                            </SectionHeader>
                            <SectionBody $visible={isDocsOpen} $flush id="docs-section">
                                <DocumentsManager customerId={customerId!} />
                            </SectionBody>
                        </Section>

                        {/* Komunikacja ────────────────────────── */}
                        <Section>
                            <SectionHeader
                                onClick={() => setIsCommOpen(v => !v)}
                                aria-expanded={isCommOpen}
                                aria-controls="comm-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M2 7l10 7 10-7" />
                                        </svg>
                                    </SectionIconWrap>
                                    <SectionTitle>Komunikacja</SectionTitle>
                                    {communications.length > 0 && (
                                        <SectionCount>{communications.length}</SectionCount>
                                    )}
                                </SectionHeaderLeft>
                                <ChevronIcon $open={isCommOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </ChevronIcon>
                            </SectionHeader>
                            <SectionBody $visible={isCommOpen} $flush id="comm-section">
                                <CommunicationList communications={communications} />
                            </SectionBody>
                        </Section>

                        {/* Historia zmian ─────────────────────── */}
                        <Section>
                            <SectionHeader
                                onClick={() => setIsAuditOpen(v => !v)}
                                aria-expanded={isAuditOpen}
                                aria-controls="audit-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </SectionIconWrap>
                                    <SectionTitle>Historia zmian</SectionTitle>
                                </SectionHeaderLeft>
                                <ChevronIcon $open={isAuditOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </ChevronIcon>
                            </SectionHeader>
                            <SectionBody $visible={isAuditOpen} id="audit-section">
                                <AuditTimeline module="CUSTOMER" entityId={customerId!} />
                            </SectionBody>
                        </Section>
                    </MainColumn>

                    {/* ─── Right sidebar ──────────────────── */}
                    <SidebarColumn>
                        {/* Dane klienta */}
                        <SidebarCard>
                            <SidebarCardHeader>
                                <SidebarCardTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    Dane klienta
                                </SidebarCardTitle>
                            </SidebarCardHeader>
                            <InfoGrid>
                                <InfoItem $span>
                                    <InfoLabel>Imię i nazwisko</InfoLabel>
                                    <InfoValue>
                                        {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'}
                                    </InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>E-mail</InfoLabel>
                                    <InfoValue>{customer.contact.email || '—'}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>Telefon</InfoLabel>
                                    <InfoValue>{customer.contact.phone || '—'}</InfoValue>
                                </InfoItem>
                                {customer.homeAddress && (
                                    <InfoItem $span>
                                        <InfoLabel>Adres</InfoLabel>
                                        <InfoValue>{formatAddress(customer.homeAddress)}</InfoValue>
                                    </InfoItem>
                                )}
                                <InfoItem $noBorder>
                                    <InfoLabel>W systemie od</InfoLabel>
                                    <InfoValue>{formatDate(customer.createdAt)}</InfoValue>
                                </InfoItem>
                                <InfoItem $noBorder>
                                    <InfoLabel>Pojazdy</InfoLabel>
                                    <InfoValue>{customer.vehicleCount}</InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </SidebarCard>

                        {/* Firma */}
                        {customer.company && (
                            <SidebarCard>
                                <SidebarCardHeader>
                                    <SidebarCardTitle>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                            <polyline points="9,22 9,12 15,12 15,22"/>
                                        </svg>
                                        Firma
                                    </SidebarCardTitle>
                                </SidebarCardHeader>
                                <InfoGrid>
                                    <InfoItem $span>
                                        <InfoLabel>Nazwa</InfoLabel>
                                        <InfoValue>{customer.company.name}</InfoValue>
                                    </InfoItem>
                                    <InfoItem>
                                        <InfoLabel>NIP</InfoLabel>
                                        <InfoValue>{customer.company.nip || '—'}</InfoValue>
                                    </InfoItem>
                                    <InfoItem>
                                        <InfoLabel>REGON</InfoLabel>
                                        <InfoValue>{customer.company.regon || '—'}</InfoValue>
                                    </InfoItem>
                                    {customer.company.address && (
                                        <InfoItem $span $noBorder>
                                            <InfoLabel>Adres</InfoLabel>
                                            <InfoValue>{formatAddress(customer.company.address)}</InfoValue>
                                        </InfoItem>
                                    )}
                                </InfoGrid>
                            </SidebarCard>
                        )}

                        {/* Pojazdy */}
                        <SidebarCard>
                            <SidebarCardHeader>
                                <SidebarCardTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="3" width="15" height="13" />
                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                        <circle cx="5.5" cy="18.5" r="2.5" />
                                        <circle cx="18.5" cy="18.5" r="2.5" />
                                    </svg>
                                    Pojazdy
                                </SidebarCardTitle>
                                <SidebarCardBadge>{vehicles.length}</SidebarCardBadge>
                            </SidebarCardHeader>
                            <VehiclesList>
                                {isVehiclesLoading ? (
                                    <InfoItem $noBorder>
                                        <InfoValue style={{ color: st.textMuted }}>Ładowanie...</InfoValue>
                                    </InfoItem>
                                ) : vehicles.length === 0 ? (
                                    <InfoItem $noBorder>
                                        <InfoValue style={{ color: st.textMuted }}>Brak przypisanych pojazdów</InfoValue>
                                    </InfoItem>
                                ) : (
                                    vehicles.map((vehicle: Vehicle) => (
                                        <VehicleLink key={vehicle.id} to={`/vehicles/${vehicle.id}`}>
                                            <VehicleIcon>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="1" y="3" width="15" height="13" />
                                                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                                    <circle cx="5.5" cy="18.5" r="2.5" />
                                                    <circle cx="18.5" cy="18.5" r="2.5" />
                                                </svg>
                                            </VehicleIcon>
                                            <VehicleInfo>
                                                <VehicleName>{vehicle.make} {vehicle.model}</VehicleName>
                                                <VehicleMeta>
                                                    {vehicle.licensePlate}{vehicle.year ? ` · ${vehicle.year}` : ''}
                                                </VehicleMeta>
                                            </VehicleInfo>
                                            <VehicleArrow>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 18l6-6-6-6" />
                                                </svg>
                                            </VehicleArrow>
                                        </VehicleLink>
                                    ))
                                )}
                            </VehiclesList>
                        </SidebarCard>

                        {/* Zgody marketingowe */}
                        {marketingConsents && marketingConsents.length > 0 && (
                            <ConsentManager
                                consents={marketingConsents}
                                onConsentToggle={(id, granted) => updateConsent({ consentId: id, granted })}
                                isUpdating={isConsentUpdating}
                            />
                        )}

                        {/* Notatki */}
                        <CustomerNotes customerId={customerId!} />
                    </SidebarColumn>
                </MainGrid>
            </ContentArea>

            {/* ─── Modals ──────────────────────────────────── */}
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

// ─── Communication List (inline) ──────────────────────────────────────────────

function CommunicationList({ communications }: { communications: CommunicationLog[] }) {
    if (communications.length === 0) {
        return <CommEmpty>Brak historii komunikacji z klientem.</CommEmpty>;
    }

    const sorted = [...communications].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <CommList>
            {sorted.map(comm => (
                <CommItem key={comm.id}>
                    <CommHeader>
                        <CommSubject>{comm.subject}</CommSubject>
                        <CommDate>
                            {new Date(comm.date).toLocaleDateString('pl-PL', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </CommDate>
                    </CommHeader>
                    <CommSummary>{comm.summary}</CommSummary>
                    <CommBadges>
                        <CommBadge $variant={comm.type}>
                            {commTypeLabels[comm.type] || comm.type}
                        </CommBadge>
                        <CommBadge $variant={comm.direction}>
                            {commDirectionLabels[comm.direction] || comm.direction}
                        </CommBadge>
                    </CommBadges>
                </CommItem>
            ))}
        </CommList>
    );
}
