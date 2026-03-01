import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useVisitDetail, useVisitDocuments, useVisitPhotos } from '../hooks';
import { useUpdateVisit } from '../hooks';
import { useUploadDocument, useUploadPhoto, useDeleteDocument, useDeletePhoto } from '../hooks';
import { useVisitComments } from '../hooks';
import { useUpdateServiceStatus, useSaveServicesChanges } from '../hooks';
import { VisitHeader } from '../components/VisitHeader';
import { StatusStepper } from '../components/StatusStepper';
import { VehicleInfoCard, CustomerInfoCard } from '../components/InfoCards';
import { TechnicalNotesCard } from '../components/TechnicalNotesCard';
import { ServicesTable } from '../components/ServicesTable';
import { DocumentGallery } from '../components/DocumentGallery';
import { VisitComments } from '../components/VisitComments';
import { EditServicesModal } from '../components/EditServicesModal';
import { InProgressToReadyWizard, ReadyToCompletedWizard } from '../components/transitions/TransitionWizards';
import type { DocumentType, ServiceStatus } from '../types';
import { useToast } from "@/common/components/Toast";
import { AuditTimeline } from '@/common/components/AuditTimeline';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Animations ───────────────────────────────────────────────────────────────

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
`;

const ContentArea = styled.div`
    flex: 1;
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 28px 32px;
    }
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabsRow = styled.div`
    display: flex;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 4px;
    margin-bottom: 20px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    box-shadow: ${st.shadowXs};
`;

const TabButton = styled.button<{ $isActive: boolean }>`
    padding: 8px 20px;
    font-size: ${st.fontSm};
    font-weight: ${props => props.$isActive ? 600 : 400};
    color: ${props => props.$isActive ? st.accentBlue : st.textSecondary};
    background: ${props => props.$isActive ? st.accentBlueDim : 'transparent'};
    border: 1px solid ${props => props.$isActive ? `${st.accentBlue}33` : 'transparent'};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    white-space: nowrap;
    transition: all ${st.transition};
    flex-shrink: 0;

    &:hover {
        color: ${props => props.$isActive ? st.accentBlue : st.text};
        background: ${props => props.$isActive ? st.accentBlueDim : st.bg};
    }
`;

const TabContent = styled.div`
    animation: ${fadeUp} 0.25s ease;
`;

// ─── Grid layouts ─────────────────────────────────────────────────────────────

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 20px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const ServicesAndCommentsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 20px;
    align-items: start;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 2fr 1fr;
    }
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
    width: 40px;
    height: 40px;
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
    padding: 9px 20px;
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

// ─── Types ────────────────────────────────────────────────────────────────────

type TabValue = 'overview' | 'documentation' | 'audit';

// ─── View ─────────────────────────────────────────────────────────────────────

