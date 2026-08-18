// src/modules/comms/components/MessageBody.tsx
// Render cudzego HTML w izolowanym iframe. Trzecia warstwa obrony (po sanityzacji
// serwera): sandbox bez allow-scripts, więc nawet przepuszczony skrypt nie wykona się;
// allow-same-origin jest bezpieczne bez skryptów, a daje ciasteczka dla obrazków
// inline (cid → /api/v1/comms/attachments/…) i pomiar wysokości dokumentu.
//
// Pomiar musi być odporny: newslettery ładują obrazki z zewnętrznych domen długo
// po zdarzeniu load, a część z nich w ogóle się nie ładuje. Dlatego wysokość
// dopasowujemy przez ResizeObserver na <body> ramki plus nasłuch na obrazkach —
// inaczej wiadomość zostaje ucięta na wysokości zmierzonej w pierwszej klatce.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Maximize2 } from 'lucide-react';

const Wrapper = styled.div<{ $clamped: boolean; $maxHeight: number }>`
    position: relative;
    ${({ $clamped, $maxHeight }) => $clamped && `max-height: ${$maxHeight}px; overflow: hidden;`}
`;

const Frame = styled.iframe`
    width: 100%;
    border: none;
    display: block;
    background: #ffffff;
    min-height: 48px;
`;

/** Zwiastun dalszej treści: gradient + przycisk pełnego podglądu. */
const FadeOverlay = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 96px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 10px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #ffffff 78%);
    pointer-events: none;
`;

const ExpandButton = styled.button`
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 6px 14px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    font-family: inherit;
    box-shadow: ${p => p.theme.shadows.sm};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

const FRAME_STYLES = `
    <style>
        html, body { margin: 0; padding: 0; }
        body {
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.55;
            color: #1f2937;
            word-break: break-word;
            padding: 2px;
            overflow-x: auto;
        }
        img { max-width: 100%; height: auto; }
        table { max-width: 100%; }
        a { color: #2563eb; }
        blockquote { border-left: 3px solid #e5e7eb; margin-left: 0; padding-left: 12px; color: #6b7280; }
    </style>
`;

interface MessageBodyProps {
    html: string;
    /** Wysokość, powyżej której wiadomość jest przycinana z opcją pełnego podglądu. */
    clampHeight?: number;
    /** Gdy podany, pokazujemy przycisk „Otwórz w pełnym widoku". */
    onOpenFull?: () => void;
}

export function MessageBody({ html, clampHeight = 720, onOpenFull }: MessageBodyProps) {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(0);

    const srcDoc = useMemo(
        () => `<!doctype html><html><head><meta charset="utf-8">${FRAME_STYLES}</head><body>${html}</body></html>`,
        [html]
    );

    const measure = useCallback(() => {
        const doc = frameRef.current?.contentDocument;
        const body = doc?.body;
        if (!frameRef.current || !doc || !body) return;
        // documentElement bywa wyższy od body przy marginesach kolapsujących.
        const next = Math.max(body.scrollHeight, doc.documentElement?.scrollHeight ?? 0) + 16;
        frameRef.current.style.height = `${next}px`;
        setHeight(next);
    }, []);

    const handleLoad = useCallback(() => {
        const frame = frameRef.current;
        const doc = frame?.contentDocument;
        if (!frame || !doc?.body) return;

        measure();

        // Obrazki dociągają się po load — każdy z nich zmienia wysokość dokumentu.
        const observer = new ResizeObserver(measure);
        observer.observe(doc.body);
        const images = Array.from(doc.images ?? []);
        images.forEach((image) => {
            if (image.complete) return;
            image.addEventListener('load', measure);
            image.addEventListener('error', measure);
        });

        // Zapasowe pomiary dla treści, których obserwator nie złapie (webfonty).
        const timers = [120, 400, 1200].map((delay) => window.setTimeout(measure, delay));

        frame.dataset.cleanupAttached = 'true';
        (frame as HTMLIFrameElement & { __cleanup?: () => void }).__cleanup = () => {
            observer.disconnect();
            images.forEach((image) => {
                image.removeEventListener('load', measure);
                image.removeEventListener('error', measure);
            });
            timers.forEach(window.clearTimeout);
        };
    }, [measure]);

    useEffect(() => {
        const frame = frameRef.current as (HTMLIFrameElement & { __cleanup?: () => void }) | null;
        return () => frame?.__cleanup?.();
    }, [srcDoc]);

    const clamped = Boolean(onOpenFull) && height > clampHeight;

    return (
        <Wrapper $clamped={clamped} $maxHeight={clampHeight}>
            <Frame
                ref={frameRef}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                srcDoc={srcDoc}
                onLoad={handleLoad}
                title="Treść wiadomości"
                scrolling="no"
            />
            {clamped && (
                <FadeOverlay>
                    <ExpandButton onClick={onOpenFull}>
                        <Maximize2 size={13} /> Pokaż całą wiadomość
                    </ExpandButton>
                </FadeOverlay>
            )}
        </Wrapper>
    );
}
