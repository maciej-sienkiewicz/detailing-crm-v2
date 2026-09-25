// src/modules/visits/components/DocumentGallery.tsx

import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, Download, FileText, ImageOff, Tag, Trash2 } from 'lucide-react';
import { Button, IconButton, ui } from '@/common/components/ui';
import { useContainerWidth } from '@/common/hooks';
import styled from 'styled-components';
import { formatDateTime } from '@/common/utils';
import type { VisitDocument, VisitPhoto } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import { PdfViewerModal } from './PdfViewerModal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { usePermissions } from '@/core/permissions';
import { PhotoTagEditModal } from '@/modules/photos/components/PhotoTagEditModal';
import { useTagSuggestions, useUpdatePhotoTags } from '@/modules/photos/hooks/usePhotoTags';

// ─── Styl ─────────────────────────────────────────────────────────────────────
//
// Zdjęcia jako gęsta siatka kwadratów (8 w rzędzie, na wąskim panelu 4), zwinięta
// do jednego rzędu z kafelkiem „+N". Dokumenty jako wiersze: ikona, nazwa, kiedy,
// a akcje z prawej - „Podgląd" słowem, pobranie i usunięcie ikoną.
//
// Wcześniej każde zdjęcie było kartą z paskiem tagów pod spodem, a każdy dokument
// miał trzy obrysowane przyciski - sekcja rosła na pół ekranu przy kilku plikach
// i zagłuszała wykaz usług, który jest tematem okna.

/** Poniżej tej szerokości panelu siatka ma 4 kolumny zamiast 8. */
const NARROW_MAX_WIDTH = 520;

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 18px 16px;
    min-width: 0;

    @media (max-width: 640px) { padding: 0 16px 14px; }
`;

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

const FilterLabel = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const PhotoGrid = styled.ul<{ $cols: number }>`
    display: grid;
    grid-template-columns: repeat(${p => p.$cols}, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (max-width: 640px) { gap: 6px; }
`;

const Tile = styled.li`
    position: relative;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: #cbd5e1;

    &:hover > div, &:focus-within > div { opacity: 1; }
`;

const TileButton = styled.button`
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;

    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
`;

const MoreTile = styled.button`
    width: 100%;
    height: 100%;
    border: none;
    background: #d5dde7;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
    cursor: pointer;

    &:hover { background: #cbd5e1; }
`;

/* Akcje zdjęcia na najechaniu (i zawsze pod palcem - tam najechania nie ma). */
const TileActions = styled.div`
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 3px;
    opacity: 0;
    transition: opacity 150ms ease;

    @media (hover: none) { opacity: 1; }
`;

const TileAction = styled.button<{ $danger?: boolean }>`
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.62);
    color: ${p => p.$danger ? '#fecaca' : '#fff'};
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:hover { background: ${p => p.$danger ? 'rgba(185, 28, 28, 0.9)' : 'rgba(15, 23, 42, 0.85)'}; }
`;

const TagCount = styled.span`
    position: absolute;
    left: 4px;
    bottom: 4px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.62);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;

    svg { width: 10px; height: 10px; }
`;

const GridFooter = styled.div`
    display: flex;
    justify-content: flex-start;
    margin: -4px 0 0 -11px;
`;

const Docs = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const DocRow = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid ${ui.lineSoft};
    font-size: 13.5px;

    > svg { width: 16px; height: 16px; flex-shrink: 0; color: ${ui.dangerInk}; }

    @media (max-width: 480px) { flex-wrap: wrap; row-gap: 6px; }
`;

const DocText = styled.span`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    min-width: 0;
    flex: 1;

    strong { font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const DocActions = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    margin-left: auto;
`;

