// src/modules/comms/components/VehiclePhotosPopover.tsx
// Miniatury zdjęć auta — druga chmurka, obok wizytówki klienta.
//
// Pytanie, które to zamyka, brzmi „czy to TO auto?". Odpowiada na nie obrazek,
// nie nazwa modelu — dwa czarne kombi tej samej marki różni tylko wygląd, a nazwisko
// klienta nie mówi nic o tym, jak wygląda jego samochód po ostatniej wizycie.
//
// Świadomie MINIATURY, nie pełne zdjęcia: chmurka ma się pojawić od razu, a galeria
// pełnych plików potrafi ważyć kilkadziesiąt megabajtów. Pełny rozmiar jest o jedno
// kliknięcie dalej, w kartotece pojazdu.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { vehicleApi } from '@/modules/vehicles/api/vehicleApi';

const Card = styled.div`
    position: fixed;
    z-index: 121;
    width: 268px;
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
    padding: 9px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    .title {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
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
    }
    button {
        border: none;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 2px;
        display: inline-flex;

        &:hover { color: ${p => p.theme.colors.text}; }
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 8px;
    max-height: 260px;
    overflow-y: auto;
`;

const Thumb = styled.a`
    display: block;
    aspect-ratio: 4 / 3;
    border-radius: ${p => p.theme.radii.sm};
    overflow: hidden;
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform ${p => p.theme.transitions.fast};
    }

    &:hover img, &:focus-visible img { transform: scale(1.06); }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 1px; }
`;

const Muted = styled.p`
    margin: 0;
    padding: 18px 12px;
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

/** Ile miniatur pokazujemy. Chmurka ma być podglądem, nie galerią. */
const THUMBNAIL_LIMIT = 12;

export function VehiclePhotosPopover({ vehicleId, label, anchor, onClose }: VehiclePhotosPopoverProps) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle-photos', vehicleId, THUMBNAIL_LIMIT],
        queryFn: () => vehicleApi.getPhotoGallery(vehicleId, 1, THUMBNAIL_LIMIT),
        staleTime: 5 * 60_000,
    });

    useEffect(() => {
        const place = () => {
            const rect = anchor.getBoundingClientRect();
            const width = 268;
            const gap = 8;
            // Domyślnie po prawej stronie wizytówki; przy krawędzi ekranu po lewej.
            const card = anchor.closest('[role="dialog"]')?.getBoundingClientRect();
            const rightEdge = (card?.right ?? rect.right) + gap;
            const left = rightEdge + width < window.innerWidth
                ? rightEdge
                : Math.max(12, (card?.left ?? rect.left) - width - gap);
            const top = Math.min(rect.top - 4, window.innerHeight - 300);
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
            }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    if (!pos) return null;

    const photos = data?.photos ?? [];
    const total = data?.pagination?.total ?? photos.length;

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
                {total > 0 && <span className="count">{total}</span>}
                <button type="button" onClick={onClose} aria-label="Zamknij">
                    <X size={13} />
                </button>
            </Head>

            {isLoading && <Muted>Wczytywanie zdjęć…</Muted>}
            {isError && <Muted>Nie udało się wczytać zdjęć.</Muted>}
            {!isLoading && !isError && photos.length === 0 && (
                <Muted>Nie mamy jeszcze zdjęć tego auta.</Muted>
            )}

            {photos.length > 0 && (
                <Grid>
                    {photos.map((photo) => (
                        <Thumb
                            key={photo.id}
                            href={photo.fullSizeUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={photo.description || photo.fileName}
                        >
                            <img
                                src={photo.thumbnailUrl}
                                alt={photo.description || photo.fileName}
                                loading="lazy"
                                decoding="async"
                            />
                        </Thumb>
                    ))}
                </Grid>
            )}
        </Card>,
        document.body
    );
}
