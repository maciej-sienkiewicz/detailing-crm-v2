// src/modules/comms/components/signature/SignaturePreview.tsx
// Podgląd stopki na żywo: makieta wiadomości z „Pozdrawiam," i stopką pod spodem,
// z przełącznikiem ciemnego tła (tak wygląda w Outlooku i Apple Mail w trybie ciemnym).
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import styled from 'styled-components';
import DOMPurify from 'dompurify';

const Card = styled.div<{ $dark: boolean }>`
    /* Nie kurczy się do wysokości kolumny: przy niskim oknie kurczyła się i ucinała
       stopkę (overflow: hidden), a kolumna nie miała czego przewijać. Teraz rośnie
       z treścią, a przewija się kolumna podglądu. */
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-radius: ${p => p.theme.radii.xl};
    background: ${p => (p.$dark ? '#1f2023' : '#ffffff')};
    box-shadow:
        0 0 0 1px rgba(15, 23, 42, 0.06),
        0 12px 32px -12px rgba(15, 23, 42, 0.22);
    overflow: hidden;
    transition: background ${p => p.theme.transitions.normal};
`;

const Head = styled.div<{ $dark: boolean }>`
    display: grid;
    grid-template-columns: 56px 1fr;
    row-gap: 10px;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid ${p => (p.$dark ? '#34363b' : p.theme.colors.border)};
    font-size: 12px;
    color: ${p => (p.$dark ? '#9aa0a6' : p.theme.colors.textMuted)};
`;

const Bar = styled.i<{ $w: number; $dark: boolean }>`
    display: block;
    height: 8px;
    width: ${p => p.$w}%;
    border-radius: 4px;
    background: ${p => (p.$dark ? '#34363b' : '#eef1f5')};
`;

const Body = styled.div<{ $dark: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 22px 24px 28px;
    color: ${p => (p.$dark ? '#e8eaed' : '#202124')};
`;

/** Atrapa treści wiadomości - na niskim ekranie ustępuje miejsca samej stopce. */
const BodyBar = styled(Bar)`
    @media (max-height: 760px) {
        display: none;
    }
`;

const Greeting = styled.div`
    margin-top: 14px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
`;

/** Stopka w skali 1:1 - przewija się w poziomie, zamiast ściskać tabele poczty. */
const Signature = styled.div`
    margin-top: 10px;
    overflow-x: auto;
`;

const TextSignature = styled.div`
    margin-top: 10px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

/** Linki w podglądzie nie mogą wyprowadzić z aplikacji w pół konfiguracji. */
const swallowLinks = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) event.preventDefault();
};

const sanitize = (html: string) => DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });

interface SignaturePreviewProps {
    /** HTML motywu albo `null`, gdy podglądamy stopkę tekstową. */
    html: string | null;
    text?: string;
    dark: boolean;
}

export function SignaturePreview({ html, text, dark }: SignaturePreviewProps) {
    return (
        <Card $dark={dark} aria-label="Podgląd wiadomości ze stopką">
            <Head $dark={dark} aria-hidden="true">
                <span>Do:</span><Bar $w={45} $dark={dark} />
                <span>Temat:</span><Bar $w={65} $dark={dark} />
            </Head>
            <Body $dark={dark}>
                <BodyBar $w={92} $dark={dark} aria-hidden="true" />
                <BodyBar $w={74} $dark={dark} aria-hidden="true" />
                <BodyBar $w={38} $dark={dark} aria-hidden="true" />
                <Greeting>Pozdrawiam,</Greeting>
                {html !== null ? (
                    <Signature onClick={swallowLinks} dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
                ) : (
                    <TextSignature>{`--\n${text?.trim() || 'Stopka jest pusta'}`}</TextSignature>
                )}
            </Body>
        </Card>
    );
}

// ── Miniatura motywu ─────────────────────────────────────────────────────────

const ThumbFrame = styled.div<{ $height: number }>`
    position: relative;
    height: ${p => p.$height}px;
    overflow: hidden;
    pointer-events: none;
`;

/** Pełnowymiarowa stopka, zmierzona i pomniejszona do ramki karty. */
const ThumbInner = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    transform-origin: top left;
`;

const THUMB_PADDING = 12;

/**
 * Motyw w pomniejszeniu. Stopka ma stałą szerokość (tabele poczty się nie zwijają),
 * więc skalujemy całość transformacją zamiast ją przełamywać - i to do jej WŁASNEGO
 * rozmiaru, nie do szerokości maksymalnej: wąska „Klasyczna" przeskalowana jak szeroki
 * baner zajmowała róg karty i była nieczytelna.
 */
export function SignatureThumbnail({ html, height = 124 }: { html: string; height?: number }) {
    const frameRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState({ scale: 0.4, x: THUMB_PADDING, y: THUMB_PADDING });

    useLayoutEffect(() => {
        const frame = frameRef.current;
        const inner = innerRef.current;
        if (!frame || !inner) return;
        const update = () => {
            const width = inner.offsetWidth;
            const contentHeight = inner.offsetHeight;
            const available = frame.clientWidth - THUMB_PADDING * 2;
            if (!width || !contentHeight || available <= 0) return;
            const scale = Math.min(1, available / width, (height - THUMB_PADDING * 2) / contentHeight);
            setFit({
                scale,
                x: (frame.clientWidth - width * scale) / 2,
                y: (height - contentHeight * scale) / 2,
            });
        };
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(update);
        observer.observe(frame);
        observer.observe(inner);
        return () => observer.disconnect();
    }, [html, height]);

    return (
        <ThumbFrame ref={frameRef} $height={height} aria-hidden="true">
            <ThumbInner
                ref={innerRef}
                style={{ transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})` }}
                dangerouslySetInnerHTML={{ __html: sanitize(html) }}
            />
        </ThumbFrame>
    );
}
