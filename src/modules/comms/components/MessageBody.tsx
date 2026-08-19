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
// Zmierzone wysokości pamiętamy w cache modułu: powrót do wątku renderuje się od
// razu w docelowym rozmiarze, zamiast „dorastać" w oczach użytkownika.
//
// Długa wiadomość nie jest już ucinana bez wyjścia — chmurka dostaje własny scroll.
// Wiadomość graficzna (newsletter, oferta w jednym obrazku) zamienia się w przycisk
// otwierający pełny podgląd: w wąskiej chmurce i tak nie da się jej przeczytać.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronUp, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { describeHtml, splitQuotedHistory } from '../utils/emailHtml';

const Root = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

const ScrollArea = styled.div<{ $clamped: boolean; $maxHeight: number }>`
    position: relative;
    min-width: 0;
    ${({ $clamped, $maxHeight }) =>
        $clamped &&
        `
        max-height: ${$maxHeight}px;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    `}

    /* Delikatny pasek przewijania, żeby chmurka nie wyglądała jak okno w oknie. */
    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.45);
        border-radius: 999px;
    }
    &::-webkit-scrollbar-track { background: transparent; }
`;

const Frame = styled.iframe<{ $ready: boolean }>`
    width: 100%;
    border: none;
    display: block;
    background: #ffffff;
    min-height: 24px;
    opacity: ${({ $ready }) => ($ready ? 1 : 0)};
    transition: opacity 120ms ease-out;
`;

/** Stopka chmurki: przewijalna treść, historia rozmowy, pełny podgląd. */
const Footer = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

const GhostButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 5px 12px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    font-family: inherit;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

/** Zastępnik wiadomości graficznej — jedno kliknięcie do czytelnego widoku. */
const GraphicalCard = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    border: 1px dashed ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    border-radius: ${p => p.theme.radii.md};
    padding: 12px 14px;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        background: ${p => p.theme.colors.surface};
    }

    .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        border-radius: ${p => p.theme.radii.md};
        background: ${p => p.theme.colors.surface};
        border: 1px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textMuted};
    }
    .grow { flex: 1; min-width: 0; }
    .title {
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .hint {
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
    }
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
        .crm-quoted { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    </style>
`;

/** Wysokości zmierzonych wiadomości — klucz: id wiadomości + stan cytatu. */
const heightCache = new Map<string, number>();
const HEIGHT_CACHE_LIMIT = 400;

const rememberHeight = (key: string, value: number) => {
    // Cache żyje tyle, co karta przeglądarki — po długiej sesji czyścimy najstarsze wpisy.
    if (heightCache.size >= HEIGHT_CACHE_LIMIT) {
        const oldest = heightCache.keys().next().value;
        if (oldest !== undefined) heightCache.delete(oldest);
    }
    heightCache.set(key, value);
};

interface MessageBodyProps {
    html: string;
    /** Id wiadomości — pozwala pamiętać zmierzoną wysokość między renderami. */
    cacheKey?: string;
    /** Wysokość, powyżej której chmurka dostaje własny scroll. */
    maxHeight?: number;
    /** Gdy podany, pokazujemy przejście do pełnego podglądu. */
    onOpenFull?: () => void;
    /** Chowanie doklejonej historii rozmowy pod przełącznikiem. */
    collapseQuoted?: boolean;
    /** Podmiana wiadomości graficznej na przycisk (tylko w chmurce rozmowy). */
    compactGraphical?: boolean;
}

export function MessageBody({
    html,
    cacheKey,
    maxHeight,
    onOpenFull,
    collapseQuoted = true,
    compactGraphical = false,
}: MessageBodyProps) {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [quotedShown, setQuotedShown] = useState(false);

    const { mainHtml, quotedHtml } = useMemo(
        () => (collapseQuoted ? splitQuotedHistory(html) : { mainHtml: html, quotedHtml: null }),
        [html, collapseQuoted]
    );
    const shape = useMemo(() => describeHtml(mainHtml), [mainHtml]);
    const asPlaceholder = compactGraphical && shape.isGraphical && Boolean(onOpenFull);

    const documentHtml = useMemo(() => {
        const body = quotedShown && quotedHtml
            ? `${mainHtml}<div class="crm-quoted">${quotedHtml}</div>`
            : mainHtml;
        return `<!doctype html><html><head><meta charset="utf-8">${FRAME_STYLES}</head><body>${body}</body></html>`;
    }, [mainHtml, quotedHtml, quotedShown]);

    const measureKey = cacheKey ? `${cacheKey}:${quotedShown ? 'full' : 'main'}` : null;
    const cachedHeight = measureKey ? heightCache.get(measureKey) ?? 0 : 0;
    // Start od zapamiętanej wysokości: wracając do wątku ramka od razu ma docelowy
    // rozmiar, zamiast „dorastać" w oczach użytkownika. Kolejne wartości przynosi
    // pomiar po załadowaniu ramki.
    const [height, setHeight] = useState(cachedHeight);

    const measure = useCallback(() => {
        const doc = frameRef.current?.contentDocument;
        const body = doc?.body;
        if (!frameRef.current || !doc || !body) return;
        // documentElement bywa wyższy od body przy marginesach kolapsujących.
        const next = Math.max(body.scrollHeight, doc.documentElement?.scrollHeight ?? 0) + 16;
        frameRef.current.style.height = `${next}px`;
        if (measureKey) rememberHeight(measureKey, next);
        setHeight(next);
    }, [measureKey]);

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
    }, [documentHtml]);

    if (asPlaceholder) {
        return (
            <Root>
                <GraphicalCard onClick={onOpenFull}>
                    <span className="icon"><ImageIcon size={16} /></span>
                    <span className="grow">
                        <span className="title">Wiadomość graficzna</span>
                        <span className="hint"> — kliknij, żeby podejrzeć</span>
                    </span>
                    <Maximize2 size={14} />
                </GraphicalCard>
                {quotedHtml && (
                    <Footer>
                        <GhostButton onClick={onOpenFull}>
                            Zawiera historię rozmowy
                        </GhostButton>
                    </Footer>
                )}
            </Root>
        );
    }

    const clamped = Boolean(maxHeight) && height > (maxHeight ?? 0);

    return (
        <Root>
            <ScrollArea $clamped={clamped} $maxHeight={maxHeight ?? 0}>
                <Frame
                    ref={frameRef}
                    $ready={height > 0}
                    style={height > 0 ? { height } : undefined}
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={documentHtml}
                    onLoad={handleLoad}
                    title="Treść wiadomości"
                    scrolling="no"
                />
            </ScrollArea>
            {(quotedHtml || (clamped && onOpenFull)) && (
                <Footer>
                    {quotedHtml && (
                        <GhostButton
                            onClick={() => setQuotedShown((shown) => !shown)}
                            title="Wcześniejsza korespondencja doklejona przez program pocztowy nadawcy"
                        >
                            {quotedShown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {quotedShown ? 'Ukryj historię rozmowy' : 'Pokaż historię rozmowy'}
                        </GhostButton>
                    )}
                    {clamped && onOpenFull && (
                        <GhostButton onClick={onOpenFull}>
                            <Maximize2 size={13} /> Otwórz w pełnym widoku
                        </GhostButton>
                    )}
                </Footer>
            )}
        </Root>
    );
}
