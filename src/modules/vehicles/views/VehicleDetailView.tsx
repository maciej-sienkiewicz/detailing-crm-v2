// src/modules/vehicles/views/VehicleDetailView.tsx

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useVehicleDetail } from '../hooks/useVehicleDetail';
import { useVehicleVisits } from '../hooks/useVehicleVisits';
import { useVehicleAppointments } from '../hooks/useVehicleAppointments';
import { VehicleHeader } from '../components/VehicleHeader';
import { VehicleVisitHistory } from '../components/VehicleVisitHistory';
import { VehiclePhotoGallery } from '../components/VehiclePhotoGallery';
import { VehicleDocuments } from '../components/VehicleDocuments';
import { VehicleNotes } from '../components/VehicleNotes';
import { VehicleAuditTimeline } from '../components/VehicleAuditTimeline';
import { EditVehicleModal } from '../components/EditVehicleModal';
import { EditOwnersModal } from '../components/EditOwnersModal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { t } from '@/common/i18n';
import type { VehicleOwner } from '../types';

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

// ─── Main grid ────────────────────────────────────────────────────────────────

const MainGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: start;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 300px;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        grid-template-columns: 1fr 320px;
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
    padding: 11px 16px;
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
        width: 14px;
        height: 14px;
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
    padding: 1px 7px;
    border-radius: ${st.radiusFull};
`;

const SidebarCardAction = styled.button`
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

    &:hover { background: ${st.accentBlue}; color: white; }
    svg { width: 12px; height: 12px; }
`;

// ─── Info rows ────────────────────────────────────────────────────────────────

const InfoRow = styled.div<{ $noBorder?: boolean }>`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: ${props => props.$noBorder ? 'none' : `1px solid ${st.border}`};

    &:last-child { border-bottom: none; }
`;

const InfoLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

const InfoValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    text-align: right;
    word-break: break-word;
`;

// ─── Owners list ──────────────────────────────────────────────────────────────

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
`;

const OwnerLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    text-decoration: none;
    transition: background ${st.transition};
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bgCardAlt}; }
`;

const OwnerAvatar = styled.div`
    width: 32px;
    height: 32px;
    border-radius: ${st.radiusFull};
    background: ${st.gradientBlue};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: white;
`;

const OwnerInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const OwnerName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const OwnerRole = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const OwnerArrow = styled.div`
    color: ${st.textMuted};
    flex-shrink: 0;
    svg { width: 13px; height: 13px; }
`;

