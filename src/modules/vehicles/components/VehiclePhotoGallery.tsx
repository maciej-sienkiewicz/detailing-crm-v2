
import styled from 'styled-components';
import type { VehiclePhoto } from '../types';
import { t } from '@/common/i18n';

const GalleryContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const GalleryHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const UploadButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: ${props => props.theme.spacing.md};
`;

const PhotoCard = styled.div`
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
        transform: scale(1.05);
    }
`;

const PhotoImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface VehiclePhotoGalleryProps {
    photos: VehiclePhoto[];
    vehicleId: string;
}

export const VehiclePhotoGallery = ({ photos }: VehiclePhotoGalleryProps) => {
    return (
        <GalleryContainer>
            <GalleryHeader>
                <Title>{t.vehicles.detail.photoGallery.title}</Title>
                <UploadButton>
                    + {t.vehicles.detail.photoGallery.uploadPhoto}
                </UploadButton>
            </GalleryHeader>

            {photos.length === 0 ? (
                <EmptyState>
                    {t.vehicles.detail.photoGallery.noPhotos}
                </EmptyState>
            ) : (
                <PhotoGrid>
                    {photos.map(photo => (
                        <PhotoCard key={photo.id}>
                            <PhotoImage
                                src={photo.thumbnailUrl}
                                alt={photo.description}
                                loading="lazy"
                            />
                        </PhotoCard>
                    ))}
                </PhotoGrid>
            )}
        </GalleryContainer>
    );
};
