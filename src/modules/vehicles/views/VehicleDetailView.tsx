// src/modules/vehicles/views/VehicleDetailView.tsx

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useVehicleDetail } from '../hooks/useVehicleDetail';
import { useVehicleVisits } from '../hooks/useVehicleVisits';
import { useVehicleAppointments } from '../hooks/useVehicleAppointments';
import { VehicleHeader } from '../components/VehicleHeader';
import { VehicleVisitHistory } from '../components/VehicleVisitHistory';
import { VehiclePhotoGallery } from '../components/VehiclePhotoGallery';
import { VehicleDocuments } from '../components/VehicleDocuments';
import { VehicleNotes } from '../components/VehicleNotes';
import { VehicleActivityTimeline } from '../components/VehicleActivityTimeline';
import { VehicleMiniGallery } from '../components/VehicleMiniGallery';
import { EditVehicleModal } from '../components/EditVehicleModal';
import { EditOwnersModal } from '../components/EditOwnersModal';
import { formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';
import type { VehicleOwner } from '../types';

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

/* ─── Secondary Tabs (Documents, Audit) ───────────────── */

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

/* ─── Vehicle Info Card ───────────────────────────────── */

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

/* ─── Owners Card ─────────────────────────────────────── */

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
`;

const OwnerLink = styled(Link)`
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

const OwnerAvatar = styled.div`
    width: 36px;
    height: 36px;
    border-radius: ${props => props.theme.radii.full};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 700;
    color: white;
`;

const OwnerInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const OwnerName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const OwnerRole = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const OwnerArrow = styled.div`
    color: ${props => props.theme.colors.textMuted};
    flex-shrink: 0;

    svg {
        width: 16px;
        height: 16px;
    }
`;

/* ─── Gallery Card ────────────────────────────────────── */

const GalleryCardBody = styled.div`
    height: 260px;
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

/* ─── Helper ──────────────────────────────────────────── */

const roleLabels: Record<string, string> = {
    PRIMARY: 'Właściciel',
    CO_OWNER: 'Współwłaściciel',
    COMPANY: 'Firma',
};

const engineLabels: Record<string, string> = {
    GASOLINE: 'Benzyna',
    DIESEL: 'Diesel',
    HYBRID: 'Hybryda',
    ELECTRIC: 'Elektryk',
};

const paintLabels: Record<string, string> = {
    metallic: 'Metalik',
    matte: 'Mat',
    pearl: 'Perła',
    solid: 'Akryl',
};

function getOwnerInitials(owner: VehicleOwner): string {
    return owner.customerName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/* ─── Main Component ──────────────────────────────────── */

type SecondaryTab = 'documents' | 'audit' | 'photos';

export const VehicleDetailView = () => {
    const { vehicleId } = useParams<{ vehicleId: string }>();

    // State
    const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>('documents');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditOwnersModalOpen, setIsEditOwnersModalOpen] = useState(false);

    // Data
    const {
        vehicleDetail,
        isLoading: isDetailLoading,
        isError: isDetailError,
        refetch: refetchDetail,
    } = useVehicleDetail(vehicleId!);

    const { visits } = useVehicleVisits(vehicleId!);
    const { appointments } = useVehicleAppointments(vehicleId!);

    // Loading state
    if (isDetailLoading) {
        return (
            <ViewContainer>
                <LoadingContainer><Spinner /></LoadingContainer>
            </ViewContainer>
        );
    }

    // Error state
    if (isDetailError || !vehicleDetail) {
        return (
            <ViewContainer>
                <ErrorContainer>
                    <ErrorTitle>{t.common.error}</ErrorTitle>
                    <ErrorMessage>{t.vehicles.error.detailLoadFailed}</ErrorMessage>
                    <RetryButton onClick={() => refetchDetail()}>
                        {t.common.retry}
                    </RetryButton>
                </ErrorContainer>
            </ViewContainer>
        );
    }

    const { vehicle, recentVisits, activities, photos } = vehicleDetail;

    // Safe fallbacks for stats
    const stats = vehicle.stats ?? ({} as any);
    const totalSpent = stats.totalSpent ?? { grossAmount: 0, netAmount: 0, currency: 'PLN' };
    const totalVisits = typeof stats.totalVisits === 'number' ? stats.totalVisits : 0;
    const lastVisitDate = stats.lastVisitDate ?? null;

    return (
        <ViewContainer>
            {/* ─── Header Bar ─────────────────────────────── */}
            <VehicleHeader
                vehicle={vehicle}
                onEditVehicle={() => setIsEditModalOpen(true)}
                onEditOwners={() => setIsEditOwnersModalOpen(true)}
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
                    <MetricLabel $highlight>{t.vehicles.detail.stats.totalSpent}</MetricLabel>
                    <MetricValue $highlight>
                        {formatCurrency(totalSpent.grossAmount, totalSpent.currency)}
                    </MetricValue>
                    <MetricSubvalue $highlight>
                        {formatCurrency(totalSpent.netAmount, totalSpent.currency)} netto
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
                    <MetricLabel>{t.vehicles.detail.stats.totalVisits}</MetricLabel>
                    <MetricValue>{totalVisits}</MetricValue>
                </MetricCard>

                <MetricCard>
                    <MetricIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </MetricIcon>
                    <MetricLabel>{t.vehicles.detail.stats.lastVisit}</MetricLabel>
                    <MetricValue>
                        {lastVisitDate
                            ? new Date(lastVisitDate).toLocaleDateString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                            })
                            : '—'
                        }
                    </MetricValue>
                </MetricCard>

            </MetricsGrid>

            {/* ─── Two-Column Content ─────────────────────── */}
            <ContentLayout>
                {/* ─── Left: Visit History + Secondary Tabs ── */}
                <MainColumn>
                    <VehicleVisitHistory visits={visits} appointments={appointments} />

                    {/* Secondary Tabs: Docs / Audit / Full Gallery */}
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
                                {t.vehicles.detail.documents}
                            </SecondaryTab>
                            <SecondaryTab
                                $active={secondaryTab === 'audit'}
                                onClick={() => setSecondaryTab('audit')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                                Audyt ({activities.length})
                            </SecondaryTab>
                            <SecondaryTab
                                $active={secondaryTab === 'photos'}
                                onClick={() => setSecondaryTab('photos')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                {t.vehicles.detail.photos} ({photos.length})
                            </SecondaryTab>
                        </SecondaryTabBar>

                        <SecondaryTabContent>
                            {secondaryTab === 'documents' && (
                                <VehicleDocuments vehicleId={vehicleId!} />
                            )}
                            {secondaryTab === 'audit' && (
                                <VehicleActivityTimeline activities={activities} />
                            )}
                            {secondaryTab === 'photos' && (
                                <VehiclePhotoGallery vehicleId={vehicleId!} photos={photos} />
                            )}
                        </SecondaryTabContent>
                    </SecondarySection>
                </MainColumn>

                {/* ─── Right: Sidebar ─────────────────────── */}
                <Sidebar>
                    {/* Vehicle Info */}
                    <SidebarCard>
                        <SidebarCardHeader>
                            <SidebarCardTitle>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                Dane pojazdu
                            </SidebarCardTitle>
                        </SidebarCardHeader>
                        <InfoGrid>
                            <InfoItem>
                                <InfoLabel>Kolor</InfoLabel>
                                <InfoValue>{vehicle.color || '—'}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>Lakier</InfoLabel>
                                <InfoValue>
                                    {vehicle.paintType
                                        ? (paintLabels[vehicle.paintType.toLowerCase()] || vehicle.paintType)
                                        : '—'}
                                </InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>Przebieg</InfoLabel>
                                <InfoValue>
                                    {vehicle.currentMileage
                                        ? `${vehicle.currentMileage.toLocaleString()} km`
                                        : '—'}
                                </InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>Rok produkcji</InfoLabel>
                                <InfoValue>{vehicle.yearOfProduction || '—'}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>W systemie od</InfoLabel>
                                <InfoValue>
                                    {new Date(vehicle.createdAt).toLocaleDateString('pl-PL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                    })}
                                </InfoValue>
                            </InfoItem>
                        </InfoGrid>
                    </SidebarCard>

                    {/* Owners */}
                    <SidebarCard>
                        <SidebarCardHeader>
                            <SidebarCardTitle>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                Właściciele
                            </SidebarCardTitle>
                            <SidebarCardBadge>{vehicle.owners.length}</SidebarCardBadge>
                        </SidebarCardHeader>
                        <OwnersList>
                            {vehicle.owners.length === 0 ? (
                                <div style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '14px' }}>
                                    Brak przypisanych właścicieli
                                </div>
                            ) : (
                                vehicle.owners.map(owner => (
                                    <OwnerLink
                                        key={owner.customerId}
                                        to={`/customers/${owner.customerId}`}
                                    >
                                        <OwnerAvatar>{getOwnerInitials(owner)}</OwnerAvatar>
                                        <OwnerInfo>
                                            <OwnerName>{owner.customerName}</OwnerName>
                                            <OwnerRole>
                                                {roleLabels[owner.role] || owner.role}
                                            </OwnerRole>
                                        </OwnerInfo>
                                        <OwnerArrow>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </OwnerArrow>
                                    </OwnerLink>
                                ))
                            )}
                        </OwnersList>
                    </SidebarCard>

                    {/* Notes */}
                    <VehicleNotes vehicleId={vehicleId!} />
                </Sidebar>
            </ContentLayout>

            {/* ─── Modals ─────────────────────────────────── */}
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
