// src/modules/checkin/components/PhotoDocumentationStep.tsx

import { useEffect, useState } from 'react';
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

const QRCodeWrapper = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background-color: white;
    border-radius: ${props => props.theme.radii.md};
    box-shadow: ${props => props.theme.shadows.lg};
    display: flex;
    align-items: center;
    justify-content: center;

    img {
        width: 200px;
        height: 200px;
    }
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
    border: 2px dashed ${props => props.theme.colors.primary};
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    background: rgba(14, 165, 233, 0.05);
    transition: all ${props => props.theme.transitions.normal};
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, transparent 100%);
    }
`;

const PhotoIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.full};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all ${props => props.theme.transitions.normal};

    svg {
        width: 24px;
        height: 24px;
    }
`;

const PhotoInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    z-index: 1;
`;

const PhotoDescription = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    text-align: center;
`;

const PhotoTimestamp = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
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

export const PhotoDocumentationStep = ({ formData, reservationId, onChange }: PhotoDocumentationStepProps) => {
    const { uploadSession, photos, refreshPhotos, isRefreshing } = usePhotoUpload(reservationId);
    const [showDamageDocumentation, setShowDamageDocumentation] = useState(false);
    const [showPhotoDocumentation, setShowPhotoDocumentation] = useState(true);

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

    const qrCodeUrl = mobileUploadUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUploadUrl)}`
        : '';

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    };

    const handleDamagePointsChange = (points: DamagePoint[]) => {
        onChange({ damagePoints: points });
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
                        {uploadSession && (
                            <QRSection>
                                <QRTitle>Zeskanuj kod QR aby dodać zdjęcia</QRTitle>
                                <QRDescription>Użyj telefonu aby wykonać i przesłać zdjęcia pojazdu</QRDescription>
                                <QRCodeWrapper>
                                    <img src={qrCodeUrl} alt="QR Code" />
                                </QRCodeWrapper>
                                <Button $variant="secondary" onClick={refreshPhotos} disabled={isRefreshing}>
                                    {isRefreshing ? t.common.loading : 'Odśwież zdjęcia'}
                                </Button>
                            </QRSection>
                        )}

                        <div>
                            <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
                                Przesłane zdjęcia ({photosCount})
                            </h4>

                            {uploadedPhotos.length === 0 ? (
                                <EmptyState>
                                    Brak przesłanych zdjęć. Użyj kodu QR powyżej aby dodać zdjęcia z telefonu.
                                </EmptyState>
                            ) : (
                                <PhotoGrid>
                                    {uploadedPhotos.map((photo, index) => (
                                        <PhotoCard key={photo.id || photo.fileId || index}>
                                            <PhotoIcon>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </PhotoIcon>
                                            <PhotoInfo>
                                                {photo.description && (
                                                    <PhotoDescription>{photo.description}</PhotoDescription>
                                                )}
                                                {photo.uploadedAt && (
                                                    <PhotoTimestamp>{formatTimestamp(photo.uploadedAt)}</PhotoTimestamp>
                                                )}
                                            </PhotoInfo>
                                        </PhotoCard>
                                    ))}
                                </PhotoGrid>
                            )}
                        </div>

                        <StatusSection>
                            <StatusText>
                                {photosCount > 0
                                    ? `Dodano ${photosCount} ${photosCount === 1 ? 'zdjęcie' : photosCount < 5 ? 'zdjęcia' : 'zdjęć'}`
                                    : 'Dokumentacja zdjęciowa jest opcjonalna'}
                            </StatusText>
                            {photosCount > 0 && (
                                <Badge $variant="success">✓ {photosCount}</Badge>
                            )}
                        </StatusSection>
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
