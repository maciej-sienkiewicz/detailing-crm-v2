// src/modules/checkin/components/PhotoDocumentationStep.tsx

import { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { Toggle } from '@/common/components/Toggle';
import { t } from '@/common/i18n';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import type { CheckInFormData, PhotoSlot, DamagePoint } from '../types';
import { VehicleDamageMapper } from './VehicleDamageMapper';

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const QRSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.xl};
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.02) 100%);
    border-radius: ${props => props.theme.radii.lg};
    border: 2px dashed ${props => props.theme.colors.primary};
`;

const QRTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const QRDescription = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;
    text-align: center;
`;

const QRPlaceholder = styled.div`
    width: 200px;
    height: 200px;
    padding: ${props => props.theme.spacing.lg};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    box-shadow: ${props => props.theme.shadows.lg};
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    font-style: italic;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
    justify-content: center;
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const PhotoCard = styled.div`
    aspect-ratio: 4 / 3;
    border: 2px solid ${props => props.theme.colors.primary};
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    background: rgba(14, 165, 233, 0.05);
    transition: all ${props => props.theme.transitions.normal};
    position: relative;
    overflow: hidden;
`;

const PhotoThumbnail = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
`;

const PhotoOverlay = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
    padding: ${props => props.theme.spacing.sm};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    z-index: 1;
`;

const PhotoDescription = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: white;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const PhotoTimestamp = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: rgba(255, 255, 255, 0.7);
    text-align: left;
`;

const StatusSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    align-items: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
    }
`;

const StatusText = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

interface PhotoDocumentationStepProps {
    formData: CheckInFormData;
    reservationId: string;
    onChange: (updates: Partial<CheckInFormData>) => void;
}

// Helper function to detect mobile device
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

export const PhotoDocumentationStep = ({ formData, reservationId, onChange }: PhotoDocumentationStepProps) => {
    const { uploadSession, photos, refreshPhotos, isRefreshing } = usePhotoUpload(reservationId);
    const [showDamageDocumentation, setShowDamageDocumentation] = useState(false);
    const [showPhotoDocumentation, setShowPhotoDocumentation] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const isMobile = isMobileDevice();

    useEffect(() => {
        if (photos) {
            onChange({ photos });
        }
    }, [photos]);

    const uploadedPhotos = formData.photos || [];
    const photosCount = uploadedPhotos.length;

    const mobileUploadUrl = uploadSession
        ? `${window.location.origin}/checkin/mobile/${uploadSession.sessionId}?token=${uploadSession.token}`
        : '';

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    };

    const handleDamagePointsChange = (points: DamagePoint[]) => {
        onChange({ damagePoints: points });
    };

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);

        // Here you would implement actual photo upload logic
        // For now, we'll simulate it with a timeout
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Add uploaded photos to formData with preview URLs
        const newPhotos: PhotoSlot[] = Array.from(files).map((file, index) => ({
            id: `${Date.now()}_${index}`,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            previewUrl: URL.createObjectURL(file),
        }));

        onChange({ photos: [...uploadedPhotos, ...newPhotos] });
        setIsUploading(false);
    };

    const handleChooseFromDisk = () => {
        fileInputRef.current?.click();
    };

    const handleTakePhoto = () => {
        cameraInputRef.current?.click();
    };

    return (
        <StepContainer>
            <Card>
                <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CardTitle>Dokumentacja zdjęciowa (opcjonalna)</CardTitle>
                    <Toggle
                        checked={showPhotoDocumentation}
                        onChange={setShowPhotoDocumentation}
                        label="Rozwiń sekcję"
                    />
                </CardHeader>

                {showPhotoDocumentation && (
                    <>
                        <QRSection>
                            <QRTitle>Zeskanuj kod QR aby dodać zdjęcia</QRTitle>
                            <QRDescription>Użyj telefonu aby wykonać i przesłać zdjęcia pojazdu</QRDescription>
                            <QRPlaceholder>
                                Tu pojawi się QR kod jak przygotujemy implementację
                            </QRPlaceholder>

                            <HiddenFileInput
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                            <HiddenFileInput
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />

                            <ButtonGroup>
                                <Button $variant="secondary" onClick={refreshPhotos} disabled={isRefreshing}>
                                    {isRefreshing ? t.common.loading : 'Odśwież zdjęcia'}
                                </Button>
                                <Button
                                    $variant="secondary"
                                    onClick={handleChooseFromDisk}
                                    disabled={isUploading}
                                >
                                    📁 Wybierz z dysku
                                </Button>
                                {isMobile && (
                                    <Button
                                        $variant="secondary"
                                        onClick={handleTakePhoto}
                                        disabled={isUploading}
                                    >
                                        📷 Zrób zdjęcie
                                    </Button>
                                )}
                            </ButtonGroup>

                            {isUploading && (
                                <div style={{ fontSize: '14px', color: '#64748b' }}>
                                    Przesyłanie zdjęć...
                                </div>
                            )}
                        </QRSection>

                        {uploadedPhotos.length > 0 && (
                            <>
                                <div>
                                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
                                        Przesłane zdjęcia ({photosCount})
                                    </h4>

                                    <PhotoGrid>
                                        {uploadedPhotos.map((photo, index) => (
                                            <PhotoCard key={photo.id || photo.fileId || index}>
                                                {photo.previewUrl && (
                                                    <PhotoThumbnail src={photo.previewUrl} alt={photo.fileName || 'Zdjęcie pojazdu'} />
                                                )}
                                                <PhotoOverlay>
                                                    {photo.fileName && (
                                                        <PhotoDescription style={{ color: 'white' }}>{photo.fileName}</PhotoDescription>
                                                    )}
                                                    {photo.description && (
                                                        <PhotoDescription style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{photo.description}</PhotoDescription>
                                                    )}
                                                    {photo.uploadedAt && (
                                                        <PhotoTimestamp style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{formatTimestamp(photo.uploadedAt)}</PhotoTimestamp>
                                                    )}
                                                </PhotoOverlay>
                                            </PhotoCard>
                                        ))}
                                    </PhotoGrid>
                                </div>

                                <StatusSection>
                                    <StatusText>
                                        Dodano {photosCount} {photosCount === 1 ? 'zdjęcie' : photosCount < 5 ? 'zdjęcia' : 'zdjęć'}
                                    </StatusText>
                                    <Badge $variant="success">✓ {photosCount}</Badge>
                                </StatusSection>
                            </>
                        )}
                    </>
                )}
            </Card>

            <Card>
                <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CardTitle>Dokumentacja uszkodzeń (opcjonalna)</CardTitle>
                    <Toggle
                        checked={showDamageDocumentation}
                        onChange={setShowDamageDocumentation}
                        label="Rozwiń sekcję"
                    />
                </CardHeader>

                {showDamageDocumentation && (
                    <>
                        <VehicleDamageMapper
                            imageUrl="/assets/image_627063.jpg"
                            points={formData.damagePoints || []}
                            onChange={handleDamagePointsChange}
                        />
                    </>
                )}
            </Card>
        </StepContainer>
    );
};
