// src/modules/customers/views/CustomerDetailView.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useCustomerDetail } from '../hooks/useCustomerDetail';
import { useCustomerVehicles } from '../hooks/useCustomerVehicles';
import { useCustomerVisits } from '../hooks/useCustomerVisits';
import { useUpdateConsent } from '../hooks/useUpdateConsent';
import { useUpdateNotes } from '../hooks/useUpdateNotes';
import { CustomerHeader } from '../components/CustomerHeader';
import { CustomerVisitHistory } from '../components/CustomerVisitHistory';
import { DocumentsManager } from '../components/DocumentsManager';
import { ConsentManager } from '../components/ConsentManager';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { formatCurrency } from '../utils/customerMappers';
import { formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import type { Vehicle, CommunicationLog } from '../types';

/* ─── Layout ──────────────────────────────────────────── */

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

/* ─── Metrics ─────────────────────────────────────────── */

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const MetricCard = styled.div<{ $highlight?: boolean }>`
    background: ${props => props.$highlight
        ? 'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 85%, black) 100%)'
        : 'white'
    };
    border: 1px solid ${props => props.$highlight ? 'transparent' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    ${props => props.$highlight ? `
        box-shadow: 0 4px 16px rgba(14, 165, 233, 0.25);
    ` : `
        box-shadow: ${props.theme.shadows.sm};
    `}
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: ${props => props.$highlight
            ? '0 6px 20px rgba(14, 165, 233, 0.35)'
            : props.theme.shadows.md
        };
    }
`;

const MetricIcon = styled.div<{ $highlight?: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$highlight ? 'rgba(255,255,255,0.2)' : '#f1f5f9'};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: ${props => props.$highlight ? 'white' : 'var(--brand-primary)'};
    }
`;

const MetricLabel = styled.div<{ $highlight?: boolean }>`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.$highlight ? 'rgba(255,255,255,0.8)' : props.theme.colors.textMuted};
    margin-bottom: 4px;
`;

const MetricValue = styled.div<{ $highlight?: boolean }>`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: ${props => props.$highlight ? 'white' : props.theme.colors.text};
    letter-spacing: -0.02em;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const MetricSubvalue = styled.div<{ $highlight?: boolean }>`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.$highlight ? 'rgba(255,255,255,0.7)' : props.theme.colors.textMuted};
    margin-top: 2px;
`;

/* ─── Main Content ────────────────────────────────────── */

const ContentLayout = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 360px;
    }
`;

const MainColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    min-width: 0;
`;

