import { useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { batchOrderApi } from '../api/batchOrderApi';
import { useEntryPhotos, useDeleteEntryPhoto } from '../hooks/useBatchOrders';
import { useQueryClient } from '@tanstack/react-query';
import { ENTRY_PHOTOS_KEY } from '../hooks/useBatchOrders';
import type { BatchOrderPhoto } from '../types';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// ─── styled components ────────────────────────────────────────────────────────

const Wrap = styled.div`
    padding: 12px 16px;
    background: ${p => p.theme.colors.surfaceAlt};
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
`;

const Label = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 700;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const AddBtn = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid ${p => p.theme.colors.border};
    color: ${p => p.theme.colors.text};
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
    white-space: nowrap;

    &:hover {
        background: ${p => p.theme.colors.primary};
        color: #fff;
        border-color: ${p => p.theme.colors.primary};
    }

    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const HiddenInput = styled.input`
    display: none;
`;

const PhotoGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const shimmer = keyframes`
    0%   { background-position: -200px 0; }
    100% { background-position: 200px 0; }
`;

const PhotoThumb = styled.div`
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 8px;
    overflow: hidden;
    background: ${p => p.theme.colors.border};
    border: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
`;

const UploadingOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const DeleteBtn = styled.button`
    position: absolute;
    top: 3px;
    right: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0,0,0,0.65);
    border: none;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    padding: 0;

    svg { width: 10px; height: 10px; }

    ${PhotoThumb}:hover & { opacity: 1; }
`;

const SkeletonThumb = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 8px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200px 100%;
    animation: ${shimmer} 1.2s infinite linear;
    flex-shrink: 0;
`;

const EmptyText = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    font-style: italic;
`;

// ─── local state for optimistic uploads ──────────────────────────────────────

interface UploadingPhoto {
    localId: string;
    previewUrl: string;
    fileName: string;
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
    entryId: string;
}

export function BatchOrderPhotoSection({ entryId }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const qc = useQueryClient();
    const [uploading, setUploading] = useState<UploadingPhoto[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const { data: photos = [], isLoading } = useEntryPhotos(entryId);
    const deletePhoto = useDeleteEntryPhoto(entryId);

    async function handleFiles(files: File[]) {
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                alert(`Nieobsługiwany format: ${file.type}. Używaj JPEG, PNG lub WebP.`);
                continue;
            }
            if (file.size > MAX_SIZE) {
                alert(`Plik "${file.name}" przekracza 20 MB.`);
                continue;
            }

            const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const previewUrl = URL.createObjectURL(file);
            setUploading(prev => [...prev, { localId, previewUrl, fileName: file.name }]);

            try {
                const { uploadUrl } = await batchOrderApi.requestPhotoUploadUrl(entryId, { fileName: file.name });
                await batchOrderApi.uploadPhotoToS3(uploadUrl, file);
                await qc.invalidateQueries({ queryKey: ENTRY_PHOTOS_KEY(entryId) });
            } catch {
                alert(`Błąd przesyłania pliku "${file.name}". Spróbuj ponownie.`);
            } finally {
                URL.revokeObjectURL(previewUrl);
                setUploading(prev => prev.filter(u => u.localId !== localId));
            }
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        handleFiles(files);
    }

    return (
        <Wrap>
            <Header>
                <Label>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Dokumentacja ({photos.length})
                </Label>
                <AddBtn>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Dodaj zdjęcie
                    <HiddenInput
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        capture="environment"
                        onChange={handleInputChange}
                        ref={inputRef}
                    />
                </AddBtn>
            </Header>

            <PhotoGrid>
                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => <SkeletonThumb key={i} />)
                ) : (
                    <>
                        {photos.map((photo: BatchOrderPhoto) => (
                            <PhotoThumb key={photo.id} title={photo.fileName}>
                                <img
                                    src={photo.url}
                                    alt={photo.fileName}
                                    loading="lazy"
                                    onClick={() => setLightboxUrl(photo.url)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <DeleteBtn
                                    onClick={e => {
                                        e.stopPropagation();
                                        deletePhoto.mutate(photo.id);
                                    }}
                                    title="Usuń zdjęcie"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </DeleteBtn>
                            </PhotoThumb>
                        ))}
                        {uploading.map(u => (
                            <PhotoThumb key={u.localId} title={u.fileName}>
                                <img src={u.previewUrl} alt={u.fileName} />
                                <UploadingOverlay>
                                    <Spinner />
                                </UploadingOverlay>
                            </PhotoThumb>
                        ))}
                        {photos.length === 0 && uploading.length === 0 && (
                            <EmptyText>Brak zdjęć — dodaj dokumentację pojazdu</EmptyText>
                        )}
                    </>
                )}
            </PhotoGrid>

            {/* Simple lightbox */}
            {lightboxUrl && (
                <div
                    onClick={() => setLightboxUrl(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out',
                    }}
                >
                    <img
                        src={lightboxUrl}
                        alt="Podgląd"
                        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </Wrap>
    );
}
