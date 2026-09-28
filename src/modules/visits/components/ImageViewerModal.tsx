import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { acquireScrollLock } from '@/common/utils/scrollLock';

// ImageViewerModal is a fullscreen lightbox with a very dark overlay.
// It intentionally keeps its own custom overlay and does NOT use ModalShell,
// as the dark-background, image-centered lightbox pattern is incompatible with
// the standard card-style modal shell.

const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding:
        max(24px, env(safe-area-inset-top, 0px))
        max(24px, env(safe-area-inset-right, 0px))
        max(24px, env(safe-area-inset-bottom, 0px))
        max(24px, env(safe-area-inset-left, 0px));
    animation: fadeIn 0.2s ease;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    /* Nav arrows are pinned inside the frame, so the frame needs room for them. */
    @media (max-width: 640px) {
        padding:
            max(56px, env(safe-area-inset-top, 0px))
            max(12px, env(safe-area-inset-right, 0px))
            max(12px, env(safe-area-inset-bottom, 0px))
            max(12px, env(safe-area-inset-left, 0px));
    }
`;

const ModalContent = styled.div`
    position: relative;
    max-width: 100%;
    max-height: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

// Scena ma stały rozmiar zamiast dopasowywać się do zdjęcia. Miniatura i pełna
// jakość leżą na niej jedna na drugiej, więc podmiana jednej na drugą nie przesuwa
// ramki, strzałek ani podpisu - a przejście między zdjęciem pionowym i poziomym nie
// skacze oknem.
const ImageContainer = styled.div`
    position: relative;
    width: min(1600px, calc(100vw - 180px));
    height: calc(100dvh - 100px);
    min-height: 0;
    min-width: 0;
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;

    @media (max-width: 640px) {
        width: calc(100vw - 24px);
        height: calc(100dvh - 160px);
    }
`;

const StageImage = styled.img`
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    /* contain: nic nie jest przycinane, proporcje zostają. */
    object-fit: contain;
`;

// Miniatura rozciągnięta na cały ekran jest miękka - lekkie rozmycie mówi „to
// jeszcze nie to zdjęcie", zamiast udawać pełną jakość.
// Chowa się dopiero, gdy pełna jakość skończy się nakładać - zniknięcie od razu
// dawałoby czarne mignięcie pod zdjęciem, które dopiero nabiera krycia.
const PreviewImage = styled(StageImage)<{ $hidden: boolean }>`
    filter: blur(3px);
    opacity: ${p => (p.$hidden ? 0 : 1)};
    ${p => (p.$hidden ? 'transition: opacity 0s linear 0.25s;' : '')}
`;

const FullImage = styled(StageImage)<{ $loaded: boolean }>`
    opacity: ${p => (p.$loaded ? 1 : 0)};
    transition: opacity 0.2s ease;
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const appear = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

// Wskaźnik pojawia się z opóźnieniem: zdjęcie pobrane wcześniej w tle wczytuje się
// w ułamku sekundy i mignięcie kółka byłoby tylko szumem.
const Loading = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: ${props => props.theme.radii.lg};
    background: rgba(0, 0, 0, 0.45);
    color: rgba(255, 255, 255, 0.9);
    font-size: ${props => props.theme.fontSizes.xs};
    pointer-events: none;
    opacity: 0;
    animation: ${appear} 0.2s ease 0.15s forwards;

    &::before {
        content: '';
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.25);
        border-top-color: #fff;
        animation: ${spin} 0.8s linear infinite;
    }
`;

const LoadError = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: calc(100% - 32px);
    padding: 10px 14px;
    border-radius: ${props => props.theme.radii.md};
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: ${props => props.theme.fontSizes.sm};
    text-align: center;
`;

const ImageInfo = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    min-width: 0;

    @media (max-width: 480px) {
        padding: 10px 12px;
    }
`;

const ImageMeta = styled.div`
    display: flex;
    align-items: baseline;
    gap: 12px;
    min-width: 0;
`;

const ImageName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Counter = styled.span`
    flex-shrink: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: rgba(255, 255, 255, 0.75);
    font-variant-numeric: tabular-nums;
`;

const CloseButton = styled.button`
    position: absolute;
    top: ${props => props.theme.spacing.md};
    right: ${props => props.theme.spacing.md};
    width: 40px;
    height: 40px;
    flex-shrink: 0;

    /* Lifted clear of the image on a phone, where the frame fills the width. */
    @media (max-width: 640px) {
        top: -46px;
        right: 0;
    }
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: white;
        transform: scale(1.1);
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

const DownloadButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: ${props => props.theme.radii.md};
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    color: white;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const NavigationButton = styled.button<{ $direction: 'prev' | 'next' }>`
    position: absolute;
    top: 50%;
    ${props => props.$direction === 'prev' ? 'left: 20px;' : 'right: 20px;'}
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: white;
        transform: translateY(-50%) scale(1.1);
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        &:hover {
            transform: translateY(-50%);
        }
    }

    svg {
        width: 24px;
        height: 24px;
    }

    @media (max-width: 640px) {
        width: 40px;
        height: 40px;
        ${props => props.$direction === 'prev' ? 'left: 8px;' : 'right: 8px;'}

        svg { width: 20px; height: 20px; }
    }
