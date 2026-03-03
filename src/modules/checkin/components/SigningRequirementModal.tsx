import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/common/components/Modal';
import { Button } from '@/common/components/Button';
import { visitApi } from '@/modules/visits/api/visitApi';
import { DocumentPreview } from './DocumentPreview';
import { SkipSigningConfirmDialog } from './SkipSigningConfirmDialog';
import type { ProtocolResponse } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const DocumentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    max-height: 500px;
    overflow-y: auto;
`;

const DocumentRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: 12px 14px;
    background: #F8FAFC;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    transition: all ${st.transition};

    &:hover {
        background: #FFFFFF;
        border-color: ${st.accentBlue};
    }
`;

const DocumentIcon = styled.div`
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${st.accentBlueDim};
    border-radius: ${st.radiusSm};
    color: ${st.accentBlue};
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const DocumentInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const DocumentName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StatusBadge = styled.span<{ $mandatory: boolean }>`
    padding: 3px 9px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    white-space: nowrap;
    flex-shrink: 0;
    background: ${props => props.$mandatory ? st.accentRedDim : st.bgCardAlt};
    color: ${props => props.$mandatory ? st.accentRed : st.textMuted};
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
`;

const IconButton = styled.button<{ $active?: boolean }>`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${st.border};
    background: ${props => props.$active ? st.accentBlueDim : '#F8FAFC'};
    border-radius: ${st.radiusSm};
    color: ${props => props.$active ? st.accentBlue : st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        background: ${st.accentBlueDim};
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const FooterActions = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${st.border};
`;

const PrimaryActionGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    justify-content: flex-end;
`;

const SecondaryActionGroup = styled.div`
    display: flex;
    justify-content: center;
`;

const SkipButton = styled(Button)`
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const spin = keyframes`
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${st.bgCardAlt};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: ${props => props.theme.spacing.xxl} 0;
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
    font-size: ${st.fontSm};
`;

interface SigningRequirementModalProps {
    isOpen: boolean;
    isCreating: boolean; // True while visit is being created
    onClose: () => void;
    onCancel: () => void; // Called when user cancels (deletes draft visit)
    visitId: string | null;
    visitNumber: string;
    customerName: string;
    protocols: ProtocolResponse[];
    onConfirm: () => void;
}

export const SigningRequirementModal = ({
    isOpen,
    isCreating,
    onClose,
    onCancel,
    visitId,
    visitNumber,
    customerName,
    protocols,
    onConfirm,
}: SigningRequirementModalProps) => {
    const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
    const [previewProtocolId, setPreviewProtocolId] = useState<string | null>(null);
    const [showSkipConfirmDialog, setShowSkipConfirmDialog] = useState(false);

    // Mutation for cancelling (deleting) draft visit
    const cancelVisitMutation = useMutation({
        mutationFn: () => {
            if (!visitId) throw new Error('No visit to cancel');
            return visitApi.cancelDraftVisit(visitId);
        },
        onSuccess: () => {
            onClose(); // Close the modal first
            onCancel(); // Then notify parent
        },
    });

    // Mutation for confirming draft visit
    const confirmVisitMutation = useMutation({
        mutationFn: () => {
            if (!visitId) throw new Error('No visit to confirm');
            return visitApi.confirmDraftVisit(visitId);
        },
        onSuccess: () => {
            onClose(); // Close the modal first
            onConfirm(); // Then notify parent
        },
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedForPrint(new Set());
            setPreviewProtocolId(null);
            setShowSkipConfirmDialog(false);
        }
    }, [isOpen]);

    const handleTogglePrint = (protocolId: string) => {
        setSelectedForPrint(prev => {
            const newSet = new Set(prev);
            if (newSet.has(protocolId)) {
                newSet.delete(protocolId);
            } else {
                newSet.add(protocolId);
            }
            return newSet;
        });
    };

    const handlePrint = (protocolId: string) => {
        const protocol = protocols.find(p => p.id === protocolId);
        const pdfUrl = protocol?.filledPdfUrl;

        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        } else {
            console.warn('PDF URL not available for protocol:', protocolId);
        }
    };

    const handlePreview = (protocolId: string) => {
        setPreviewProtocolId(protocolId);
    };

    const handleClosePreview = () => {
        setPreviewProtocolId(null);
    };

    const handleSkipSigning = () => {
        setShowSkipConfirmDialog(true);
    };

    const handleConfirmSkip = () => {
        setShowSkipConfirmDialog(false);
        onConfirm();
    };

    const handleCancelSkip = () => {
        setShowSkipConfirmDialog(false);
    };

    const handleCancel = () => {
        cancelVisitMutation.mutate();
    };

    const handleConfirm = () => {
        // TODO: Handle printing of selected documents
        confirmVisitMutation.mutate();
    };

    const mandatoryProtocols = protocols?.filter(p => p.isMandatory) || [];
    const allMandatoryReady = mandatoryProtocols.every(p =>
        p.status === 'READY_FOR_SIGNATURE'
    );

    const canProceed = allMandatoryReady || mandatoryProtocols.length === 0;
    const isProcessing = cancelVisitMutation.isPending || confirmVisitMutation.isPending;
    const canInteract = !isCreating && visitId !== null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Dokumentacja i Podpisy"
                maxWidth="1000px"
            >
                <ModalContent>

                    {isCreating ? (
                        <LoadingContainer>
                            <Spinner />
                            <span>Uzupełniam dane na protokole...</span>
                        </LoadingContainer>
                    ) : !protocols || protocols.length === 0 ? (
                        <EmptyState>
                            Brak wymaganych protokołów dla tej wizyty
                        </EmptyState>
                    ) : (
                        <DocumentList>
                            {protocols.map(protocol => (
                                <DocumentRow key={protocol.id}>
                                    <DocumentIcon>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </DocumentIcon>

                                    <DocumentInfo>
                                        <DocumentName>
                                            {protocol.templateName || 'Protokół'}
                                        </DocumentName>
                                    </DocumentInfo>

                                    <StatusBadge $mandatory={protocol.isMandatory}>
                                        {protocol.isMandatory ? 'Wymagany' : 'Opcjonalny'}
                                    </StatusBadge>

                                    <ActionButtons>
                                        {/* Preview button */}
                                        <IconButton
                                            onClick={() => handlePreview(protocol.id)}
                                            title="Podgląd"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                            </svg>
                                        </IconButton>

                                        {/* Print button */}
                                        <IconButton
                                            onClick={() => handlePrint(protocol.id)}
                                            title="Drukuj"
                                            disabled={!protocol.filledPdfUrl}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                                />
                                            </svg>
                                        </IconButton>

                                        {/* Tablet signature button */}
                                        <IconButton disabled title="Podpisz na tablecie">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </IconButton>
                                    </ActionButtons>
                                </DocumentRow>
                            ))}
                        </DocumentList>
                    )}

                    <FooterActions>
                        <PrimaryActionGroup>
                            <Button
                                $variant="secondary"
                                onClick={handleCancel}
                                disabled={!canInteract || isProcessing}
                            >
                                Anuluj wizytę
                            </Button>
                            <Button
                                $variant="primary"
                                onClick={handleConfirm}
                                disabled={!canInteract || !canProceed || isProcessing}
                            >
                                {isProcessing ? 'Przetwarzanie...' : 'Zatwierdź i rozpocznij wizytę'}
                            </Button>
                        </PrimaryActionGroup>

                        {!canProceed && !isProcessing && canInteract && (
                            <SecondaryActionGroup>
                                <SkipButton
                                    $variant="secondary"
                                    onClick={handleSkipSigning}
                                >
                                    Rozpocznij bez podpisów
                                </SkipButton>
                            </SecondaryActionGroup>
                        )}
                    </FooterActions>
                </ModalContent>
            </Modal>

            {/* Document Preview Modal */}
            {previewProtocolId && visitId && (
                <DocumentPreview
                    isOpen={!!previewProtocolId}
                    onClose={handleClosePreview}
                    visitId={visitId}
                    protocolId={previewProtocolId}
                />
            )}

            {/* Skip Signing Confirmation Dialog */}
            <SkipSigningConfirmDialog
                isOpen={showSkipConfirmDialog}
                onConfirm={handleConfirmSkip}
                onCancel={handleCancelSkip}
            />
        </>
    );
};
