// src/modules/public-signing/components/PdfPagesViewer.tsx
//
// Renders every page of a PDF (raw bytes) onto stacked canvases via pdf.js.
// Mobile browsers do not reliably display PDFs in <iframe>/<embed> (Android
// Chrome downloads the file instead), and this page is opened from an SMS,
// so rendering to canvas is the only dependable option.

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

const RetryBtn = styled.button`
    display: block;
    margin: 12px auto 0;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    color: #1d4ed8;
    background: #ffffff;
    border: 1.5px solid #1d4ed8;
    border-radius: 9999px;
    cursor: pointer;
`;

interface PdfPagesViewerProps {
    /** Raw PDF bytes. The component copies them: pdf.js detaches its input buffer. */
    data: ArrayBuffer;
    onRenderError?: () => void;
}

export const PdfPagesViewer = ({ data, onRenderError }: PdfPagesViewerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<'rendering' | 'done' | 'error'>('rendering');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const render = async (retriesLeft: number): Promise<void> => {
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                    'pdfjs-dist/build/pdf.worker.min.mjs',
                    import.meta.url,
                ).toString();

                // pdf.js transfers (detaches) the buffer it receives, so hand it a copy
                const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
                if (cancelled) return;

                const container = containerRef.current;
                if (!container) return;
                container.innerHTML = '';

                const containerWidth = container.clientWidth || 320;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                // Cap the backing-store width: on multi-page documents unbounded
                // canvases exhaust iOS Safari's canvas memory budget and the render
                // throws mid-document
                const targetWidth = Math.min(containerWidth * dpr, 1600);

                for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
                    const page = await doc.getPage(pageNumber);
                    if (cancelled) return;

                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = targetWidth / baseViewport.width;
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
                if (cancelled) return;
                if (retriesLeft > 0) {
                    // A failed dynamic import of pdf.js or its worker chunk (flaky
                    // mobile network) usually succeeds on a fresh attempt
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    if (!cancelled) return render(retriesLeft - 1);
                    return;
                }
                setState('error');
                onRenderError?.();
            }
        };

        setState('rendering');
        void render(1);
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, attempt]);

    return (
        <PagesWrap>
            {state === 'rendering' && <Status>Ładowanie dokumentu...</Status>}
            {state === 'error' && (
                <Status>
                    Nie udało się wyświetlić dokumentu.
                    <RetryBtn onClick={() => setAttempt(a => a + 1)}>Spróbuj ponownie</RetryBtn>
                </Status>
            )}
            <div ref={containerRef} />
        </PagesWrap>
    );
};
