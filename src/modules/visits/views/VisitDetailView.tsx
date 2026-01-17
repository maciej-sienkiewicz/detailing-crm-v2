import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useVisitDetail } from '../hooks';
import { useUpdateVisit } from '../hooks';
import { useCreateJournalEntry, useDeleteJournalEntry } from '../hooks';
import { useUploadDocument, useDeleteDocument } from '../hooks';
import { useVisitComments } from '../hooks';
import { VisitHeader } from '../components/VisitHeader';
import { StatusStepper } from '../components/StatusStepper';
import { VehicleInfoCard, CustomerInfoCard } from '../components/InfoCards';
import { ServicesTable } from '../components/ServicesTable';
import { CommunicationJournal } from '../components/CommunicationJournal';
import { DocumentGallery } from '../components/DocumentGallery';
import { VisitComments } from '../components/VisitComments';
import { InProgressToReadyWizard, ReadyToCompletedWizard } from '../components/transitions/TransitionWizards';
import type { JournalEntryType, DocumentType } from '../types';

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

type TabValue = 'overview' | 'communication' | 'comments' | 'documentation';

export const VisitDetailView = () => {
    const { visitId } = useParams<{ visitId: string }>();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabValue>('overview');
    const [isTransitionWizardOpen, setIsTransitionWizardOpen] = useState(false);
    const [transitionType, setTransitionType] = useState<'in_progress_to_ready' | 'ready_to_completed' | null>(null);

    const { visitDetail, isLoading, isError, refetch } = useVisitDetail(visitId!);
    const { updateVisit, isUpdating } = useUpdateVisit(visitId!);
    const { createEntry, isCreating } = useCreateJournalEntry(visitId!);
    const { deleteEntry, isDeleting: isDeletingEntry } = useDeleteJournalEntry(visitId!);
    const { uploadDocument, isUploading } = useUploadDocument(visitId!);
    const { deleteDocument, isDeleting: isDeletingDoc } = useDeleteDocument(visitId!);
    const { comments, isLoading: isLoadingComments } = useVisitComments(visitId!);

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

    const { visit, journalEntries, documents } = visitDetail;

    const handleCompleteVisit = () => {
        if (visit.status === 'in_progress') {
            setTransitionType('in_progress_to_ready');
            setIsTransitionWizardOpen(true);
        } else if (visit.status === 'ready') {
            setTransitionType('ready_to_completed');
            setIsTransitionWizardOpen(true);
        } else if (window.confirm('Czy na pewno chcesz zakończyć tę wizytę?')) {
            updateVisit({ status: 'completed' });
        }
    };

    const handlePrintProtocol = () => {
        window.print();
    };

    const handleCancelVisit = () => {
        if (window.confirm('Czy na pewno chcesz anulować tę wizytę? Ta operacja jest nieodwracalna.')) {
            updateVisit({ status: 'cancelled' });
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

    const handleAddEntry = (type: JournalEntryType, content: string) => {
        createEntry({ visitId: visitId!, type, content });
    };

    const handleDeleteEntry = (entryId: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten wpis?')) {
            deleteEntry(entryId);
        }
    };

    const handleUploadDocument = (file: File, type: DocumentType, category: string) => {
        uploadDocument({ visitId: visitId!, file, type, category });
    };

    const handleDeleteDocument = (documentId: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten dokument?')) {
            deleteDocument(documentId);
        }
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
                            $isActive={activeTab === 'communication'}
                            onClick={() => setActiveTab('communication')}
                        >
                            💬 Komunikacja ({journalEntries.filter(e => !e.isDeleted).length})
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
                            📁 Dokumentacja ({documents.length})
                        </TabButton>
                    </TabsList>
                </TabsContainer>

                {activeTab === 'overview' && (
                    <TabContent>
                        <ContentGrid>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <ServicesTable services={visit.services} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <VehicleInfoCard
                                    vehicle={visit.vehicle}
                                    mileageAtArrival={visit.mileageAtArrival}
                                    keysHandedOver={visit.keysHandedOver}
                                    documentsHandedOver={visit.documentsHandedOver}
                                    onMileageChange={handleMileageChange}
                                    onKeysToggle={handleKeysToggle}
                                    onDocumentsToggle={handleDocumentsToggle}
                                />
                                <CustomerInfoCard customer={visit.customer} />
                            </div>
                        </ContentGrid>
                    </TabContent>
                )}

                {activeTab === 'communication' && (
                    <TabContent>
                        <CommunicationJournal
                            entries={journalEntries}
                            onAddEntry={handleAddEntry}
                            onDeleteEntry={handleDeleteEntry}
                            isAdding={isCreating}
                        />
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
                            onUpload={handleUploadDocument}
                            onDelete={handleDeleteDocument}
                            isUploading={isUploading}
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
                    journalEntries={journalEntries}
                    isOpen={isTransitionWizardOpen}
                    onClose={() => {
                        setIsTransitionWizardOpen(false);
                        setTransitionType(null);
                    }}
                />
            )}
        </ViewContainer>
    );
};