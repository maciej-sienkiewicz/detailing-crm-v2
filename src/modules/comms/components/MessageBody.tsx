// src/modules/comms/components/MessageBody.tsx
// Treść jednej wiadomości. Dwie drogi renderu, dobierane do tego, czym wiadomość
// naprawdę jest:
//
//  • ZWYKŁA KORESPONDENCJA (akapity, listy, linki — przytłaczająca większość poczty
//    w CRM) renderuje się WPROST w naszej typografii. Jedna czcionka, jeden rytm,
//    jedna szerokość kolumny — i zero mierzenia wysokości, więc nie ma czego uciąć.
//    Warstwy bezpieczeństwa: sanityzacja na backendzie (jsoup Safelist) + DOMPurify tutaj.
//
//  • MAIL PROJEKTOWANY (newsletter na tabelach, własne style, tła) ląduje w izolowanym
//    iframe, bo tam układ jest treścią, a obce CSS nie może wyciec na resztę aplikacji.
//    Sandbox bez allow-scripts; allow-same-origin daje ciasteczka dla obrazków inline
//    (cid → /api/v1/comms/attachments/…) i pomiar wysokości dokumentu. Ramka bywa
//    ekranami treści, więc dostaje własny scroll i przejście do pełnego podglądu.
//
//  • WIADOMOŚĆ GRAFICZNA (sam obrazek, zero tekstu) w wąskiej kolumnie wątku jest
//    nieczytelna — pokazujemy przycisk otwierający pełny podgląd.
//
// Doklejoną historię rozmowy chowamy pod przełącznikiem w obu trybach (patrz
// utils/emailHtml.ts) — bez tego każda kolejna odpowiedź powtarza cały wątek.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import DOMPurify from 'dompurify';
import { ChevronUp, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { describeHtml, isRichHtml, splitQuotedHistory, trimEmptyEdges } from '../utils/emailHtml';

const Root = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
`;

/** Kolumna czytelnicza: długość wiersza, przy której oko nie gubi linijek. */
const Prose = styled.div`
    max-width: 68ch;
    font-size: 14.5px;
    line-height: 1.65;
    color: ${p => p.theme.colors.text};
    overflow-wrap: anywhere;

    /* Obcy HTML sprowadzamy do naszego rytmu — bez tego każdy mail ma inną skalę. */
    * { max-width: 100%; font-family: inherit !important; }
    font, span, div, p, td { font-size: inherit !important; line-height: inherit !important; }

    p, div { margin: 0; }
    p + p { margin-top: 0.9em; }
    br + br { line-height: 0.5; }
    ul, ol { margin: 0.6em 0; padding-left: 1.4em; }
    li { margin: 0.2em 0; }
    a { color: ${p => p.theme.colors.primary}; text-decoration: underline; }
    img { height: auto; border-radius: ${p => p.theme.radii.sm}; margin: 4px 0; }
    hr { border: none; border-top: 1px solid ${p => p.theme.colors.border}; margin: 1em 0; }
    blockquote {
        margin: 0.6em 0;
        padding-left: 12px;
        border-left: 2px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textSecondary};
    }
    pre { white-space: pre-wrap; font-family: inherit; }
    table { border-collapse: collapse; }
    td, th { padding: 2px 6px; }
`;

/** Cytat renderujemy przygaszony — jest kontekstem, nie treścią. */
const QuotedProse = styled(Prose)`
    margin-top: 4px;
    padding-left: 12px;
    border-left: 2px solid ${p => p.theme.colors.border};
    color: ${p => p.theme.colors.textMuted};
    font-size: 13.5px;
`;

const ScrollArea = styled.div<{ $clamped: boolean; $maxHeight: number }>`
    position: relative;
    width: 100%;
    min-width: 0;
    ${({ $clamped, $maxHeight }) =>
        $clamped &&
        `
        max-height: ${$maxHeight}px;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
    `}

    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.45); border-radius: 999px; }
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

const Footer = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

/** „⋯" w stylu Gmaila: rozwija doklejoną historię rozmowy, nie krzycząc o tym. */
const QuoteToggle = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textMuted};
    border-radius: ${p => p.theme.radii.full};
    padding: ${({ $open }) => ($open ? '4px 12px' : '2px 10px')};
    font-size: 12px;
    line-height: 1.4;
    font-weight: ${p => p.theme.fontWeights.medium};
    letter-spacing: ${({ $open }) => ($open ? 'normal' : '0.12em')};
    cursor: pointer;
    font-family: inherit;

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
        color: ${p => p.theme.colors.textSecondary};
    }
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

