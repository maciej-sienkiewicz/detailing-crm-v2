// src/modules/checkin/components/PhotoDocumentationStep.tsx

import { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CheckInFormData, DamagePoint, PhotoSlot } from '../types';
import { VehicleDamageMapper } from './VehicleDamageMapper';
import { CheckinQRGenerator } from './CheckinQRGenerator';
import { TagChip } from '@/modules/photos/components/TagChip';
import { PhotoTagEditModal } from '@/modules/photos/components/PhotoTagEditModal';
import { useTagSuggestions, useUpdatePhotoTags } from '@/modules/photos/hooks/usePhotoTags';

// ─── Layout ───────────────────────────────────────────────────────────────────

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
    flex-wrap: wrap;

    @media (min-width: 640px) {
        padding: 14px 20px;
        gap: 12px;
    }
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
`;

const SectionNum = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${st.accentBlue};
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
`;

const SectionLabel = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 7px;

    svg {
        width: 17px;
        height: 17px;
        color: ${st.accentBlue};
        flex-shrink: 0;
    }
`;

const CountChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
`;

const SectionBody = styled.div`
    padding: 14px 16px;

    @media (min-width: 640px) {
        padding: 20px;
    }
`;

// ─── Upload zone ──────────────────────────────────────────────────────────────

const UploadZone = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 24px;
    border: 2px dashed ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    text-align: center;
    transition: border-color ${st.transition}, background ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }
`;

const UploadIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: ${st.accentBlueDim};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${st.accentBlue};

    svg {
        width: 24px;
        height: 24px;
    }
`;

const UploadTitle = styled.div`
    font-size: 15px;
    font-weight: 600;
    color: ${st.text};
`;

const UploadSubtitle = styled.div`
    font-size: 13px;
    color: ${st.textMuted};
    margin-top: -8px;
`;

const UploadActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
`;

const UploadBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const PrimaryUploadBtn = styled(UploadBtn)`
    background: ${st.accentBlue};
    color: #fff;
    border-color: ${st.accentBlue};

    &:hover:not(:disabled) {
        background: #1D4ED8;
        border-color: #1D4ED8;
        color: #fff;
    }
`;

const UploadingLabel = styled.div`
    font-size: 13px;
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    gap: 6px;
`;

const HiddenInput = styled.input`
    display: none;
`;

// ─── Photo grid ───────────────────────────────────────────────────────────────

const SectionDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 20px 0 16px;
`;

const PhotosHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
`;

const PhotosTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${st.text};
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @media (min-width: 640px) {
        grid-template-columns: repeat(3, 1fr);
    }

    @media (min-width: 900px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

// Wraps the image box + tags footer together
const PhotoCardWrapper = styled.div`
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    border: 1px solid ${st.border};
    overflow: hidden;
    background: ${st.bgCardAlt};
    transition: box-shadow ${st.transition}, border-color ${st.transition};

    &:hover {
        border-color: ${st.borderHover};
        box-shadow: ${st.shadowMd};
    }
`;

const PhotoImageBox = styled.div`
    aspect-ratio: 4 / 3;
    position: relative;
    overflow: hidden;
    background: ${st.bgCardAlt};

    &:hover .photo-overlay {
        opacity: 1;
    }
`;

const PhotoImg = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

const PhotoOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 10px;
    opacity: 0;
    transition: opacity 200ms ease;
`;

const PhotoName = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
`;

const PhotoTime = styled.span`
    font-size: 10px;
    color: rgba(255, 255, 255, 0.70);
    margin-top: 2px;
