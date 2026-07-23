// src/modules/checkin/components/DamagePhotoAnnotator.tsx
//
// Full-screen editor for drawing annotations (freehand strokes) on a damage
// photo. Works with both touch (mobile QR view) and mouse (desktop wizard).
// Strokes are stored as vectors in percentage coordinates of the photo, so
// they are resolution-independent and can be re-rendered anywhere (thumbnails,
// backend PDF report).

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import type { AnnotationStroke, AnnotationPoint } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
    { value: '#EF4444', label: 'Czerwony' },
    { value: '#FBBF24', label: 'Żółty' },
    { value: '#38BDF8', label: 'Niebieski' },
    { value: '#FFFFFF', label: 'Biały' },
];

// Stroke width as % of photo width
const WIDTHS = [
    { value: 0.5, label: 'Cienki' },
    { value: 1.0, label: 'Średni' },
    { value: 1.8, label: 'Gruby' },
];

// Minimum distance (in %) between captured points — keeps strokes light
const MIN_POINT_DISTANCE = 0.6;

// ─── Styles ───────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(4, 8, 16, 0.96);
    display: flex;
    flex-direction: column;
`;

const TopBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    padding-top: max(12px, env(safe-area-inset-top));
    flex-shrink: 0;
`;

const TopTitle = styled.div`
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
`;

const TopHint = styled.div`
    color: rgba(255, 255, 255, 0.55);
    font-size: 11px;
    margin-top: 2px;
`;

const CloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
    flex-shrink: 0;
    font-size: 18px;
    line-height: 1;
`;

const CanvasArea = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    overflow: hidden;
`;

const ImageBox = styled.div`
    position: relative;
    max-width: 100%;
    max-height: 100%;
`;

const Photo = styled.img`
    display: block;
    max-width: 100%;
    max-height: calc(100vh - 200px);
    object-fit: contain;
    user-select: none;
    -webkit-user-select: none;
    border-radius: 8px;
`;

const DrawLayer = styled.svg`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
    border-radius: 8px;
`;

const Toolbar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    padding-bottom: max(14px, env(safe-area-inset-bottom));
    flex-shrink: 0;
`;

const ToolRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const ColorDot = styled.button<{ $color: string; $active: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${p => p.$color};
    border: 3px solid ${p => p.$active ? '#fff' : 'rgba(255,255,255,0.18)'};
    cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease;
    ${p => p.$active && 'transform: scale(1.12);'}
`;

const WidthBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1.5px solid ${p => p.$active ? '#38BDF8' : 'rgba(255,255,255,0.18)'};
    background: ${p => p.$active ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)'};
    color: #fff;
    cursor: pointer;
`;

const WidthPreview = styled.span<{ $h: number }>`
    display: block;
    width: 22px;
    height: ${p => p.$h}px;
    border-radius: 999px;
    background: #fff;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: ${p => p.$variant === 'primary' ? '1.4' : '1'};
    height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid ${p => p.$variant === 'primary' ? '#0EA5E9' : 'rgba(255,255,255,0.18)'};
    background: ${p => p.$variant === 'primary' ? '#0EA5E9' : 'rgba(255,255,255,0.06)'};
    color: #fff;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

// ─── Stroke rendering (shared with thumbnails) ────────────────────────────────

interface StrokesOverlayProps {
    strokes: AnnotationStroke[];
    /** Rendered width of the underlying image in px — used to scale stroke width */
    renderWidth: number;
    current?: AnnotationStroke | null;
}

const toPolylinePoints = (points: AnnotationPoint[]) =>
    points.map(p => `${p.x},${p.y}`).join(' ');

