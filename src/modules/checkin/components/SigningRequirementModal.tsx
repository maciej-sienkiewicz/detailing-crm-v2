import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/common/components/Modal';
import { visitApi } from '@/modules/visits/api/visitApi';
import { DocumentPreview } from './DocumentPreview';
import { NotificationSection, defaultNotificationOptions, toConfirmVisitOptions } from './NotificationSection';
import type { NotificationOptions } from './NotificationSection';
import type { ProtocolResponse } from '../types';
import {
    ModalContent,
    DocumentList,
    DocumentRow,
    DocumentIcon,
    DocumentInfo,
    DocumentName,
    ActionButtons,
    IconButton,
    FooterActions,
    PrimaryActionGroup,
    CancelBtn,
    ConfirmBtn,
    Spinner,
    LoadingContainer,
    EmptyState,
} from './SigningRequirementModal.styles';

/* ─── Icons ─────────────────────────────────────────────────────────────────── */

const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const PrintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

const TabletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

/* ─── Props ──────────────────────────────────────────────────────────────────── */

interface SigningRequirementModalProps {
    isOpen: boolean;
    isCreating: boolean;
    onClose: () => void;
    onCancel: () => void;
    visitId: string | null;
    visitNumber: string;
    customerName: string;
    protocols: ProtocolResponse[];
    onConfirm: () => void;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export const SigningRequirementModal = ({
    isOpen,
    isCreating,
    onClose,
    onCancel,
    visitId,
    protocols,
    onConfirm,
}: SigningRequirementModalProps) => {
    const [previewProtocolId, setPreviewProtocolId] = useState<string | null>(null);

    const { data: emailConfig, isPending: emailConfigPending } = useQuery({
        queryKey: ['email-automation-config'],
        queryFn: () => import('@/modules/email-campaigns/api/emailCampaignsApi').then(m => m.fetchEmailAutomationConfig()),
        staleTime: 120_000,
    });
    // Default to false while loading to avoid "on → off" flicker on first open
    const visitWelcomeEnabled = emailConfigPending ? false : (emailConfig?.visitWelcome?.enabled ?? true);

    const [notifOptions, setNotifOptions] = useState<NotificationOptions>(() => defaultNotificationOptions(true, visitWelcomeEnabled));

    const cancelVisitMutation = useMutation({
        mutationFn: () => {
            if (!visitId) throw new Error('No visit to cancel');
            return visitApi.cancelDraftVisit(visitId);
        },
        onSuccess: () => {
            onClose();
            onCancel();
        },
    });

    const confirmVisitMutation = useMutation({
        mutationFn: () => {
            if (!visitId) throw new Error('No visit to confirm');
            return visitApi.confirmDraftVisit(visitId, toConfirmVisitOptions(notifOptions));
        },
        onSuccess: () => {
            onClose();
            onConfirm();
        },
    });

    const hasProtocol = protocols?.some(p => p.templateId !== null) ?? false;

    useEffect(() => {
        if (isOpen) {
            setPreviewProtocolId(null);
            setNotifOptions(defaultNotificationOptions(hasProtocol, visitWelcomeEnabled));
        }
    }, [isOpen, hasProtocol, visitWelcomeEnabled]);

    const handlePrint = (protocolId: string) => {
        const pdfUrl = protocols.find(p => p.id === protocolId)?.filledPdfUrl;
        if (pdfUrl) window.open(pdfUrl, '_blank');
    };
    const isProcessing = cancelVisitMutation.isPending || confirmVisitMutation.isPending;
    const canInteract = !isCreating && visitId !== null;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Dokumentacja i Podpisy" maxWidth="680px">
                <ModalContent>

                    {isCreating ? (
                        <LoadingContainer>
                            <Spinner />
                            <span>Uzupełniam dane na protokole...</span>
                        </LoadingContainer>
                    ) : !protocols || protocols.length === 0 ? (
                        <EmptyState>Brak wymaganych protokołów dla tej wizyty</EmptyState>
                    ) : (
                        <DocumentList>
                            {protocols.map(protocol => (
                                <DocumentRow key={protocol.id}>
                                    <DocumentIcon>
                                        <FileTextIcon />
                                    </DocumentIcon>

                                    <DocumentInfo>
                                        <DocumentName>
                                            {protocol.templateName || 'Protokół'}
                                        </DocumentName>
                                    </DocumentInfo>

                                    <ActionButtons>
                                        <IconButton onClick={() => setPreviewProtocolId(protocol.id)} title="Podgląd">
                                            <EyeIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handlePrint(protocol.id)} title="Drukuj" disabled={!protocol.filledPdfUrl}>
                                            <PrintIcon />
                                        </IconButton>
                                        <IconButton disabled title="Podpisz na tablecie">
                                            <TabletIcon />
                                        </IconButton>
                                    </ActionButtons>
                                </DocumentRow>
                            ))}
                        </DocumentList>
                    )}

                    {canInteract && visitId && (
                        <NotificationSection
                            visitId={visitId}
                            hasProtocol={hasProtocol}
                            visitWelcomeEnabled={visitWelcomeEnabled}
                            options={notifOptions}
                            onChange={setNotifOptions}
                        />
                    )}

                    <FooterActions>
                        <PrimaryActionGroup>
                            <CancelBtn onClick={() => cancelVisitMutation.mutate()} disabled={!canInteract || isProcessing}>
                                Anuluj wizytę
                            </CancelBtn>
                            <ConfirmBtn
                                onClick={() => confirmVisitMutation.mutate()}
                                disabled={!canInteract || isProcessing}
                            >
                                {isProcessing ? 'Przetwarzanie...' : 'Zatwierdź i rozpocznij wizytę'}
                            </ConfirmBtn>
                        </PrimaryActionGroup>

                    </FooterActions>

                </ModalContent>
            </Modal>

            {previewProtocolId && visitId && (
                <DocumentPreview
                    isOpen
                    onClose={() => setPreviewProtocolId(null)}
                    visitId={visitId}
                    protocolId={previewProtocolId}
                />
            )}

        </>
    );
};
