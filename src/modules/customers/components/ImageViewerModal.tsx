import { useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: ${props => props.theme.spacing.lg};
    animation: fadeIn 0.2s ease;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

const ModalContent = styled.div`
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const ImageContainer = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000;
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const Image = styled.img`
    max-width: 90vw;
    max-height: 85vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: ${props => props.theme.radii.lg};
`;

const ImageInfo = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ImageName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
`;

const CloseButton = styled.button`
    position: absolute;
    top: ${props => props.theme.spacing.md};
    right: ${props => props.theme.spacing.md};
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: white;
        transform: scale(1.1);
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

const DownloadButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: ${props => props.theme.radii.md};
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    color: white;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const NavigationButton = styled.button<{ $direction: 'prev' | 'next' }>`
    position: absolute;
    top: 50%;
    ${props => props.$direction === 'prev' ? 'left: 20px;' : 'right: 20px;'}
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: white;
        transform: translateY(-50%) scale(1.1);
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        &:hover {
            transform: translateY(-50%);
        }
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

interface ImageViewerModalProps {
    imageUrl: string;
    imageName: string;
    isOpen: boolean;
    onClose: () => void;
    onDownload?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    onNext?: () => void;
    onPrev?: () => void;
}

export const ImageViewerModal = ({
    imageUrl,
    imageName,
    isOpen,
    onClose,
    onDownload,
    hasNext = false,
    hasPrev = false,
    onNext,
    onPrev,
}: ImageViewerModalProps) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight' && hasNext && onNext) {
                onNext();
            } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
                onPrev();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, hasNext, hasPrev, onNext, onPrev]);

    if (!isOpen) return null;

    return (
        <ModalOverlay onClick={onClose}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
                <CloseButton onClick={onClose} title="Zamknij (Esc)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </CloseButton>

                {hasPrev && onPrev && (
                    <NavigationButton
                        $direction="prev"
                        onClick={onPrev}
                        title="Poprzednie (←)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </NavigationButton>
                )}

                {hasNext && onNext && (
                    <NavigationButton
                        $direction="next"
                        onClick={onNext}
                        title="Następne (→)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </NavigationButton>
                )}

                <ImageContainer>
                    <Image src={imageUrl} alt={imageName} />
                    <ImageInfo>
                        <ImageName>{imageName}</ImageName>
                        {onDownload && (
                            <DownloadButton onClick={onDownload}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Pobierz
                            </DownloadButton>
                        )}
                    </ImageInfo>
                </ImageContainer>
            </ModalContent>
        </ModalOverlay>
    );
};
