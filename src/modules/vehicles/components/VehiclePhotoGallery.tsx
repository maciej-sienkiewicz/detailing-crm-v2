import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import type { VehiclePhoto } from '../types';
import { useVehiclePhotoGallery, useDeleteVehiclePhoto } from '../hooks';
import { UploadPhotoModal } from './UploadPhotoModal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { t } from '@/common/i18n';

const spin = keyframes`to { transform: rotate(360deg); }`;

const GalleryContainer = styled.div`
    background: ${st.bgCard};
`;

const GalleryHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const HeaderLeft = styled.div``;

const Title = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const UploadButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: ${st.accentBlue};
    color: white;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);

    &:hover { background: #2563EB; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
    svg { width: 15px; height: 15px; }
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    padding: 20px;
`;

const PhotoCard = styled.div`
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: ${st.radiusSm};
    overflow: hidden;
    border: 1px solid ${st.border};
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${st.bgCardAlt};

    &:hover {
        transform: translateY(-3px);
        box-shadow: ${st.shadowMd};
        border-color: ${st.borderHover};
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
    padding: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;

    ${PhotoCard}:hover & { opacity: 1; }
`;

const PhotoDescription = styled.p`
    margin: 0 0 4px;
    font-size: ${st.fontXs};
    color: white;
    line-height: 1.4;
`;

const PhotoMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: rgba(255, 255, 255, 0.8);
`;

const SourceBadge = styled.span<{ $source: 'VEHICLE' | 'VISIT' }>`
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: ${st.radiusSm};
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;

    ${props => props.$source === 'VEHICLE' ? `
        background: ${st.accentBlue};
        color: white;
    ` : `
        background: ${st.accentGreen};
        color: white;
    `}
`;

const DeleteButton = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 30px;
    height: 30px;
    border-radius: ${st.radiusFull};
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

    ${PhotoCard}:hover & { opacity: 1; }
    &:hover { background: ${st.accentRed}; transform: scale(1.1); }
    svg { width: 14px; height: 14px; }
`;

const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px 20px;
    border-top: 1px solid ${st.border};
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    border: 1px solid ${props => props.$isActive ? st.accentBlue : st.border};
    border-radius: ${st.radiusSm};
    background: ${props => props.$isActive ? st.accentBlue : st.bgCard};
    color: ${props => props.$isActive ? 'white' : st.text};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        background: ${props => props.$isActive ? st.accentBlue : st.accentBlueDim};
        color: ${props => props.$isActive ? 'white' : st.accentBlue};
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const PageInfo = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    margin: 0 6px;
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 48px 20px;
    color: ${st.textMuted};
`;

const EmptyIcon = styled.div`
    font-size: 52px;
    margin-bottom: 12px;
    opacity: 0.5;
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${st.fontMd};
    color: ${st.textMuted};
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
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
        const endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <PageButton key={i} $isActive={i === currentPage} onClick={() => setCurrentPage(i)}>
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
                            {pagination
                                ? `${pagination.total} ${pagination.total === 1 ? 'zdjęcie' : pagination.total < 5 ? 'zdjęcia' : 'zdjęć'}`
                                : 'Ładowanie...'
                            }
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
                    <LoadingContainer><Spinner /></LoadingContainer>
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
                                            onClick={e => handleDeletePhoto(photo.id, e)}
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
                                            {photo.visitNumber && <span>· {photo.visitNumber}</span>}
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
                                >←</PageButton>

                                {renderPageNumbers()}

                                <PageButton
                                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={currentPage === pagination.totalPages}
                                >→</PageButton>

                                <PageInfo>Strona {currentPage} z {pagination.totalPages}</PageInfo>
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
