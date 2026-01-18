// src/modules/checkin/components/PhotoDocumentationStep.tsx

import { useEffect } from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { Divider } from '@/common/components/Divider';
import { t, interpolate } from '@/common/i18n';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import type { CheckInFormData, PhotoSlotType } from '../types';

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

const PhotoSlot = styled.div<{ $uploaded: boolean }>`
    aspect-ratio: 4 / 3;
    border: 2px dashed ${props => props.$uploaded ? props.theme.colors.primary : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.$uploaded ? 'rgba(14, 165, 233, 0.05)' : props.theme.colors.surfaceAlt};
    transition: all ${props => props.theme.transitions.normal};
    position: relative;
    overflow: hidden;

    ${props => props.$uploaded && `
        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, transparent 100%);
        }
    `}
`;

const PhotoIcon = styled.div<{ $uploaded: boolean }>`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.full};
    background: ${props => props.$uploaded
    ? `linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%)`
    : props.theme.colors.border};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.$uploaded ? 'white' : props.theme.colors.textMuted};
    transition: all ${props => props.theme.transitions.normal};

    svg {
        width: 24px;
        height: 24px;
    }
`;

const PhotoLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    text-align: center;
`;

const PhotoTimestamp = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
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

    const requiredSlots: PhotoSlotType[] = ['front', 'rear', 'left_side', 'right_side'];

    useEffect(() => {
        if (photos) {
            onChange({ photos });
        }
    }, [photos]);

    const getPhotoByType = (type: PhotoSlotType) => {
        return formData.photos.find(p => p.type === type);
    };

    const requiredPhotosCount = requiredSlots.filter(type => getPhotoByType(type)).length;
    const missingCount = 0;
    const allRequiredUploaded = true;

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

    return (
        <StepContainer>
            <Card>
                <CardHeader>
                    <CardTitle>{t.checkin.photos.title}</CardTitle>
                </CardHeader>

                {uploadSession && (
                    <QRSection>
                        <QRTitle>{t.checkin.photos.qrCodeTitle}</QRTitle>
                        <QRDescription>{t.checkin.photos.qrCodeDescription}</QRDescription>
                        <QRCodeWrapper>
                            <img src={qrCodeUrl} alt="QR Code" />
                        </QRCodeWrapper>
                        <Button $variant="secondary" onClick={refreshPhotos} disabled={isRefreshing}>
                            {isRefreshing ? t.common.loading : t.checkin.photos.refreshPhotos}
                        </Button>
                    </QRSection>
                )}

                <Divider />

                <div>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
                        {t.checkin.photos.required}
                    </h4>
                    <PhotoGrid>
                        {requiredSlots.map(type => {
                            const photo = getPhotoByType(type);
                            const uploaded = !!photo;

                            return (
                                <PhotoSlot key={type} $uploaded={uploaded}>
                                    <PhotoIcon $uploaded={uploaded}>
                                        {uploaded ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </PhotoIcon>
                                    <PhotoLabel>{t.checkin.photos.requiredSlots[type]}</PhotoLabel>
                                    {photo && (
                                        <PhotoTimestamp>{formatTimestamp(photo.uploadedAt!)}</PhotoTimestamp>
                                    )}
                                </PhotoSlot>
                            );
                        })}
                    </PhotoGrid>
                </div>

                <StatusSection>
                    {allRequiredUploaded ? (
                        <>
                            <StatusText>{t.checkin.photos.allRequiredUploaded}</StatusText>
                            <Badge $variant="success">✓ {requiredPhotosCount}/4</Badge>
                        </>
                    ) : (
                        <>
                            <StatusText>
                                {interpolate(t.checkin.photos.missingRequired, { count: missingCount.toString() })}
                            </StatusText>
                            <Badge $variant="warning">{requiredPhotosCount}/4</Badge>
                        </>
                    )}
                </StatusSection>
            </Card>
        </StepContainer>
    );
};
