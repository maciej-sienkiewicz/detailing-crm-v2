// src/modules/gallery/views/GalleryView.tsx

import { memo, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { CalendarCheck, Car, ChevronLeft, ChevronRight, Grid2x2, Grid3x3, Images, Layers, Square, Tag } from 'lucide-react';
import { PiiValue } from '@/common/pii';
import { useBreakpoint, useLocalStorage } from '@/common/hooks';
import { PageHeader, MobilePageHeader, MobilePageHeaderCountValue } from '@/common/components/PageHeader';
import { PageContainer } from '@/common/components/PageContainer';
import { Segmented, StatusPill, touch, ui, type SegmentedOption } from '@/common/components/ui';
import { GalleryFilterBar } from '../components/GalleryFilterBar';
import { GalleryLightbox } from '../components/GalleryLightbox';
import {
    photoPosition,
    shownPhoto,
    stepLightbox,
    type GalleryPageView,
    type LightboxState,
} from '../utils/lightboxNavigation';
import {
    DEFAULT_DENSITY,
    DEFAULT_PAGE_SIZE,
    GALLERY_COLUMNS,
    GALLERY_PAGE_SIZES,
    normalizeDensity,
    normalizePageSize,
    pageAfterResize,
    type GalleryDensity,
    type GalleryPageSize,
} from '../utils/galleryLayout';
import { useGallery } from '../hooks/useGallery';
import type { GalleryPhoto } from '../types';
import { pluralPl } from '@/common/utils/plural';

// ─── animations ───────────────────────────────────────────────────────────────

const fadeSlide = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
`;

// ─── layout ───────────────────────────────────────────────────────────────────

// Galeria stoi teraz na zwykłym PageContainerze, jak Klienci i Pojazdy.
// Wcześniej była widokiem „pełnoekranowym" z własnym przewijaniem siatki
// i granatowym banerem - jedyna lista w aplikacji, która tak wyglądała,
// a przewijanie wewnątrz okna na telefonie łapało się na pasku przeglądarki.
const ViewContainer = styled.div`
    min-height: 100vh;
    background: ${p => p.theme.colors.background};
`;

const PageBody = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media (max-width: 767px) {
        gap: 12px;
    }
`;

const TotalChip = styled(StatusPill).attrs({ $tone: 'info' as const })`
    font-variant-numeric: tabular-nums;
`;

/** Jedyne wyniesienie w kolumnie: filtry, siatka i strony leżą na jednej karcie. */
const GallerySection = styled.section`
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04);
    /* Bez overflow: hidden - panel tagów i listy marek wychodzą poza kartę. */
    scroll-margin-top: 16px;
`;

// ─── view bar: zakres + układ ─────────────────────────────────────────────────

const ViewBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding: 10px 20px;
    border-bottom: 1px solid ${ui.lineSoft};
    background: ${ui.surfaceSoft};

    @media (max-width: 767px) {
        padding: 10px 14px;
    }
`;

const RangeInfo = styled.span`
    font-size: 13px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;

    strong { color: ${ui.ink}; font-weight: 600; }

    /* Na wąskim telefonie liczbę zdjęć podaje już pasek tytułu, a ten rząd
       potrzebuje całej szerokości na dwa przełączniki. */
    @media (max-width: 479px) {
        display: none;
    }
`;

const ViewControls = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;

    @media (max-width: 479px) {
        width: 100%;
        justify-content: space-between;
    }
`;

const ControlGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    /* Na najwęższych telefonach (320 px) dwa przełączniki w naturalnej szerokości
       wychodziły poza kartę - dzielą się więc rzędem po równo. */
    @media (max-width: 479px) {
        flex: 1 1 0;
        min-width: 0;

        > [role='group'] { display: flex; flex: 1; }
        > [role='group'] > button { flex: 1 1 0; min-width: 0; padding: 0 6px; }
    }
`;

const ControlLabel = styled.span`
    font-size: 12.5px;
    font-weight: 500;
    color: ${ui.textMuted};
    white-space: nowrap;

    @media (max-width: 767px) {
        display: none;
    }
`;

const DensityIcon = styled.span`
    display: inline-flex;
    svg { width: 15px; height: 15px; }
`;

// ─── grid ─────────────────────────────────────────────────────────────────────

// Kolumny liczy szerokość KOLUMNY TREŚCI, nie okna (container query): zwinięcie
// paska bocznego albo wąski laptop dają tę samą siatkę co ekran o tej szerokości
// treści. Tabelę progów i uzasadnienie trzyma galleryLayout.ts.
const GridArea = styled.div`
    container: gallery / inline-size;
    padding: 20px;

    @media (max-width: 767px) {
        padding: 12px;
    }
`;

const gridColumns = (density: GalleryDensity) => GALLERY_COLUMNS[density].map(({ minWidth, columns }) =>
    minWidth === 0
        ? css`grid-template-columns: repeat(${columns}, minmax(0, 1fr));`
        : css`
            @container gallery (min-width: ${minWidth}px) {
                grid-template-columns: repeat(${columns}, minmax(0, 1fr));
            }
        `,
);

const Grid = styled.div<{ $density: GalleryDensity; $stale?: boolean }>`
    display: grid;
    ${p => gridColumns(p.$density)}
    gap: ${p => p.$density === 'small' ? 8 : 16}px;
    opacity: ${p => p.$stale ? 0.55 : 1};
    transition: opacity 0.2s ease;

    @container gallery (max-width: 599px) {
        gap: ${p => p.$density === 'large' ? 12 : 8}px;
    }
`;

// ─── card ─────────────────────────────────────────────────────────────────────

const Card = styled.button<{ $index: number; $density: GalleryDensity }>`
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0;
    border: 1px solid ${ui.line};
    border-radius: ${p => p.$density === 'small' ? ui.radiusRow : '14px'};
    background: ${ui.surface};
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: inherit;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    animation: ${fadeSlide} 0.3s ease both;
    animation-delay: ${p => Math.min(p.$index * 20, 240)}ms;

    @media (hover: hover) {
        &:hover {
            transform: translateY(-2px);
            border-color: ${ui.brandLineSoft};
            box-shadow: 0 2px 4px rgba(15, 23, 42, 0.05), 0 12px 28px rgba(15, 23, 42, 0.1);
        }
    }

    &:focus-visible {
        outline: 2px solid ${ui.focusRing};
        outline-offset: 2px;
    }
`;

const Media = styled.div`
    position: relative;
    aspect-ratio: 4 / 3;
    background: ${ui.surfaceAlt};
    overflow: hidden;
`;

const CardImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;

    @media (hover: hover) {
        ${Card}:hover & {
            transform: scale(1.04);
        }
    }
`;

/* Małe kafelki nie mają podpisu - nazwę auta pokazują dopiero pod kursorem.
   Pod palcem nic się nie „najeżdża", więc tam zostaje sama fotografia, a opis
   jest jeden dotyk dalej, w podglądzie. */
const HoverCaption = styled.div`
    position: absolute;
    inset: auto 0 0 0;
    padding: 18px 8px 6px;
    background: linear-gradient(to top, rgba(15, 23, 42, 0.78), transparent);
    color: #ffffff;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    transition: opacity 0.2s ease;

    @media (hover: hover) {
        ${Card}:hover &, ${Card}:focus-visible & {
            opacity: 1;
        }
    }
`;

const TagCount = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    border-radius: ${ui.radiusControl};
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;

    svg { width: 11px; height: 11px; }
`;

const Caption = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px 12px;
    min-width: 0;

    @container gallery (max-width: 599px) {
        padding: 8px 10px 10px;
        gap: 4px;
    }
`;

const CardTitle = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.ink};
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CardMeta = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
`;

const CardSubline = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
`;

