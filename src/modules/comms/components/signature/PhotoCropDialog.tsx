// src/modules/comms/components/signature/PhotoCropDialog.tsx
// Kadr zdjęcia do stopki: przeciąganie, powiększenie suwakiem albo kółkiem, strzałki.
//
// Okno otwiera się Z KREATORA stopki, więc idzie na SUBMODAL_Z_INDEX - inaczej
// wylądowałoby pod nim. Blokadę przewijania tła daje ModalShell.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalShell,
    ModalSubtitle,
    ModalTitle,
    ModalTitleGroup,
} from '@/common/components/ModalKit';
import { ModalCloseButton, SUBMODAL_Z_INDEX } from '@/common/styles';
import { IconButton, PrimaryButton } from '../shared';
import { cropGeometry, cropSquare, loadImage } from '../../utils/signatureImage';

const STAGE_PX = 280;
const MAX_ZOOM = 4;

const Stage = styled.div`
    position: relative;
    width: ${STAGE_PX}px;
    height: ${STAGE_PX}px;
    max-width: 100%;
    margin: 0 auto;
    overflow: hidden;
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surfaceAlt};
    cursor: grab;
    touch-action: none;
    user-select: none;

    &[data-dragging='true'] { cursor: grabbing; }

    img {
        position: absolute;
        max-width: none;
        pointer-events: none;
    }
`;

/** Koło pokazuje, co zostanie w stopce - motywy rysują zdjęcie w kółku. */
const CircleMask = styled.span`
    position: absolute;
    inset: 0;
    border-radius: 50%;
    box-shadow: 0 0 0 200px rgba(15, 23, 42, 0.45);
    border: 2px solid rgba(255, 255, 255, 0.9);
    pointer-events: none;
`;

const Zoom = styled.label`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    input { flex: 1; accent-color: ${p => p.theme.colors.primary}; }
`;

interface PhotoCropDialogProps {
    file: File;
    onCancel: () => void;
    onConfirm: (blob: Blob) => void;
}

export function PhotoCropDialog({ file, onCancel, onConfirm }: PhotoCropDialogProps) {
    const [loaded, setLoaded] = useState<{ image: HTMLImageElement; url: string } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
    // Rodzic podaje nowe onCancel przy każdym renderze; efekt wczytujący obraz nie może
    // się przez to restartować, bo zerowałby kadr ustawiony już przez użytkownika.
    const cancelRef = useRef(onCancel);
    useEffect(() => { cancelRef.current = onCancel; }, [onCancel]);

    // Adres blob: powstaje, jest wczytywany i zwalniany w JEDNYM efekcie. Wersja z useMemo
    // i osobnym sprzątaniem psuła się w StrictMode: podwójny montaż zwalniał adres, który
    // memo podawało dalej, obraz się nie wczytywał i okno kadru zamykało się samo.
    useEffect(() => {
        const url = URL.createObjectURL(file);
        let cancelled = false;
        loadImage(url).then(img => {
            if (cancelled) return;
            setLoaded({ image: img, url });
            // Portret robiony z góry ma twarz w górnej części - startujemy od niej, nie od środka.
            if (img.naturalHeight > img.naturalWidth) {
                const scale = STAGE_PX / img.naturalWidth;
                setOffset({ x: 0, y: ((img.naturalHeight * scale - STAGE_PX) / 2) * 0.6 });
            }
        }).catch(() => { if (!cancelled) cancelRef.current(); });
        return () => {
            cancelled = true;
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const image = loaded?.image ?? null;
    const geometry = image
        ? cropGeometry(image.naturalWidth, image.naturalHeight, STAGE_PX, zoom, offset.x, offset.y)
        : null;

    const changeZoom = (next: number) => {
        const clamped = Math.max(1, Math.min(MAX_ZOOM, next));
        // Powiększamy względem środka sceny - to, na co użytkownik patrzy, zostaje na środku.
        setOffset(prev => ({ x: (prev.x * clamped) / zoom, y: (prev.y * clamped) / zoom }));
        setZoom(clamped);
    };

    const nudge = (dx: number, dy: number) => {
        if (!geometry) return;
        setOffset({ x: geometry.offsetX + dx, y: geometry.offsetY + dy });
    };

    const confirm = async () => {
        if (!image || !geometry) return;
        setBusy(true);
        try {
            onConfirm(await cropSquare(image, geometry.crop, file.type));
        } catch {
            setBusy(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onCancel} size="sm" zIndex={SUBMODAL_Z_INDEX}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Ustaw kadr zdjęcia</ModalTitle>
                    <ModalSubtitle>Przeciągnij zdjęcie i powiększ je tak, żeby twarz była w środku koła.</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton onClick={onCancel} aria-label="Zamknij"><X /></ModalCloseButton>
            </ModalHeader>
            <ModalContent>
                <Stage
                    data-dragging={dragging}
                    tabIndex={0}
                    aria-label="Kadr zdjęcia - przeciągnij albo użyj strzałek"
                    onPointerDown={event => {
                        if (!geometry) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        drag.current = { px: event.clientX, py: event.clientY, x: geometry.offsetX, y: geometry.offsetY };
                        setDragging(true);
                    }}
                    onPointerMove={event => {
                        const start = drag.current;
                        if (!start) return;
                        setOffset({ x: start.x + event.clientX - start.px, y: start.y + event.clientY - start.py });
                    }}
                    onPointerUp={() => { drag.current = null; setDragging(false); }}
                    onPointerCancel={() => { drag.current = null; setDragging(false); }}
                    onWheel={event => changeZoom(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08))}
                    onKeyDown={event => {
                        const step = { ArrowUp: [0, -8], ArrowDown: [0, 8], ArrowLeft: [-8, 0], ArrowRight: [8, 0] }[event.key];
                        if (!step) return;
                        event.preventDefault();
                        nudge(step[0], step[1]);
                    }}
                >
                    {geometry && loaded && (
                        <img
                            src={loaded.url}
                            alt=""
                            draggable={false}
                            style={{ width: geometry.width, height: geometry.height, left: geometry.left, top: geometry.top }}
                        />
                    )}
                    <CircleMask />
                </Stage>
                <Zoom>
                    Powiększenie
                    <input
                        type="range"
                        min={1}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={event => changeZoom(Number(event.target.value))}
                        aria-label="Powiększenie"
                    />
                </Zoom>
            </ModalContent>
            <ModalFooter>
                <IconButton onClick={onCancel}>Anuluj</IconButton>
                <PrimaryButton onClick={confirm} disabled={!image || busy}>
                    {busy ? 'Przygotowuję…' : 'Użyj tego kadru'}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}
