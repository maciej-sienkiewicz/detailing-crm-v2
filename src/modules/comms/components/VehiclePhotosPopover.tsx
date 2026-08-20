// src/modules/comms/components/VehiclePhotosPopover.tsx
// Zdjęcia auta — druga chmurka, obok wizytówki klienta.
//
// Pytanie, które to zamyka, brzmi „czy to TO auto?". Odpowiada na nie obrazek,
// nie nazwa modelu — dwa czarne kombi tej samej marki różni tylko wygląd.
//
// Jedno zdjęcie na raz, a nie siatka miniatur: siatka 60 × 45 px odpowiada
// „są jakieś zdjęcia", ale nie „to jest to auto". Strzałki i kropki pod spodem
// mówią, że jest ich więcej, zanim ktokolwiek zacznie szukać, gdzie kliknąć.
//
// Szybkość rozwiązana dwuetapowo: najpierw pokazujemy MINIATURĘ (jest w odpowiedzi
// i waży tyle co nic), a pełny plik podmienia ją dopiero, gdy się doczyta. Dzięki
// temu chmurka pojawia się natychmiast i nie zostaje rozmyta.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { vehicleApi } from '@/modules/vehicles/api/vehicleApi';

const Card = styled.div`
    position: fixed;
    z-index: 121;
    width: 380px;
    max-width: calc(100vw - 24px);
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    .title {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .count {
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    button.close {
        border: none;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 2px;
        display: inline-flex;

        &:hover { color: ${p => p.theme.colors.text}; }
    }
`;

/** Scena zdjęcia. Ciemne tło, bo zdjęcia aut bywają jasne i ciemne naprzemiennie. */
const Stage = styled.div`
    position: relative;
    aspect-ratio: 4 / 3;
    background: #0f172a;
    overflow: hidden;

    img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    /* Miniatura rozciągnięta na całą scenę jest miękka — rozmycie zamienia
       to z wady w celowy podkład, który znika, gdy dojdzie pełny plik. */
    img.thumb { filter: blur(6px); transform: scale(1.04); }
    img.full {
        opacity: 0;
        transition: opacity 180ms ease;
    }
    img.full.ready { opacity: 1; }
`;

const Arrow = styled.button<{ $side: 'left' | 'right' }>`
    position: absolute;
    top: 50%;
    ${({ $side }) => ($side === 'left' ? 'left: 8px;' : 'right: 8px;')}
    transform: translateY(-50%);
    z-index: 2;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    background: rgba(15, 23, 42, 0.55);
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) { background: rgba(15, 23, 42, 0.78); }
    &:disabled { opacity: 0.35; cursor: default; }
    &:focus-visible { outline: 2px solid #ffffff; outline-offset: 1px; }
`;

const Foot = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-top: 1px solid ${p => p.theme.colors.border};

    .caption {
        flex: 1;
        min-width: 0;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    a {
        font-size: 11.5px;
        color: ${p => p.theme.colors.primary};
        text-decoration: none;
        white-space: nowrap;

        &:hover { text-decoration: underline; }
    }
`;

const Dots = styled.div`
    display: flex;
    justify-content: center;
    gap: 5px;
    padding: 9px 12px 4px;
    flex-wrap: wrap;
`;

const Dot = styled.button<{ $active: boolean }>`
    width: ${({ $active }) => ($active ? '18px' : '6px')};
    height: 6px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    cursor: pointer;
    transition: width ${p => p.theme.transitions.fast}, background ${p => p.theme.transitions.fast};

    &:hover { background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textMuted)}; }
`;

const Muted = styled.p`
    margin: 0;
    padding: 26px 14px;
    text-align: center;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.5;
