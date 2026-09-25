// src/modules/batch-orders/components/BatchOrderPhotoSection.tsx
//
// Zdjęcia wpisu, wewnątrz jego edytora. Dawniej siedziały w menu ⋮ jako
// „Dokumentacja zdjęciowa" rozwijana pod wierszem tabeli - kto nie znalazł menu,
// nie znalazł też zdjęć, a wiersz nie mówił, czy wpis w ogóle je ma.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { batchOrderApi } from '../api/batchOrderApi';
import { ENTRIES_KEY, ENTRY_PHOTOS_KEY, useDeleteEntryPhoto, useEntryPhotos } from '../hooks/useBatchOrders';
import type { BatchOrderPhoto } from '../types';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 20 * 1024 * 1024;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
    gap: 8px;
`;

const Thumb = styled.div`
    position: relative;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: ${p => p.theme.colors.border};

    img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const ThumbBtn = styled.button`
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    cursor: zoom-in;
`;

const shimmer = keyframes`
    0%   { background-position: -200px 0; }
    100% { background-position: 200px 0; }
`;

const Skeleton = styled.div`
    aspect-ratio: 1;
    border-radius: 10px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200px 100%;
    animation: ${shimmer} 1.2s infinite linear;
`;

const spin = keyframes`to { transform: rotate(360deg); }`;

const Uploading = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.55);

    &::after {
        content: '';
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: ${spin} 0.7s linear infinite;
    }
`;

/* Na dotyku zawsze widoczny i duży - nie ma najechania, które by go odsłoniło. */
const RemoveBtn = styled.button`
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.7);
    color: #fff;
    cursor: pointer;
    opacity: 0;
    transition: opacity 150ms ease;

    svg { width: 13px; height: 13px; }
    ${Thumb}:hover &, &:focus-visible { opacity: 1; }
    @media (hover: none) and (pointer: coarse) { opacity: 1; width: 30px; height: 30px; }
`;

const AddTile = styled.label`
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 10px;
    background: ${p => p.theme.colors.surface};
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 18px; height: 18px; }
    &:hover { border-color: #38bdf8; color: #075985; background: #f0f9ff; }
    &:focus-within { outline: 2px solid #38bdf8; outline-offset: 2px; }

    input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
`;

const Lightbox = styled.div`
    position: fixed;
    inset: 0;
    z-index: 3500;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.88);
    cursor: zoom-out;

    img { max-width: 92vw; max-height: 90vh; border-radius: 8px; cursor: default; }
`;

const LightboxClose = styled.button`
    position: absolute;
    top: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    cursor: pointer;

    svg { width: 20px; height: 20px; }
`;

interface UploadingPhoto { localId: string; previewUrl: string; fileName: string; }

interface Props {
    entryId: string;
    contractorId: string;
}

export function BatchOrderPhotoSection({ entryId, contractorId }: Props) {
    const qc = useQueryClient();
    const { showError } = useToast();
    const [uploading, setUploading] = useState<UploadingPhoto[]>([]);
    const [lightbox, setLightbox] = useState<BatchOrderPhoto | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<BatchOrderPhoto | null>(null);

    const { data: photos = [], isLoading } = useEntryPhotos(entryId);
    const deletePhoto = useDeleteEntryPhoto(entryId, contractorId);

    useEffect(() => {
        if (!lightbox) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); setLightbox(null); }
        };
        // capture: Escape ma zamknąć podgląd, a nie cały edytor wpisu pod nim.
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [lightbox]);

    async function handleFiles(files: File[]) {
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                showError('Nieobsługiwany format zdjęcia', `„${file.name}": użyj JPEG, PNG albo WebP.`);
                continue;
            }
            if (file.size > MAX_SIZE) {
                showError('Zdjęcie jest za duże', `„${file.name}" przekracza 20 MB.`);
                continue;
            }

            const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const previewUrl = URL.createObjectURL(file);
            setUploading(prev => [...prev, { localId, previewUrl, fileName: file.name }]);

            try {
                const { uploadUrl } = await batchOrderApi.requestPhotoUploadUrl(entryId, { fileName: file.name });
                await batchOrderApi.uploadPhotoToS3(uploadUrl, file);
                await qc.invalidateQueries({ queryKey: ENTRY_PHOTOS_KEY(entryId) });
                qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) });
            } catch {
                showError('Nie udało się dodać zdjęcia', `„${file.name}" - spróbuj ponownie.`);
            } finally {
                URL.revokeObjectURL(previewUrl);
                setUploading(prev => prev.filter(u => u.localId !== localId));
            }
        }
    }

    return (
        <>
            <Grid>
                {isLoading
                    ? [0, 1].map(i => <Skeleton key={i} />)
                    : photos.map(photo => (
                        <Thumb key={photo.id}>
                            <ThumbBtn type="button" onClick={() => setLightbox(photo)} aria-label={`Powiększ zdjęcie ${photo.fileName}`}>
                                <img src={photo.url} alt={photo.fileName} loading="lazy" />
                            </ThumbBtn>
                            <RemoveBtn type="button" onClick={() => setConfirmDelete(photo)} aria-label={`Usuń zdjęcie ${photo.fileName}`}>
                                <X />
                            </RemoveBtn>
                        </Thumb>
                    ))}
                {uploading.map(u => (
                    <Thumb key={u.localId} title={u.fileName}>
                        <img src={u.previewUrl} alt={u.fileName} />
                        <Uploading />
                    </Thumb>
                ))}
                <AddTile>
                    <Camera />
                    Dodaj
                    <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        onChange={e => {
                            const files = Array.from(e.target.files ?? []);
                            e.target.value = '';
                            handleFiles(files);
                        }}
                    />
                </AddTile>
            </Grid>

            {lightbox && createPortal(
                <Lightbox onClick={() => setLightbox(null)} role="dialog" aria-label="Podgląd zdjęcia">
                    <LightboxClose type="button" aria-label="Zamknij podgląd" onClick={() => setLightbox(null)}><X /></LightboxClose>
                    <img src={lightbox.url} alt={lightbox.fileName} onClick={e => e.stopPropagation()} />
                </Lightbox>,
                document.body,
            )}

            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Usunąć zdjęcie?"
                message="Zdjęcie zniknie z dokumentacji tego auta."
                variant="danger"
                confirmText="Usuń zdjęcie"
                cancelText="Zostaw"
                onConfirm={() => {
                    if (!confirmDelete) return;
                    deletePhoto.mutateAsync(confirmDelete.id).catch(() => showError('Nie udało się usunąć zdjęcia'));
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
}
