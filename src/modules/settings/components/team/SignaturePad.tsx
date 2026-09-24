// src/modules/settings/components/team/SignaturePad.tsx
//
// Kanwa do złożenia podpisu myszą, rysikiem albo palcem.
//
// Tło zostaje PRZEZROCZYSTE: podpis wtapia się w gotowy PDF, więc biały prostokąt
// pod pociągnięciami zasłoniłby linię podpisu w dokumencie. Backend i tak wymusza
// przezroczystość po swojej stronie (klientowi się nie ufa) i przycina obraz do
// samych pociągnięć.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

const STROKE_COLOR = '#0f172a';
const STROKE_WIDTH = 2.2;

export interface SignaturePadHandle {
    clear: () => void;
    /** `data:image/png;base64,...` albo null, gdy nic nie narysowano. */
    toDataUrl: () => string | null;
}

interface Props {
    /**
     * Czy na kanwie jest podpis - od razu po zamontowaniu (pusta) i przy każdej zmianie.
     * Do wygaszania przycisku „Podpisz" dopóki kanwa jest pusta.
     */
    onInkChange?: (hasInk: boolean) => void;
    /** Wysokość pola: liczba w px albo wyrażenie CSS, np. `clamp(150px, 26vh, 220px)`. */
    height?: number | string;
}

interface Point { x: number; y: number }

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad({ onInkChange, height = 180 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /** Stan steruje podpowiedzią na kanwie; ref niesie tę samą wiedzę do metod imperatywnych. */
    const [hasInk, setHasInk] = useState(false);
    const hasInkRef = useRef(false);
    const onInkChangeRef = useRef(onInkChange);
    /**
     * Pociągnięcia w pikselach CSS kanwy. Z nich rysunek odtwarza się po zmianie rozmiaru
     * pola - obrót telefonu albo szersze okno czyszczą bufor kanwy, a podpisu nie wolno zgubić.
     */
    const strokesRef = useRef<Point[][]>([]);
    /** Przerysowanie kanwy z [strokesRef]; ustawia je efekt, który trzyma kontekst rysowania. */
    const repaintRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        onInkChangeRef.current = onInkChange;
    });

    const reportInk = useCallback((value: boolean) => {
        hasInkRef.current = value;
        setHasInk(value);
        onInkChangeRef.current?.(value);
    }, []);

    useImperativeHandle(ref, () => ({
        clear() {
            strokesRef.current = [];
            repaintRef.current();
            reportInk(false);
        },
        toDataUrl() {
            const canvas = canvasRef.current;
            if (!canvas || !hasInkRef.current) return null;
            return canvas.toDataURL('image/png');
        },
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Nowa kanwa jest pusta - rodzic dowiaduje się o tym od razu, a nie dopiero przy
        // pierwszym pociągnięciu: pole zamontowane na nowo nie może dziedziczyć „jest podpis".
        onInkChangeRef.current?.(false);

        let size = { width: 0, height: 0 };

        const dot = (point: Point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
            ctx.fill();
        };

        const segment = (from: Point, to: Point) => {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        };

        const repaint = () => {
            const ratio = window.devicePixelRatio || 1;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, size.width, size.height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = STROKE_COLOR;
            ctx.fillStyle = STROKE_COLOR;
            ctx.lineWidth = STROKE_WIDTH;
            strokesRef.current.forEach(stroke => {
                // Kropka od razu przy dotknięciu - kropka nad „i" to też podpis.
                dot(stroke[0]);
                for (let i = 1; i < stroke.length; i++) segment(stroke[i - 1], stroke[i]);
            });
        };
        repaintRef.current = repaint;

        // Bufor kanwy w pikselach urządzenia: na ekranie z DPR 2 podpis rysowany w CSS-owych
        // pikselach byłby rozmyty, a to obraz, który trafia do dokumentu.
        //
        // Rozmiar z układu (clientWidth), a nie z getBoundingClientRect: ta druga liczy się
        // z transformacjami, a okno otwiera się animacją skali - bufor wychodził o kilka
        // procent za mały i kreska rozjeżdżała się z kursorem. Przy każdej zmianie rozmiaru
        // pola bufor jest liczony od nowa, a rysunek odtwarzany w nowej skali.
        const fit = () => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            // Ukryte pole (wybrany inny sposób podpisu) ma zerowy rozmiar - rysunek czeka.
            if (width === 0 || height === 0) return;
            const ratio = window.devicePixelRatio || 1;
            const unchanged = width === size.width && height === size.height
                && canvas.width === Math.round(width * ratio) && canvas.height === Math.round(height * ratio);
            if (unchanged) return;
            if (size.width > 0 && size.height > 0) {
                const sx = width / size.width;
                const sy = height / size.height;
                strokesRef.current = strokesRef.current.map(stroke => stroke.map(p => ({ x: p.x * sx, y: p.y * sy })));
            }
            size = { width, height };
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            repaint();
        };
        fit();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
        observer?.observe(canvas);

        let drawing = false;

        /** Punkt w pikselach układu - także wtedy, gdy pole jest akurat przeskalowane animacją. */
        const positionOf = (event: PointerEvent): Point => {
            const bounds = canvas.getBoundingClientRect();
            const sx = bounds.width > 0 ? size.width / bounds.width : 1;
            const sy = bounds.height > 0 ? size.height / bounds.height : 1;
            return { x: (event.clientX - bounds.left) * sx, y: (event.clientY - bounds.top) * sy };
        };

        const start = (event: PointerEvent) => {
            fit();
            drawing = true;
            canvas.setPointerCapture(event.pointerId);
            const point = positionOf(event);
            strokesRef.current.push([point]);
            dot(point);
            if (!hasInkRef.current) reportInk(true);
        };

        const move = (event: PointerEvent) => {
            const stroke = strokesRef.current[strokesRef.current.length - 1];
            if (!drawing || !stroke) return;
            const point = positionOf(event);
            segment(stroke[stroke.length - 1], point);
            stroke.push(point);
        };

        const end = () => {
            drawing = false;
        };

        canvas.addEventListener('pointerdown', start);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('pointerleave', end);

        return () => {
            observer?.disconnect();
            repaintRef.current = () => undefined;
            canvas.removeEventListener('pointerdown', start);
            canvas.removeEventListener('pointermove', move);
            canvas.removeEventListener('pointerup', end);
            canvas.removeEventListener('pointercancel', end);
            canvas.removeEventListener('pointerleave', end);
        };
    }, [reportInk]);

    return (
        <PadWrap $height={typeof height === 'number' ? `${height}px` : height}>
            {/* touch-action: none - bez tego przeciągnięcie palcem przewija stronę zamiast rysować. */}
            <Canvas ref={canvasRef} aria-label="Pole podpisu" />
            {!hasInk && <Placeholder>Podpisz w tym polu</Placeholder>}
            <BaselineHint />
        </PadWrap>
    );
});

const PadWrap = styled.div<{ $height: string }>`
    position: relative;
    width: 100%;
    height: ${p => p.$height};
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
