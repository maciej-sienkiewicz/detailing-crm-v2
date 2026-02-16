import { useState } from 'react';
import styled from 'styled-components';
import type { VehiclePhoto } from '../types';
import { useVehiclePhotoGallery, useDeleteVehiclePhoto } from '../hooks';
import { UploadPhotoModal } from './UploadPhotoModal';
import { t } from '@/common/i18n';

const GalleryContainer = styled.div`
    background: white;
`;

const GalleryHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
`;

const HeaderLeft = styled.div``;

const Title = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const UploadButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
`;

const PhotoCard = styled.div`
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f8fafc;

    &:hover {
        transform: translateY(-4px);
        box-shadow: ${props => props.theme.shadows.lg};
    }
`;

const PhotoImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const PhotoOverlay = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    padding: ${props => props.theme.spacing.md};
    opacity: 0;
    transition: opacity 0.2s ease;

    ${PhotoCard}:hover & {
        opacity: 1;
    }
`;

const PhotoDescription = styled.p`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xs};
    color: white;
    line-height: 1.4;
`;

const PhotoMeta = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xs};
    color: rgba(255, 255, 255, 0.8);
`;

const SourceBadge = styled.span<{ $source: 'VEHICLE' | 'VISIT' }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;

    ${props => props.$source === 'VEHICLE' ? `
        background: var(--brand-primary);
        color: white;
    ` : `
        background: #10b981;
        color: white;
    `}
`;

const DeleteButton = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.full};
    border: none;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    z-index: 10;

    ${PhotoCard}:hover & {
        opacity: 1;
    }

    &:hover {
        background: rgba(220, 38, 38, 1);
        transform: scale(1.1);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.lg};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
    min-width: 36px;
    height: 36px;
    padding: 0 ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive ? 'var(--brand-primary)' : 'white'};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        ${props => !props.$isActive && `
            background: ${props.theme.colors.surfaceHover};
        `}
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const PageInfo = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    margin: 0 ${props => props.theme.spacing.sm};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyIcon = styled.div`
    font-size: 64px;
    margin-bottom: ${props => props.theme.spacing.md};
    opacity: 0.5;
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl};
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 4px solid ${props => props.theme.colors.border};
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

interface VehiclePhotoGalleryProps {
    vehicleId: string;
    photos?: VehiclePhoto[];
}

export const VehiclePhotoGallery = ({ vehicleId }: VehiclePhotoGalleryProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const pageSize = 12;
    const { photos, pagination, isLoading } = useVehiclePhotoGallery(vehicleId, currentPage, pageSize);
    const { deletePhoto, isDeleting } = useDeleteVehiclePhoto(vehicleId);

    const handleDeletePhoto = (photoId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Czy na pewno chcesz usunąć to zdjęcie?')) {
            deletePhoto(photoId);
        }
    };

    const handlePhotoClick = (photo: VehiclePhoto) => {
        window.open(photo.fullSizeUrl, '_blank');
    };

    const renderPageNumbers = () => {
        if (!pagination || pagination.totalPages <= 1) return null;

        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <PageButton
                    key={i}
                    $isActive={i === currentPage}
                    onClick={() => setCurrentPage(i)}
                >
                    {i}
                </PageButton>
            );
        }

        return pages;
    };

    return (
        <>
            <GalleryContainer>
                <GalleryHeader>
                    <HeaderLeft>
                        <Title>{t.vehicles.detail.photoGallery.title}</Title>
                        <Subtitle>
                            {pagination ? `${pagination.total} ${pagination.total === 1 ? 'zdjęcie' : pagination.total < 5 ? 'zdjęcia' : 'zdjęć'}` : 'Ładowanie...'}
                        </Subtitle>
                    </HeaderLeft>
                    <UploadButton onClick={() => setIsUploadModalOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        {t.vehicles.detail.photoGallery.uploadPhoto}
                    </UploadButton>
                </GalleryHeader>

                {isLoading ? (
                    <LoadingContainer>
                        <Spinner />
                    </LoadingContainer>
                ) : photos.length === 0 ? (
                    <EmptyState>
                        <EmptyIcon>📸</EmptyIcon>
                        <EmptyText>{t.vehicles.detail.photoGallery.noPhotos}</EmptyText>
                    </EmptyState>
                ) : (
                    <>
                        <PhotoGrid>
                            {photos.map(photo => (
                                <PhotoCard key={photo.id} onClick={() => handlePhotoClick(photo)}>
                                    <PhotoImage
                                        src={photo.thumbnailUrl}
                                        alt={photo.description || 'Zdjęcie pojazdu'}
                                        loading="lazy"
                                    />
                                    {photo.source === 'VEHICLE' && (
                                        <DeleteButton
                                            onClick={(e) => handleDeletePhoto(photo.id, e)}
                                            disabled={isDeleting}
                                            title="Usuń zdjęcie"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </DeleteButton>
                                    )}
                                    <PhotoOverlay>
                                        <PhotoDescription>{photo.description || 'Brak opisu'}</PhotoDescription>
                                        <PhotoMeta>
                                            <SourceBadge $source={photo.source}>
                                                {photo.source === 'VEHICLE' ? 'Pojazd' : 'Wizyta'}
                                            </SourceBadge>
                                            {photo.visitNumber && (
                                                <span>• {photo.visitNumber}</span>
                                            )}
                                        </PhotoMeta>
                                    </PhotoOverlay>
                                </PhotoCard>
                            ))}
                        </PhotoGrid>

                        {pagination && pagination.totalPages > 1 && (
                            <Pagination>
                                <PageButton
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    ←
                                </PageButton>

                                {renderPageNumbers()}

                                <PageButton
                                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={currentPage === pagination.totalPages}
                                >
                                    →
                                </PageButton>

                                <PageInfo>
                                    Strona {currentPage} z {pagination.totalPages}
                                </PageInfo>
                            </Pagination>
                        )}
                    </>
                )}
            </GalleryContainer>

            <UploadPhotoModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                vehicleId={vehicleId}
            />
        </>
    );
};
