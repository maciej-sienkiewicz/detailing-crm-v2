// src/modules/gallery/views/GalleryView.tsx

import { useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { GalleryFilterBar } from '../components/GalleryFilterBar';
import { GalleryLightbox } from '../components/GalleryLightbox';
import { useGallery } from '../hooks/useGallery';
import type { GalleryPhoto } from '../types';

// ─── animations ───────────────────────────────────────────────────────────────

const fadeSlide = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${p => p.theme.colors.background};
`;

const PageHeader = styled.div`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    padding: 24px ${p => p.theme.spacing.xl};
    display: flex;
    align-items: center;
    gap: ${p => p.theme.spacing.md};
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 4px 20px rgba(0, 0, 0, 0.14);

    &::before {
        content: '';
        position: absolute;
        top: -60px;
        right: -40px;
        width: 280px;
        height: 280px;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 65%);
        pointer-events: none;
    }

    @media (max-width: 640px) {
        padding: ${p => p.theme.spacing.md};
    }
`;

const HeaderIcon = styled.div`
    position: relative;
    z-index: 1;
    width: 44px;
    height: 44px;
    border-radius: ${p => p.theme.radii.lg};
    background: rgba(14, 165, 233, 0.18);
    border: 1px solid rgba(14, 165, 233, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #7dd3fc;

    svg { width: 22px; height: 22px; }
`;

const HeaderText = styled.div`
    position: relative;
    z-index: 1;
`;

const PageTitle = styled.h1`
    margin: 0 0 3px;
    font-size: 26px;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.4px;
    line-height: 1.1;
`;

const PageSubtitle = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    color: #475569;
    font-weight: 500;
`;

// ─── main content ─────────────────────────────────────────────────────────────

const Content = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const ScrollArea = styled.div`
    flex: 1;
    overflow-y: auto;
`;

// ─── grid ─────────────────────────────────────────────────────────────────────

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: ${p => p.theme.spacing.md};
    padding: ${p => p.theme.spacing.lg};

    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
        gap: ${p => p.theme.spacing.sm};
        padding: ${p => p.theme.spacing.md};
    }
`;

// ─── card ─────────────────────────────────────────────────────────────────────

const Card = styled.div<{ $index: number }>`
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
    cursor: pointer;
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: ${fadeSlide} 0.3s ease both;
    animation-delay: ${p => Math.min(p.$index * 30, 300)}ms;

    &:hover {
        transform: translateY(-4px) scale(1.01);
        box-shadow: ${p => p.theme.shadows.xl};
        z-index: 2;
    }
`;

const CardImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;

    ${Card}:hover & {
        transform: scale(1.04);
    }
`;

const CardOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.78) 0%,
        rgba(0, 0, 0, 0.18) 50%,
        transparent 100%
    );
    opacity: 0;
    transition: opacity 0.2s ease;

    ${Card}:hover & {
        opacity: 1;
    }
`;

const CardBody = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: ${p => p.theme.spacing.sm} ${p => p.theme.spacing.md};
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.2s ease, transform 0.2s ease;

    ${Card}:hover & {
        opacity: 1;
        transform: translateY(0);
    }
`;

const CardTitle = styled.p`
    margin: 0 0 5px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    color: white;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CardTags = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-bottom: ${p => p.theme.spacing.xs};
`;

const CardMeta = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${p => p.theme.spacing.xs};
`;

const CardVehicle = styled.span`
    font-size: 10px;
    color: rgba(255, 255, 255, 0.75);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const SourceBadge = styled.span<{ $source: 'VEHICLE' | 'VISIT' }>`
    padding: 2px 7px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
    ${p => p.$source === 'VISIT' ? `
        background: rgba(16,185,129,0.85);
        color: white;
    ` : `
        background: rgba(14,165,233,0.85);
        color: white;
    `}
`;

const ZoomIcon = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.7);
    width: 44px;
    height: 44px;
    border-radius: ${p => p.theme.radii.full};
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    transition: all 0.2s ease;

    ${Card}:hover & {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }

    svg { width: 20px; height: 20px; }
`;

// ─── pagination ───────────────────────────────────────────────────────────────

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${p => p.theme.spacing.xs};
    padding: ${p => p.theme.spacing.lg};
    border-top: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    flex-wrap: wrap;
`;

const PageBtn = styled.button<{ $active?: boolean; $disabled?: boolean }>`
    min-width: 36px;
    height: 36px;
    padding: 0 ${p => p.theme.spacing.sm};
    border: 1px solid ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.surface};
    color: ${p => p.$active ? 'white' : p.theme.colors.text};
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.$active ? '700' : '500'};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.4 : 1};
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        ${p => !p.$active && css`
            background: rgba(14, 165, 233, 0.07);
            border-color: var(--brand-primary);
            color: var(--brand-primary);
        `}
    }
`;

const PageInfo = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    padding: 0 ${p => p.theme.spacing.sm};
`;

const Ellipsis = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    padding: 0 4px;
`;

// ─── empty / loading ──────────────────────────────────────────────────────────

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${p => p.theme.spacing.xxl};
    color: ${p => p.theme.colors.textMuted};
    gap: ${p => p.theme.spacing.md};
    text-align: center;
`;

const EmptyIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: ${p => p.theme.radii.xl};
    background: ${p => p.theme.colors.surfaceAlt};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.theme.colors.textMuted};
    opacity: 0.6;

    svg { width: 40px; height: 40px; }
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const EmptyDesc = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
`;

const LoadingGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: ${p => p.theme.spacing.md};
    padding: ${p => p.theme.spacing.lg};

    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
        gap: ${p => p.theme.spacing.sm};
        padding: ${p => p.theme.spacing.md};
    }
