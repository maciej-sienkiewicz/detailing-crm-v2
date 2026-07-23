// src/modules/checkin/views/mobile/MobileDamageSection.tsx
// Mobile-optimised vehicle damage mapper with touch support and dark theme.

import { useState, useRef, useCallback } from 'react';
import type { DamagePoint, DamagePointPhoto } from '../../types';
import type { MobileDamageLogic } from './useMobileDamageLogic';
import { DamagePhotoAnnotator, AnnotationOverlay } from '../../components/DamagePhotoAnnotator';
import {
    SaveStatusBadge,
    DamageMapperWrap,
    DiagramCard,
    DiagramHint,
    VehicleImage,
    OverlayLayer,
    DamageMarker,
    DamageControlRow,
    DamageControlBtn,
    DamageList,
    DamageItem,
    DamageItemHeader,
    DamageNumber,
    DamageItemLabel,
    DamageDeleteBtn,
    DamageNoteInput,
    EmptyDamageState,
    SectionTitle,
    SectionSubtitle,
    InfoCard,
    VehicleTypeSelectorRow,
    VehicleTypeLabel,
    VehicleTypeSelect,
    DamagePhotoRow,
    DamagePhotoThumb,
    DamagePhotoThumbOverlay,
    DamagePhotoBadge,
    DamagePhotoRemoveBtn,
    DamageAddPhotoBtn,
    DamagePhotoHint,
    HiddenInput,
} from './MobilePhotoUpload.styles';

// ─── Vehicle types ─────────────────────────────────────────────────────────────

const VEHICLE_BODY_TYPES: { value: string; label: string }[] = [
    { value: 'sedan',    label: 'Sedan'     },
    { value: 'suv',      label: 'SUV'       },
    { value: 'hatchback',label: 'Hatchback' },
    { value: 'kombi',    label: 'Kombi'     },
    { value: 'coupe',    label: 'Coupe'     },
    { value: 'cabrio',   label: 'Kabriolet' },
    { value: 'van',      label: 'Van'       },
];

interface Props {
    logic: MobileDamageLogic;
}

const SAVE_LABELS: Record<string, string> = {
    saving:  '⟳ Zapisywanie…',
    saved:   '✓ Zapisano',
    error:   '✗ Błąd zapisu — spróbuj ponownie',
    offline: '◷ Offline — zostanie zapisane po połączeniu',
};

