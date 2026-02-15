import { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useVisitDetail, useVisitDocuments, useVisitPhotos } from '../hooks';
import { useUpdateVisit } from '../hooks';
import { useUploadDocument, useUploadPhoto, useDeleteDocument } from '../hooks';
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
import {useToast} from "@/common/components/Toast";

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
`;

const ContentArea = styled.div`
    flex: 1;
    padding: ${props => props.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const TabsContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const TabsList = styled.div`
    display: flex;
    border-bottom: 2px solid ${props => props.theme.colors.border};
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
    flex: 1;
    min-width: fit-content;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border: none;
    background: ${props => props.$isActive
            ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
            : 'transparent'
    };
    color: ${props => props.$isActive ? props.theme.colors.text : props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.$isActive ? 600 : 500};
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 3px solid ${props => props.$isActive ? 'var(--brand-primary)' : 'transparent'};
    white-space: nowrap;

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        color: ${props => props.theme.colors.text};
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
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

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: ${props => props.theme.spacing.md};
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

const LoadingText = styled.p`
    margin: 0;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
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

type TabValue = 'overview' | 'comments' | 'documentation';

export const VisitDetailView = () => {
    const { visitId } = useParams<{ visitId: string }>();

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
        if (window.confirm('Czy na pewno chcesz usunąć ten dokument?')) {
            deleteDocument(documentId);
        }
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

                <TabsContainer>
                    <TabsList>
                        <TabButton
                            $isActive={activeTab === 'overview'}
                            onClick={() => setActiveTab('overview')}
                        >
                            📋 Przegląd
                        </TabButton>
                        <TabButton
                            $isActive={activeTab === 'comments'}
                            onClick={() => setActiveTab('comments')}
                        >
                            💭 Komentarze ({comments.filter(c => !c.isDeleted).length})
                        </TabButton>
                        <TabButton
                            $isActive={activeTab === 'documentation'}
                            onClick={() => setActiveTab('documentation')}
                        >
                            📁 Dokumentacja ({documents.length + visitPhotos.length})
                        </TabButton>
                    </TabsList>
                </TabsContainer>

                {activeTab === 'overview' && (
                    <TabContent>
                        <ContentGrid>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <ServicesTable
                                    services={visit.services}
                                    visitStatus={visit.status}
                                    visitId={visitId!}
                                    onEditClick={handleEditServicesClick}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {visit.technicalNotes && (<TechnicalNotesCard notes={visit.technicalNotes} />)}
                                <VehicleInfoCard
                                    vehicle={visit.vehicle}
                                    mileageAtArrival={visit.mileageAtArrival}
                                    keysHandedOver={visit.keysHandedOver}
                                    documentsHandedOver={visit.documentsHandedOver}
                                    vehicleHandoff={visit.vehicleHandoff}
                                    onMileageChange={handleMileageChange}
                                    onKeysToggle={handleKeysToggle}
                                    onDocumentsToggle={handleDocumentsToggle}
                                />
                                <CustomerInfoCard customer={visit.customer} />
                            </div>
                        </ContentGrid>
                    </TabContent>
                )}

                {activeTab === 'comments' && (
                    <TabContent>
                        <VisitComments
                            visitId={visitId!}
                            comments={comments}
                            isLoading={isLoadingComments}
                        />
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
                            isUploading={isUploading || isUploadingPhoto}
                        />
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