`;

const shimmer = keyframes`
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
`;

const SkeletonCard = styled.div`
    aspect-ratio: 4 / 3;
    border-radius: ${p => p.theme.radii.lg};
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 400px 100%;
    animation: ${shimmer} 1.4s infinite linear;
`;

// ─── card tag pill (monochrome, on dark overlay) ──────────────────────────────

const CardTag = styled.span`
    display: inline-flex;
    padding: 2px 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(2px);
`;

// ─── helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

function buildPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const result: (number | '…')[] = [];
    result.push(1);
    if (current > 3) result.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        result.push(p);
    }
    if (current < total - 2) result.push('…');
    result.push(total);
    return result;
}

// ─── component ─────────────────────────────────────────────────────────────────

export const GalleryView = () => {
    const [page, setPage] = useState(1);
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

    const { photos, pagination, availableTags, isFetching, isLoading } = useGallery({
        tags: activeTags,
        brand,
        model,
        page,
        pageSize: PAGE_SIZE,
    });

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

    const handleClearTags = useCallback(() => {
        setActiveTags([]);
        setPage(1);
    }, []);

    const handleClearAll = useCallback(() => {
        setBrand('');
        setModel('');
        setActiveTags([]);
        setPage(1);
    }, []);

    const pageNumbers = pagination ? buildPageNumbers(page, pagination.totalPages) : [];

    return (
        <Page>
            {/* Header */}
            <PageHeader>
                <HeaderIcon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </HeaderIcon>
                <HeaderText>
                    <PageTitle>Galeria</PageTitle>
                    <PageSubtitle>Wszystkie zdjęcia z wizyt, pojazdów i klientów</PageSubtitle>
                </HeaderText>
            </PageHeader>

            {/* Filters */}
            <GalleryFilterBar
                brand={brand}
                model={model}
                onBrandChange={handleBrandChange}
                onModelChange={handleModelChange}
                activeTags={activeTags}
                availableTags={availableTags}
                onTagToggle={handleTagToggle}
                onClearTags={handleClearTags}
                onClearAll={handleClearAll}
                totalPhotos={pagination?.total ?? 0}
                isFetching={isFetching}
            />

            {/* Content */}
            <Content>
                <ScrollArea>
                    {isLoading ? (
                        <LoadingGrid>
                            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </LoadingGrid>
                    ) : photos.length === 0 ? (
                        <EmptyState>
                            <EmptyIcon>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            </EmptyIcon>
                            <EmptyTitle>Brak zdjęć</EmptyTitle>
                            <EmptyDesc>
                                {activeTags.length > 0 || brand || model
                                    ? 'Żadne zdjęcie nie pasuje do podanych filtrów.'
                                    : 'Nie dodano jeszcze żadnych zdjęć.'}
                            </EmptyDesc>
                        </EmptyState>
                    ) : (
                        <Grid>
                            {photos.map((photo, idx) => (
                                <Card
                                    key={photo.id}
                                    $index={idx}
                                    onClick={() => setSelectedPhoto(photo)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === 'Enter' && setSelectedPhoto(photo)}
                                    aria-label={`Zdjęcie: ${photo.fileName}`}
                                >
                                    <CardImage
                                        src={photo.thumbnailUrl}
                                        alt={photo.description ?? photo.fileName}
                                        loading="lazy"
                                    />
                                    <CardOverlay />
                                    <ZoomIcon>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="M21 21l-4.35-4.35" />
                                            <line x1="11" y1="8" x2="11" y2="14" />
                                            <line x1="8" y1="11" x2="14" y2="11" />
                                        </svg>
                                    </ZoomIcon>
                                    <CardBody>
                                        <CardTitle>
                                            {[photo.vehicleBrand, photo.vehicleModel].filter(Boolean).join(' ') || photo.fileName}
                                        </CardTitle>
                                        {photo.tags.length > 0 && (
                                            <CardTags>
                                                {photo.tags.slice(0, 3).map(tag => (
                                                    <CardTag key={tag}>{tag}</CardTag>
                                                ))}
                                                {photo.tags.length > 3 && (
                                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', alignSelf: 'center' }}>
                                                        +{photo.tags.length - 3}
                                                    </span>
                                                )}
                                            </CardTags>
                                        )}
                                        <CardMeta>
                                            <CardVehicle>
                                                {photo.vehicleLicensePlate ?? photo.customerName ?? ''}
                                            </CardVehicle>
                                            <SourceBadge $source={photo.source}>
                                                {photo.source === 'VISIT' ? 'Wizyta' : 'Pojazd'}
                                            </SourceBadge>
                                        </CardMeta>
                                    </CardBody>
                                </Card>
                            ))}
                        </Grid>
                    )}
                </ScrollArea>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <PaginationBar>
                        <PageBtn
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            $disabled={page === 1}
                        >
                            ←
                        </PageBtn>

                        {pageNumbers.map((p, idx) =>
                            p === '…' ? (
                                <Ellipsis key={`ell-${idx}`}>…</Ellipsis>
                            ) : (
                                <PageBtn
                                    key={p}
                                    $active={p === page}
                                    onClick={() => setPage(p as number)}
                                >
                                    {p}
                                </PageBtn>
                            )
                        )}

                        <PageBtn
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            $disabled={page === pagination.totalPages}
                        >
                            →
                        </PageBtn>

                        <PageInfo>
                            Strona {page} z {pagination.totalPages}
                            {' · '}
                            {pagination.total} zdjęć
                        </PageInfo>
                    </PaginationBar>
                )}
            </Content>

            {/* Lightbox */}
            {selectedPhoto && (
                <GalleryLightbox
                    photo={selectedPhoto}
                    onClose={() => setSelectedPhoto(null)}
                />
            )}
        </Page>
    );
};
