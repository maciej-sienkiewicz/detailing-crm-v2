// src/modules/checkin/views/MobilePhotoUploadView.tsx

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { Input } from '@/common/components/Form';
import { t } from '@/common/i18n';
import { useMobilePhotoUpload } from '../hooks/useMobilePhotoUpload';
import type { PhotoSlotType, DamagePhotoType } from '../types';

const MobileContainer = styled.div`
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: ${props => props.theme.spacing.md};
    color: white;
`;

const Header = styled.div`
    padding: ${props => props.theme.spacing.lg} 0;
    text-align: center;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const Title = styled.h1`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    margin: 0 0 ${props => props.theme.spacing.xs} 0;
    color: white;
`;

const Subtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
`;

const SlotsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.xl};
`;

const SlotCard = styled.div<{ $completed: boolean }>`
    background-color: rgba(255, 255, 255, 0.05);
    border: 2px solid ${props => props.$completed ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    transition: all ${props => props.theme.transitions.normal};

    ${props => props.$completed && `
        background-color: rgba(34, 197, 94, 0.1);
    `}
`;

const SlotHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const SlotTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    margin: 0;
    color: white;
`;

const CameraInput = styled.input`
    display: none;
`;

const CameraButton = styled.label`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    color: white;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    box-shadow: ${props => props.theme.shadows.md};

    &:active {
        transform: scale(0.98);
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const PreviewImage = styled.img`
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: ${props => props.theme.radii.md};
    margin-bottom: ${props => props.theme.spacing.md};
`;

const DescriptionInput = styled(Input)`
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
    margin-bottom: ${props => props.theme.spacing.md};

    &::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }

    &:focus {
        border-color: ${props => props.theme.colors.primary};
        background-color: rgba(255, 255, 255, 0.15);
    }
`;

const ActionButtons = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const UploadButton = styled(Button)`
    flex: 1;
`;

const RetakeButton = styled(Button)`
    flex: 1;
`;

const InfoBox = styled.div`
    background-color: rgba(14, 165, 233, 0.1);
    border: 1px solid rgba(14, 165, 233, 0.3);
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
`;

const ErrorBox = styled.div`
    background-color: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
    margin-top: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: #fca5a5;