export const VisitDetailView = () => {
    const { visitId } = useParams<{ visitId: string }>();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabValue>('overview');
    const [isTransitionWizardOpen, setIsTransitionWizardOpen] = useState(false);
    const [transitionType, setTransitionType] = useState<'in_progress_to_ready' | 'ready_to_completed' | null>(null);
    const [isEditServicesModalOpen, setIsEditServicesModalOpen] = useState(false);

    const { visitDetail, isLoading, isError, refetch } = useVisitDetail(visitId!);
    const { documents } = useVisitDocuments(visitId!);
    const { photos: visitPhotos, isLoading: isLoadingPhotos } = useVisitPhotos(visitId!);
    const { updateVisit } = useUpdateVisit(visitId!);
    const { uploadDocument, isUploading } = useUploadDocument(visitId!);
    const { uploadPhoto, isUploading: isUploadingPhoto } = useUploadPhoto(visitId!);
    const { deleteDocument } = useDeleteDocument(visitId!);
    const { deletePhoto } = useDeletePhoto(visitId!);
    const { comments, isLoading: isLoadingComments } = useVisitComments(visitId!);
    const { updateServiceStatus } = useUpdateServiceStatus(visitId!);
    const { saveServicesChanges, isSaving } = useSaveServicesChanges(visitId!);
    const { showSuccess } = useToast();

    if (isLoading) {
        return (
            <ViewContainer>
                <ContentArea>
                    <LoadingContainer>
                        <Spinner />
                        <LoadingText>Ładowanie szczegółów wizyty...</LoadingText>
                    </LoadingContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    if (isError || !visitDetail) {
        return (
            <ViewContainer>
                <ContentArea>
                    <ErrorContainer>
                        <ErrorTitle>Błąd ładowania</ErrorTitle>
                        <ErrorMessage>
                            Nie udało się załadować szczegółów wizyty. Spróbuj ponownie.
                        </ErrorMessage>
                        <RetryButton onClick={() => refetch()}>
                            Spróbuj ponownie
                        </RetryButton>
                    </ErrorContainer>
                </ContentArea>
            </ViewContainer>
        );
    }

    const { visit } = visitDetail;

    const handleCompleteVisit = () => {
        if (visit.status === 'IN_PROGRESS') {
            setTransitionType('in_progress_to_ready');
            setIsTransitionWizardOpen(true);
        } else if (visit.status === 'READY_FOR_PICKUP') {
            setTransitionType('ready_to_completed');
            setIsTransitionWizardOpen(true);
        } else if (window.confirm('Czy na pewno chcesz zakończyć tę wizytę?')) {
            updateVisit({ status: 'COMPLETED' });
        }
    };

    const handlePrintProtocol = () => {
        window.print();
    };

    const handleCancelVisit = () => {
        if (window.confirm('Czy na pewno chcesz odrzucić tę wizytę? Ta operacja jest nieodwracalna.')) {
            updateVisit({ status: 'REJECTED' });
        }
    };

    const handleMileageChange = (mileage: number) => {
        updateVisit({ mileageAtArrival: mileage });
    };

    const handleKeysToggle = (checked: boolean) => {
        updateVisit({ keysHandedOver: checked });
    };

    const handleDocumentsToggle = (checked: boolean) => {
        updateVisit({ documentsHandedOver: checked });
    };

    const handleUploadDocument = (file: File, type: DocumentType, category: string) => {
        uploadDocument({
            visitId: visitId!,
            customerId: visit.customer.id,
            file,
            type,
            category
        });
    };

    const handleUploadPhoto = (file: File, description?: string) => {
        uploadPhoto({
            visitId: visitId!,
            file,
            description
        });
    };

    const handleDeleteDocument = (documentId: string) => {
        deleteDocument(documentId);
    };

    const handleDeletePhoto = (photoId: string) => {
        deletePhoto(photoId);
    };

    const handleEditServicesClick = () => {
        setIsEditServicesModalOpen(true);
    };

    const handleSaveServicesChanges = (payload: import('../types').ServicesChangesPayload) => {
        saveServicesChanges(payload, {
            onSuccess: () => {
                setIsEditServicesModalOpen(false);
            },
        });
    };

    const handleUpdateServiceStatus = (serviceLineItemId: string, status: ServiceStatus) => {
        updateServiceStatus({
            serviceLineItemId,
            payload: { status },
        });
    };

    const handleViewCustomerDetails = () => {
        navigate(`/customers/${visit.customer.id}`);
    };

    const handleViewVehicleDetails = () => {
        navigate(`/vehicles/${visit.vehicle.id}`);
    };

    return (
        <ViewContainer>
            <VisitHeader
                visit={visit}
                onCompleteVisit={handleCompleteVisit}
                onPrintProtocol={handlePrintProtocol}
                onCancelVisit={handleCancelVisit}
            />

            <ContentArea>
                <StatusStepper currentStatus={visit.status} />

                <TabsRow>
                    <TabButton
                        $isActive={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    >
                        Przegląd
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'documentation'}
                        onClick={() => setActiveTab('documentation')}
                    >
                        Dokumentacja ({documents.length + visitPhotos.length})
                    </TabButton>
                    <TabButton
                        $isActive={activeTab === 'audit'}
                        onClick={() => setActiveTab('audit')}
                    >
                        Audyt
                    </TabButton>
                </TabsRow>

                {activeTab === 'overview' && (
                    <TabContent>
                        <InfoGrid>
                            <CustomerInfoCard
                                customer={visit.customer}
                                onViewDetails={handleViewCustomerDetails}
                            />
                            <VehicleInfoCard
                                vehicle={visit.vehicle}
                                mileageAtArrival={visit.mileageAtArrival}
                                keysHandedOver={visit.keysHandedOver}
                                documentsHandedOver={visit.documentsHandedOver}
                                vehicleHandoff={visit.vehicleHandoff}
                                onMileageChange={handleMileageChange}
                                onKeysToggle={handleKeysToggle}
                                onDocumentsToggle={handleDocumentsToggle}
                                onViewDetails={handleViewVehicleDetails}
                            />
                        </InfoGrid>

                        <ServicesAndCommentsGrid>
                            <ServicesTable
                                services={visit.services}
                                visitStatus={visit.status}
                                visitId={visitId!}
                                onEditClick={handleEditServicesClick}
                            />
                            <VisitComments
                                visitId={visitId!}
                                comments={comments}
                                isLoading={isLoadingComments}
                            />
                        </ServicesAndCommentsGrid>
                        {visit.technicalNotes && <TechnicalNotesCard notes={visit.technicalNotes} />}
                    </TabContent>
                )}

                {activeTab === 'documentation' && (
                    <TabContent>
                        <DocumentGallery
                            documents={documents}
                            visitPhotos={visitPhotos}
                            isLoadingPhotos={isLoadingPhotos}
                            onUpload={handleUploadDocument}
                            onUploadPhoto={handleUploadPhoto}
                            onDelete={handleDeleteDocument}
                            onDeletePhoto={handleDeletePhoto}
                            isUploading={isUploading || isUploadingPhoto}
                        />
                    </TabContent>
                )}

                {activeTab === 'audit' && (
                    <TabContent>
                        <AuditTimeline module="VISIT" entityId={visitId!} />
                    </TabContent>
                )}
            </ContentArea>

            {transitionType === 'in_progress_to_ready' && (
                <InProgressToReadyWizard
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={() => {
                        setIsTransitionWizardOpen(false);
                        setTransitionType(null);
                    }}
                />
            )}

            {transitionType === 'ready_to_completed' && (
                <ReadyToCompletedWizard
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={() => {
                        setIsTransitionWizardOpen(false);
                        setTransitionType(null);
                    }}
                />
            )}

            <EditServicesModal
                isOpen={isEditServicesModalOpen}
                services={visit.services}
                onClose={() => setIsEditServicesModalOpen(false)}
                onUpdateServiceStatus={handleUpdateServiceStatus}
                onSaveChanges={handleSaveServicesChanges}
                isSavingChanges={isSaving}
            />
        </ViewContainer>
    );
};
