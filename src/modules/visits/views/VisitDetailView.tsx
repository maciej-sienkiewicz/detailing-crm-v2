import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { useVisitDetail, useVisitDocuments, useVisitPhotos } from '../hooks';
import { useUpdateVisit, useUpdateVisitTitle, useUpdateEstimatedCompletionDate } from '../hooks';
import { useUploadDocument, useUploadPhoto, useDeleteDocument, useDeletePhoto } from '../hooks';
import { useVisitComments, useVisitCommunication } from '../hooks';
import { useUpdateServiceStatus } from '../hooks';
import { VisitHeader } from '../components/VisitHeader';
import { StatusStepper } from '../components/StatusStepper';
import { VehicleInfoCard, CustomerInfoCard } from '../components/InfoCards';
import { TechnicalNotesCard } from '../components/TechnicalNotesCard';
import { ServicesTable } from '../components/ServicesTable';
import { DocumentGallery } from '../components/DocumentGallery';
import { VisitComments } from '../components/VisitComments';
import { VisitCommunicationHistory } from '../components/VisitCommunicationHistory';
import { InProgressToReadyWizard, ReadyToCompletedWizard } from '../components/transitions/TransitionWizards';
import { SmsReminderModal } from '../components/SmsReminderModal';
import { useSmsReminder, type SmsReminderResponse } from '../hooks/useSmsReminder';
import { GeneratePostModal } from '@/modules/competition-monitoring/components/GeneratePostModal';
import type { GeneratePostPrefill } from '@/modules/competition-monitoring/components/GeneratePostModal';
import type { DocumentType, ServiceStatus } from '../types';
import { useToast } from '@/common/components/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import { DeleteOperationModal } from '@/modules/operations/components/DeleteOperationModal';
import { DoorToDoorModal } from '../components/DoorToDoorModal';
import { AuditTimeline } from '@/common/components/AuditTimeline';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAutomationConfig } from '@/modules/sms-campaigns/hooks';

// ─── Brand tokens (visit view uses sky-500, not stats blue) ──────────────────
const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';
const BRAND_RING = '0 0 0 3px rgba(14, 165, 233, 0.14)';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// Opacity-only fade for top-level containers — transform-based animations
// on ancestors break position:fixed modals (they become the containing block).
const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
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
    ${hexBackdrop}
    animation: ${fadeIn} 0.3s ease both;
`;

const ContentArea = styled.div`
    flex: 1;
    padding: 20px 20px 40px;
    max-width: 1280px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 24px 32px 48px;
    }

    @media (max-width: 767px) {
        padding: 16px 16px 88px;
    }
`;

// ─── Main grid ────────────────────────────────────────────────────────────────
// Flex (not grid) so col-1 expand/collapse never shifts col-2.

const MainGrid = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        flex-direction: row;
        gap: 20px;
    }

    @media (max-width: 767px) {
        gap: 0;
    }
`;

const MainColumn = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Sidebar = styled.aside<{ $mobileVisible?: boolean }>`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        width: 320px;
        flex-shrink: 0;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        width: 340px;
    }

    @media (max-width: 767px) {
        display: ${p => p.$mobileVisible ? 'flex' : 'none'};
    }
`;

// ─── Section wrapper (docs, audit, communication) ─────────────────────────────

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
    background: ${st.bgCard};
    border: none;
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};
    text-align: left;

    &:hover { background: ${st.bg}; }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const SectionIconWrap = styled.div<{ $gradient?: string }>`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: ${p => p.$gradient ?? `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const SectionIconPlain = styled.span`
    display: inline-flex;
    align-items: center;
    color: ${st.textMuted};
    flex-shrink: 0;
    svg { width: 16px; height: 16px; }
`;

const SectionTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    letter-spacing: -0.1px;
    color: ${st.text};
