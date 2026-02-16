import { useState } from 'react';
import styled from 'styled-components';
import type { VehiclePhoto } from '../types';

const GalleryContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
`;

const GalleryHeader = styled.div`
    padding: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
`;

const GalleryTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const GalleryCount = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-left: ${props => props.theme.spacing.xs};
`;

const ImageContainer = styled.div`
    position: relative;
    flex: 1;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
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
    font-size: 48px;
    opacity: 0.5;
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
`;

const NavigationButton = styled.button`
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
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
        width: 20px;
        height: 20px;
    }
`;

const PrevButton = styled(NavigationButton)`
    left: 12px;
`;

const NextButton = styled(NavigationButton)`
    right: 12px;
`;

const ImageCounter = styled.div`
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 6px 12px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    backdrop-filter: blur(4px);
`;

const ImageDescription = styled.div`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: white;
    border-top: 1px solid ${props => props.theme.colors.border};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    text-align: center;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
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
            <GalleryHeader>
                <GalleryTitle>
                    Galeria
                    <GalleryCount>({photos.length})</GalleryCount>
                </GalleryTitle>
            </GalleryHeader>

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
