// src/modules/vehicles/views/VehicleDetailView.tsx

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useVehicleDetail } from '../hooks/useVehicleDetail';
import { useUpdateVehicle } from '../hooks/useUpdateVehicle';
import { VehicleHeader } from '../components/VehicleHeader';
import { VehicleActivityTimeline } from '../components/VehicleActivityTimeline';
import { VehicleVisitHistory } from '../components/VehicleVisitHistory';
import { VehiclePhotoGallery } from '../components/VehiclePhotoGallery';
import { VehicleDocuments } from '../components/VehicleDocuments';
import { EditVehicleModal } from '../components/EditVehicleModal';
import { EditOwnersModal } from '../components/EditOwnersModal';
import { t } from '@/common/i18n';

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


const TabsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const TabsList = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.sm};
    }
`;

const TabButton = styled.button<{ $isActive: boolean }>`
    flex: 1;
    min-width: fit-content;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive
            ? 'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%)'
            : 'transparent'
    };
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.$isActive ? 'white' : props.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    box-shadow: ${props => props.$isActive ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none'};

    &:hover {
        background: ${props => props.$isActive
                ? 'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 90%, black) 100%)'
                : props.theme.colors.surfaceHover
        };
        color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const TabContent = styled.div`
    animation: fadeIn 0.3s ease;

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const ContentGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 2fr 1fr;
    }
`;

const InfoSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;
`;

const SectionEditButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    background: white;
    color: ${props => props.theme.colors.textSecondary};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: #f0f9ff;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const InfoItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const InfoLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const InfoValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    font-weight: 500;
`;

const NotesSection = styled.div`
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const NotesText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #78350f;
    line-height: 1.6;
    white-space: pre-wrap;
`;

const NotesTextArea = styled.textarea`
    width: 100%;
    min-height: 120px;
    padding: ${props => props.theme.spacing.md};
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    resize: vertical;
    background: white;
    color: #78350f;
    line-height: 1.6;

    &:focus {
        outline: none;
        border-color: #f59e0b;
    }

    &::placeholder {
        color: #d97706;
    }
`;

const SaveButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-direction: column;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
    }
`;

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
        to {
            transform: rotate(360deg);
        }
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
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }
`;

type TabValue = 'visits' | 'info' | 'photos' | 'documents' | 'audit';

export const VehicleDetailView = () => {
    const { vehicleId } = useParams<{ vehicleId: string }>();
    const [activeTab, setActiveTab] = useState<TabValue>('visits');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditOwnersModalOpen, setIsEditOwnersModalOpen] = useState(false);

    const {
        vehicleDetail,
        isLoading: isDetailLoading,
        isError: isDetailError,
        refetch: refetchDetail
    } = useVehicleDetail(vehicleId!);

    const { updateVehicle, isUpdating } = useUpdateVehicle(vehicleId!);

    if (isDetailLoading) {
        return (
            <ViewContainer>
                <LoadingContainer>
                    <Spinner />
                </LoadingContainer>
            </ViewContainer>
        );
    }

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

    const handleEditNotes = () => {
        setNotes(vehicle.technicalNotes);
        setIsEditingNotes(true);
    };

    const handleSaveNotes = () => {
        updateVehicle({ technicalNotes: notes }, {
            onSuccess: () => {
                setIsEditingNotes(false);
            },
        });
    };

    const handleCancelNotes = () => {
        setNotes(vehicle.technicalNotes);
        setIsEditingNotes(false);
    };

    return (
        <ViewContainer>
            <VehicleHeader vehicle={vehicle} photos={photos} />

            <TabsContainer>
                <TabsList>
                    <TabButton
                        $isActive={activeTab === 'visits'}
                        onClick={() => setActiveTab('visits')}
                    >
                        {t.vehicles.detail.visits} ({recentVisits.length})
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'info'}
                        onClick={() => setActiveTab('info')}
                    >
                        Informacje
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'photos'}
                        onClick={() => setActiveTab('photos')}
                    >
                        {t.vehicles.detail.photos} ({photos.length})
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'documents'}
                        onClick={() => setActiveTab('documents')}
                    >
                        {t.vehicles.detail.documents}
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'audit'}
                        onClick={() => setActiveTab('audit')}
                    >
                        Audyt ({activities.length})
                    </TabButton>
                </TabsList>

                {activeTab === 'visits' && (
                    <TabContent>
                        <VehicleVisitHistory visits={recentVisits} />
                    </TabContent>
                )}

                {activeTab === 'info' && (
                    <TabContent>
                        <ContentGrid>
                            <div>
                                <InfoSection>
                                    <SectionHeader>
                                        <SectionTitle>{t.vehicles.detail.technicalInfo.title}</SectionTitle>
                                        <SectionEditButton onClick={() => setIsEditModalOpen(true)}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                            {t.common.edit}
                                        </SectionEditButton>
                                    </SectionHeader>
                                    <InfoGrid>
                                        <InfoItem>
                                            <InfoLabel>{t.vehicles.detail.technicalInfo.licensePlate}</InfoLabel>
                                            <InfoValue>{vehicle.licensePlate}</InfoValue>
                                        </InfoItem>
                                        <InfoItem>
                                            <InfoLabel>{t.vehicles.detail.technicalInfo.brand}</InfoLabel>
                                            <InfoValue>{vehicle.brand}</InfoValue>
                                        </InfoItem>
                                        <InfoItem>
                                            <InfoLabel>{t.vehicles.detail.technicalInfo.model}</InfoLabel>
                                            <InfoValue>{vehicle.model}</InfoValue>
                                        </InfoItem>
                                        <InfoItem>
                                            <InfoLabel>{t.vehicles.detail.technicalInfo.year}</InfoLabel>
                                            <InfoValue>{vehicle.yearOfProduction}</InfoValue>
                                        </InfoItem>
                                        <InfoItem>
                                            <InfoLabel>{t.vehicles.detail.technicalInfo.color}</InfoLabel>
                                            <InfoValue>{vehicle.color}</InfoValue>
                                        </InfoItem>
                                        {vehicle.paintType && (
                                            <InfoItem>
                                                <InfoLabel>{t.vehicles.detail.technicalInfo.paintType}</InfoLabel>
                                                <InfoValue>{vehicle.paintType}</InfoValue>
                                            </InfoItem>
                                        )}
                                        {vehicle.currentMileage && (
                                            <InfoItem>
                                                <InfoLabel>{t.vehicles.detail.technicalInfo.mileage}</InfoLabel>
                                                <InfoValue>{vehicle.currentMileage.toLocaleString()} km</InfoValue>
                                            </InfoItem>
                                        )}
                                        <InfoItem>
                                            <InfoLabel>{t.vehicles.detail.technicalInfo.engineType}</InfoLabel>
                                            <InfoValue>{t.vehicles.detail.engineType[vehicle.engineType.toLowerCase()]}</InfoValue>
                                        </InfoItem>
                                    </InfoGrid>
                                </InfoSection>

                                {vehicle.technicalNotes && (
                                    <NotesSection style={{ marginTop: '24px' }}>
                                        <SectionHeader>
                                            <SectionTitle>{t.vehicles.detail.notes.title}</SectionTitle>
                                            {!isEditingNotes && (
                                                <SectionEditButton onClick={handleEditNotes}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                    {t.common.edit}
                                                </SectionEditButton>
                                            )}
                                        </SectionHeader>
                                        {isEditingNotes ? (
                                            <>
                                                <NotesTextArea
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    placeholder={t.vehicles.detail.notes.placeholder}
                                                />
                                                <ButtonGroup style={{ marginTop: '12px' }}>
                                                    <SaveButton
                                                        onClick={handleCancelNotes}
                                                        style={{ background: '#94a3b8' }}
                                                    >
                                                        {t.common.cancel}
                                                    </SaveButton>
                                                    <SaveButton
                                                        onClick={handleSaveNotes}
                                                        disabled={isUpdating}
                                                    >
                                                        {isUpdating ? 'Zapisywanie...' : t.vehicles.detail.notes.save}
                                                    </SaveButton>
                                                </ButtonGroup>
                                            </>
                                        ) : (
                                            <NotesText>{vehicle.technicalNotes}</NotesText>
                                        )}
                                    </NotesSection>
                                )}
                            </div>
                        </ContentGrid>
                    </TabContent>
                )}

                {activeTab === 'photos' && (
                    <TabContent>
                        <VehiclePhotoGallery
                            photos={photos}
                            vehicleId={vehicleId!}
                        />
                    </TabContent>
                )}

                {activeTab === 'documents' && (
                    <TabContent>
                        <VehicleDocuments vehicleId={vehicleId!} />
                    </TabContent>
                )}

                {activeTab === 'audit' && (
                    <TabContent>
                        <VehicleActivityTimeline activities={activities} />
                    </TabContent>
                )}
            </TabsContainer>

            {vehicleDetail && (
                <>
                    <EditVehicleModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        vehicle={vehicleDetail.vehicle}
                    />
                    <EditOwnersModal
                        isOpen={isEditOwnersModalOpen}
                        onClose={() => setIsEditOwnersModalOpen(false)}
                        vehicleId={vehicleId!}
                        owners={vehicleDetail.vehicle.owners}
                    />
                </>
            )}
        </ViewContainer>
    );
};