`;

interface ImageViewerModalProps {
    imageUrl: string;
    imageName: string;
    isOpen: boolean;
    onClose: () => void;
    onDownload?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    onNext?: () => void;
    onPrev?: () => void;
    /** Mniejsza wersja tego samego zdjęcia (miniatura z siatki) - widać ją od razu. */
    previewUrl?: string;
    /** Zdjęcia, do których prawdopodobnie przejdzie się strzałką - pobierane w tle. */
    preloadUrls?: string[];
    /** Numer zdjęcia i ile ich jest, np. 3 z 12. */
    position?: { index: number; total: number };
}

// Przeglądarka nie gwarantuje dokończenia pobierania obrazka, do którego nic już
// nie trzyma referencji - dlatego obiekty Image żyją w module, a nie w efekcie.
// Mapa jest ograniczona, żeby długie przeglądanie nie trzymało setek zdjęć.
const PRELOAD_LIMIT = 12;
const preloaded = new Map<string, HTMLImageElement>();

function preload(url: string) {
    if (preloaded.has(url)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    preloaded.set(url, img);
    if (preloaded.size > PRELOAD_LIMIT) {
        const oldest = preloaded.keys().next().value;
        if (oldest !== undefined) preloaded.delete(oldest);
    }
}

export const ImageViewerModal = ({
    imageUrl,
    imageName,
    isOpen,
    onClose,
    onDownload,
    hasNext = false,
    hasPrev = false,
    onNext,
    onPrev,
    previewUrl,
    preloadUrls,
    position,
}: ImageViewerModalProps) => {
    // Które zdjęcie w pełnej jakości już doszło (albo się wysypało). Porównanie z
    // bieżącym adresem zamiast flagi resetowanej w efekcie: po strzałce stan
    // „wczytane" dotyczy jeszcze poprzedniego zdjęcia i sam przestaje pasować, bez
    // jednej klatki, w której nowe zdjęcie udawałoby gotowe.
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const loaded = loadedUrl === imageUrl;
    const failed = failedUrl === imageUrl;
    const showPreview = !!previewUrl && previewUrl !== imageUrl;

    // Klucz tekstowy zamiast tablicy: rodzic buduje ją na nowo przy każdym renderze.
    const preloadKey = (preloadUrls ?? []).join('\n');
    useEffect(() => {
        if (!isOpen || !preloadKey) return;
        preloadKey.split('\n').forEach(preload);
    }, [isOpen, preloadKey]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight' && hasNext && onNext) {
                onNext();
            } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
                onPrev();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, hasNext, hasPrev, onNext, onPrev]);

    // Blokada scrolla osobno od klawiatury: tamten efekt przeżywa restart przy
    // każdej zmianie callbacków rodzica, a blokada ma trwać dokładnie tyle,
    // ile otwarte okno. Współdzielony scrollLock zamiast zapisu po stylach
    // <body> — sztywne przywracanie 'unset' rozbrajało blokadę okna pod spodem.
    useEffect(() => {
        if (!isOpen) return;
        return acquireScrollLock();
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <ModalOverlay onClick={onClose}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
                <CloseButton onClick={onClose} title="Zamknij (Esc)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </CloseButton>

                {hasPrev && onPrev && (
                    <NavigationButton
                        $direction="prev"
                        onClick={onPrev}
                        title="Poprzednie (←)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </NavigationButton>
                )}

                {hasNext && onNext && (
                    <NavigationButton
                        $direction="next"
                        onClick={onNext}
                        title="Następne (→)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </NavigationButton>
                )}

                <ImageContainer>
                    {/* Po strzałce od razu widać NASTĘPNE zdjęcie - miniaturę, którą
                        przeglądarka ma już z siatki - a nie poprzednie, które wisiało
                        do czasu pobrania oryginału i dawało wrażenie, że klik nie
                        zadziałał. */}
                    {showPreview && (
                        <PreviewImage
                            key={`p:${previewUrl}`}
                            src={previewUrl}
                            alt=""
                            aria-hidden="true"
                            $hidden={loaded}
                        />
                    )}
                    <FullImage
                        key={imageUrl}
                        src={imageUrl}
                        alt={imageName}
                        $loaded={loaded}
                        onLoad={() => setLoadedUrl(imageUrl)}
                        onError={() => setFailedUrl(imageUrl)}
                    />
                    {!loaded && !failed && (
                        <Loading key={`l:${imageUrl}`} role="status">Wczytywanie zdjęcia</Loading>
                    )}
                    {failed && (
                        <LoadError role="alert">Nie udało się wczytać zdjęcia w pełnej jakości.</LoadError>
                    )}
                    <ImageInfo>
                        <ImageMeta>
                            <ImageName>{imageName}</ImageName>
                            {position && position.total > 1 && (
                                <Counter>{position.index} z {position.total}</Counter>
                            )}
                        </ImageMeta>
                        {onDownload && (
                            <DownloadButton onClick={onDownload}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Pobierz
                            </DownloadButton>
                        )}
                    </ImageInfo>
                </ImageContainer>
            </ModalContent>
        </ModalOverlay>,
        document.body
    );
};