const EmptySlot = styled.div`
    padding: 14px 16px;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    text-align: center;
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

const roleLabels: Record<string, string> = {
    PRIMARY:  'Właściciel',
    CO_OWNER: 'Współwłaściciel',
    COMPANY:  'Firma',
};

const paintLabels: Record<string, string> = {
    metallic: 'Metalik',
    matte:    'Mat',
    pearl:    'Perła',
    solid:    'Akryl',
};

function getOwnerInitials(owner: VehicleOwner): string {
    return owner.customerName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const VehicleDetailView = () => {
    const { vehicleId } = useParams<{ vehicleId: string }>();

    const [isDocsOpen,   setIsDocsOpen]   = useState(true);
    const [isPhotosOpen, setIsPhotosOpen] = useState(false);
    const [isAuditOpen,  setIsAuditOpen]  = useState(false);
    const [isEditModalOpen,       setIsEditModalOpen]       = useState(false);
    const [isEditOwnersModalOpen, setIsEditOwnersModalOpen] = useState(false);

    const {
        vehicleDetail,
        isLoading,
        isError,
        refetch,
    } = useVehicleDetail(vehicleId!);

    const { visits }       = useVehicleVisits(vehicleId!);
    const { appointments } = useVehicleAppointments(vehicleId!);

    if (isLoading) {
        return (
            <ViewContainer>
                <ContentArea>
                    <LoadingContainer>
                        <Spinner />
                        <LoadingText>Ładowanie danych pojazdu...</LoadingText>
                    </LoadingContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isError || !vehicleDetail) {
        return (
            <ViewContainer>
                <ContentArea>
                    <ErrorContainer>
                        <ErrorTitle>{t.common.error}</ErrorTitle>
                        <ErrorMessage>{t.vehicles.error.detailLoadFailed}</ErrorMessage>
                        <RetryButton onClick={() => refetch()}>{t.common.retry}</RetryButton>
                    </ErrorContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    const { vehicle, photos } = vehicleDetail;

    return (
        <ViewContainer>
            {/* ─── Hero header (ze stats strip) ────────── */}
            <VehicleHeader
                vehicle={vehicle}
                onEditVehicle={() => setIsEditModalOpen(true)}
                onEditOwners={() => setIsEditOwnersModalOpen(true)}
            />

            <ContentArea>
                <MainGrid>
                    {/* ─── Left: historia + sekcje ──────────── */}
                    <MainColumn>
                        <VehicleVisitHistory visits={visits} appointments={appointments} />

                        {/* Dokumenty */}
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
                                <VehicleDocuments vehicleId={vehicleId!} />
                            </SectionBody>
                        </Section>

                        {/* Zdjęcia */}
                        <Section>
                            <SectionHeader
                                onClick={() => setIsPhotosOpen(v => !v)}
                                aria-expanded={isPhotosOpen}
                                aria-controls="photos-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                            <polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <SectionTitle>Zdjęcia</SectionTitle>
                                    {photos.length > 0 && (
                                        <SectionCount>{photos.length}</SectionCount>
                                    )}
                                </SectionHeaderLeft>
                                <ChevronIcon $open={isPhotosOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </ChevronIcon>
                            </SectionHeader>
                            <SectionBody $visible={isPhotosOpen} $flush id="photos-section">
                                <VehiclePhotoGallery vehicleId={vehicleId!} photos={photos} />
                            </SectionBody>
                        </Section>

                        {/* Historia zmian */}
                        <Section>
                            <SectionHeader
                                onClick={() => setIsAuditOpen(v => !v)}
                                aria-expanded={isAuditOpen}
                                aria-controls="audit-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconWrap $gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                    </SectionIconWrap>
                                    <SectionTitle>Historia zmian</SectionTitle>
                                </SectionHeaderLeft>
                                <ChevronIcon $open={isAuditOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </ChevronIcon>
                            </SectionHeader>
                            <SectionBody $visible={isAuditOpen} id="audit-section">
                                <VehicleAuditTimeline vehicleId={vehicleId!} />
                            </SectionBody>
                        </Section>
                    </MainColumn>

                    {/* ─── Right sidebar ────────────────────── */}
                    <SidebarColumn>
                        {/* Dane pojazdu */}
                        <SidebarCard>
                            <SidebarCardHeader>
                                <SidebarCardTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.4L19 11"/>
                                        <rect x="2" y="11" width="20" height="6" rx="1"/>
                                        <circle cx="7" cy="17" r="2"/>
                                        <circle cx="17" cy="17" r="2"/>
                                        <path d="M5 11h14"/>
                                    </svg>
                                    Dane pojazdu
                                </SidebarCardTitle>
                            </SidebarCardHeader>
                            {vehicle.color && (
                                <InfoRow>
                                    <InfoLabel>Kolor</InfoLabel>
                                    <InfoValue>{vehicle.color}</InfoValue>
                                </InfoRow>
                            )}
                            {vehicle.paintType && (
                                <InfoRow>
                                    <InfoLabel>Lakier</InfoLabel>
                                    <InfoValue>
                                        {paintLabels[vehicle.paintType.toLowerCase()] ?? vehicle.paintType}
                                    </InfoValue>
                                </InfoRow>
                            )}
                            {vehicle.currentMileage != null && (
                                <InfoRow>
                                    <InfoLabel>Przebieg</InfoLabel>
                                    <InfoValue>{vehicle.currentMileage.toLocaleString()} km</InfoValue>
                                </InfoRow>
                            )}
                            {vehicle.yearOfProduction && (
                                <InfoRow>
                                    <InfoLabel>Rok produkcji</InfoLabel>
                                    <InfoValue>{vehicle.yearOfProduction}</InfoValue>
                                </InfoRow>
                            )}
                            <InfoRow $noBorder>
                                <InfoLabel>W systemie od</InfoLabel>
                                <InfoValue>
                                    {new Date(vehicle.createdAt).toLocaleDateString('pl-PL', {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                    })}
                                </InfoValue>
                            </InfoRow>
                        </SidebarCard>

                        {/* Właściciele */}
                        <SidebarCard>
                            <SidebarCardHeader>
                                <SidebarCardTitle>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    Właściciele
                                </SidebarCardTitle>
                                <SidebarCardBadge>{vehicle.owners.length}</SidebarCardBadge>
                            </SidebarCardHeader>
                            <OwnersList>
                                {vehicle.owners.length === 0 ? (
                                    <EmptySlot>Brak przypisanych właścicieli</EmptySlot>
                                ) : (
                                    vehicle.owners.map(owner => (
                                        <OwnerLink key={owner.customerId} to={`/customers/${owner.customerId}`}>
                                            <OwnerAvatar>{getOwnerInitials(owner)}</OwnerAvatar>
                                            <OwnerInfo>
                                                <OwnerName>{owner.customerName}</OwnerName>
                                                <OwnerRole>{roleLabels[owner.role] ?? owner.role}</OwnerRole>
                                            </OwnerInfo>
                                            <OwnerArrow>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 18l6-6-6-6"/>
                                                </svg>
                                            </OwnerArrow>
                                        </OwnerLink>
                                    ))
                                )}
                            </OwnersList>
                            <div style={{ padding: '8px 16px', borderTop: `1px solid ${st.border}` }}>
                                <SidebarCardAction onClick={() => setIsEditOwnersModalOpen(true)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Zarządzaj
                                </SidebarCardAction>
                            </div>
                        </SidebarCard>

                        {/* Notatki */}
                        <VehicleNotes vehicleId={vehicleId!} />
                    </SidebarColumn>
                </MainGrid>
            </ContentArea>

            {/* ─── Modals ──────────────────────────────────── */}
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
