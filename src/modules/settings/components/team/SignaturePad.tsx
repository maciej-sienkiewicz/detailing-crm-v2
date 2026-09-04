// src/modules/settings/components/team/SignaturePad.tsx
//
// Kanwa do złożenia podpisu myszą, rysikiem albo palcem.
//
// Tło zostaje PRZEZROCZYSTE: podpis wtapia się w gotowy PDF, więc biały prostokąt
// pod pociągnięciami zasłoniłby linię podpisu w dokumencie. Backend i tak wymusza
// przezroczystość po swojej stronie (klientowi się nie ufa) i przycina obraz do
// samych pociągnięć.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

const STROKE_COLOR = '#0f172a';
const STROKE_WIDTH = 2.2;

export interface SignaturePadHandle {
    clear: () => void;
    /** `data:image/png;base64,...` albo null, gdy nic nie narysowano. */
    toDataUrl: () => string | null;
}

interface Props {
    /** Do wygaszania przycisku „Podpisz" dopóki kanwa jest pusta. */
    onInkChange?: (hasInk: boolean) => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad({ onInkChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /** Stan steruje podpowiedzią na kanwie; ref niesie tę samą wiedzę do metod imperatywnych. */
    const [hasInk, setHasInk] = useState(false);
    const hasInkRef = useRef(false);

    useImperativeHandle(ref, () => ({
        clear() {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
            hasInkRef.current = false;
            setHasInk(false);
            onInkChange?.(false);
        },
        toDataUrl() {
            const canvas = canvasRef.current;
            if (!canvas || !hasInkRef.current) return null;
            return canvas.toDataURL('image/png');
        },
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Kanwa w pikselach urządzenia: na ekranie z DPR 2 podpis rysowany w CSS-owych
        // pikselach byłby rozmyty, a to obraz, który trafia do dokumentu.
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(ratio, ratio);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth = STROKE_WIDTH;

        let drawing = false;
        let last: { x: number; y: number } | null = null;

        const positionOf = (event: PointerEvent) => {
            const bounds = canvas.getBoundingClientRect();
            return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        };

        const start = (event: PointerEvent) => {
            drawing = true;
            canvas.setPointerCapture(event.pointerId);
            last = positionOf(event);
            // Kropka od razu przy dotknięciu - kropka nad „i" to też podpis.
            ctx.beginPath();
            ctx.arc(last.x, last.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
            ctx.fillStyle = STROKE_COLOR;
            ctx.fill();
            if (!hasInkRef.current) {
                hasInkRef.current = true;
                setHasInk(true);
                onInkChange?.(true);
            }
        };

        const move = (event: PointerEvent) => {
            if (!drawing || !last) return;
            const point = positionOf(event);
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            last = point;
        };

        const end = () => {
            drawing = false;
            last = null;
        };

        canvas.addEventListener('pointerdown', start);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('pointerleave', end);

        return () => {
            canvas.removeEventListener('pointerdown', start);
            canvas.removeEventListener('pointermove', move);
            canvas.removeEventListener('pointerup', end);
            canvas.removeEventListener('pointercancel', end);
            canvas.removeEventListener('pointerleave', end);
        };
    }, [onInkChange]);

    return (
        <PadWrap>
            {/* touch-action: none - bez tego przeciągnięcie palcem przewija stronę zamiast rysować. */}
            <Canvas ref={canvasRef} />
            {!hasInk && <Placeholder>Podpisz w tym polu</Placeholder>}
            <BaselineHint />
        </PadWrap>
    );
});

const PadWrap = styled.div`
    position: relative;
    width: 100%;
    height: 180px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 12px;
    background: #f8fafc;
    overflow: hidden;
`;

const Canvas = styled.canvas`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
`;

const Placeholder = styled.span`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #cbd5e1;
    pointer-events: none;
`;

const BaselineHint = styled.div`
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 38px;
    border-bottom: 1px solid #e2e8f0;
    pointer-events: none;
`;