`;

const ProgressBar = styled.div<{ $progress: number }>`
    width: 100%;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: ${props => props.theme.radii.full};
    overflow: hidden;
    margin-top: ${props => props.theme.spacing.md};

    &::after {
        content: '';
        display: block;
        width: ${props => props.$progress}%;
        height: 100%;
        background: linear-gradient(90deg, ${props => props.theme.colors.primary} 0%, #22c55e 100%);
        transition: width ${props => props.theme.transitions.slow};
    }
`;

interface PhotoSlotState {
    type: PhotoSlotType | DamagePhotoType;
    label: string;
    required: boolean;
    preview?: string;
    file?: File;
    description?: string;
    uploaded: boolean;
}

interface MobilePhotoUploadViewProps {
    sessionId: string;
    token: string;
}

export const MobilePhotoUploadView = ({ sessionId, token }: MobilePhotoUploadViewProps) => {

    const { validateSession, uploadPhoto, isValidating, isUploading, uploadError } = useMobilePhotoUpload();

    const [isValid, setIsValid] = useState(false);
    const [slots, setSlots] = useState<PhotoSlotState[]>([
        { type: 'front', label: t.checkin.photos.requiredSlots.front, required: true, uploaded: false },
        { type: 'rear', label: t.checkin.photos.requiredSlots.rear, required: true, uploaded: false },
        { type: 'left_side', label: t.checkin.photos.requiredSlots.left_side, required: true, uploaded: false },
        { type: 'right_side', label: t.checkin.photos.requiredSlots.right_side, required: true, uploaded: false },
    ]);

    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        const validate = async () => {
            if (sessionId && token) {
                const valid = await validateSession(sessionId, token);
                setIsValid(valid);
            }
        };
        validate();
    }, [sessionId, token]);

    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d')!;

                    let width = img.width;
                    let height = img.height;
                    const maxSize = 1920;

                    if (width > height && width > maxSize) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/jpeg',
                        0.85
                    );
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (slotType: string, file: File) => {
        const compressedFile = await compressImage(file);
        const preview = URL.createObjectURL(compressedFile);

        setSlots(prev => prev.map(slot =>
            slot.type === slotType
                ? { ...slot, file: compressedFile, preview, uploaded: false }
                : slot
        ));
    };

    const handleUpload = async (slotType: string) => {
        const slot = slots.find(s => s.type === slotType);
        if (!slot?.file || !sessionId || !token) return;

        const success = await uploadPhoto({
            sessionId,
            token,
            photo: slot.file,
            type: slot.type as PhotoSlotType | DamagePhotoType,
            description: slot.description,
        });

        if (success) {
            setSlots(prev => prev.map(s =>
                s.type === slotType ? { ...s, uploaded: true, file: undefined } : s
            ));
        }
    };

    const handleRetake = (slotType: string) => {
        setSlots(prev => prev.map(slot =>
            slot.type === slotType
                ? { ...slot, file: undefined, preview: undefined, uploaded: false }
                : slot
        ));
    };

    const completedCount = slots.filter(s => s.uploaded).length;
    const progress = (completedCount / slots.length) * 100;

    if (isValidating) {
        return (
            <MobileContainer>
                <Header>
                    <Title>{t.common.loading}</Title>
                </Header>
            </MobileContainer>
        );
    }

    if (!isValid) {
        return (
            <MobileContainer>
                <Header>
                    <Title>{t.checkin.mobile.sessionExpired}</Title>
                    <Subtitle>{t.checkin.mobile.invalidSession}</Subtitle>
                </Header>
            </MobileContainer>
        );
    }

    return (
        <MobileContainer>
            <Header>
                <Title>{t.checkin.mobile.title}</Title>
                <Subtitle>{t.checkin.mobile.subtitle}</Subtitle>
                <ProgressBar $progress={progress} />
            </Header>

            <InfoBox>{t.checkin.mobile.compressionInfo}</InfoBox>

            <SlotsList>
                {slots.map((slot) => (
                    <SlotCard key={slot.type} $completed={slot.uploaded}>
                        <SlotHeader>
                            <SlotTitle>{slot.label}</SlotTitle>
                            {slot.uploaded ? (
                                <Badge $variant="success">✓</Badge>
                            ) : slot.required ? (
                                <Badge $variant="warning">Wymagane</Badge>
                            ) : null}
                        </SlotHeader>

                        {slot.preview && !slot.uploaded && (
                            <>
                                <PreviewImage src={slot.preview} alt={slot.label} />
                                <DescriptionInput
                                    placeholder={t.checkin.mobile.addDescription}
                                    value={slot.description || ''}
                                    onChange={(e) =>
                                        setSlots(prev => prev.map(s =>
                                            s.type === slot.type
                                                ? { ...s, description: e.target.value }
                                                : s
                                        ))
                                    }
                                />
                                <ActionButtons>
                                    <UploadButton
                                        $variant="primary"
                                        onClick={() => handleUpload(slot.type)}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? t.checkin.mobile.uploading : t.checkin.mobile.uploadPhoto}
                                    </UploadButton>
                                    <RetakeButton
                                        $variant="secondary"
                                        onClick={() => handleRetake(slot.type)}
                                        disabled={isUploading}
                                    >
                                        {t.checkin.mobile.retakePhoto}
                                    </RetakeButton>
                                </ActionButtons>
                                {uploadError && <ErrorBox>{uploadError}</ErrorBox>}
                            </>
                        )}

                        {!slot.preview && !slot.uploaded && (
                            <>
                                <CameraInput
                                    ref={el => fileInputRefs.current[slot.type] = el}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(slot.type, file);
                                    }}
                                    id={`camera-${slot.type}`}
                                />
                                <CameraButton htmlFor={`camera-${slot.type}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {t.checkin.mobile.takePhoto}
                                </CameraButton>
                            </>
                        )}

                        {slot.uploaded && (
                            <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '14px' }}>
                                {t.checkin.mobile.uploadSuccess}
                            </div>
                        )}
                    </SlotCard>
                ))}
            </SlotsList>
        </MobileContainer>
    );
};