const GraphicalCard = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 420px;
    text-align: left;
    border: 1px dashed ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    border-radius: ${p => p.theme.radii.md};
    padding: 12px 14px;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.primary}; background: ${p => p.theme.colors.surface}; }

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
    .title { font-size: 13px; font-weight: ${p => p.theme.fontWeights.semibold}; color: ${p => p.theme.colors.text}; }
    .hint { font-size: 12px; color: ${p => p.theme.colors.textSecondary}; }
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

/** Warstwa kliencka nad sanityzacją backendu — obie muszą zawieść, żeby coś przeszło. */
const PURIFY_CONFIG = {
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'formaction'],
    ADD_ATTR: ['target', 'rel'],
};

const sanitize = (html: string): string => DOMPurify.sanitize(html, PURIFY_CONFIG) as string;

/** Wysokości zmierzonych ramek — klucz: id wiadomości + stan cytatu. */
const heightCache = new Map<string, number>();
const HEIGHT_CACHE_LIMIT = 400;

const rememberHeight = (key: string, value: number) => {
    if (heightCache.size >= HEIGHT_CACHE_LIMIT) {
        const oldest = heightCache.keys().next().value;
        if (oldest !== undefined) heightCache.delete(oldest);
    }
    heightCache.set(key, value);
};

interface MessageBodyProps {
    html: string;
    /** Id wiadomości — pozwala pamiętać zmierzoną wysokość ramki między renderami. */
    cacheKey?: string;
    /** Wysokość, powyżej której ramka maila projektowanego dostaje własny scroll. */
    maxHeight?: number;
    /** Gdy podany, oferujemy przejście do pełnego podglądu. */
    onOpenFull?: () => void;
    /** Chowanie doklejonej historii rozmowy pod przełącznikiem. */
    collapseQuoted?: boolean;
    /** Podmiana wiadomości graficznej na przycisk (tylko w wątku, nie w pełnym podglądzie). */
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

    const { mainHtml, quotedHtml } = useMemo(() => {
        const split = collapseQuoted ? splitQuotedHistory(html) : { mainHtml: html, quotedHtml: null };
        return { mainHtml: trimEmptyEdges(split.mainHtml), quotedHtml: split.quotedHtml };
    }, [html, collapseQuoted]);
    const shape = useMemo(() => describeHtml(mainHtml), [mainHtml]);
    const rich = useMemo(() => isRichHtml(mainHtml), [mainHtml]);

    const documentHtml = useMemo(() => {
        const body = quotedShown && quotedHtml
            ? `${mainHtml}<div class="crm-quoted">${quotedHtml}</div>`
            : mainHtml;
        return `<!doctype html><html><head><meta charset="utf-8">${FRAME_STYLES}</head><body>${body}</body></html>`;
    }, [mainHtml, quotedHtml, quotedShown]);

    const measureKey = cacheKey ? `${cacheKey}:${quotedShown ? 'full' : 'main'}` : null;
    // Start od zapamiętanej wysokości: wracając do wątku ramka od razu ma docelowy
    // rozmiar, zamiast „dorastać" w oczach użytkownika.
    const [height, setHeight] = useState(measureKey ? heightCache.get(measureKey) ?? 0 : 0);

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

    const quoteToggle = quotedHtml && (
        <QuoteToggle
            $open={quotedShown}
            onClick={() => setQuotedShown((shown) => !shown)}
            aria-expanded={quotedShown}
            title="Wcześniejsza korespondencja doklejona przez program pocztowy nadawcy"
        >
            {quotedShown ? (
                <>
                    <ChevronUp size={12} /> Ukryj historię rozmowy
                </>
            ) : (
                '•••'
            )}
        </QuoteToggle>
    );

    // ── Wiadomość graficzna ──────────────────────────────────────────────────
    if (compactGraphical && shape.isGraphical && onOpenFull) {
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
                {quotedHtml && <Footer>{quoteToggle}</Footer>}
            </Root>
        );
    }

    // ── Zwykła korespondencja: render wprost, w naszej typografii ────────────
    if (!rich) {
        return (
            <Root>
                <Prose dangerouslySetInnerHTML={{ __html: sanitize(mainHtml) }} />
                {quotedHtml && (
                    <>
                        <Footer>{quoteToggle}</Footer>
                        {quotedShown && (
                            <QuotedProse dangerouslySetInnerHTML={{ __html: sanitize(quotedHtml) }} />
                        )}
                    </>
                )}
            </Root>
        );
    }

    // ── Mail projektowany: izolowana ramka ───────────────────────────────────
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
                    {quoteToggle}
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