/* Źródło zdjęcia to nie stan, więc nie dostaje tonu - rozróżnia je ikona
   i słowo. Wcześniej każdy kafelek miał wypełnioną plakietkę w innym kolorze:
   dwanaście nasyconych plam na ekranie, z których żadna nie była krokiem
   następnym (CLAUDE.md §2). */
const SourcePill = styled(StatusPill)`
    font-size: 11.5px;
    padding: 1px 8px;

    svg { width: 11px; height: 11px; }

    /* Przy dwóch kolumnach na telefonie słowo spychało tablicę rejestracyjną
       do kilku znaków - zostaje sama ikona, nazwę niesie title. */
    @container gallery (max-width: 599px) {
        padding: 3px;
        span { display: none; }
    }
`;

const CardTags = styled.div`
    display: flex;
    gap: 4px;
    overflow: hidden;
`;

const CardTag = styled.span`
    flex-shrink: 0;
    padding: 1px 8px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surfaceSoft};
    color: ${ui.textSecondary};
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
`;

// ─── pagination ───────────────────────────────────────────────────────────────

const PaginationBar = styled.nav`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14px 20px;
    border-top: 1px solid ${ui.lineSoft};

    @media (max-width: 767px) {
        padding: 12px 14px;
        justify-content: space-between;
    }
`;

