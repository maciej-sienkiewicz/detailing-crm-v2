// src/modules/vehicles/components/VehiclePhotoGallery.tsx
//
// Zdjęcia pojazdu - ta sama gęsta siatka co w karcie wizyty: 8 kwadratów w rzędzie
// (na wąskim panelu 4), zwinięta do jednego rzędu z kafelkiem „+N".
//
// Zdjęcia z wizyt i dodane wprost do pojazdu leżą w jednej siatce - zdjęcia z wizyty
// nie da się tu usunąć (należy do wizyty), a jej numer stoi w podpisie przeglądarki. Kliknięcie
// otwiera przeglądarkę z poprzednim i następnym zdjęciem zamiast nowej karty
// przeglądarki, a usunięcie pyta oknem potwierdzenia, nie systemowym `confirm`.

import { useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, ChevronUp, Download, ImagePlus, Trash2 } from 'lucide-react';
import type { VehiclePhoto } from '../types';
import { useVehiclePhotoGallery, useDeleteVehiclePhoto } from '../hooks';
import { UploadPhotoModal } from './UploadPhotoModal';
import { ImageViewerModal } from '@/modules/customers/components/ImageViewerModal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useContainerWidth } from '@/common/hooks';
import { Button, Panel, PanelActions, PanelBody, PanelHead, SectionTitle, ui } from '@/common/components/ui';

/** Poniżej tej szerokości panelu siatka ma 4 kolumny zamiast 8. */
const NARROW_MAX_WIDTH = 520;
const PAGE_SIZE = 48;

const Grid = styled.ul<{ $cols: number }>`
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


const Footer = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 8px 0 0 -11px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Empty = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

/** 1 zdjęcie, 2 zdjęcia, 5 zdjęć, 22 zdjęcia. */
const photosWord = (n: number) => {
    if (n === 1) return 'zdjęcie';
    const u = n % 10;
    const t = n % 100;
    return u >= 2 && u <= 4 && (t < 12 || t > 14) ? 'zdjęcia' : 'zdjęć';
};

interface Props {
    vehicleId: string;
    readOnly?: boolean;
    id?: string;
    /** Zdjęcia z odpowiedzi szczegółów - nieużywane, zostaje dla zgodności wywołań. */
    photos?: VehiclePhoto[];
}

export const VehiclePhotoGallery = ({ vehicleId, readOnly, id }: Props) => {
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [toDelete, setToDelete] = useState<VehiclePhoto | null>(null);
    const [wrapRef, width] = useContainerWidth<HTMLDivElement>();

    const { photos, pagination, isLoading } = useVehiclePhotoGallery(vehicleId, page, PAGE_SIZE);
    const { deletePhoto, isDeleting } = useDeleteVehiclePhoto(vehicleId);

    const total = pagination?.total ?? photos.length;
    const cols = width !== null && width < NARROW_MAX_WIDTH ? 4 : 8;
    const collapsed = !expanded && photos.length > cols;
    const shown = collapsed ? photos.slice(0, cols - 1) : photos;
    const current = viewerIndex !== null ? photos[viewerIndex] : null;

    return (
        <Panel id={id} aria-labelledby="vehicle-photos-title">
            <PanelHead>
                <SectionTitle id="vehicle-photos-title" count={total ? `${total} ${photosWord(total)}` : undefined}>Zdjęcia</SectionTitle>
                {!readOnly && (
                    <PanelActions>
                        <Button variant="tinted" size="sm" onClick={() => setIsUploadOpen(true)}>
                            <ImagePlus />Dodaj zdjęcie
                        </Button>
                    </PanelActions>
                )}
            </PanelHead>
            <PanelBody ref={wrapRef}>
                {isLoading ? (
                    <Empty>Wczytywanie zdjęć...</Empty>
                ) : photos.length === 0 ? (
                    <Empty>Nie ma jeszcze zdjęć. Zdjęcia z wizyt pojawią się tu same.</Empty>
                ) : (
                    <Grid $cols={cols} aria-label="Zdjęcia pojazdu">
                        {shown.map((photo, index) => (
                            <Tile key={photo.id}>
                                <TileButton
                                    type="button"
                                    onClick={() => setViewerIndex(index)}
                                    title={[photo.visitNumber ? `Z wizyty ${photo.visitNumber}` : null, photo.description || photo.fileName].filter(Boolean).join(': ')}
                                    aria-label={`Otwórz zdjęcie ${photo.description || photo.fileName}`}
                                >
                                    <img src={photo.thumbnailUrl} alt="" loading="lazy" decoding="async" />
                                </TileButton>
                                <TileActions>
                                    <TileAction type="button" onClick={() => window.open(photo.fullSizeUrl, '_blank')} title="Pobierz" aria-label={`Pobierz ${photo.fileName}`}>
                                        <Download />
                                    </TileAction>
                                    {!readOnly && photo.source === 'VEHICLE' && (
                                        <TileAction type="button" $danger disabled={isDeleting} onClick={() => setToDelete(photo)} title="Usuń" aria-label={`Usuń ${photo.fileName}`}>
                                            <Trash2 />
                                        </TileAction>
                                    )}
                                </TileActions>
                            </Tile>
                        ))}
                        {collapsed && (
                            <Tile>
                                <MoreTile type="button" onClick={() => setExpanded(true)} aria-label={`Pokaż wszystkie zdjęcia (${photos.length})`}>
                                    +{photos.length - shown.length}
                                </MoreTile>
                            </Tile>
                        )}
                    </Grid>
                )}

                {expanded && (photos.length > cols || (pagination?.totalPages ?? 1) > 1) && (
                    <Footer>
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}><ChevronUp />Zwiń</Button>
                        {pagination && pagination.totalPages > 1 && (
                            <>
                                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                    <ChevronLeft />Poprzednie
                                </Button>
                                <span>strona {page} z {pagination.totalPages}</span>
                                <Button variant="ghost" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                                    Następne<ChevronRight />
                                </Button>
                            </>
                        )}
                    </Footer>
                )}
            </PanelBody>

            <UploadPhotoModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} vehicleId={vehicleId} />

            {current && (
                <ImageViewerModal
                    isOpen
                    onClose={() => setViewerIndex(null)}
                    imageUrl={current.fullSizeUrl || current.photoUrl}
                    imageName={[current.visitNumber ? `Wizyta ${current.visitNumber}` : null, current.description || current.fileName].filter(Boolean).join(': ')}
                    hasNext={viewerIndex! < photos.length - 1}
                    hasPrev={viewerIndex! > 0}
                    onNext={() => setViewerIndex(i => (i ?? 0) + 1)}
                    onPrev={() => setViewerIndex(i => (i ?? 0) - 1)}
                    onDownload={() => window.open(current.fullSizeUrl, '_blank')}
                />
            )}

            <ConfirmationModal
                isOpen={toDelete !== null}
                title="Usunąć zdjęcie?"
                message="Zdjęcie zniknie z galerii pojazdu. Tej operacji nie można cofnąć."
                variant="danger"
                confirmText="Usuń zdjęcie"
                cancelText="Zostaw"
                onConfirm={() => { if (toDelete) deletePhoto(toDelete.id); setToDelete(null); }}
                onCancel={() => setToDelete(null)}
            />
        </Panel>
    );
};
