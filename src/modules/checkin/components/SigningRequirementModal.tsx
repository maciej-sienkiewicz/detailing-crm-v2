import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    CloseBtn,
} from '@/common/components/ModalKit';
import { useToast } from '@/common/components/Toast';
import { visitApi } from '@/modules/visits/api/visitApi';
import { tabletApi } from '../api/tabletApi';
import { useSignatureRequestsSocket } from '../hooks/useSignatureRequestsSocket';
import type { SignatureRequestSocketEvent } from '../hooks/useSignatureRequestsSocket';
import { DocumentPreview } from './DocumentPreview';
import { NotificationSection, defaultNotificationOptions, toConfirmVisitOptions } from './NotificationSection';
import type { NotificationOptions } from './NotificationSection';
import type { ProtocolResponse } from '../types';
import {
    ModalContent as StyledModalContent,
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
    RetryButton,
    Spinner,
    LoadingContainer,
    EmptyState,
    TabletPickerWrapper,
    TabletPickerDropdown,
    TabletPickerLabel,
    TabletPickerItem,
    SpinningIconWrapper,
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

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

/* ─── Signing session state (per protocol) ──────────────────────────────────── */

type SigningState =
    | { phase: 'sending' }
    | { phase: 'waiting'; requestId: string }
    | { phase: 'signed'; requestId: string }
    | { phase: 'declined'; requestId: string }
    | { phase: 'failed'; requestId?: string; errorMessage?: string };

const extractApiErrorMessage = (error: unknown): string | undefined => {
    const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (apiMessage) return apiMessage;
    return error instanceof Error ? error.message : undefined;
};

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
    customerName,
    protocols,
    onConfirm,
}: SigningRequirementModalProps) => {
    const [previewProtocolId, setPreviewProtocolId] = useState<string | null>(null);
    const [tabletPickerProtocolId, setTabletPickerProtocolId] = useState<string | null>(null);
    const [signingByProtocol, setSigningByProtocol] = useState<Record<string, SigningState>>({});
    const tabletPickerRef = useRef<HTMLDivElement>(null);
    const { showSuccess, showError } = useToast();

    const { data: emailConfig, isPending: emailConfigPending } = useQuery({
        queryKey: ['email-automation-config'],
        queryFn: () => import('@/modules/email-campaigns/api/emailCampaignsApi').then(m => m.fetchEmailAutomationConfig()),
    });
    const visitWelcomeEnabled = emailConfigPending ? false : (emailConfig?.visitWelcome?.enabled ?? true);

    const { data: tablets = [] } = useQuery({
        queryKey: ['tablets'],
        queryFn: tabletApi.listTablets,
        enabled: isOpen,
        staleTime: 30_000,
    });

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
            setTabletPickerProtocolId(null);
            setSigningByProtocol({});
            setNotifOptions(defaultNotificationOptions(hasProtocol, visitWelcomeEnabled));
        }
    }, [isOpen, hasProtocol, visitWelcomeEnabled]);

    // Close tablet picker when clicking outside
    useEffect(() => {
        if (!tabletPickerProtocolId) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (tabletPickerRef.current && !tabletPickerRef.current.contains(e.target as Node)) {
                setTabletPickerProtocolId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [tabletPickerProtocolId]);

    const handlePrint = (protocolId: string) => {
        const pdfUrl = protocols.find(p => p.id === protocolId)?.filledPdfUrl;
        if (pdfUrl) window.open(pdfUrl, '_blank');
    };

    const setSigningState = (protocolId: string, state: SigningState) => {
        setSigningByProtocol(prev => ({ ...prev, [protocolId]: state }));
    };

    const handleSendToTablet = async (protocolId: string, tabletId: string) => {
        if (!visitId) return;
        const phase = signingByProtocol[protocolId]?.phase;
        if (phase === 'sending' || phase === 'waiting' || phase === 'signed') return;
        setTabletPickerProtocolId(null);
        setSigningState(protocolId, { phase: 'sending' });
        try {
            const request = await tabletApi.requestTabletSignature(visitId, protocolId, customerName, tabletId);
            setSigningState(protocolId, { phase: 'waiting', requestId: request.id });
        } catch (error) {
            const errorMessage = extractApiErrorMessage(error);
            setSigningState(protocolId, { phase: 'failed', errorMessage });
            showError('Coś poszło nie tak. Spróbuj jeszcze raz.', errorMessage);
        }
    };

    const handleTabletButtonClick = (protocolId: string) => {
        if (tablets.length === 1) {
            handleSendToTablet(protocolId, tablets[0].tabletId);
        } else if (tablets.length > 1) {
            setTabletPickerProtocolId(prev => prev === protocolId ? null : protocolId);
        }
    };

    // ─── Live status of awaited signing sessions (WebSocket + reconnect re-sync) ─

    const awaitedRequests = useMemo(() =>
        Object.entries(signingByProtocol).flatMap(([protocolId, state]) =>
            state.phase === 'waiting' ? [{ protocolId, requestId: state.requestId }] : []
        ),
    [signingByProtocol]);

    const applySignatureOutcome = (protocolId: string, requestId: string, outcome: string, errorMessage?: string | null) => {
        switch (outcome) {
            case 'SIGNATURE_COMPLETED':
                setSigningState(protocolId, { phase: 'signed', requestId });
                showSuccess('Klient pomyślnie podpisał dokument');
                break;
            case 'SIGNATURE_DECLINED':
                setSigningState(protocolId, { phase: 'declined', requestId });
                showError('Klient odrzucił dokument. Spróbuj ponownie.');
                break;
            case 'SIGNATURE_FAILED':
            case 'SIGNATURE_EXPIRED':
                setSigningState(protocolId, { phase: 'failed', requestId, errorMessage: errorMessage ?? undefined });
                showError('Coś poszło nie tak. Spróbuj jeszcze raz.', errorMessage ?? undefined);
                break;
            // SIGNATURE_REQUESTED / SIGNATURE_DISPLAYED / SIGNATURE_CANCELLED: still waiting or handled elsewhere
        }
    };

    useSignatureRequestsSocket(awaitedRequests.map(r => r.requestId), {
        onEvent: (event: SignatureRequestSocketEvent) => {
            const awaited = awaitedRequests.find(r => r.requestId === event.requestId);
            if (!awaited) return;
            applySignatureOutcome(awaited.protocolId, event.requestId, event.type, event.errorMessage);
        },
        // Events may have been missed while the socket was down — poll the final state
        onReconnect: () => {
            awaitedRequests.forEach(async ({ protocolId, requestId }) => {
                try {
                    const request = await tabletApi.getSignatureRequest(requestId);
                    applySignatureOutcome(protocolId, requestId, `SIGNATURE_${request.status}`, request.failureReason);
                } catch (err) {
                    console.error('[SigningRequirementModal] Failed to re-sync signature request:', err);
                }
            });
        },
    });

    const tabletButtonTitle = (protocol: ProtocolResponse): string => {
        const phase = signingByProtocol[protocol.id]?.phase;
        if (phase === 'signed') return 'Klient podpisał dokument';
        if (phase === 'waiting') return 'Oczekiwanie na podpis klienta...';
        if (tablets.length === 0) return 'Brak sparowanego tabletu';
        if (tablets.length === 1) return `Wyślij na tablet: ${tablets[0].deviceName}`;
        return 'Wybierz tablet do podpisu';
    };

    const isProcessing = cancelVisitMutation.isPending || confirmVisitMutation.isPending;
    const canInteract = !isCreating && visitId !== null;
    const hasTablets = tablets.length > 0;

    return (
        <>
            <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="680px">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Dokumentacja i Podpisy</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <StyledModalContent>
                        {isCreating ? (
                            <LoadingContainer>
                                <Spinner />
                                <span>Uzupełniam dane na protokole...</span>
                            </LoadingContainer>
                        ) : !protocols || protocols.length === 0 ? (
                            <EmptyState>Brak wymaganych protokołów dla tej wizyty</EmptyState>
                        ) : (
                            <DocumentList>
                                {protocols.map(protocol => {
                                    const signingPhase = signingByProtocol[protocol.id]?.phase;
                                    const isSending = signingPhase === 'sending';
                                    const isWaiting = signingPhase === 'waiting';
                                    const isSigned = signingPhase === 'signed';
                                    const needsRetry = signingPhase === 'failed' || signingPhase === 'declined';
                                    const isPickerOpen = tabletPickerProtocolId === protocol.id;

                                    return (
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

                                                <TabletPickerWrapper ref={isPickerOpen ? tabletPickerRef : undefined}>
                                                    {needsRetry ? (
                                                        <RetryButton
                                                            onClick={() => handleTabletButtonClick(protocol.id)}
                                                            title={tabletButtonTitle(protocol)}
                                                            disabled={!hasTablets}
                                                        >
                                                            Ponów
                                                        </RetryButton>
                                                    ) : (
                                                        <IconButton
                                                            onClick={() => handleTabletButtonClick(protocol.id)}
                                                            title={tabletButtonTitle(protocol)}
                                                            disabled={!hasTablets || isSending || isWaiting || isSigned}
                                                            $active={isPickerOpen}
                                                            $success={isSigned}
                                                        >
                                                            {isSending || isWaiting ? (
                                                                <SpinningIconWrapper>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                </SpinningIconWrapper>
                                                            ) : isSigned ? (
                                                                <CheckIcon />
                                                            ) : (
                                                                <TabletIcon />
                                                            )}
                                                        </IconButton>
                                                    )}

                                                    {isPickerOpen && tablets.length > 1 && (
                                                        <TabletPickerDropdown>
                                                            <TabletPickerLabel>Wybierz tablet</TabletPickerLabel>
                                                            {tablets.map(tablet => (
                                                                <TabletPickerItem
                                                                    key={tablet.tabletId}
                                                                    onClick={() => handleSendToTablet(protocol.id, tablet.tabletId)}
                                                                >
                                                                    <TabletIcon />
                                                                    {tablet.deviceName}
                                                                </TabletPickerItem>
                                                            ))}
                                                        </TabletPickerDropdown>
                                                    )}
                                                </TabletPickerWrapper>
                                            </ActionButtons>
                                        </DocumentRow>
                                    );
                                })}
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
                    </StyledModalContent>
                </ModalContent>
            </ModalShell>

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