const Sidebar = styled.aside`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

/* ─── Secondary Tabs ─────────────────────────────────── */

const SecondarySection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const SecondaryTabBar = styled.div`
    display: flex;
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SecondaryTab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.$active ? 'white' : '#f8fafc'};
    border: none;
    border-bottom: 2px solid ${props => props.$active ? 'var(--brand-primary)' : 'transparent'};
    color: ${props => props.$active ? 'var(--brand-primary)' : props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.$active ? '600' : '500'};
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.xs};

    &:hover {
        color: ${props => props.$active ? 'var(--brand-primary)' : props.theme.colors.text};
        background: white;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const SecondaryTabContent = styled.div`
    animation: fadeSlide 0.25s ease;

    @keyframes fadeSlide {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

/* ─── Sidebar Cards ───────────────────────────────────── */

const SidebarCard = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const SidebarCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SidebarCardTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.theme.colors.textMuted};
    }
`;

const SidebarCardBadge = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-weight: 500;
`;

/* ─── Info Card ───────────────────────────────────────── */

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
`;

const InfoItem = styled.div<{ $span?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    ${props => props.$span && 'grid-column: 1 / -1;'}

    &:nth-last-child(-n+2):nth-child(odd),
    &:last-child {
        border-bottom: none;
    }
`;

const InfoLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${props => props.theme.colors.textMuted};
`;

const InfoValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

/* ─── Vehicles Card ──────────────────────────────────── */

const VehiclesList = styled.div`
    display: flex;
    flex-direction: column;
`;

const VehicleLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    text-decoration: none;
    transition: background 0.15s ease;
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #f8fafc;
    }
`;

const VehicleIcon = styled.div`
    width: 36px;
    height: 36px;
    border-radius: ${props => props.theme.radii.md};
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${props => props.theme.colors.textMuted};

    svg {
        width: 18px;
        height: 18px;
    }
`;

const VehicleInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const VehicleName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const VehicleMeta = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const VehicleArrow = styled.div`
    color: ${props => props.theme.colors.textMuted};
    flex-shrink: 0;

    svg {
        width: 16px;
        height: 16px;
    }
`;

/* ─── Communication List ─────────────────────────────── */

const CommList = styled.div`
    display: flex;
    flex-direction: column;
`;

const CommItem = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }
`;

const CommHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
    gap: ${props => props.theme.spacing.sm};
`;

const CommSubject = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const CommDate = styled.time`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
`;

const CommSummary = styled.p`
    margin: 0 0 ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.5;
`;

const CommBadges = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
`;

const CommBadge = styled.span<{ $variant?: string }>`
    display: inline-flex;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: 11px;
    font-weight: 600;

    ${props => {
        const variants: Record<string, string> = {
            email: 'background: #dbeafe; color: #1e40af;',
            sms: 'background: #fef3c7; color: #92400e;',
            phone: 'background: #dcfce7; color: #166534;',
            meeting: 'background: #f3e8ff; color: #6b21a8;',
            inbound: 'background: #dbeafe; color: #1e40af;',
            outbound: 'background: #dcfce7; color: #166534;',
        };
        return variants[props.$variant || ''] || 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const CommEmpty = styled.div`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

/* ─── Notes Card ──────────────────────────────────────── */

const NotesBody = styled.div`
    padding: ${props => props.theme.spacing.lg};
`;

const NotesText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
    white-space: pre-wrap;
`;

const NotesEmpty = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
`;

const NotesTextArea = styled.textarea`
    width: 100%;
    min-height: 100px;
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    resize: vertical;
    color: ${props => props.theme.colors.text};
    line-height: 1.6;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const NotesActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.sm};
    justify-content: flex-end;
`;

const NotesButton = styled.button<{ $primary?: boolean }>`
    padding: 6px 14px;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => props.$primary ? `
        background: var(--brand-primary);
        color: white;
        border: none;

        &:hover { opacity: 0.9; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    ` : `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 1px solid ${props.theme.colors.border};

        &:hover { background: #f8fafc; }
    `}
`;

const EditButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    color: ${props => props.theme.colors.textMuted};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }

    svg {
        width: 12px;
        height: 12px;
    }
`;

/* ─── Loading / Error ─────────────────────────────────── */

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
`;

const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid ${props => props.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ErrorContainer = styled.div`
    padding: ${props => props.theme.spacing.xxl};
    text-align: center;
`;

const ErrorTitle = styled.h2`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.xl};
    color: ${props => props.theme.colors.error};
`;

const ErrorMessage = styled.p`
    margin: 0 0 ${props => props.theme.spacing.lg};
    color: ${props => props.theme.colors.textSecondary};
`;

const RetryButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;

    &:hover { opacity: 0.9; }
`;

/* ─── Helpers ─────────────────────────────────────────── */

const commTypeLabels: Record<string, string> = {
    email: 'E-mail',
    sms: 'SMS',
    phone: 'Telefon',
    meeting: 'Spotkanie',
};

const commDirectionLabels: Record<string, string> = {
    inbound: 'Przychodzący',
    outbound: 'Wychodzący',
};

function formatAddress(address: { street: string; postalCode: string; city: string } | null): string {
    if (!address) return '—';
    return `${address.street}, ${address.postalCode} ${address.city}`;
}

/* ─── Main Component ──────────────────────────────────── */

type SecondaryTabType = 'documents' | 'communications' | 'audit';

export const CustomerDetailView = () => {
    const { customerId } = useParams<{ customerId: string }>();

    // State
    const [secondaryTab, setSecondaryTab] = useState<SecondaryTabType>('documents');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
    const [visitsPage, setVisitsPage] = useState(1);
    const visitsLimit = 50;

    // Data
    const {
        customerDetail,
        isLoading: isDetailLoading,
        isError: isDetailError,
        refetch: refetchDetail,
    } = useCustomerDetail(customerId!);

    const {
        vehicles,
        isLoading: isVehiclesLoading,
    } = useCustomerVehicles(customerId!);

    const {
        visits,
        communications,
    } = useCustomerVisits(customerId!, visitsPage, visitsLimit);

    const { updateConsent, isUpdating: isConsentUpdating } = useUpdateConsent({
        customerId: customerId!,
    });

    const { updateNotes, isUpdating: isNotesUpdating } = useUpdateNotes({
        customerId: customerId!,
        onSuccess: () => setIsEditingNotes(false),
    });

    // Reset on customer change
    useEffect(() => {
        setVisitsPage(1);
    }, [customerId]);

    // Loading state
    if (isDetailLoading) {
        return (
            <ViewContainer>
                <LoadingContainer><Spinner /></LoadingContainer>
            </ViewContainer>
        );
    }

    // Error state
    if (isDetailError || !customerDetail) {
        return (
            <ViewContainer>
                <ErrorContainer>
                    <ErrorTitle>{t.common.error}</ErrorTitle>
                    <ErrorMessage>{t.customers.error.detailLoadFailed}</ErrorMessage>
                    <RetryButton onClick={() => refetchDetail()}>
                        {t.common.retry}
                    </RetryButton>
                </ErrorContainer>
            </ViewContainer>
        );
    }

    const { customer, marketingConsents, lifetimeValue } = customerDetail;

    // Notes handlers
    const handleEditNotes = () => {
        setNotes(customer.notes);
        setIsEditingNotes(true);
    };

    const handleSaveNotes = () => {
        updateNotes({ notes });
    };

    const handleCancelNotes = () => {
        setNotes(customer.notes);
        setIsEditingNotes(false);
    };

    return (
        <ViewContainer>
            {/* ─── Header Bar ─────────────────────────────── */}
            <CustomerHeader
                data={customerDetail}
                onEditCustomer={() => setIsEditModalOpen(true)}
                onEditCompany={() => setIsEditCompanyModalOpen(true)}
            />

            {/* ─── Metrics Row ────────────────────────────── */}
            <MetricsGrid>
                <MetricCard $highlight>
                    <MetricIcon $highlight>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </MetricIcon>
                    <MetricLabel>{t.customers.detail.lastVisitDate}</MetricLabel>
                    <MetricValue>
                        {customer.lastVisitDate
                            ? formatDate(customer.lastVisitDate)
                            : '—'
                        }
                    </MetricValue>
                </MetricCard>
            </MetricsGrid>

            {/* ─── Two-Column Content ─────────────────────── */}
            <ContentLayout>
                {/* ─── Left: Visit History + Secondary Tabs ── */}
                <MainColumn>
                    <CustomerVisitHistory visits={visits} />

                    {/* Secondary Tabs: Docs / Communications / Audit */}
                    <SecondarySection>
                        <SecondaryTabBar>
                            <SecondaryTab
                                $active={secondaryTab === 'documents'}
                                onClick={() => setSecondaryTab('documents')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                Dokumenty
                            </SecondaryTab>
                            <SecondaryTab
                                $active={secondaryTab === 'communications'}
                                onClick={() => setSecondaryTab('communications')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                Komunikacja ({communications.length})
                            </SecondaryTab>
                            <SecondaryTab
                                $active={secondaryTab === 'audit'}
                                onClick={() => setSecondaryTab('audit')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                                Audyt
                            </SecondaryTab>
                        </SecondaryTabBar>

                        <SecondaryTabContent>
                            {secondaryTab === 'documents' && (
                                <DocumentsManager customerId={customerId!} />
                            )}
                            {secondaryTab === 'communications' && (
                                <CommunicationList communications={communications} />
                            )}
                            {secondaryTab === 'audit' && (
                                <CommEmpty>
                                    Historia zmian klienta pojawi się wkrótce.
                                </CommEmpty>
                            )}
                        </SecondaryTabContent>
                    </SecondarySection>
                </MainColumn>

                {/* ─── Right: Sidebar ─────────────────────── */}
                <Sidebar>
                    {/* Customer Info */}
                    <SidebarCard>
                        <SidebarCardHeader>
                            <SidebarCardTitle>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                            <InfoItem>
                                <InfoLabel>W systemie od</InfoLabel>
                                <InfoValue>{formatDate(customer.createdAt)}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>Pojazdy</InfoLabel>
                                <InfoValue>{customer.vehicleCount}</InfoValue>
                            </InfoItem>
                        </InfoGrid>
                    </SidebarCard>

                    {/* Company Info */}
                    {customer.company && (
                        <SidebarCard>
                            <SidebarCardHeader>
                                <SidebarCardTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                    <InfoValue>{customer.company.nip}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>REGON</InfoLabel>
                                    <InfoValue>{customer.company.regon}</InfoValue>
                                </InfoItem>
                                <InfoItem $span>
                                    <InfoLabel>Adres</InfoLabel>
                                    <InfoValue>{formatAddress(customer.company.address)}</InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </SidebarCard>
                    )}

                    {/* Vehicles */}
                    <SidebarCard>
                        <SidebarCardHeader>
                            <SidebarCardTitle>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                <div style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '14px' }}>
                                    Ładowanie...
                                </div>
                            ) : vehicles.length === 0 ? (
                                <div style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '14px' }}>
                                    Brak przypisanych pojazdów
                                </div>
                            ) : (
                                vehicles.map((vehicle: Vehicle) => (
                                    <VehicleLink
                                        key={vehicle.id}
                                        to={`/vehicles/${vehicle.id}`}
                                    >
                                        <VehicleIcon>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="3" width="15" height="13" />
                                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                                <circle cx="5.5" cy="18.5" r="2.5" />
                                                <circle cx="18.5" cy="18.5" r="2.5" />
                                            </svg>
                                        </VehicleIcon>
                                        <VehicleInfo>
                                            <VehicleName>{vehicle.make} {vehicle.model}</VehicleName>
                                            <VehicleMeta>
                                                {vehicle.licensePlate}
                                                {vehicle.year ? ` · ${vehicle.year}` : ''}
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

                    {/* Marketing Consents */}
                    <ConsentManager
                        consents={marketingConsents}
                        onConsentToggle={(consentId, granted) => updateConsent({ consentId, granted })}
                        isUpdating={isConsentUpdating}
                    />

                    {/* Notes */}
                    <SidebarCard>
                        <SidebarCardHeader>
                            <SidebarCardTitle>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                                Notatki
                            </SidebarCardTitle>
                            {!isEditingNotes && (
                                <EditButton onClick={handleEditNotes}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    {t.common.edit}
                                </EditButton>
                            )}
                        </SidebarCardHeader>
                        <NotesBody>
                            {isEditingNotes ? (
                                <>
                                    <NotesTextArea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Dodaj notatki..."
                                    />
                                    <NotesActions>
                                        <NotesButton onClick={handleCancelNotes}>
                                            {t.common.cancel}
                                        </NotesButton>
                                        <NotesButton
                                            $primary
                                            onClick={handleSaveNotes}
                                            disabled={isNotesUpdating}
                                        >
                                            {isNotesUpdating ? 'Zapisywanie...' : 'Zapisz'}
                                        </NotesButton>
                                    </NotesActions>
                                </>
                            ) : (
                                customer.notes ? (
                                    <NotesText>{customer.notes}</NotesText>
                                ) : (
                                    <NotesEmpty>Brak notatek. Kliknij "Edytuj" aby dodać.</NotesEmpty>
                                )
                            )}
                        </NotesBody>
                    </SidebarCard>
                </Sidebar>
            </ContentLayout>

            {/* ─── Modals ─────────────────────────────────── */}
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

/* ─── Communication List (inline) ─────────────────────── */

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
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
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
