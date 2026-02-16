import { useState } from 'react';
import styled from 'styled-components';
import type { VehiclePhoto } from '../types';

const GalleryContainer = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const ImageContainer = styled.div`
    position: relative;
    flex: 1;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-height: 0;
`;

const Image = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.full};
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
`;

const NavigationButton = styled.button`
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: ${props => props.theme.radii.full};
    border: none;
    background: rgba(255, 255, 255, 0.95);
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;

    &:hover {
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        color: var(--brand-primary);
    }

    &:active {
        transform: translateY(-50%) scale(0.95);
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const PrevButton = styled(NavigationButton)`
    left: 10px;
`;

const NextButton = styled(NavigationButton)`
    right: 10px;
`;

const ImageCounter = styled.div`
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 12px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    backdrop-filter: blur(4px);
`;

const ImageDescription = styled.div`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    background: white;
    border-top: 1px solid ${props => props.theme.colors.border};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

interface VehicleMiniGalleryProps {
    photos: VehiclePhoto[];
}

export const VehicleMiniGallery = ({ photos }: VehicleMiniGalleryProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrevious = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
    };

    const currentPhoto = photos[currentIndex];

    return (
        <GalleryContainer>
            <ImageContainer>
                {photos.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>📸</EmptyIcon>
                        <EmptyText>Brak zdjęć</EmptyText>
                    </EmptyState>
                ) : (
                    <>
                        <Image
                            src={currentPhoto.photoUrl}
                            alt={currentPhoto.description || 'Zdjęcie pojazdu'}
                        />
                        <PrevButton
                            onClick={handlePrevious}
                            disabled={photos.length <= 1}
                            title="Poprzednie zdjęcie"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </PrevButton>
                        <NextButton
                            onClick={handleNext}
                            disabled={photos.length <= 1}
                            title="Następne zdjęcie"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </NextButton>
                        <ImageCounter>
                            {currentIndex + 1} / {photos.length}
                        </ImageCounter>
                    </>
                )}
            </ImageContainer>

            {currentPhoto?.description && (
                <ImageDescription>{currentPhoto.description}</ImageDescription>
            )}
        </GalleryContainer>
    );
};
