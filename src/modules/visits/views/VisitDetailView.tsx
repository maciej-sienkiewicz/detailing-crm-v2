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
import { useToast } from '@/common/components/Toast';
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
    animation: ${fadeUp} 0.3s ease both;
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
    margin-bottom: 20px;
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

const Sidebar = styled.aside`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

// ─── Section wrapper (docs, audit) ────────────────────────────────────────────

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

const SectionIconWrap = styled.div`
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: ${st.gradientBlue};
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

const DocsSectionHeader = styled(SectionHeader)`
    padding: 0;
`;

const DocsHeaderMain = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    min-width: 0;
`;

const DocsHeaderStats = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const StatPill = styled.span<{ $color?: 'blue' | 'amber' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    background: ${p => p.$color === 'amber' ? 'rgba(245,158,11,0.12)' : st.accentBlueDim};
    color: ${p => p.$color === 'amber' ? '#d97706' : st.accentBlue};
    border: 1px solid ${p => p.$color === 'amber' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.2)'};
`;

const DocsHeaderChevron = styled.div`
    padding: 14px 20px 14px 0;
    display: flex;
    align-items: center;
    flex-shrink: 0;
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

// ─── View ─────────────────────────────────────────────────────────────────────

export const VisitDetailView = () => {
    const { visitId } = useParams<{ visitId: string }>();
    const navigate = useNavigate();

    const [isTransitionWizardOpen, setIsTransitionWizardOpen] = useState(false);
    const [transitionType, setTransitionType] = useState<'in_progress_to_ready' | 'ready_to_completed' | null>(null);
    const [isEditServicesModalOpen, setIsEditServicesModalOpen] = useState(false);
    const [highlightPendingServices, setHighlightPendingServices] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);

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
    const { showSuccess, showWarning } = useToast();

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
            const pendingCount = visit.services.filter(s => s.status === 'PENDING').length;
            if (pendingCount > 0) {
                showWarning(
                    'Nie można oznaczyć wizyty jako gotowej',
                    `${pendingCount === 1 ? 'Jedna usługa wymaga' : `${pendingCount} usługi wymagają`} potwierdzenia przed zakończeniem.`
                );
                setHighlightPendingServices(true);
                setTimeout(() => setHighlightPendingServices(false), 4000);
                return;
            }
            setTransitionType('in_progress_to_ready');
            setIsTransitionWizardOpen(true);
        } else if (visit.status === 'READY_FOR_PICKUP') {
            setTransitionType('ready_to_completed');
            setIsTransitionWizardOpen(true);
        } else if (window.confirm('Czy na pewno chcesz zakończyć tę wizytę?')) {
            updateVisit({ status: 'COMPLETED' });
        }
    };

    const handlePrintProtocol = () => { window.print(); };

    const handleCancelVisit = () => {
        if (window.confirm('Czy na pewno chcesz odrzucić tę wizytę? Ta operacja jest nieodwracalna.')) {
            updateVisit({ status: 'REJECTED' });
        }
    };

    const handleMileageChange = (mileage: number) => { updateVisit({ mileageAtArrival: mileage }); };
    const handleKeysToggle = (checked: boolean) => { updateVisit({ keysHandedOver: checked }); };
    const handleDocumentsToggle = (checked: boolean) => { updateVisit({ documentsHandedOver: checked }); };

    const handleUploadDocument = (file: File, type: DocumentType, category: string) => {
        uploadDocument({ visitId: visitId!, customerId: visit.customer.id, file, type, category });
    };

    const handleUploadPhoto = (file: File, description?: string) => {
        uploadPhoto({ visitId: visitId!, file, description });
    };

    const handleDeleteDocument = (documentId: string) => { deleteDocument(documentId); };
    const handleDeletePhoto = (photoId: string) => { deletePhoto(photoId); };

    const handleEditServicesClick = () => { setIsEditServicesModalOpen(true); };

    const handleSaveServicesChanges = (payload: import('../types').ServicesChangesPayload) => {
        saveServicesChanges(payload, {
            onSuccess: () => { setIsEditServicesModalOpen(false); },
        });
    };

    const handleUpdateServiceStatus = (serviceLineItemId: string, status: ServiceStatus) => {
        updateServiceStatus({ serviceLineItemId, payload: { status } });
    };

    const photoCount = visitPhotos.length + documents.filter(d => d.type === 'PHOTO' || d.type === 'DAMAGE_MAP').length;
    const pdfCount = documents.filter(d => !['PHOTO', 'DAMAGE_MAP'].includes(d.type)).length;
    const totalDocCount = photoCount + pdfCount;

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

                <MainGrid>
                    <MainColumn>
                        <ServicesTable
                            services={visit.services}
                            visitStatus={visit.status}
                            visitId={visitId!}
                            onEditClick={handleEditServicesClick}
                            highlightPending={highlightPendingServices}
                        />

                        {/* Dokumentacja ─────────────────────────────────── */}
                        <Section>
                            <DocsSectionHeader
                                onClick={() => setIsDocsOpen(v => !v)}
                                aria-expanded={isDocsOpen}
                                aria-controls="docs-section"
                            >
                                <DocsHeaderMain>
                                    <SectionIconWrap>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                            <rect x="14" y="14" width="7" height="7" rx="1" />
                                        </svg>
                                    </SectionIconWrap>
                                    <SectionTitle>Dokumentacja</SectionTitle>
                                    <DocsHeaderStats>
                                        {photoCount > 0 && (
                                            <StatPill $color="blue">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                                {photoCount}
                                            </StatPill>
                                        )}
                                        {pdfCount > 0 && (
                                            <StatPill $color="amber">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                </svg>
                                                {pdfCount}
                                            </StatPill>
                                        )}
                                        {totalDocCount === 0 && (
                                            <SectionCount>Brak plików</SectionCount>
                                        )}
                                    </DocsHeaderStats>
                                </DocsHeaderMain>
                                <DocsHeaderChevron>
                                    <ChevronIcon $open={isDocsOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </ChevronIcon>
                                </DocsHeaderChevron>
                            </DocsSectionHeader>
                            <SectionBody $flush $visible={isDocsOpen} id="docs-section">
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
                            </SectionBody>
                        </Section>

                        {/* Historia zmian ───────────────────────────────── */}
                        <Section>
                            <SectionHeader
                                onClick={() => setIsAuditOpen(v => !v)}
                                aria-expanded={isAuditOpen}
                                aria-controls="audit-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconWrap>
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
                                <AuditTimeline module="VISIT" entityId={visitId!} />
                            </SectionBody>
                        </Section>
                    </MainColumn>

                    <Sidebar>
                        <CustomerInfoCard
                            customer={visit.customer}
                            onViewDetails={() => navigate(`/customers/${visit.customer.id}`)}
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
                            onViewDetails={() => navigate(`/vehicles/${visit.vehicle.id}`)}
                        />
                        {visit.technicalNotes && (
                            <TechnicalNotesCard notes={visit.technicalNotes} />
                        )}
                        <VisitComments
                            visitId={visitId!}
                            comments={comments}
                            isLoading={isLoadingComments}
                        />
                    </Sidebar>
                </MainGrid>
            </ContentArea>

            {transitionType === 'in_progress_to_ready' && (
                <InProgressToReadyWizard
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={() => { setIsTransitionWizardOpen(false); setTransitionType(null); }}
                />
            )}

            {transitionType === 'ready_to_completed' && (
                <ReadyToCompletedWizard
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={() => { setIsTransitionWizardOpen(false); setTransitionType(null); }}
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
