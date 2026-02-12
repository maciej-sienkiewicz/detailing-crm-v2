// src/modules/checkin/views/MobilePhotoUploadView.tsx

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { Input } from '@/common/components/Form';
import { t } from '@/common/i18n';
import { useMobilePhotoUpload } from '../hooks/useMobilePhotoUpload';

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

const PhotoList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.xl};
`;

const PhotoCard = styled.div<{ $completed: boolean }>`
    background-color: rgba(255, 255, 255, 0.05);
    border: 2px solid ${props => props.$completed ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    transition: all ${props => props.theme.transitions.normal};

    ${props => props.$completed && `
        background-color: rgba(34, 197, 94, 0.1);
    `}
`;

const PhotoHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const PhotoTitle = styled.h3`
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

const AddPhotoButton = styled.button`
    width: 100%;
    padding: ${props => props.theme.spacing.lg};
    background-color: rgba(255, 255, 255, 0.05);
    border: 2px dashed rgba(255, 255, 255, 0.3);
    border-radius: ${props => props.theme.radii.lg};
    color: white;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};

    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: ${props => props.theme.colors.primary};
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

const ProgressInfo = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.md};
    color: rgba(255, 255, 255, 0.7);
    font-size: ${props => props.theme.fontSizes.sm};
`;

interface PhotoState {
    id: string;
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
    const [photos, setPhotos] = useState<PhotoState[]>([]);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    const handleAddPhoto = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (file: File) => {
        const compressedFile = await compressImage(file);
        const preview = URL.createObjectURL(compressedFile);
        const newPhoto: PhotoState = {
            id: Date.now().toString(),
            file: compressedFile,
            preview,
            uploaded: false,
        };

        setPhotos(prev => [...prev, newPhoto]);
    };

    const handleUpload = async (photoId: string) => {
        const photo = photos.find(p => p.id === photoId);
        if (!photo?.file || !sessionId || !token) return;

        const success = await uploadPhoto({
            sessionId,
            token,
            photo: photo.file,
            description: photo.description,
        });

        if (success) {
            setPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, uploaded: true, file: undefined } : p
            ));
        }
    };

    const handleRetake = (photoId: string) => {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
    };

    const handleDescriptionChange = (photoId: string, description: string) => {
        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, description } : p
        ));
    };

    const uploadedCount = photos.filter(p => p.uploaded).length;
    const totalCount = photos.length;

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
                    <Title>Sesja wygasła</Title>
                    <Subtitle>Link do przesyłania zdjęć jest nieprawidłowy lub wygasł</Subtitle>
                </Header>
            </MobileContainer>
        );
    }

    return (
        <MobileContainer>
            <Header>
                <Title>Dodaj zdjęcia pojazdu</Title>
                <Subtitle>Dodaj dowolną liczbę zdjęć</Subtitle>
            </Header>

            <InfoBox>
                Zdjęcia są automatycznie kompresowane do optymalnej wielkości
            </InfoBox>

            {totalCount > 0 && (
                <ProgressInfo>
                    Przesłano {uploadedCount} z {totalCount} zdjęć
                </ProgressInfo>
            )}

            <PhotoList>
                {photos.map((photo) => (
                    <PhotoCard key={photo.id} $completed={photo.uploaded}>
                        <PhotoHeader>
                            <PhotoTitle>Zdjęcie #{photos.indexOf(photo) + 1}</PhotoTitle>
                            {photo.uploaded && (
                                <Badge $variant="success">✓</Badge>
                            )}
                        </PhotoHeader>

                        {photo.preview && !photo.uploaded && (
                            <>
                                <PreviewImage src={photo.preview} alt="Podgląd" />
                                <DescriptionInput
                                    placeholder="Dodaj opis (opcjonalnie)"
                                    value={photo.description || ''}
                                    onChange={(e) => handleDescriptionChange(photo.id, e.target.value)}
                                />
                                <ActionButtons>
                                    <UploadButton
                                        $variant="primary"
                                        onClick={() => handleUpload(photo.id)}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? 'Przesyłanie...' : 'Prześlij zdjęcie'}
                                    </UploadButton>
                                    <RetakeButton
                                        $variant="secondary"
                                        onClick={() => handleRetake(photo.id)}
                                        disabled={isUploading}
                                    >
                                        Usuń
                                    </RetakeButton>
                                </ActionButtons>
                                {uploadError && <ErrorBox>{uploadError}</ErrorBox>}
                            </>
                        )}

                        {photo.uploaded && (
                            <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '14px' }}>
                                ✓ Zdjęcie przesłane pomyślnie
                            </div>
                        )}
                    </PhotoCard>
                ))}
            </PhotoList>

            <CameraInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                }}
            />

            <AddPhotoButton onClick={handleAddPhoto}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Dodaj kolejne zdjęcie
            </AddPhotoButton>
        </MobileContainer>
    );
};