/* Wybrana strona to STAN, nie krok następny - leży na odcieniu marki, bez
   wypełnienia (jak wybrana opcja w Segmented). */
const PageBtn = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 36px;
    height: 36px;
    padding: 0 10px;
    border: 1px solid ${p => p.$active ? ui.brandLine : ui.line};
    border-radius: ${ui.radiusRow};
    background: ${p => p.$active ? ui.brandTint : ui.surface};
    color: ${p => p.$active ? ui.brandInk : ui.inkSoft};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.$active ? 700 : 500};
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    svg { width: 16px; height: 16px; }

    &:hover:not(:disabled) {
        border-color: ${ui.brandLine};
        color: ${ui.brandInk};
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
    ${touch} { min-width: 44px; height: 44px; }
`;

const PageNumbers = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;

    @media (max-width: 639px) {
        display: none;
    }
`;

/** Na telefonie siedem numerów nie mieści się w rzędzie - zostaje „Strona 3 z 12". */
const PageCompact = styled.span`
    display: none;
    font-size: 13px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;

    strong { color: ${ui.ink}; font-weight: 600; }

    @media (max-width: 639px) {
        display: inline;
    }
`;

const NavLabel = styled.span`
    @media (max-width: 1023px) {
        display: none;
    }
`;

const Ellipsis = styled.span`
    min-width: 20px;
    text-align: center;
    font-size: 13px;
    color: ${ui.textFaint};
`;

// ─── empty / loading ──────────────────────────────────────────────────────────

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 20px;
    gap: 10px;
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 64px;
    height: 64px;
    margin-bottom: 6px;
    border-radius: ${ui.radiusPanel};
    background: ${ui.brandTint};
    border: 1px solid ${ui.brandLineSoft};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${ui.brandInk};

    svg { width: 28px; height: 28px; }
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: ${ui.ink};
`;

const EmptyDesc = styled.p`
    margin: 0;
    max-width: 360px;
    font-size: 14px;
    color: ${ui.textMuted};
`;

const SkeletonCard = styled.div`
    aspect-ratio: 4 / 3;
    border-radius: 14px;
    background: linear-gradient(90deg, ${ui.line} 25%, ${ui.surfaceAlt} 50%, ${ui.line} 75%);
    background-size: 400px 100%;
    animation: ${shimmer} 1.4s infinite linear;
`;

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const result: (number | '...')[] = [];
    result.push(1);
    if (current > 3) result.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        result.push(p);
    }
    if (current < total - 2) result.push('...');
    result.push(total);
    return result;
}

// Fire-and-forget warmup of the preview image so the lightbox can show it
// instantly. The browser dedupes and caches the request; the Set just avoids
// re-creating Image objects for cards hovered repeatedly.
const warmedUrls = new Set<string>();
function warmImage(url: string) {
    if (warmedUrls.has(url)) return;
    warmedUrls.add(url);
    const img = new Image();
    img.src = url;
}

const vehicleName = (photo: GalleryPhoto) =>
    [photo.vehicleBrand, photo.vehicleModel].filter(Boolean).join(' ');

const SOURCE: Record<GalleryPhoto['source'], { label: string; icon: ReactNode }> = {
    VISIT: { label: 'Wizyta', icon: <CalendarCheck /> },
    VEHICLE: { label: 'Pojazd', icon: <Car /> },
    BATCH_ORDER: { label: 'Zbiorcze', icon: <Layers /> },
};

const DENSITY_OPTIONS: SegmentedOption<GalleryDensity>[] = [
    { value: 'large', label: <DensityIcon><Square /></DensityIcon>, ariaLabel: 'Duże kafelki' },
    { value: 'medium', label: <DensityIcon><Grid2x2 /></DensityIcon>, ariaLabel: 'Średnie kafelki' },
    { value: 'small', label: <DensityIcon><Grid3x3 /></DensityIcon>, ariaLabel: 'Małe kafelki' },
];

const PAGE_SIZE_OPTIONS: SegmentedOption<`${GalleryPageSize}`>[] = GALLERY_PAGE_SIZES.map(size => ({
    value: `${size}`,
    label: size,
    ariaLabel: `${size} zdjęć na stronę`,
}));

// ─── card component ───────────────────────────────────────────────────────────

interface GalleryCardProps {
    photo: GalleryPhoto;
    index: number;
    density: GalleryDensity;
    onSelect: (photo: GalleryPhoto) => void;
}

// Memoized so parent state changes (lightbox open/close, filter typing) don't
// re-render the whole grid of cards.
const GalleryCard = memo(({ photo, index, density, onSelect }: GalleryCardProps) => {
    const title = vehicleName(photo)
        || (photo.source === 'BATCH_ORDER' ? photo.contractorName : undefined)
        || photo.fileName;
    const subline = photo.source === 'BATCH_ORDER'
        ? (photo.contractorName ?? photo.vehicleLicensePlate)
        : photo.vehicleLicensePlate;
    const source = SOURCE[photo.source];
    const visibleTags = density === 'large' ? 3 : 2;

    return (
        <Card
            type="button"
            $index={index}
            $density={density}
            onClick={() => onSelect(photo)}
            onMouseEnter={() => warmImage(photo.previewUrl)}
            onFocus={() => warmImage(photo.previewUrl)}
            aria-label={`Zdjęcie: ${title}`}
            title={density === 'small' ? title : undefined}
        >
            <Media>
                <CardImage
                    src={photo.thumbnailUrl}
                    alt={photo.description ?? photo.fileName}
                    loading="lazy"
                    decoding="async"
                />
                {density === 'small' && <HoverCaption>{title}</HoverCaption>}
                {density === 'small' && photo.tags.length > 0 && (
                    <TagCount aria-label={`${photo.tags.length} ${pluralPl(photo.tags.length, 'tag', 'tagi', 'tagów')}`}>
                        <Tag aria-hidden="true" />
                        {photo.tags.length}
                    </TagCount>
                )}
            </Media>
            {density !== 'small' && (
                <Caption>
                    <CardTitle>{title}</CardTitle>
                    <CardMeta>
                        <CardSubline>
                            {subline
                                ?? (photo.customerName ? <PiiValue value={photo.customerName} kind="name" /> : ' ')}
                        </CardSubline>
                        <SourcePill title={source.label}>
                            {source.icon}
                            <span>{source.label}</span>
                        </SourcePill>
                    </CardMeta>
                    {photo.tags.length > 0 && (
                        <CardTags>
                            {photo.tags.slice(0, visibleTags).map(tag => (
                                <CardTag key={tag}>{tag}</CardTag>
                            ))}
                            {photo.tags.length > visibleTags && (
                                <CardTag>+{photo.tags.length - visibleTags}</CardTag>
                            )}
                        </CardTags>
                    )}
                </Caption>
            )}
        </Card>
    );
});
GalleryCard.displayName = 'GalleryCard';

// ─── component ─────────────────────────────────────────────────────────────────

export const GalleryView = () => {
    const [page, setPage] = useState(1);
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [lightbox, setLightbox] = useState<LightboxState>(null);
    const [storedDensity, setStoredDensity] = useLocalStorage<GalleryDensity>('gallery.density', DEFAULT_DENSITY);
    const [storedPageSize, setStoredPageSize] = useLocalStorage<GalleryPageSize>('gallery.pageSize', DEFAULT_PAGE_SIZE);
    const density = normalizeDensity(storedDensity);
    const pageSize = normalizePageSize(storedPageSize);
    const sectionRef = useRef<HTMLElement>(null);

    // Stable filter identity so the query key (and the next-page prefetch
    // effect in useGallery) only change when a filter actually changes.
    const filters = useMemo(() => ({
        tags: activeTags,
        brand,
        model,
        page,
        pageSize,
    }), [activeTags, brand, model, page, pageSize]);

    const { photos, pagination, availableTags, isLoading, isPlaceholderData, error } = useGallery(filters);

    // Podgląd przechodzi strzałkami przez całą galerię, także przez granicę strony
    // (patrz lightboxNavigation) - strona siatki idzie za nim.
    const pageView: GalleryPageView = {
        page,
        totalPages: pagination?.totalPages ?? page,
        photos,
        isPlaceholderData,
    };
    const lightboxPhoto = shownPhoto(lightbox, pageView);
    const stepPrev = stepLightbox(lightbox, -1, pageView);
    const stepNext = stepLightbox(lightbox, 1, pageView);
    const applyStep = (step: ReturnType<typeof stepLightbox>) => {
        if (!step) return;
        setLightbox(step.state);
        if (step.page !== page) setPage(step.page);
    };
    const lightboxIndex = lightboxPhoto ? photos.findIndex(p => p.id === lightboxPhoto.id) : -1;

    const isDesktopHeader = useBreakpoint('md');

    const handleSelectPhoto = useCallback((photo: GalleryPhoto) => {
        setLightbox({ kind: 'photo', photo });
    }, []);

    const handleBrandChange = useCallback((b: string) => {
        setBrand(b);
        setModel('');
        setPage(1);
    }, []);

    const handleModelChange = useCallback((m: string) => {
        setModel(m);
        setPage(1);
    }, []);

    const handleTagToggle = useCallback((tag: string) => {
        setActiveTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
        setPage(1);
    }, []);

    const handleClearAll = useCallback(() => {
        setBrand('');
        setModel('');
        setActiveTags([]);
        setPage(1);
    }, []);

    const handlePageSizeChange = (value: `${GalleryPageSize}`) => {
        const next = normalizePageSize(Number(value));
        setPage(pageAfterResize(page, pageSize, next));
        setStoredPageSize(next);
    };

    // Strona zmieniona z paginacji pod siatką: wracamy na górę karty, inaczej
    // nowa strona zaczyna się poza ekranem, a użytkownik widzi jej koniec.
    // Krok strzałką w podglądzie zmienia stronę bez przewijania - podgląd ją zasłania.
    const goToPage = (next: number) => {
        setPage(next);
        sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };

    const pageNumbers = pagination ? buildPageNumbers(page, pagination.totalPages) : [];
    const hasFilters = activeTags.length > 0 || !!brand || !!model;
    const total = pagination?.total ?? 0;
    const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, total);
    const totalLabel = `${total} ${pluralPl(total, 'zdjęcie', 'zdjęcia', 'zdjęć')}`;

    const renderContent = () => {
        if (isLoading) {
            return (
                <Grid $density={density} aria-busy="true">
                    {Array.from({ length: pageSize }).map((_, i) => <SkeletonCard key={i} />)}
                </Grid>
            );
        }
        if (photos.length === 0) {
            return (
                <EmptyState>
                    <EmptyIcon><Images /></EmptyIcon>
                    <EmptyTitle>{error ? 'Nie udało się wczytać zdjęć' : 'Brak zdjęć'}</EmptyTitle>
                    <EmptyDesc>
                        {error
                            ? 'Odśwież stronę za chwilę. Jeśli problem wróci, daj nam znać.'
                            : hasFilters
                                ? 'Żadne zdjęcie nie pasuje do wybranych filtrów. Zmień markę, model albo tagi.'
                                : 'Zdjęcia dodane przy wizytach, pojazdach i zleceniach zbiorczych pojawią się tutaj.'}
                    </EmptyDesc>
                </EmptyState>
            );
        }
        return (
            <Grid $density={density} $stale={isPlaceholderData}>
                {photos.map((photo, idx) => (
                    <GalleryCard
                        key={photo.id}
                        photo={photo}
                        index={idx}
                        density={density}
                        onSelect={handleSelectPhoto}
                    />
                ))}
            </Grid>
        );
    };

    return (
        <ViewContainer>
            <PageBody>
                {isDesktopHeader ? (
                    <PageHeader
                        title="Galeria"
                        subtitle={
                            <>
                                Zdjęcia z wizyt, pojazdów i zleceń zbiorczych
                                {pagination && <TotalChip>{totalLabel}</TotalChip>}
                            </>
                        }
                    />
                ) : (
                    <MobilePageHeader
                        icon={<Images />}
                        title="Galeria"
                        subtitle={pagination
                            ? <><MobilePageHeaderCountValue>{total}</MobilePageHeaderCountValue> {pluralPl(total, 'zdjęcie', 'zdjęcia', 'zdjęć')}</>
                            : 'Wczytywanie…'}
                    />
                )}

                <GallerySection ref={sectionRef} aria-label="Zdjęcia">
                    <GalleryFilterBar
                        brand={brand}
                        model={model}
                        onBrandChange={handleBrandChange}
                        onModelChange={handleModelChange}
                        activeTags={activeTags}
                        availableTags={availableTags}
                        onTagToggle={handleTagToggle}
                        onClearAll={handleClearAll}
                    />

                    <ViewBar>
                        <RangeInfo>
                            {total > 0
                                ? <>Zdjęcia <strong>{rangeStart}–{rangeEnd}</strong> z {total}</>
                                : isLoading ? 'Wczytywanie…' : 'Brak zdjęć'}
                        </RangeInfo>
                        <ViewControls>
                            <ControlGroup>
                                <ControlLabel>Kafelki</ControlLabel>
                                <Segmented
                                    label="Wielkość kafelków"
                                    size="sm"
                                    options={DENSITY_OPTIONS}
                                    value={density}
                                    onChange={setStoredDensity}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <ControlLabel>Na stronę</ControlLabel>
                                <Segmented
                                    label="Zdjęć na stronę"
                                    size="sm"
                                    options={PAGE_SIZE_OPTIONS}
                                    value={`${pageSize}`}
                                    onChange={handlePageSizeChange}
                                />
                            </ControlGroup>
                        </ViewControls>
                    </ViewBar>

                    <GridArea>{renderContent()}</GridArea>

                    {pagination && pagination.totalPages > 1 && (
                        <PaginationBar aria-label="Strony galerii">
                            <PageBtn
                                type="button"
                                onClick={() => goToPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                aria-label="Poprzednia strona"
                            >
                                <ChevronLeft />
                                <NavLabel>Poprzednia</NavLabel>
                            </PageBtn>

                            <PageNumbers>
                                {pageNumbers.map((p, idx) =>
                                    p === '...' ? (
                                        <Ellipsis key={`ell-${idx}`}>…</Ellipsis>
                                    ) : (
                                        <PageBtn
                                            type="button"
                                            key={p}
                                            $active={p === page}
                                            aria-current={p === page ? 'page' : undefined}
                                            onClick={() => goToPage(p)}
                                        >
                                            {p}
                                        </PageBtn>
                                    )
                                )}
                            </PageNumbers>
                            <PageCompact>
                                Strona <strong>{page}</strong> z {pagination.totalPages}
                            </PageCompact>

                            <PageBtn
                                type="button"
                                onClick={() => goToPage(Math.min(pagination.totalPages, page + 1))}
                                disabled={page === pagination.totalPages}
                                aria-label="Następna strona"
                            >
                                <NavLabel>Następna</NavLabel>
                                <ChevronRight />
                            </PageBtn>
                        </PaginationBar>
                    )}
                </GallerySection>
            </PageBody>

            {/* Lightbox */}
            {lightboxPhoto && (
                <GalleryLightbox
                    photo={lightboxPhoto}
                    onClose={() => setLightbox(null)}
                    onPrev={stepPrev ? () => applyStep(stepPrev) : undefined}
                    onNext={stepNext ? () => applyStep(stepNext) : undefined}
                    position={pagination ? {
                        index: photoPosition(lightboxPhoto, pageView, pageSize),
                        total: pagination.total,
                    } : undefined}
                    preload={[photos[lightboxIndex - 1], photos[lightboxIndex + 1]]
                        .filter((p): p is GalleryPhoto => !!p && lightboxIndex >= 0)
                        .map(p => p.previewUrl)}
                />
            )}
        </ViewContainer>
    );
};
