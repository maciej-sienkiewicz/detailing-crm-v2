// src/modules/public-signing/components/PdfPagesViewer.tsx
//
// Renders every page of a PDF (raw bytes) onto stacked canvases via pdf.js.
// Mobile browsers do not reliably display PDFs in <iframe>/<embed> (Android
// Chrome downloads the file instead), and this page is opened from an SMS —
// rendering to canvas is the only dependable option.

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const PagesWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Status = styled.div`
    padding: 32px 16px;
    text-align: center;
    color: #667085;
    font-size: 13px;
`;

interface PdfPagesViewerProps {
    /** Raw PDF bytes. The component copies them — pdf.js detaches its input buffer. */
    data: ArrayBuffer;
    onRenderError?: () => void;
}

export const PdfPagesViewer = ({ data, onRenderError }: PdfPagesViewerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<'rendering' | 'done' | 'error'>('rendering');

    useEffect(() => {
        let cancelled = false;

        const render = async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                    'pdfjs-dist/build/pdf.worker.min.mjs',
                    import.meta.url,
                ).toString();

                // pdf.js transfers (detaches) the buffer it receives — hand it a copy
                const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
                if (cancelled) return;

                const container = containerRef.current;
                if (!container) return;
                container.innerHTML = '';

                const containerWidth = container.clientWidth || 320;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);

                for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
                    const page = await doc.getPage(pageNumber);
                    if (cancelled) return;

                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = (containerWidth / baseViewport.width) * dpr;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.display = 'block';
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.background = '#ffffff';
                    canvas.style.border = '1px solid #e4e7ec';
                    canvas.style.borderRadius = '8px';
                    canvas.style.marginBottom = '8px';

                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;
                    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
                    if (cancelled) return;
                    container.appendChild(canvas);
                }

                setState('done');
            } catch (err) {
                console.error('[PdfPagesViewer] Failed to render PDF:', err);
                if (!cancelled) {
                    setState('error');
                    onRenderError?.();
                }
            }
        };

        void render();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    return (
        <PagesWrap>
            {state === 'rendering' && <Status>Ładowanie dokumentu…</Status>}
            {state === 'error' && <Status>Nie udało się wyświetlić dokumentu.</Status>}
            <div ref={containerRef} />
        </PagesWrap>
    );
};
