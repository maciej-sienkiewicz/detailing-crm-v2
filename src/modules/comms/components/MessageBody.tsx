// src/modules/comms/components/MessageBody.tsx
// Render cudzego HTML w izolowanym iframe. Trzecia warstwa obrony (po sanityzacji
// serwera): sandbox bez allow-scripts, więc nawet przepuszczony skrypt nie wykona się;
// allow-same-origin jest bezpieczne bez skryptów, a daje ciasteczka dla obrazków
// inline (cid → /api/v1/comms/attachments/…) i automatyczne dopasowanie wysokości.
import { useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';

const Frame = styled.iframe`
    width: 100%;
    border: none;
    display: block;
    background: #ffffff;
    min-height: 60px;
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
        }
        img { max-width: 100%; height: auto; }
        table { max-width: 100%; }
        a { color: #2563eb; }
        blockquote { border-left: 3px solid #e5e7eb; margin-left: 0; padding-left: 12px; color: #6b7280; }
    </style>
`;

interface MessageBodyProps {
    html: string;
}

export function MessageBody({ html }: MessageBodyProps) {
    const frameRef = useRef<HTMLIFrameElement>(null);

    const srcDoc = useMemo(
        () => `<!doctype html><html><head><meta charset="utf-8">${FRAME_STYLES}</head><body>${html}</body></html>`,
        [html]
    );

    const resize = useCallback(() => {
        const frame = frameRef.current;
        const body = frame?.contentDocument?.body;
        if (!frame || !body) return;
        frame.style.height = `${Math.min(body.scrollHeight + 16, 4000)}px`;
    }, []);

    return (
        <Frame
            ref={frameRef}
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            srcDoc={srcDoc}
            onLoad={resize}
            title="Treść wiadomości"
        />
    );
}
