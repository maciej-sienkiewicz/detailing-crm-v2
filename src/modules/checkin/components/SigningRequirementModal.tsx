import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/common/components/Modal';
import { Button } from '@/common/components/Button';
import { visitApi } from '@/modules/visits/api/visitApi';
import { DocumentPreview } from './DocumentPreview';
import { SkipSigningConfirmDialog } from './SkipSigningConfirmDialog';
import type { ProtocolResponse } from '../types';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.md};
`;

const Header = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    margin-bottom: ${props => props.theme.spacing.md};
`;

const Title = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const Subtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;
`;

const DocumentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    max-height: 500px;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.xs};
`;

const DocumentRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        box-shadow: ${props => props.theme.shadows.sm};
    }
`;

const DocumentIcon = styled.div`
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => props.theme.colors.primary}15;
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.primary};
    flex-shrink: 0;

    svg {
        width: 24px;
        height: 24px;
    }
`;

const DocumentInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const DocumentName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const DocumentDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const StatusBadge = styled.span<{ $mandatory: boolean }>`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: ${props => props.$mandatory
        ? props.theme.colors.error + '15'
        : props.theme.colors.textMuted + '15'};
    color: ${props => props.$mandatory
        ? props.theme.colors.error
        : props.theme.colors.textMuted};
`;

const ActionButtons = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    align-items: center;
`;

const IconButton = styled.button`
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: ${props => props.theme.colors.surfaceHover};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${props => props.theme.colors.primary}15;
        color: ${props => props.theme.colors.primary};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: ${props => props.theme.colors.primary};
`;

const FooterActions = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.lg};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const PrimaryActionGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
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

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
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
    const allMandatoryHandled = mandatoryProtocols.every(p =>
        selectedForPrint.has(p.id)
    );

    const canProceed = allMandatoryHandled || mandatoryProtocols.length === 0;
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
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div className="spinner" style={{
                                    border: '3px solid #f3f4f6',
                                    borderTop: '3px solid #3b82f6',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                <div style={{ fontSize: '16px', fontWeight: 500 }}>
                                    Uzupełniam dane na protokole...
                                </div>
                            </div>
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
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
                                            title="Podgląd dokumentu"
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

                                        {/* Print checkbox */}
                                        <Checkbox
                                            checked={selectedForPrint.has(protocol.id)}
                                            onChange={() => handleTogglePrint(protocol.id)}
                                            title="Zaznacz do druku"
                                        />

                                        {/* Tablet signature (disabled placeholder) */}
                                        <IconButton disabled title="Wyślij na tablet (Wkrótce)">
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