const EmptyState = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
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
    // Destructive actions are separate capabilities: documents ride on VISITS_DELETE,
    // photos on VISITS_MEDIA_DELETE (backend enforces the same split).
    const { can } = usePermissions();
    const canDeleteDocuments = can('VISITS_DELETE');
    const canDeletePhotos = can('VISITS_MEDIA_DELETE');
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; isPhoto: boolean; name: string } | null>(null);
    const [editingPhoto, setEditingPhoto] = useState<NormalisedPhoto | null>(null);
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    const [localTagsMap, setLocalTagsMap] = useState<Record<string, string[]>>({});
    const [previewPdf, setPreviewPdf] = useState<{ fileUrl: string; fileName: string } | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [wrapRef, width] = useContainerWidth<HTMLDivElement>();

    // Tag support
    const { data: suggestions = [] } = useTagSuggestions();
    const updatePhotoTags = useUpdatePhotoTags({
        onSuccess: (photoId, tags) => {
            setLocalTagsMap(prev => ({ ...prev, [photoId]: tags }));
            onUpdatePhotoTags?.(photoId, tags);
        },
    });

    // Memoized: this feeds the allPhotos/allTags/filteredPhotos memos below,
    // which were recomputing on every render when this array got a new identity.
    const documentPhotos = useMemo(() => documents.filter(doc =>
        (doc.type === 'PHOTO' || doc.type === 'DAMAGE_MAP') && !isPdfFile(doc.fileName)
    ), [documents]);

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

    const cols = width !== null && width < NARROW_MAX_WIDTH ? 4 : 8;
    const collapsed = !expanded && filteredPhotos.length > cols;
    const shownPhotos = collapsed ? filteredPhotos.slice(0, cols - 1) : filteredPhotos;

    return (
        <>
            <Wrap ref={wrapRef}>
                {allTags.length > 0 && (
                    <FilterBar>
                        <FilterLabel>Tagi:</FilterLabel>
                        {/* Wybrany filtr to stan, nie krok następny: odcień, bez wypełnienia (CLAUDE.md §2). */}
                        <Button
                            size="sm"
                            variant={activeTagFilter === null ? 'tinted' : 'outline'}
                            aria-pressed={activeTagFilter === null}
                            onClick={() => setActiveTagFilter(null)}
                        >
                            Wszystkie {allPhotos.length}
                        </Button>
                        {allTags.map(tag => (
                            <Button
                                key={tag}
                                size="sm"
                                variant={activeTagFilter === tag ? 'tinted' : 'outline'}
                                aria-pressed={activeTagFilter === tag}
                                onClick={() => setActiveTagFilter(prev => prev === tag ? null : tag)}
                            >
                                <Tag />{tag}
                            </Button>
                        ))}
                    </FilterBar>
                )}

                {filteredPhotos.length > 0 && (
                    <PhotoGrid $cols={cols} aria-label="Zdjęcia">
                        {shownPhotos.map((photo, index) => (
                            <Tile key={photo.id}>
                                <TileButton
                                    type="button"
                                    onClick={() => handleImageClick(index)}
                                    title={[photo.fileName, photo.description, formatDateTime(photo.uploadedAt)].filter(Boolean).join('\n')}
                                    aria-label={`Otwórz zdjęcie ${photo.fileName}`}
                                >
                                    {photo.fileUrl
                                        ? <img src={photo.fileUrl} alt="" loading="lazy" decoding="async" />
                                        : <ImageOff aria-hidden="true" />}
                                </TileButton>
                                {(photo.tags ?? []).length > 0 && (
                                    <TagCount title={(photo.tags ?? []).join(', ')}><Tag />{(photo.tags ?? []).length}</TagCount>
                                )}
                                <TileActions>
                                    <TileAction type="button" onClick={() => openTagEditor(photo)} title="Tagi zdjęcia" aria-label={`Tagi zdjęcia ${photo.fileName}`}>
                                        <Tag />
                                    </TileAction>
                                    <TileAction type="button" onClick={() => handleDownload(photo.fullSizeUrl, photo.fileName)} title="Pobierz" aria-label={`Pobierz ${photo.fileName}`}>
                                        <Download />
                                    </TileAction>
                                    {canDeletePhotos && (
                                        <TileAction
                                            type="button"
                                            $danger
                                            onClick={() => handleDeleteClick(photo.id, photo.isVisitPhoto, photo.fileName)}
                                            title="Usuń"
                                            aria-label={`Usuń ${photo.fileName}`}
                                        >
                                            <Trash2 />
                                        </TileAction>
                                    )}
                                </TileActions>
                            </Tile>
                        ))}
                        {collapsed && (
                            <Tile>
                                <MoreTile type="button" onClick={() => setExpanded(true)} aria-label={`Pokaż wszystkie zdjęcia (${filteredPhotos.length})`}>
                                    +{filteredPhotos.length - shownPhotos.length}
                                </MoreTile>
                            </Tile>
                        )}
                    </PhotoGrid>
                )}
                {expanded && filteredPhotos.length > cols && (
                    <GridFooter>
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}><ChevronUp />Zwiń zdjęcia</Button>
                    </GridFooter>
                )}

                {pdfs.length > 0 && (
                    <Docs aria-label="Dokumenty">
                        {pdfs.map(doc => (
                            <DocRow key={doc.id}>
                                <FileText aria-hidden="true" />
                                <DocText>
                                    <strong>{doc.name || doc.fileName}</strong>
                                    <span>{formatDateTime(doc.uploadedAt)}{doc.uploadedByName ? `, ${doc.uploadedByName}` : ''}</span>
                                </DocText>
                                <DocActions>
                                    <Button variant="ghost" size="sm" onClick={() => handlePreview(doc.fileUrl, doc.fileName)}>Podgląd</Button>
                                    <IconButton label={`Pobierz ${doc.name || doc.fileName}`} variant="ghost" size="sm" onClick={() => handleDownload(doc.fileUrl, doc.fileName)}>
                                        <Download />
                                    </IconButton>
                                    {canDeleteDocuments && (
                                        <IconButton label={`Usuń ${doc.name || doc.fileName}`} variant="danger" size="sm" onClick={() => handleDeleteClick(doc.id, false, doc.fileName)}>
                                            <Trash2 />
                                        </IconButton>
                                    )}
                                </DocActions>
                            </DocRow>
                        ))}
                    </Docs>
                )}

                {filteredPhotos.length === 0 && pdfs.length === 0 && (
                    <EmptyState>
                        {activeTagFilter
                            ? `Brak zdjęć z tagiem „${activeTagFilter}"`
                            : isLoadingPhotos ? 'Wczytywanie zdjęć...' : 'Nie ma jeszcze zdjęć ani dokumentów.'}
                    </EmptyState>
                )}
            </Wrap>

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
