import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/common/components/Modal';
import { Button } from '@/common/components/Button';
import { protocolsApi } from '@/modules/protocols/api/protocolsApi';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    height: 70vh;
`;

const PreviewContainer = styled.div`
    flex: 1;
    background: ${props => props.theme.colors.surfaceHover};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
`;

const IframePreview = styled.iframe`
    width: 100%;
    height: 100%;
    border: none;
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
`;

const ErrorIcon = styled.div`
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: ${props => props.theme.colors.error}15;
    color: ${props => props.theme.colors.error};
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 32px;
        height: 32px;
    }
`;

const ErrorMessage = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const ErrorDetails = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const FooterActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    justify-content: flex-end;
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const PlaceholderPreview = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.xxl};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
`;

const PlaceholderIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary}10;
    color: ${props => props.theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 48px;
        height: 48px;
    }
`;

const PlaceholderText = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const PlaceholderDescription = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    max-width: 400px;
`;

interface DocumentPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    visitId: string;
    protocolId: string;
}

export const DocumentPreview = ({
    isOpen,
    onClose,
    visitId,
    protocolId,
}: DocumentPreviewProps) => {
    const [pdfError, setPdfError] = useState(false);

    // Fetch protocol details
    const { data: protocols, isLoading, error } = useQuery({
        queryKey: ['visit-protocols', visitId],
        queryFn: () => protocolsApi.getVisitProtocols(visitId),
        enabled: isOpen && !!visitId,
    });

    const protocol = protocols?.find(p => p.id === protocolId);
    const pdfUrl = protocol?.filledPdfUrl || protocol?.protocolTemplate?.templateUrl;

    const handlePdfError = () => {
        setPdfError(true);
    };

    const renderPreviewContent = () => {
        if (isLoading) {
            return (
                <LoadingContainer>
                    <Spinner />
                    <div>Ładowanie podglądu dokumentu...</div>
                </LoadingContainer>
            );
        }

        if (error) {
            return (
                <ErrorContainer>
                    <ErrorIcon>
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
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </ErrorIcon>
                    <ErrorMessage>Nie udało się załadować dokumentu</ErrorMessage>
                    <ErrorDetails>
                        Wystąpił problem podczas pobierania dokumentu. Spróbuj ponownie później.
                    </ErrorDetails>
                </ErrorContainer>
            );
        }

        if (!protocol || !pdfUrl) {
            return (
                <PlaceholderPreview>
                    <PlaceholderIcon>
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
                    </PlaceholderIcon>
                    <PlaceholderText>Podgląd niedostępny</PlaceholderText>
                    <PlaceholderDescription>
                        Dokument nie został jeszcze wygenerowany lub nie jest dostępny.
                    </PlaceholderDescription>
                </PlaceholderPreview>
            );
        }

        if (pdfError) {
            return (
                <ErrorContainer>
                    <ErrorIcon>
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
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </ErrorIcon>
                    <ErrorMessage>Problem z wyświetleniem PDF</ErrorMessage>
                    <ErrorDetails>
                        Twoja przeglądarka może nie obsługiwać podglądu PDF.
                        Spróbuj otworzyć dokument w nowej karcie.
                    </ErrorDetails>
                    <Button
                        $variant="primary"
                        onClick={() => window.open(pdfUrl, '_blank')}
                    >
                        Otwórz w nowej karcie
                    </Button>
                </ErrorContainer>
            );
        }

        // Try to display PDF via iframe
        return (
            <IframePreview
                src={`${pdfUrl}#toolbar=0`}
                title="Document Preview"
                onError={handlePdfError}
            />
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={protocol?.protocolTemplate?.name || 'Podgląd dokumentu'}
            maxWidth="1000px"
        >
            <ModalContent>
                <PreviewContainer>
                    {renderPreviewContent()}
                </PreviewContainer>

                <FooterActions>
                    {pdfUrl && !pdfError && (
                        <Button
                            $variant="secondary"
                            onClick={() => window.open(pdfUrl, '_blank')}
                        >
                            Otwórz w nowej karcie
                        </Button>
                    )}
                    <Button $variant="primary" onClick={onClose}>
                        Zamknij
                    </Button>
                </FooterActions>
            </ModalContent>
        </Modal>
    );
};