`;

const SectionCount = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    padding: 2px 8px;
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

const SmsDisabledNotice = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 14px 20px;
    padding: 11px 14px;
    background: rgba(245, 158, 11, 0.06);
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;

    svg {
        width: 15px;
        height: 15px;
        color: #d97706;
        flex-shrink: 0;
        margin-top: 1px;
    }
`;

const DocsSectionHeader = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: ${st.bgCardAlt}; }
`;

const DocsHeaderMain = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    min-width: 0;
`;

const DocsHeaderStats = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const StatPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    background: ${st.bg};
    color: ${st.textMuted};
    border: 1px solid ${st.border};
`;

const DocsHeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 16px;
    flex-shrink: 0;
`;

const UploadHeaderLabel = styled.label<{ $uploading?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: ${BRAND};
    color: white;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: ${p => p.$uploading ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$uploading ? 0.6 : 1};
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
    white-space: nowrap;
    user-select: none;

    &:hover {
        background: ${p => p.$uploading ? BRAND : BRAND_DARK};
        box-shadow: ${p => p.$uploading ? '0 2px 8px rgba(14,165,233,0.28)' : '0 4px 14px rgba(14,165,233,0.36)'};
        transform: ${p => p.$uploading ? 'none' : 'translateY(-1px)'};
    }

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const HiddenFileInput = styled.input`
    display: none;
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
    background: ${BRAND};
    color: white;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
    &:hover { background: ${BRAND_DARK}; box-shadow: 0 4px 14px rgba(14,165,233,0.36); transform: translateY(-1px); }
`;

// ─── SMS Reminder Card ────────────────────────────────────────────────────────

const ReminderCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const ReminderCardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 10px;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
`;

const ReminderCardIcon = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${st.textMuted};
    flex-shrink: 0;
    svg { width: 15px; height: 15px; }
`;

const ReminderCardTitle = styled.span`
    flex: 1;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const ReminderCardBadge = styled.span`
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    border: 1px solid ${st.border};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const ReminderCardBody = styled.div`
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ReminderDate = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
    svg { width: 12px; height: 12px; color: ${st.textMuted}; flex-shrink: 0; }
`;

const ReminderMessagePreview = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    line-height: 1.45;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ReminderCardActions = styled.div`
    display: flex;
    gap: 6px;
    padding: 0 14px 12px;
`;

const ReminderActionBtn = styled.button<{ $danger?: boolean }>`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 10px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    ${p => p.$danger ? `
        background: transparent;
        color: #EF4444;
        border: 1px solid rgba(239,68,68,0.3);
        &:hover { background: rgba(239,68,68,0.08); border-color: #EF4444; }
    ` : `
        background: transparent;
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
        &:hover { border-color: ${BRAND}; color: ${BRAND}; background: ${BRAND_DIM}; }
    `}

    svg { width: 11px; height: 11px; }
`;

const ScheduleSmsBtn = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: ${st.radius};
    border: 1.5px dashed #cbd5e1;
    background: transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    svg { width: 15px; height: 15px; flex-shrink: 0; }

    &:hover:not(:disabled) {
        border-color: #0ea5e9;
        color: #0369a1;
        background: #f0f9ff;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
`;

const ScheduleSmsNoPhone = styled.p`
    margin: 6px 0 0;
    font-size: 11px;
    color: ${st.textMuted};
    text-align: center;
    line-height: 1.4;
`;

// ─── Mobile tab navigation ────────────────────────────────────────────────────

type MobileTab = 'services' | 'info' | 'docs' | 'communication' | 'history';

const MobileTabPanel = styled.div<{ $visible: boolean }>`
    @media (max-width: 767px) {
        display: ${p => p.$visible ? 'block' : 'none'};
    }
`;

const MobileBottomNav = styled.nav`
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    padding: 6px 4px calc(8px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);

    /* hidden on desktop */
    @media (min-width: 768px) {
        display: none;
    }
`;

const MobileNavBtn = styled.button<{ $active: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 2px;
    background: none;
    border: none;
    cursor: pointer;
    color: ${p => p.$active ? BRAND : '#94a3b8'};
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;

    &:active { opacity: 0.7; }
`;

const MobileNavIconWrap = styled.span<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 30px;
    border-radius: 15px;
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.12)' : 'transparent'};
    transition: background 0.2s ease;

    svg { width: 20px; height: 20px; flex-shrink: 0; }
`;

const MobileNavLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 56px;
    text-align: center;
`;

// ─── View ─────────────────────────────────────────────────────────────────────

export const VisitDetailView = () => {
    const { visitId } = useParams<{ visitId: string }>();
    const navigate = useNavigate();

    const [isTransitionWizardOpen, setIsTransitionWizardOpen] = useState(false);
    const [isDoorToDoorOpen, setIsDoorToDoorOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transitionType, setTransitionType] = useState<'in_progress_to_ready' | 'ready_to_completed' | null>(null);
    const [isGeneratePostOpen, setIsGeneratePostOpen] = useState(false);
    const [isSmsReminderOpen, setIsSmsReminderOpen] = useState(false);
    const [smsReminderForEdit, setSmsReminderForEdit] = useState<SmsReminderResponse | null>(null);
    const [highlightPendingServices, setHighlightPendingServices] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isCommunicationOpen, setIsCommunicationOpen] = useState(true);
    const [mobileTab, setMobileTab] = useState<MobileTab>('services');

    const handleMobileTabChange = (tab: MobileTab) => {
        setMobileTab(tab);
        if (tab === 'docs') setIsDocsOpen(true);
        if (tab === 'history') setIsAuditOpen(true);
        if (tab === 'communication') setIsCommunicationOpen(true);
    };
    const docFileInputRef = useRef<HTMLInputElement>(null);

    const { visitDetail, isLoading, isError, refetch } = useVisitDetail(visitId!);
    const { documents } = useVisitDocuments(visitId!);
    const { photos: visitPhotos, isLoading: isLoadingPhotos } = useVisitPhotos(visitId!);
    const { updateVisit } = useUpdateVisit(visitId!);
    const { updateTitle } = useUpdateVisitTitle(visitId!);
    const { updateEstimatedCompletionDate } = useUpdateEstimatedCompletionDate(visitId!);
    const { uploadDocument, isUploading } = useUploadDocument(visitId!);
    const { uploadPhoto, isUploading: isUploadingPhoto } = useUploadPhoto(visitId!);
    const { deleteDocument } = useDeleteDocument(visitId!);
    const { deletePhoto } = useDeletePhoto(visitId!);
    const { comments, isLoading: isLoadingComments } = useVisitComments(visitId!);
    const { entries: communicationEntries, isLoading: isLoadingCommunication } = useVisitCommunication(visitId!);
    const { updateServiceStatus } = useUpdateServiceStatus(visitId!);
    const { showSuccess, showWarning, showInfo } = useToast();
    const { pendingReminder } = useSmsReminder(visitId!);
    const { config: smsConfig } = useAutomationConfig();
    const smsPreVisitDisabled = smsConfig !== null && !smsConfig.preVisit.enabled;

    const queryClient = useQueryClient();
    const { mutate: deleteVisit, isPending: isDeleting } = useMutation({
        mutationFn: () => visitApi.cancelDraftVisit(visitId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            navigate('/operations');
        },
        onError: () => showWarning('Nie udało się usunąć wizyty. Spróbuj ponownie.'),
    });

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

    const handleReadyTransitionSuccess = () => {
        setIsTransitionWizardOpen(false);
        setTransitionType(null);
    };

    const handlePrintProtocol = () => { showInfo('To jeszcze nie działa, trzeba obgadać'); };

    const buildGeneratePostPrefill = (): GeneratePostPrefill => {
        const { vehicle, services, status } = visit;
        const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
        const serviceNames = services
            .filter(s => s.status !== 'REJECTED')
            .map(s => s.serviceName);

        const topic = [vehicleLabel, serviceNames.length > 0 ? serviceNames.join(', ') : '']
            .filter(Boolean)
            .join(' — ');

        const statusLabel =
            status === 'COMPLETED'        ? 'Realizacja zakończona.'       :
            status === 'READY_FOR_PICKUP' ? 'Pojazd gotowy do odbioru.'    :
            status === 'IN_PROGRESS'      ? 'Realizacja w toku.'           : '';

        const context = [
            statusLabel,
            serviceNames.length > 0 ? `Usługi: ${serviceNames.join(', ')}.` : '',
        ].filter(Boolean).join(' ');

        // Heuristic: detect dominant service type from names
        const namesLower = serviceNames.map(n => n.toLowerCase()).join(' ');
        const detectedServiceType: GeneratePostPrefill['serviceType'] =
            /\bppf\b|paint protection/.test(namesLower)             ? 'ppf'       :
            /ceramik|ceramic/.test(namesLower)                      ? 'ceramic'   :
            /tapicerk|wnętrze|interior|skór/.test(namesLower)       ? 'interior'  :
            /oklej|wrap|foli(?!a ppf)/.test(namesLower)             ? 'wrap'      :
            /poler|polish|korekta/.test(namesLower)                 ? 'polish'    :
            /detailing/.test(namesLower)                            ? 'detailing' :
            undefined;

        return { topic, context, serviceType: detectedServiceType };
    };

    const handleCancelVisit = () => setIsDeleteModalOpen(true);
    const handleConfirmDelete = () => deleteVisit();

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

    const handleUpdateServiceStatus = (serviceLineItemId: string, status: ServiceStatus) => {
        updateServiceStatus({ serviceLineItemId, payload: { status } });
    };

    const photoCount = visitPhotos.length + documents.filter(d => d.type === 'PHOTO' || d.type === 'DAMAGE_MAP').length;
    const pdfCount = documents.filter(d => !['PHOTO', 'DAMAGE_MAP'].includes(d.type)).length;
    const totalDocCount = photoCount + pdfCount;

    const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
        if (isImage) {
            handleUploadPhoto(file);
        } else {
            handleUploadDocument(file, 'PDF', 'inne');
        }
        if (docFileInputRef.current) docFileInputRef.current.value = '';
    };

    return (
    <>
        <ViewContainer>
            <ContentArea>
                <VisitHeader
                    visit={visit}
                    onCompleteVisit={handleCompleteVisit}
                    onPrintProtocol={handlePrintProtocol}
                    onCancelVisit={handleCancelVisit}
                    onGeneratePost={() => setIsGeneratePostOpen(true)}
                    onDoorToDoor={() => setIsDoorToDoorOpen(true)}
                    onTitleUpdate={updateTitle}
                    onEstimatedCompletionDateUpdate={updateEstimatedCompletionDate}
                />

                <StatusStepper currentStatus={visit.status} />

                <MainGrid>
                    <MainColumn>
                        <MobileTabPanel $visible={mobileTab === 'services'}>
                            <ServicesTable
                                services={visit.services}
                                visitStatus={visit.status}
                                visitId={visitId!}
                                highlightPending={highlightPendingServices}
                            />
                        </MobileTabPanel>

                        {/* Komunikacja ──────────────────────────────────── */}
                        <MobileTabPanel $visible={mobileTab === 'communication'}>
                        <Section>
                            <SectionHeader
                                onClick={() => setIsCommunicationOpen(v => !v)}
                                aria-expanded={isCommunicationOpen}
                                aria-controls="communication-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconPlain>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M2 7l10 7 10-7" />
                                        </svg>
                                    </SectionIconPlain>
                                    <SectionTitle>Komunikacja z klientem</SectionTitle>
                                    {communicationEntries.length > 0 && (
                                        <SectionCount>{communicationEntries.length}</SectionCount>
                                    )}
                                    {communicationEntries.some(e => e.status === 'FAILED') && (
                                        <SectionCount title="Błąd wysyłki">⚠ Błąd</SectionCount>
                                    )}
                                </SectionHeaderLeft>
                                <ChevronIcon $open={isCommunicationOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </ChevronIcon>
                            </SectionHeader>
                            <SectionBody $visible={isCommunicationOpen} $flush id="communication-section">
                                <VisitCommunicationHistory
                                    entries={communicationEntries}
                                    isLoading={isLoadingCommunication}
                                />
                            </SectionBody>
                        </Section>
                        </MobileTabPanel>

                        {/* Dokumentacja ─────────────────────────────────── */}
                        <MobileTabPanel $visible={mobileTab === 'docs'}>
                        <Section>
                            <DocsSectionHeader
                                onClick={() => setIsDocsOpen(v => !v)}
                                role="button"
                                tabIndex={0}
                                aria-expanded={isDocsOpen}
                                aria-controls="docs-section"
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setIsDocsOpen(v => !v); }}
                            >
                                <DocsHeaderMain>
                                    <SectionIconPlain>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                            <rect x="14" y="14" width="7" height="7" rx="1" />
                                        </svg>
                                    </SectionIconPlain>
                                    <SectionTitle>Dokumentacja</SectionTitle>
                                    <DocsHeaderStats>
                                        {photoCount > 0 && (
                                            <StatPill>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                                {photoCount}
                                            </StatPill>
                                        )}
                                        {pdfCount > 0 && (
                                            <StatPill>
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
                                <DocsHeaderRight>
                                    <UploadHeaderLabel
                                        $uploading={isUploading || isUploadingPhoto}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        {isUploading || isUploadingPhoto ? 'Wysyłanie...' : 'Dodaj plik'}
                                        <HiddenFileInput
                                            ref={docFileInputRef}
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleDocFileSelect}
                                            disabled={isUploading || isUploadingPhoto}
                                        />
                                    </UploadHeaderLabel>
                                    <ChevronIcon $open={isDocsOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </ChevronIcon>
                                </DocsHeaderRight>
                            </DocsSectionHeader>
                            <SectionBody $flush $visible={isDocsOpen} id="docs-section">
                                <DocumentGallery
                                    documents={documents}
                                    visitPhotos={visitPhotos}
                                    isLoadingPhotos={isLoadingPhotos}
                                    onDelete={handleDeleteDocument}
                                    onDeletePhoto={handleDeletePhoto}
                                />
                            </SectionBody>
                        </Section>
                        </MobileTabPanel>

                        {/* Historia zmian ───────────────────────────────── */}
                        <MobileTabPanel $visible={mobileTab === 'history'}>
                        <Section>
                            <SectionHeader
                                onClick={() => setIsAuditOpen(v => !v)}
                                aria-expanded={isAuditOpen}
                                aria-controls="audit-section"
                            >
                                <SectionHeaderLeft>
                                    <SectionIconPlain>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </SectionIconPlain>
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
                        </MobileTabPanel>
                    </MainColumn>

                    <Sidebar $mobileVisible={mobileTab === 'info'}>
                        {pendingReminder && (
                            <ReminderCard>
                                <ReminderCardHeader>
                                    <ReminderCardIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                    </ReminderCardIcon>
                                    <ReminderCardTitle>SMS Przypominający</ReminderCardTitle>
                                    <ReminderCardBadge>Zaplanowany</ReminderCardBadge>
                                </ReminderCardHeader>
                                <ReminderCardBody>
                                    <ReminderDate>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        {new Date(pendingReminder.scheduledFor).toLocaleString('pl-PL', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </ReminderDate>
                                    <ReminderMessagePreview>{pendingReminder.messageContent}</ReminderMessagePreview>
                                </ReminderCardBody>
                                <ReminderCardActions>
                                    <ReminderActionBtn onClick={() => {
                                        setSmsReminderForEdit(pendingReminder);
                                        setIsSmsReminderOpen(true);
                                    }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                        Edytuj
                                    </ReminderActionBtn>
                                </ReminderCardActions>
                            </ReminderCard>
                        )}
                        {!pendingReminder && visit.status === 'COMPLETED' && (() => {
                            const hasPhone = !!visit.customer.phone?.trim();
                            return (
                                <>
                                    <ScheduleSmsBtn
                                        disabled={!hasPhone}
                                        onClick={() => { setSmsReminderForEdit(null); setIsSmsReminderOpen(true); }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                        Zaplanuj SMS przypominający
                                    </ScheduleSmsBtn>
                                    {!hasPhone && (
                                        <ScheduleSmsNoPhone>
                                            Klient nie ma przypisanego numeru telefonu
                                        </ScheduleSmsNoPhone>
                                    )}
                                </>
                            );
                        })()}
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
                    onTransitionSuccess={handleReadyTransitionSuccess}
                />
            )}

            {transitionType === 'ready_to_completed' && (
                <ReadyToCompletedWizard
                    visit={visit}
                    isOpen={isTransitionWizardOpen}
                    onClose={() => { setIsTransitionWizardOpen(false); setTransitionType(null); }}
                />
            )}

            <DoorToDoorModal
                isOpen={isDoorToDoorOpen}
                initialData={visit.doorToDoor}
                onClose={() => setIsDoorToDoorOpen(false)}
                onConfirm={(data) => {
                    updateVisit({ doorToDoor: data });
                }}
            />

            {isGeneratePostOpen && (
                <GeneratePostModal
                    onClose={() => setIsGeneratePostOpen(false)}
                    prefill={buildGeneratePostPrefill()}
                />
            )}

            <SmsReminderModal
                isOpen={isSmsReminderOpen}
                visitId={visitId!}
                customer={visit.customer}
                existingReminder={smsReminderForEdit}
                onClose={() => { setIsSmsReminderOpen(false); setSmsReminderForEdit(null); }}
            />

            <DeleteOperationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                operationName={`${visit.customer.firstName} ${visit.customer.lastName}`}
            />
        </ViewContainer>

        {createPortal(
            <MobileBottomNav aria-label="Nawigacja sekcji wizyty">
                <MobileNavBtn $active={mobileTab === 'services'} onClick={() => handleMobileTabChange('services')} aria-label="Usługi">
                    <MobileNavIconWrap $active={mobileTab === 'services'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                            <rect x="9" y="3" width="6" height="4" rx="1"/>
                            <path d="M9 12h6M9 16h4"/>
                        </svg>
                    </MobileNavIconWrap>
                    <MobileNavLabel>Usługi</MobileNavLabel>
                </MobileNavBtn>

                <MobileNavBtn $active={mobileTab === 'info'} onClick={() => handleMobileTabChange('info')} aria-label="Klient">
                    <MobileNavIconWrap $active={mobileTab === 'info'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </MobileNavIconWrap>
                    <MobileNavLabel>Klient</MobileNavLabel>
                </MobileNavBtn>

                <MobileNavBtn $active={mobileTab === 'docs'} onClick={() => handleMobileTabChange('docs')} aria-label="Zdjęcia i dokumenty">
                    <MobileNavIconWrap $active={mobileTab === 'docs'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                    </MobileNavIconWrap>
                    <MobileNavLabel>Zdjęcia</MobileNavLabel>
                </MobileNavBtn>

                <MobileNavBtn $active={mobileTab === 'communication'} onClick={() => handleMobileTabChange('communication')} aria-label="Komunikacja">
                    <MobileNavIconWrap $active={mobileTab === 'communication'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </MobileNavIconWrap>
                    <MobileNavLabel>Komunikacja</MobileNavLabel>
                </MobileNavBtn>

                <MobileNavBtn $active={mobileTab === 'history'} onClick={() => handleMobileTabChange('history')} aria-label="Historia zmian">
                    <MobileNavIconWrap $active={mobileTab === 'history'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </MobileNavIconWrap>
                    <MobileNavLabel>Historia</MobileNavLabel>
                </MobileNavBtn>
            </MobileBottomNav>,
            document.body
        )}
    </>
    );
};
