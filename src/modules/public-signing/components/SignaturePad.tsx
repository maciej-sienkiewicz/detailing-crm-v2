// src/modules/public-signing/components/SignaturePad.tsx
//
// Touch/stylus/mouse signature canvas. Strokes are drawn on a TRANSPARENT
// canvas — the exported PNG carries an alpha channel and never a white
// background (backend contract, see SignatureImageProcessor).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

const PadWrap = styled.div`
    position: relative;
    border: 1.5px dashed #cbd5e1;
    border-radius: 12px;
    background:
        linear-gradient(#94a3b8, #94a3b8) no-repeat 8% 78% / 84% 1px,
        #f8fafc;
    touch-action: none;
    overflow: hidden;
`;

const Canvas = styled.canvas`
    display: block;
    width: 100%;
    height: 200px;
`;

const Hint = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #98a2b3;
    font-size: 13px;
    pointer-events: none;
`;

const ClearBtn = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    color: #667085;
    background: #ffffff;
    border: 1px solid #e4e7ec;
    border-radius: 9999px;
    cursor: pointer;

    &:active {
        background: #f1f3f6;
    }
`;

export interface SignaturePadHandle {
    isEmpty: () => boolean;
    clear: () => void;
    /** PNG with alpha channel, base64 WITHOUT the data: prefix. */
    toPngBase64: () => string | null;
}

interface SignaturePadProps {
    onStrokeChange?: (hasStrokes: boolean) => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
    ({ onStrokeChange }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const drawingRef = useRef(false);
        const [hasStrokes, setHasStrokes] = useState(false);
        const hasStrokesRef = useRef(false);

        // Size the bitmap to the CSS box × devicePixelRatio for crisp strokes
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#1e293b';
            }
        }, []);

        const setStrokes = (value: boolean) => {
            hasStrokesRef.current = value;
            setHasStrokes(value);
            onStrokeChange?.(value);
        };

        const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawingRef.current = true;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            const { x, y } = pointFromEvent(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            // A tap should leave a visible dot
            ctx.lineTo(x + 0.1, y + 0.1);
            ctx.stroke();
            if (!hasStrokesRef.current) setStrokes(true);
        };

        const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawingRef.current) return;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            const { x, y } = pointFromEvent(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        };

        const endStroke = () => {
            drawingRef.current = false;
        };

        const clear = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            setStrokes(false);
        };

        useImperativeHandle(ref, () => ({
            isEmpty: () => !hasStrokesRef.current,
            clear,
            toPngBase64: () => {
                const canvas = canvasRef.current;
                if (!canvas || !hasStrokesRef.current) return null;
                return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
            },
        }));

        return (
            <PadWrap>
                <Canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endStroke}
                    onPointerCancel={endStroke}
                    onPointerLeave={endStroke}
                />
                {!hasStrokes && <Hint>Podpisz się palcem lub rysikiem</Hint>}
                {hasStrokes && (
                    <ClearBtn type="button" onClick={clear}>
                        Wyczyść
                    </ClearBtn>
                )}
            </PadWrap>
        );
    },
);

SignaturePad.displayName = 'SignaturePad';