`;

const DeletePhotoBtn = styled.button`
    position: absolute;
    top: 6px;
    right: 6px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.85);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: background 150ms;
    z-index: 2;

    &:hover { background: #DC2626; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// Tags footer (below the image, always visible)
const TagsFooter = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 10px 8px;
    flex-wrap: wrap;
    background: ${st.bgCard};
    border-top: 1px solid ${st.border};
    min-height: 38px;
    cursor: pointer;
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const AddTagBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 9999px;
    border: 1px dashed ${st.border};
    background: transparent;
    font-size: 10px;
    font-weight: 600;
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    svg { width: 9px; height: 9px; }

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }
`;

// ─── Helper ───────────────────────────────────────────────────────────────────

const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhotoDocumentationStepProps {
    formData: CheckInFormData;
    reservationId: string;
    onChange: (updates: Partial<CheckInFormData>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PhotoDocumentationStep = ({ formData, reservationId, onChange }: PhotoDocumentationStepProps) => {
    const {
        photos,
        uploadPhoto,
        deletePhoto,
        refreshPhotos,
        isUploading,
        isDeleting,
        isRefreshing,
    } = usePhotoUpload(reservationId);

    const [showDamageSection, setShowDamageSection] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<PhotoSlot | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const isMobile = isMobileDevice();

    // Tag support
    const { data: suggestions = [] } = useTagSuggestions();
    const updatePhotoTags = useUpdatePhotoTags();

    useEffect(() => {
        if (photos && photos.length > 0) onChange({ photos });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photos]);

    const uploadedPhotos = formData.photos || [];

    const formatTimestamp = (ts: string) =>
        new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        try {
            await Promise.all(Array.from(files).map(f => uploadPhoto(f)));
        } catch {
            alert('Błąd podczas przesyłania zdjęć. Spróbuj ponownie.');
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) return;
        try {
            await deletePhoto(photoId);
        } catch {
            alert('Błąd podczas usuwania zdjęcia. Spróbuj ponownie.');
        }
    };

    const handleDamagePointsChange = (points: DamagePoint[]) => {
        onChange({ damagePoints: points });
    };

    // When modal closes, persist tags locally + save to backend
    const handleTagsSave = useCallback((photoId: string, tags: string[]) => {
        const updatedPhotos = uploadedPhotos.map(p =>
            p.id === photoId ? { ...p, tags } : p
        );
        onChange({ photos: updatedPhotos });

        updatePhotoTags.mutate({ photoId, tags });
        setEditingPhoto(null);
    }, [uploadedPhotos, onChange, updatePhotoTags]);

    const openTagEditor = (photo: PhotoSlot) => {
        setEditingPhoto(photo);
    };

    return (
        <StepContainer>

            {/* ── 1. Dokumentacja zdjęciowa ──────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>1</SectionNum>
                        <SectionLabel>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Dokumentacja zdjęciowa
                            <span style={{ fontSize: '12px', fontWeight: 400, color: st.textMuted }}>(opcjonalna)</span>
                            {uploadedPhotos.length > 0 && (
                                <CountChip>{uploadedPhotos.length}</CountChip>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                </SectionHead>
                <SectionBody>
                    <UploadZone>
                        <UploadIcon>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </UploadIcon>
                        <div>
                            <UploadTitle>Prześlij zdjęcia pojazdu</UploadTitle>
                            <UploadSubtitle>lub zeskanuj kod QR, aby użyć telefonu</UploadSubtitle>
                        </div>

                        <UploadActions>
                            <PrimaryUploadBtn
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Wybierz z dysku
                            </PrimaryUploadBtn>

                            {isMobile && (
                                <UploadBtn
                                    onClick={() => cameraInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                    Zrób zdjęcie
                                </UploadBtn>
                            )}

                            <UploadBtn onClick={refreshPhotos} disabled={isRefreshing}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                {isRefreshing ? 'Odświeżam…' : 'Odśwież'}
                            </UploadBtn>
                        </UploadActions>

                        {isUploading && (
                            <UploadingLabel>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                Przesyłanie zdjęć…
                            </UploadingLabel>
                        )}
                    </UploadZone>

                    {/* QR code generator — also listens for mobile damage updates */}
                    <div style={{ marginTop: 16 }}>
                        <CheckinQRGenerator
                            appointmentId={reservationId}
                            onDamageUpdated={handleDamagePointsChange}
                        />
                    </div>

                    {/* Photo grid */}
                    {uploadedPhotos.length > 0 && (
                        <>
                            <SectionDivider />
                            <PhotosHeader>
                                <PhotosTitle>Przesłane zdjęcia</PhotosTitle>
                                <CountChip>{uploadedPhotos.length}</CountChip>
                            </PhotosHeader>
                            <PhotoGrid>
                                {uploadedPhotos.map(photo => (
                                    <PhotoCardWrapper key={photo.id}>
                                        {/* Image */}
                                        <PhotoImageBox>
                                            {(photo.thumbnailUrl || photo.previewUrl) && (
                                                <PhotoImg
                                                    src={photo.thumbnailUrl || photo.previewUrl}
                                                    alt={photo.fileName || 'Zdjęcie pojazdu'}
                                                />
                                            )}
                                            <DeletePhotoBtn
                                                onClick={() => handleDeletePhoto(photo.id)}
                                                disabled={isDeleting}
                                                title="Usuń zdjęcie"
                                            >
                                                ×
                                            </DeletePhotoBtn>
                                            <PhotoOverlay className="photo-overlay">
                                                {photo.fileName && <PhotoName>{photo.fileName}</PhotoName>}
                                                {photo.uploadedAt && <PhotoTime>{formatTimestamp(photo.uploadedAt)}</PhotoTime>}
                                            </PhotoOverlay>
                                        </PhotoImageBox>

                                        {/* Tags footer */}
                                        <TagsFooter onClick={() => openTagEditor(photo)}>
                                            {(photo.tags ?? []).map(tag => (
                                                <TagChip key={tag} label={tag} size="sm" />
                                            ))}
                                            <AddTagBtn
                                                type="button"
                                                onClick={e => { e.stopPropagation(); openTagEditor(photo); }}
                                                title="Dodaj lub edytuj tagi"
                                            >
                                                <svg fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                                    <line x1="5" y1="1" x2="5" y2="9" />
                                                    <line x1="1" y1="5" x2="9" y2="5" />
                                                </svg>
                                                {(photo.tags ?? []).length === 0 ? 'Dodaj tagi' : 'Edytuj'}
                                            </AddTagBtn>
                                        </TagsFooter>
                                    </PhotoCardWrapper>
                                ))}
                            </PhotoGrid>
                        </>
                    )}

                    <HiddenInput
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                    />
                    <HiddenInput
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileSelect(e.target.files)}
                    />
                </SectionBody>
            </SectionCard>

            {/* ── 2. Dokumentacja uszkodzeń ──────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>2</SectionNum>
                        <SectionLabel>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            Dokumentacja uszkodzeń
                            <span style={{ fontSize: '12px', fontWeight: 400, color: st.textMuted }}>(opcjonalna)</span>
                            {(formData.damagePoints?.length ?? 0) > 0 && (
                                <CountChip>{formData.damagePoints!.length}</CountChip>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                    <Toggle
                        checked={showDamageSection}
                        onChange={setShowDamageSection}
                        label="Rozwiń"
                    />
                </SectionHead>

                {showDamageSection && (
                    <SectionBody>
                        <VehicleDamageMapper
                            points={formData.damagePoints || []}
                            onChange={handleDamagePointsChange}
                        />
                    </SectionBody>
                )}
            </SectionCard>

            {/* Tag edit modal */}
            {editingPhoto && (
                <PhotoTagEditModal
                    isOpen={!!editingPhoto}
                    photoId={editingPhoto.id}
                    fileName={editingPhoto.fileName}
                    thumbnailUrl={editingPhoto.thumbnailUrl || editingPhoto.previewUrl}
                    initialTags={editingPhoto.tags ?? []}
                    suggestions={suggestions}
                    onClose={() => setEditingPhoto(null)}
                    onTagsChange={handleTagsSave}
                    isSaving={updatePhotoTags.isPending}
                />
            )}
        </StepContainer>
    );
};