const StrokesSvgContent = ({ strokes, renderWidth, current }: StrokesOverlayProps) => (
    <>
        {[...strokes, ...(current ? [current] : [])].map((stroke, i) => (
            <polyline
                key={i}
                points={toPolylinePoints(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={Math.max(1.5, (stroke.width / 100) * renderWidth)}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={0.9}
            />
        ))}
    </>
);

/**
 * Read-only strokes overlay for thumbnails / previews.
 * Place inside a `position: relative` box that wraps the <img>.
 * The <img> must use `object-fit: contain`-like rendering that fills the box,
 * or simply be the box itself.
 */
export const AnnotationOverlay = ({ strokes, strokeWidthPx = 2 }: {
    strokes: AnnotationStroke[];
    strokeWidthPx?: number;
}) => {
    if (!strokes || strokes.length === 0) return null;
    return (
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
            {strokes.map((stroke, i) => (
                <polyline
                    key={i}
                    points={toPolylinePoints(stroke.points)}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={strokeWidthPx}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.9}
                />
            ))}
        </svg>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DamagePhotoAnnotatorProps {
    imageUrl: string;
    initialStrokes: AnnotationStroke[];
    title?: string;
    onSave: (strokes: AnnotationStroke[]) => void;
    onClose: () => void;
}

export const DamagePhotoAnnotator = ({
    imageUrl,
    initialStrokes,
    title,
    onSave,
    onClose,
}: DamagePhotoAnnotatorProps) => {
    const [strokes, setStrokes] = useState<AnnotationStroke[]>(initialStrokes);
    const [current, setCurrent] = useState<AnnotationStroke | null>(null);
    const [color, setColor] = useState(COLORS[0].value);
    const [width, setWidth] = useState(WIDTHS[1].value);
    const [renderWidth, setRenderWidth] = useState(0);

    const svgRef = useRef<SVGSVGElement>(null);
    const drawingRef = useRef(false);
    const currentRef = useRef<AnnotationStroke | null>(null);

    // Track rendered image width so stroke thickness scales correctly
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setRenderWidth(entry.contentRect.width);
            }
        });
        ro.observe(svg);
        return () => ro.disconnect();
    }, []);

    // Block background scroll while the editor is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const toPercent = useCallback((e: React.PointerEvent): AnnotationPoint | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        return {
            x: Math.min(100, Math.max(0, x)),
            y: Math.min(100, Math.max(0, y)),
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = toPercent(e);
        if (!point) return;
        e.preventDefault();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drawingRef.current = true;
        const stroke: AnnotationStroke = { color, width, points: [point] };
        currentRef.current = stroke;
        setCurrent(stroke);
    }, [toPercent, color, width]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!drawingRef.current || !currentRef.current) return;
        const point = toPercent(e);
        if (!point) return;
        const pts = currentRef.current.points;
        const last = pts[pts.length - 1];
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_POINT_DISTANCE) return;
        const updated = { ...currentRef.current, points: [...pts, point] };
        currentRef.current = updated;
        setCurrent(updated);
    }, [toPercent]);

    const handlePointerUp = useCallback(() => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        const stroke = currentRef.current;
        currentRef.current = null;
        setCurrent(null);
        if (stroke && stroke.points.length > 0) {
            // A single tap becomes a short dot-stroke (two identical points)
            const finalStroke = stroke.points.length === 1
                ? { ...stroke, points: [stroke.points[0], stroke.points[0]] }
                : stroke;
            setStrokes(prev => [...prev, finalStroke]);
        }
    }, []);

    const handleUndo = useCallback(() => {
        setStrokes(prev => prev.slice(0, -1));
    }, []);

    const handleClear = useCallback(() => {
        setStrokes([]);
    }, []);

    const handleSave = useCallback(() => {
        onSave(strokes);
    }, [strokes, onSave]);

    return createPortal(
        <Overlay>
            <TopBar>
                <div style={{ minWidth: 0 }}>
                    <TopTitle>{title ?? 'Zaznacz uszkodzenie na zdjęciu'}</TopTitle>
                    <TopHint>Rysuj palcem lub myszą, aby wskazać miejsce uszkodzenia</TopHint>
                </div>
                <CloseBtn onClick={onClose} title="Zamknij bez zapisywania">×</CloseBtn>
            </TopBar>

            <CanvasArea>
                <ImageBox>
                    <Photo src={imageUrl} alt="Zdjęcie uszkodzenia" draggable={false} />
                    <DrawLayer
                        ref={svgRef}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        <StrokesSvgContent strokes={strokes} renderWidth={renderWidth} current={current} />
                    </DrawLayer>
                </ImageBox>
            </CanvasArea>

            <Toolbar>
                <ToolRow>
                    {COLORS.map(c => (
                        <ColorDot
                            key={c.value}
                            $color={c.value}
                            $active={color === c.value}
                            onClick={() => setColor(c.value)}
                            title={c.label}
                        />
                    ))}
                    <span style={{ width: 10 }} />
                    {WIDTHS.map(w => (
                        <WidthBtn
                            key={w.value}
                            $active={width === w.value}
                            onClick={() => setWidth(w.value)}
                            title={w.label}
                        >
                            <WidthPreview $h={w.value === 0.5 ? 2 : w.value === 1.0 ? 4 : 7} />
                        </WidthBtn>
                    ))}
                </ToolRow>
                <ToolRow>
                    <ActionBtn onClick={handleUndo} disabled={strokes.length === 0}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 14 4 9 9 4" />
                            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                        </svg>
                        Cofnij
                    </ActionBtn>
                    <ActionBtn onClick={handleClear} disabled={strokes.length === 0}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                        Wyczyść
                    </ActionBtn>
                    <ActionBtn $variant="primary" onClick={handleSave}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Zapisz
                    </ActionBtn>
                </ToolRow>
            </Toolbar>
        </Overlay>,
        document.body,
    );
};
