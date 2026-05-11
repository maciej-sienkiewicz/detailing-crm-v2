// src/modules/visits/components/DocumentGallery.tsx

import { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { formatDateTime } from '@/common/utils';
import type { VisitDocument, VisitPhoto } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import { PdfViewerModal } from './PdfViewerModal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { TagChip } from '@/modules/photos/components/TagChip';
import { PhotoTagEditModal } from '@/modules/photos/components/PhotoTagEditModal';
import { useTagSuggestions, useUpdatePhotoTags } from '@/modules/photos/hooks/usePhotoTags';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Styles ───────────────────────────────────────────────────────────────────

// ─── Tag filter bar ───────────────────────────────────────────────────────────

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: ${st.bg};
`;

const FilterLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
`;

const AllFilterBtn = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 9999px;
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlue : 'transparent'};
    color: ${p => p.$active ? '#fff' : st.textSecondary};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 140ms ease;
    white-space: nowrap;

    &:hover {
        border-color: ${st.accentBlue};
        color: ${p => p.$active ? '#fff' : st.accentBlue};
    }
`;

// ─── Gallery content ──────────────────────────────────────────────────────────

const GalleryContent = styled.div`
    padding: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h4`
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CountBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
`;

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: ${props => props.theme.spacing.md};
`;

// ─── Photo card ───────────────────────────────────────────────────────────────

const PhotoCard = styled.div`
    display: flex;
    flex-direction: column;
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};
    transition: all 0.2s ease;
    background: #f8fafc;

    &:hover {
        box-shadow: ${props => props.theme.shadows.lg};
        transform: translateY(-2px);
    }
`;

const PhotoImageBox = styled.div`
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
`;

const PhotoImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    display: block;
`;

const PhotoPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
`;

const PhotoOverlay = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: ${props => props.theme.spacing.sm};
    background: linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
`;

const PhotoInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const PhotoNameText = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PhotoDate = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    opacity: 0.8;
`;

const PhotoActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    flex-shrink: 0;
`;

const IconButton = styled.button`
    width: 28px;
    height: 28px;
    border: none;
    border-radius: ${props => props.theme.radii.sm};
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;

    &:hover {
        background: rgba(255, 255, 255, 0.28);
        transform: scale(1.1);
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

const DeleteIconButton = styled(IconButton)`
    &:hover {
        background: rgba(220, 38, 38, 0.85);
    }
`;

// Tags strip — shown below the image box
const PhotoTagsStrip = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 6px 10px 8px;
    background: white;
    border-top: 1px solid ${props => props.theme.colors.border};
    min-height: 36px;
    cursor: pointer;
    transition: background 140ms ease;

    &:hover {
        background: ${st.bg};
    }
`;

const AddTagInlineBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border-radius: 9999px;
    border: 1px dashed ${st.border};
    background: transparent;
    font-size: 10px;
    font-weight: 600;
    color: ${st.textMuted};
    cursor: pointer;
    transition: all 140ms ease;
    white-space: nowrap;

    svg { width: 9px; height: 9px; }

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }
`;

// ─── Document list ────────────────────────────────────────────────────────────

const DocumentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const DocumentCard = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const DocumentIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.md};
    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
`;

const DocumentInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const DocumentMeta = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const DocumentActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-shrink: 0;
`;

const ActionButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const DeleteButton = styled(ActionButton)`
    &:hover {
        border-color: #dc2626;
        color: #dc2626;
        background: rgba(220, 38, 38, 0.05);
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

const SectionDivider = styled.div`
    height: 1px;
    background: ${props => props.theme.colors.border};
    margin: ${props => props.theme.spacing.xl} 0;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isPdfFile = (fileName: string) => fileName.toLowerCase().endsWith('.pdf');

/** Collect all unique tags from all photos */
function collectAllTags(photos: NormalisedPhoto[]): string[] {
    const set = new Set<string>();
    photos.forEach(p => (p.tags ?? []).forEach(t => set.add(t)));
    return Array.from(set).sort();
}

// Normalised shape used only inside this component
interface NormalisedPhoto {
    id: string;
    fileName: string;
    fileUrl: string;
    fullSizeUrl: string;
    uploadedAt: string;
    description?: string;
    isVisitPhoto: boolean;
    tags?: string[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentGalleryProps {
    documents: VisitDocument[];
    visitPhotos?: VisitPhoto[];
    isLoadingPhotos?: boolean;
    onDelete: (documentId: string) => void;
    onDeletePhoto: (photoId: string) => void;
    onUpdatePhotoTags?: (photoId: string, tags: string[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DocumentGallery = ({
    documents,
    visitPhotos = [],
    isLoadingPhotos = false,
    onDelete,
    onDeletePhoto,
    onUpdatePhotoTags,
}: DocumentGalleryProps) => {
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; isPhoto: boolean; name: string } | null>(null);
    const [editingPhoto, setEditingPhoto] = useState<NormalisedPhoto | null>(null);
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    const [localTagsMap, setLocalTagsMap] = useState<Record<string, string[]>>({});
    const [previewPdf, setPreviewPdf] = useState<{ fileUrl: string; fileName: string } | null>(null);

    // Tag support
    const { data: suggestions = [] } = useTagSuggestions();
    const updatePhotoTags = useUpdatePhotoTags({
        onSuccess: (photoId, tags) => {
            setLocalTagsMap(prev => ({ ...prev, [photoId]: tags }));
            onUpdatePhotoTags?.(photoId, tags);
        },
    });

    const documentPhotos = documents.filter(doc =>
        (doc.type === 'PHOTO' || doc.type === 'DAMAGE_MAP') && !isPdfFile(doc.fileName)
    );

    // Build normalised list, merging local tag overrides
    const allPhotos: NormalisedPhoto[] = useMemo(() => [
        ...visitPhotos.map(vp => ({
            id: vp.id,
            fileName: vp.fileName,
            fileUrl: vp.thumbnailUrl,
            fullSizeUrl: vp.fullSizeUrl,
            uploadedAt: vp.uploadedAt,
            description: vp.description,
            isVisitPhoto: true,
            tags: localTagsMap[vp.id] ?? vp.tags ?? [],
        })),
        ...documentPhotos.map(p => ({
            id: p.id,
            fileName: p.fileName,
            fileUrl: p.fileUrl,
            fullSizeUrl: p.fileUrl,
            uploadedAt: p.uploadedAt,
            description: undefined,
            isVisitPhoto: false,
            tags: localTagsMap[p.id] ?? [],
        })),
    ], [visitPhotos, documentPhotos, localTagsMap]);

    const allTags = useMemo(() => collectAllTags(allPhotos), [allPhotos]);

    const filteredPhotos = useMemo(() =>
        activeTagFilter
            ? allPhotos.filter(p => (p.tags ?? []).includes(activeTagFilter))
            : allPhotos,
        [allPhotos, activeTagFilter]
    );

    const pdfs = documents.filter(doc =>
        doc.type === 'PDF' ||
        doc.type === 'PROTOCOL' ||
        doc.type === 'INTAKE' ||
        doc.type === 'OUTTAKE' ||
        doc.type === 'OTHER' ||
        ((doc.type === 'PHOTO' || doc.type === 'DAMAGE_MAP') && isPdfFile(doc.fileName))
    );

    const handleDownload = (fileUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = (fileUrl: string, fileName: string) => {
        setPreviewPdf({ fileUrl, fileName });
    };

    const handleImageClick = (index: number) => setSelectedPhotoIndex(index);
    const handleCloseModal = () => setSelectedPhotoIndex(null);

    const handleNextImage = () => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex < filteredPhotos.length - 1) {
            setSelectedPhotoIndex(selectedPhotoIndex + 1);
        }
    };

    const handlePrevImage = () => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
            setSelectedPhotoIndex(selectedPhotoIndex - 1);
        }
    };

    const handleDeleteClick = (id: string, isPhoto: boolean, name: string) => {
        setItemToDelete({ id, isPhoto, name });
        setDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.isPhoto) {
            onDeletePhoto(itemToDelete.id);
        } else {
            onDelete(itemToDelete.id);
        }
        setDeleteConfirmModalOpen(false);
        setItemToDelete(null);
    };

    const handleCancelDelete = () => {
        setDeleteConfirmModalOpen(false);
        setItemToDelete(null);
    };

    const handleTagsSave = useCallback((photoId: string, tags: string[]) => {
        setLocalTagsMap(prev => ({ ...prev, [photoId]: tags }));
        updatePhotoTags.mutate({ photoId, tags });
        setEditingPhoto(null);
    }, [updatePhotoTags]);

    const openTagEditor = (photo: NormalisedPhoto) => setEditingPhoto(photo);

    const selectedPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

    return (
        <>
            {/* ── Tag filter bar (only when tags exist) ─────────────── */}
            {allTags.length > 0 && (
                <FilterBar>
                    <FilterLabel>Filtruj:</FilterLabel>
                    <AllFilterBtn
                        $active={activeTagFilter === null}
                        onClick={() => setActiveTagFilter(null)}
                    >
                        Wszystkie ({allPhotos.length})
                    </AllFilterBtn>
                    {allTags.map(tag => (
                        <TagChip
                            key={tag}
                            label={tag}
                            size="sm"
                            active={activeTagFilter === tag}
                            onClick={() => setActiveTagFilter(prev => prev === tag ? null : tag)}
                        />
                    ))}
                </FilterBar>
            )}

            {/* ── Content ───────────────────────────────────────────── */}
            <GalleryContent>

                {/* Photos section */}
                {filteredPhotos.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <SectionTitle>
                            Zdjęcia
                            <CountBadge>{filteredPhotos.length}</CountBadge>
                            {activeTagFilter && (
                                <span style={{ fontSize: '12px', fontWeight: 400, color: st.textMuted }}>
                                    · filtr: <strong style={{ color: st.accentBlue }}>{activeTagFilter}</strong>
                                </span>
                            )}
                        </SectionTitle>
                        <PhotoGrid>
                            {filteredPhotos.map((photo, index) => (
                                <PhotoCard key={photo.id}>
                                    {/* Image */}
                                    <PhotoImageBox>
                                        {photo.fileUrl ? (
                                            <PhotoImage
                                                src={photo.fileUrl}
                                                alt={photo.fileName}
                                                onClick={() => handleImageClick(index)}
                                            />
                                        ) : (
                                            <PhotoPlaceholder>📸</PhotoPlaceholder>
                                        )}
                                        <PhotoOverlay>
                                            <PhotoInfo>
                                                <PhotoNameText>{photo.fileName}</PhotoNameText>
                                                {photo.description && (
                                                    <PhotoDate style={{ marginTop: '2px' }}>{photo.description}</PhotoDate>
                                                )}
                                                <PhotoDate>{formatDateTime(photo.uploadedAt)}</PhotoDate>
                                            </PhotoInfo>
                                            <PhotoActions>
                                                <IconButton
                                                    onClick={e => { e.stopPropagation(); openTagEditor(photo); }}
                                                    title="Edytuj tagi"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                                                    </svg>
                                                </IconButton>
                                                <IconButton
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleDownload(photo.fullSizeUrl, photo.fileName);
                                                    }}
                                                    title="Pobierz"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                        <polyline points="7 10 12 15 17 10"/>
                                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                                    </svg>
                                                </IconButton>
                                                <DeleteIconButton
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(photo.id, photo.isVisitPhoto, photo.fileName);
                                                    }}
                                                    title="Usuń"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6"/>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                    </svg>
                                                </DeleteIconButton>
                                            </PhotoActions>
                                        </PhotoOverlay>
                                    </PhotoImageBox>

                                    {/* Tags strip */}
                                    <PhotoTagsStrip onClick={() => openTagEditor(photo)}>
                                        {(photo.tags ?? []).map(tag => (
                                            <TagChip key={tag} label={tag} size="sm" />
                                        ))}
                                        <AddTagInlineBtn
                                            type="button"
                                            onClick={e => { e.stopPropagation(); openTagEditor(photo); }}
                                        >
                                            <svg fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                                <line x1="5" y1="1" x2="5" y2="9" />
                                                <line x1="1" y1="5" x2="9" y2="5" />
                                            </svg>
                                            {(photo.tags ?? []).length === 0 ? 'Dodaj tagi' : 'Edytuj'}
                                        </AddTagInlineBtn>
                                    </PhotoTagsStrip>
                                </PhotoCard>
                            ))}
                        </PhotoGrid>
                    </div>
                )}

                {/* PDFs */}
                {pdfs.length > 0 && (
                    <div>
                        {filteredPhotos.length > 0 && <SectionDivider />}
                        <SectionTitle>
                            Dokumenty PDF
                            <CountBadge>{pdfs.length}</CountBadge>
                        </SectionTitle>
                        <DocumentList>
                            {pdfs.map(doc => (
                                <DocumentCard key={doc.id}>
                                    <DocumentIcon>📄</DocumentIcon>
                                    <DocumentInfo>
                                        <DocumentName>{doc.name || doc.fileName}</DocumentName>
                                        <DocumentMeta>
                                            {doc.name && doc.name !== doc.fileName && `${doc.fileName} · `}
                                            Dodano: {formatDateTime(doc.uploadedAt)} · {doc.uploadedByName}
                                        </DocumentMeta>
                                    </DocumentInfo>
                                    <DocumentActions>
                                        <ActionButton onClick={() => handlePreview(doc.fileUrl, doc.fileName)}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                            Podgląd
                                        </ActionButton>
                                        <ActionButton
                                            title="Pobierz"
                                            onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                <polyline points="7 10 12 15 17 10"/>
                                                <line x1="12" y1="15" x2="12" y2="3"/>
                                            </svg>
                                            Pobierz
                                        </ActionButton>
                                        <DeleteButton onClick={() => handleDeleteClick(doc.id, false, doc.fileName)}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                            Usuń
                                        </DeleteButton>
                                    </DocumentActions>
                                </DocumentCard>
                            ))}
                        </DocumentList>
                    </div>
                )}

                {filteredPhotos.length === 0 && pdfs.length === 0 && (
                    <EmptyState>
                        {activeTagFilter
                            ? `Brak zdjęć z tagiem „${activeTagFilter}"`
                            : 'Brak dokumentów dla tej wizyty'}
                    </EmptyState>
                )}
            </GalleryContent>

            {/* PDF viewer */}
            <PdfViewerModal
                isOpen={!!previewPdf}
                fileUrl={previewPdf?.fileUrl ?? ''}
                fileName={previewPdf?.fileName ?? ''}
                onClose={() => setPreviewPdf(null)}
                onDownload={() => previewPdf && handleDownload(previewPdf.fileUrl, previewPdf.fileName)}
            />

            {/* Photo viewer */}
            {selectedPhoto && (
                <ImageViewerModal
                    imageUrl={selectedPhoto.fullSizeUrl}
                    imageName={selectedPhoto.fileName}
                    isOpen={selectedPhotoIndex !== null}
                    onClose={handleCloseModal}
                    onDownload={() => handleDownload(selectedPhoto.fullSizeUrl, selectedPhoto.fileName)}
                    hasNext={selectedPhotoIndex !== null && selectedPhotoIndex < filteredPhotos.length - 1}
                    hasPrev={selectedPhotoIndex !== null && selectedPhotoIndex > 0}
                    onNext={handleNextImage}
                    onPrev={handlePrevImage}
                />
            )}

            {/* Delete confirm */}
            <ConfirmationModal
                isOpen={deleteConfirmModalOpen}
                title="Usuń plik"
                message={itemToDelete ? `Czy na pewno chcesz usunąć "${itemToDelete.name}"? Tej operacji nie można cofnąć.` : ''}
                variant="danger"
                confirmText="Usuń"
                cancelText="Anuluj"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />

            {/* Tag edit modal */}
            {editingPhoto && (
                <PhotoTagEditModal
                    isOpen={!!editingPhoto}
                    photoId={editingPhoto.id}
                    fileName={editingPhoto.fileName}
                    thumbnailUrl={editingPhoto.fileUrl}
                    initialTags={editingPhoto.tags ?? []}
                    suggestions={suggestions}
                    onClose={() => setEditingPhoto(null)}
                    onTagsChange={handleTagsSave}
                    isSaving={updatePhotoTags.isPending}
                />
            )}
        </>
    );
};