`;

interface VehiclePhotosPopoverProps {
    vehicleId: string;
    label: string;
    /** Element pojazdu w wizytówce — chmurka staje obok niego. */
    anchor: HTMLElement;
    onClose: () => void;
}

/** Ile zdjęć wciągamy. Podgląd, nie galeria — pełna jest w kartotece pojazdu. */
const PHOTO_LIMIT = 12;

/** Powyżej tylu zdjęć kropki przestają być czytelne i zamieniają się w licznik. */
const MAX_DOTS = 10;

export function VehiclePhotosPopover({ vehicleId, label, anchor, onClose }: VehiclePhotosPopoverProps) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [index, setIndex] = useState(0);
    // Pełne pliki, które już się doczytały — po nich poznajemy, czy podmienić podkład.
    const [loaded, setLoaded] = useState<Record<string, boolean>>({});
    const cardRef = useRef<HTMLDivElement | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle-photos', vehicleId, PHOTO_LIMIT],
        queryFn: () => vehicleApi.getPhotoGallery(vehicleId, 1, PHOTO_LIMIT),
        staleTime: 5 * 60_000,
    });

    const photos = data?.photos ?? [];
    const total = data?.pagination?.total ?? photos.length;
    const current = photos[Math.min(index, Math.max(0, photos.length - 1))];

    const go = useCallback(
        (delta: number) => {
            setIndex((currentIndex) => {
                const next = currentIndex + delta;
                if (next < 0 || next >= photos.length) return currentIndex;
                return next;
            });
        },
        [photos.length]
    );

    useEffect(() => {
        const place = () => {
            const rect = anchor.getBoundingClientRect();
            const width = 380;
            const gap = 8;
            const card = anchor.closest('[role="dialog"]')?.getBoundingClientRect();
            const rightEdge = (card?.right ?? rect.right) + gap;
            const left = rightEdge + width < window.innerWidth
                ? rightEdge
                : Math.max(12, (card?.left ?? rect.left) - width - gap);
            const top = Math.min(rect.top - 4, window.innerHeight - 420);
            setPos({ top: Math.max(12, top), left });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchor]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Zamykamy tylko tę chmurkę — wizytówka pod spodem zostaje.
                event.stopPropagation();
                onClose();
                return;
            }
            if (event.key === 'ArrowLeft') { event.stopPropagation(); go(-1); }
            if (event.key === 'ArrowRight') { event.stopPropagation(); go(1); }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [onClose, go]);

    if (!pos) return null;

    return createPortal(
        <Card
            ref={cardRef}
            data-vehicle-photos
            style={{ top: pos.top, left: pos.left }}
            role="dialog"
            aria-label={`Zdjęcia — ${label}`}
        >
            <Head>
                <span className="title">{label}</span>
                {photos.length > 0 && (
                    <span className="count">
                        {index + 1} / {photos.length}
                        {total > photos.length && ` z ${total}`}
                    </span>
                )}
                <button type="button" className="close" onClick={onClose} aria-label="Zamknij">
                    <X size={14} />
                </button>
            </Head>

            {isLoading && <Muted>Wczytywanie zdjęć…</Muted>}
            {isError && <Muted>Nie udało się wczytać zdjęć.</Muted>}
            {!isLoading && !isError && photos.length === 0 && (
                <Muted>Nie mamy jeszcze zdjęć tego auta.</Muted>
            )}

            {current && (
                <>
                    <Stage>
                        <img className="thumb" src={current.thumbnailUrl} alt="" aria-hidden />
                        <img
                            key={current.id}
                            className={`full${loaded[current.id] ? ' ready' : ''}`}
                            src={current.fullSizeUrl}
                            alt={current.description || current.fileName}
                            decoding="async"
                            onLoad={() => setLoaded((state) => ({ ...state, [current.id]: true }))}
                        />
                        {/* Przy jednym zdjęciu strzałki obiecywałyby ruch, którego nie ma. */}
                        {photos.length > 1 && (
                            <>
                                <Arrow
                                    type="button"
                                    $side="left"
                                    aria-label="Poprzednie zdjęcie"
                                    disabled={index === 0}
                                    onClick={() => go(-1)}
                                >
                                    <ChevronLeft size={16} />
                                </Arrow>
                                <Arrow
                                    type="button"
                                    $side="right"
                                    aria-label="Następne zdjęcie"
                                    disabled={index >= photos.length - 1}
                                    onClick={() => go(1)}
                                >
                                    <ChevronRight size={16} />
                                </Arrow>
                            </>
                        )}
                    </Stage>

                    {photos.length > 1 && photos.length <= MAX_DOTS && (
                        <Dots>
                            {photos.map((photo, dotIndex) => (
                                <Dot
                                    key={photo.id}
                                    type="button"
                                    $active={dotIndex === index}
                                    aria-label={`Zdjęcie ${dotIndex + 1}`}
                                    aria-current={dotIndex === index}
                                    onClick={() => setIndex(dotIndex)}
                                />
                            ))}
                        </Dots>
                    )}

                    <Foot>
                        <span className="caption">
                            {current.description || current.fileName}
                            {current.visitNumber && ` · wizyta ${current.visitNumber}`}
                        </span>
                        <a href={current.fullSizeUrl} target="_blank" rel="noreferrer">
                            Pełny rozmiar
                        </a>
                    </Foot>
                </>
            )}
        </Card>,
        document.body
    );
}