export const MobileDamageSection = ({ logic }: Props) => {
    const {
        damagePoints, saveStatus, updatePoints,
        attachPhotos, removePhoto, setPhotoStrokes,
        vehicleType, setVehicleType,
    } = logic;

    const [activePointId, setActivePointId] = useState<number | null>(null);
    // Photo currently open in the annotation editor
    const [annotating, setAnnotating] = useState<{ pointId: number; photo: DamagePointPhoto } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    // Guard against touch→click double-fire on mobile browsers
    const touchJustFiredRef = useRef(false);

    // ─── Point management (Moved up to fix TDZ / "Cannot access before initialization") ─────

    const addPoint = useCallback((x: number, y: number) => {
        const newId = damagePoints.length > 0
            ? Math.max(...damagePoints.map(p => p.id)) + 1
            : 1;
        const newPoint: DamagePoint = { id: newId, x, y, note: '' };
        const updated = [...damagePoints, newPoint];
        updatePoints(updated);
        setActivePointId(newId);

        // Scroll list into view after render
        setTimeout(() => {
            const el = document.getElementById(`damage-item-${newId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
    }, [damagePoints, updatePoints]);

    // Always-current ref — stable event handlers call this to avoid stale closure
    // Now safely initialized after addPoint is defined
    const addPointRef = useRef(addPoint);
    addPointRef.current = addPoint;

    // ─── Touch tap detection ──────────────────────────────────────────────────

    const handleOverlayTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
    }, []);

    const handleOverlayTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchStartRef.current || !imageRef.current) return;
        const t = e.changedTouches[0];
        const dx = Math.abs(t.clientX - touchStartRef.current.x);
        const dy = Math.abs(t.clientY - touchStartRef.current.y);
        touchStartRef.current = null;

        // Only place marker if it was a tap (not a scroll gesture)
        if (dx > 12 || dy > 12) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((t.clientX - rect.left) / rect.width) * 100;
        const y = ((t.clientY - rect.top) / rect.height) * 100;

        if (x < 0 || x > 100 || y < 0 || y > 100) return;

        // Suppress the synthetic click event the browser fires after touch
        touchJustFiredRef.current = true;
        setTimeout(() => { touchJustFiredRef.current = false; }, 600);

        addPointRef.current(x, y);
    }, []);

    // Click handler: used on desktop; skipped when touch already handled the tap
    const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (touchJustFiredRef.current) return;
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        addPointRef.current(x, y);
    }, []);

    // ─── Other Handlers ───────────────────────────────────────────────────────

    const handleMarkerTap = useCallback((e: React.MouseEvent | React.TouchEvent, id: number) => {
        e.stopPropagation();
        setActivePointId(prev => prev === id ? null : id);
        setTimeout(() => {
            const el = document.getElementById(`damage-item-${id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
    }, []);

    const handleUpdateNote = useCallback((id: number, note: string) => {
        updatePoints(damagePoints.map(p => p.id === id ? { ...p, note } : p));
    }, [damagePoints, updatePoints]);

    const handleDelete = useCallback((id: number) => {
        updatePoints(damagePoints.filter(p => p.id !== id));
        if (activePointId === id) setActivePointId(null);
    }, [damagePoints, updatePoints, activePointId]);

    const handleUndo = useCallback(() => {
        if (damagePoints.length === 0) return;
        const removed = damagePoints[damagePoints.length - 1];
        updatePoints(damagePoints.slice(0, -1));
        if (activePointId === removed.id) setActivePointId(null);
    }, [damagePoints, updatePoints, activePointId]);

    const handleClearAll = useCallback(() => {
        updatePoints([]);
        setActivePointId(null);
    }, [updatePoints]);

    const getNumber = (id: number) => damagePoints.findIndex(p => p.id === id) + 1;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <DamageMapperWrap>
            <SectionTitle>Mapa uszkodzeń</SectionTitle>
            <SectionSubtitle>
                Dotknij schemat pojazdu, aby oznaczyć miejsce uszkodzenia, a następnie dodaj opis
                i zdjęcia. Na każdym zdjęciu możesz zaznaczyć dokładne miejsce uszkodzenia.
            </SectionSubtitle>

            <SaveStatusBadge $status={saveStatus}>
                {SAVE_LABELS[saveStatus] ?? ''}
            </SaveStatusBadge>

            {/* Vehicle type selector */}
            <VehicleTypeSelectorRow>
                <VehicleTypeLabel htmlFor="mobile-vehicle-body-type">Typ nadwozia:</VehicleTypeLabel>
                <VehicleTypeSelect
                    id="mobile-vehicle-body-type"
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                >
                    {VEHICLE_BODY_TYPES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </VehicleTypeSelect>
            </VehicleTypeSelectorRow>

            {damagePoints.length === 0 && (
                <InfoCard>
                    Podejdź z klientem do pojazdu i zaznacz uszkodzenia na schemacie poniżej.
                    Każde oznaczenie możesz opisać w polu notatki.
                </InfoCard>
            )}

            {/* Vehicle diagram */}
            <DiagramCard>
                <VehicleImage
                    ref={imageRef}
                    src={`/assets/${vehicleType}.webp`}
                    alt={`Schemat pojazdu — ${VEHICLE_BODY_TYPES.find(t => t.value === vehicleType)?.label}`}
                    draggable={false}
                    onContextMenu={e => e.preventDefault()}
                />
                <OverlayLayer
                    onTouchStart={handleOverlayTouchStart}
                    onTouchEnd={handleOverlayTouchEnd}
                    onClick={handleOverlayClick}
                >
                    {damagePoints.map((point, index) => (
                        <DamageMarker
                            key={point.id}
                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                            $isLast={index === damagePoints.length - 1}
                            $isActive={activePointId === point.id}
                            onTouchEnd={e => handleMarkerTap(e, point.id)}
                            onClick={e => handleMarkerTap(e, point.id)}
                        >
                            {getNumber(point.id)}
                        </DamageMarker>
                    ))}
                </OverlayLayer>
                <DiagramHint>
                    {damagePoints.length === 0
                        ? 'Dotknij pojazd, aby dodać oznaczenie'
                        : `${damagePoints.length} ${damagePoints.length === 1 ? 'oznaczenie' : damagePoints.length < 5 ? 'oznaczenia' : 'oznaczeń'} · dotknij, aby dodać kolejne`}
                </DiagramHint>
            </DiagramCard>

            {/* Controls */}
            <DamageControlRow>
                <DamageControlBtn onClick={handleUndo} disabled={damagePoints.length === 0}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 14 4 9 9 4" />
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                    </svg>
                    Cofnij
                </DamageControlBtn>
                <DamageControlBtn onClick={handleClearAll} disabled={damagePoints.length === 0}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                    </svg>
                    Wyczyść
                </DamageControlBtn>
            </DamageControlRow>

            {/* Damage list */}
            <DamageList ref={listRef}>
                {damagePoints.length === 0 ? (
                    <EmptyDamageState>
                        <strong>Brak oznaczeń</strong>
                        Dotknij schemat pojazdu powyżej, aby oznaczyć uszkodzenie
                    </EmptyDamageState>
                ) : (
                    damagePoints.map(point => (
                        <DamageItem
                            key={point.id}
                            id={`damage-item-${point.id}`}
                            $isActive={activePointId === point.id}
                        >
                            <DamageItemHeader onClick={() => setActivePointId(prev => prev === point.id ? null : point.id)}>
                                <DamageNumber>{getNumber(point.id)}</DamageNumber>
                                <DamageItemLabel>
                                    {point.note ? point.note : `Uszkodzenie ${getNumber(point.id)}`}
                                </DamageItemLabel>
                                <DamageDeleteBtn
                                    onClick={e => { e.stopPropagation(); handleDelete(point.id); }}
                                    title="Usuń oznaczenie"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                    </svg>
                                </DamageDeleteBtn>
                            </DamageItemHeader>
                            <DamageNoteInput
                                placeholder={`Opisz uszkodzenie #${getNumber(point.id)} (np. rysa, wgniecenie, odprysk lakieru…)`}
                                value={point.note}
                                onChange={e => handleUpdateNote(point.id, e.target.value)}
                                onFocus={() => setActivePointId(point.id)}
                                rows={2}
                            />

                            {/* Photos attached to this damage point */}
                            <DamagePhotoRow>
                                {(point.photos ?? []).map(photo => (
                                    <DamagePhotoThumb
                                        key={photo.photoId}
                                        $failed={photo.status === 'failed'}
                                        onClick={() => {
                                            if (photo.status === 'failed') {
                                                removePhoto(point.id, photo.localId ?? photo.photoId);
                                                return;
                                            }
                                            // Drawing while the upload is still in progress is fine —
                                            // strokes are matched to the photo via its stable localId.
                                            if (photo.thumbnailUrl) {
                                                setAnnotating({ pointId: point.id, photo });
                                            }
                                        }}
                                        title={photo.status === 'failed'
                                            ? 'Błąd przesyłania — dotknij, aby usunąć'
                                            : 'Dotknij, aby zaznaczyć uszkodzenie na zdjęciu'}
                                    >
                                        {photo.thumbnailUrl && (
                                            <img src={photo.thumbnailUrl} alt="Zdjęcie uszkodzenia" draggable={false} />
                                        )}
                                        <AnnotationOverlay strokes={photo.strokes} />
                                        {photo.status === 'uploading' && (
                                            <DamagePhotoThumbOverlay>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                                                </svg>
                                            </DamagePhotoThumbOverlay>
                                        )}
                                        {photo.status === 'failed' && (
                                            <DamagePhotoThumbOverlay>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </DamagePhotoThumbOverlay>
                                        )}
                                        {photo.status !== 'uploading' && photo.status !== 'failed' && photo.strokes.length > 0 && (
                                            <DamagePhotoBadge title="Zdjęcie z oznaczeniem">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                                                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                                                </svg>
                                            </DamagePhotoBadge>
                                        )}
                                        {photo.status !== 'uploading' && (
                                            <DamagePhotoRemoveBtn
                                                role="button"
                                                title="Usuń zdjęcie"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    removePhoto(point.id, photo.localId ?? photo.photoId);
                                                }}
                                            >
                                                ×
                                            </DamagePhotoRemoveBtn>
                                        )}
                                    </DamagePhotoThumb>
                                ))}

                                <DamageAddPhotoBtn title="Dodaj zdjęcie uszkodzenia">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                    Dodaj zdjęcie
                                    <HiddenInput
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        multiple
                                        onChange={e => {
                                            const files = Array.from(e.target.files ?? []);
                                            e.target.value = '';
                                            if (files.length === 0) return;
                                            const created = attachPhotos(point.id, files);
                                            // Open the annotation editor straight away for the captured
                                            // photo — no extra tap needed to start drawing.
                                            if (created.length > 0) {
                                                setAnnotating({ pointId: point.id, photo: created[0] });
                                            }
                                        }}
                                    />
                                </DamageAddPhotoBtn>
                            </DamagePhotoRow>
                            {(point.photos?.length ?? 0) === 0 && (
                                <DamagePhotoHint>
                                    Sfotografuj uszkodzenie, a potem dotknij miniaturę, aby zaznaczyć je na zdjęciu.
                                </DamagePhotoHint>
                            )}
                        </DamageItem>
                    ))
                )}
            </DamageList>

            {/* Photo annotation editor */}
            {annotating && annotating.photo.thumbnailUrl && (
                <DamagePhotoAnnotator
                    imageUrl={annotating.photo.thumbnailUrl}
                    initialStrokes={annotating.photo.strokes}
                    title={`Uszkodzenie #${getNumber(annotating.pointId)} — zaznacz na zdjęciu`}
                    onSave={strokes => {
                        setPhotoStrokes(
                            annotating.pointId,
                            annotating.photo.localId ?? annotating.photo.photoId,
                            strokes,
                        );
                        setAnnotating(null);
                    }}
                    onClose={() => setAnnotating(null)}
                />
            )}
        </DamageMapperWrap>
    );
};