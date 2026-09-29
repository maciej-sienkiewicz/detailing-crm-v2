// src/common/components/ProgressiveImage/ProgressiveImage.tsx
//
// Zdjęcie wczytywane w dwóch krokach: od razu miniatura (przeglądarka ma ją zwykle z siatki),
// lekko rozmyta, ze wskaźnikiem wczytywania - a pełna jakość nakłada się na nią, gdy dojdzie.
// Wspólne dla podglądu zdjęć wizyty i galerii: po strzałce widać NASTĘPNE zdjęcie od razu,
// zamiast poprzedniego wiszącego do czasu pobrania oryginału.
//
// Warstwy leżą jedna na drugiej (position: absolute, inset: 0) w kontenerze rodzica, który
// musi mieć position: relative i STAŁY rozmiar. Wtedy podmiana miniatury na oryginał ani
// przejście między zdjęciem pionowym i poziomym niczego nie przesuwa.
import { useState } from 'react';
import styled, { keyframes } from 'styled-components';

const Layer = styled.img`
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    /* contain: nic nie jest przycinane, proporcje zostają. */
    object-fit: contain;
`;

// Miniatura rozciągnięta na cały ekran jest miękka - lekkie rozmycie mówi „to jeszcze nie
// to zdjęcie", zamiast udawać pełną jakość. Chowa się dopiero, gdy pełna jakość skończy się
// nakładać - zniknięcie od razu dawałoby ciemne mignięcie pod zdjęciem, które nabiera krycia.
const PreviewLayer = styled(Layer)<{ $hidden: boolean }>`
    filter: blur(3px);
    opacity: ${p => (p.$hidden ? 0 : 1)};
    ${p => (p.$hidden ? 'transition: opacity 0s linear 0.25s;' : '')}
`;

const FullLayer = styled(Layer)<{ $loaded: boolean }>`
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
    white-space: nowrap;
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

interface ProgressiveImageProps {
    /** Pełna jakość. */
    src: string;
    alt: string;
    /** Mniejsza wersja tego samego zdjęcia (miniatura z siatki) - widać ją od razu. */
    previewSrc?: string;
}

export const ProgressiveImage = ({ src, alt, previewSrc }: ProgressiveImageProps) => {
    // Które zdjęcie w pełnej jakości już doszło (albo się wysypało). Porównanie z bieżącym
    // adresem zamiast flagi resetowanej w efekcie: po strzałce stan „wczytane" dotyczy
    // jeszcze poprzedniego zdjęcia i sam przestaje pasować, bez jednej klatki, w której
    // nowe zdjęcie udawałoby gotowe.
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const loaded = loadedUrl === src;
    const failed = failedUrl === src;
    const showPreview = !!previewSrc && previewSrc !== src;

    return (
        <>
            {showPreview && (
                <PreviewLayer
                    key={`p:${previewSrc}`}
                    src={previewSrc}
                    alt=""
                    aria-hidden="true"
                    $hidden={loaded}
                />
            )}
            <FullLayer
                key={src}
                src={src}
                alt={alt}
                decoding="async"
                $loaded={loaded}
                onLoad={() => setLoadedUrl(src)}
                onError={() => setFailedUrl(src)}
            />
            {!loaded && !failed && (
                <Loading key={`l:${src}`} role="status">Wczytywanie zdjęcia</Loading>
            )}
            {failed && (
                <LoadError role="alert">Nie udało się wczytać zdjęcia w pełnej jakości.</LoadError>
            )}
        </>
    );
};
