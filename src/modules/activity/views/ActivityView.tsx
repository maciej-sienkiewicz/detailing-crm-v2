// src/modules/activity/views/ActivityView.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Activity, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { ActivityFilterBar } from '../components/ActivityFilterBar';
import { ActivityRow } from '../components/ActivityRow';
import { useActivityFeed, useActivityFilterOptions } from '../hooks/useActivityFeed';
import { groupByDay, presetToFrom } from '../activityTheme';
import type { DateRangePreset } from '../activityTheme';
import { DEFAULT_ACTIVITY_FILTERS } from '../types';
import type { ActivityFilters } from '../types';

// ─── animations ───────────────────────────────────────────────────────────────

const fadeSlide = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
    0%   { opacity: 0.55; }
    50%  { opacity: 1; }
    100% { opacity: 0.55; }
`;

// ─── layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100%;
    background: ${p => p.theme.colors.background};
    ${hexBackdrop}
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.lg};
    padding: ${p => p.theme.spacing.lg};
    width: 100%;
    max-width: 1080px;
    margin: 0 auto;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: ${p => p.theme.spacing.xl};
    }
`;

// ─── hero ─────────────────────────────────────────────────────────────────────

const Hero = styled.header`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    border-radius: ${p => p.theme.radii.xl};
    padding: 28px 32px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 8px 32px rgba(0, 0, 0, 0.16);

    &::before {
        content: '';
        position: absolute;
        top: -80px;
        right: -60px;
        width: 320px;
        height: 320px;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, transparent 65%);
        pointer-events: none;
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 22px 20px;
    }
`;

const HeroInner = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const HeroText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const HeroEyebrow = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7dd3fc;

    svg { width: 13px; height: 13px; }
`;

const HeroTitle = styled.h1`
    margin: 0;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.1;
    color: #f1f5f9;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        font-size: 34px;
    }
`;

const HeroSubtitle = styled.p`
    margin: 0;
    max-width: 62ch;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: #94a3b8;
`;

const HeroCount = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;

    strong {
        font-size: 30px;
        font-weight: 800;
        letter-spacing: -1px;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        color: #f1f5f9;
    }

    span {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
    }
`;

// ─── timeline ─────────────────────────────────────────────────────────────────

const Timeline = styled.section`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    overflow: hidden;
`;

const DayGroup = styled.div`
    animation: ${fadeSlide} 240ms ease both;

    & + & {
        border-top: 1px solid ${p => p.theme.colors.border};
    }
`;

const DayHeader = styled.h2`
    position: sticky;
    top: 0;
    z-index: 2;
    margin: 0;
    padding: 10px 20px;
    background: ${p => p.theme.colors.surfaceHover};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textSecondary};
    backdrop-filter: blur(6px);
`;

const DayRows = styled.div`
    padding: 4px 0;
`;

// ─── states ───────────────────────────────────────────────────────────────────

const StateBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 64px 24px;
    text-align: center;

    svg {
        width: 30px;
        height: 30px;
        color: ${p => p.theme.colors.textMuted};
    }

    h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: ${p => p.theme.colors.text};
    }

    p {
        margin: 0;
        max-width: 46ch;
        font-size: 13.5px;
        line-height: 1.5;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const RetryButton = styled.button`
    margin-top: 4px;
    padding: 9px 20px;
    border: none;
    border-radius: 9999px;
    background: var(--brand-primary);
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.28);
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3);
    }
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: 58px 40px 1fr;
    gap: 0 14px;
    padding: 16px 20px 16px 0;
    animation: ${shimmer} 1.4s ease-in-out infinite;

    div {
        border-radius: 8px;
        background: ${p => p.theme.colors.surfaceAlt};
    }

    .time { height: 12px; margin-top: 12px; }
    .tile { height: 40px; border-radius: 12px; }
    .body { display: flex; flex-direction: column; gap: 8px; }
    .line-a { height: 14px; width: 46%; }
    .line-b { height: 12px; width: 68%; }
    .line-c { height: 12px; width: 30%; }
`;

const LoadMore = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 18px;
    border-top: 1px solid ${p => p.theme.colors.border};
    font-size: 12.5px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};

    svg {
        width: 15px;
        height: 15px;
        animation: ${spin} 900ms linear infinite;
    }
`;

const EndMarker = styled.div`
    padding: 18px;
    border-top: 1px solid ${p => p.theme.colors.border};
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: ${p => p.theme.colors.textMuted};
`;

// ─── view ─────────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 300;

export const ActivityView = () => {
    const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);
    const [preset, setPreset] = useState<DateRangePreset>('ALL');

    // Kept apart from `filters` so typing does not fire a request per keystroke:
    // the whole filter object is the react-query key, so every change is a refetch.
    const [searchInput, setSearchInput] = useState('');

    useEffect(() => {
        if (searchInput === filters.search) return;
        const timer = setTimeout(
            () => setFilters(current => ({ ...current, search: searchInput })),
            SEARCH_DEBOUNCE_MS,
        );
        return () => clearTimeout(timer);
    }, [searchInput, filters.search]);

    const { data: options } = useActivityFilterOptions();
    const {
        data,
        isLoading,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useActivityFeed(filters);

    // Odsiew po id, a nie zwykłe sklejenie stron. Strony feedu są kursorowe i normalnie
    // nie zachodzą na siebie, ale wystarczy jedno odświeżenie pierwszej strony przy już
    // pobranych kolejnych, żeby ten sam wpis trafił na ekran dwa razy - a wiersz obok
    // wiersza wygląda jak zdublowane powiadomienie, nie jak artefakt stronicowania.
    const items = useMemo(() => {
        const seen = new Set<string>();
        return (data?.pages ?? [])
            .flatMap(page => page.items)
            .filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });
    }, [data]);
    const groups = useMemo(() => groupByDay(items), [items]);

    const isDefault = useMemo(
        () =>
            filters.modules.length === 0 &&
            filters.actorTypes.length === 0 &&
            filters.search === '' &&
            filters.from === null &&
            filters.severities.length === DEFAULT_ACTIVITY_FILTERS.severities.length &&
            filters.severities.every(s => DEFAULT_ACTIVITY_FILTERS.severities.includes(s)),
        [filters],
    );

    const handleReset = useCallback(() => {
        setSearchInput('');
        setPreset('ALL');
        setFilters(DEFAULT_ACTIVITY_FILTERS);
    }, []);

    const handleFiltersChange = useCallback((next: ActivityFilters) => {
        setFilters(next);
    }, []);

    const handlePresetChange = useCallback((next: DateRangePreset) => {
        setPreset(next);
        setFilters(current => ({ ...current, from: presetToFrom(next) }));
    }, []);

    // Infinite scroll: a sentinel below the last row pulls the next page as it
    // comes into view, so the feed reads as one continuous history.
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0]?.isIntersecting) void fetchNextPage();
            },
            { rootMargin: '320px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <Page>
            <Content>
                <Hero>
                    <HeroInner>
                        <HeroText>
                            <HeroEyebrow>
                                <Activity />
                                Historia firmy
                            </HeroEyebrow>
                            <HeroTitle>Aktywność</HeroTitle>
                            <HeroSubtitle>
                                Wszystko, co dzieje się w studiu: kto co zrobił, kiedy i na jaką
                                kwotę. Razem z tym, co robią klienci na swoich Kartach Wizyty.
                            </HeroSubtitle>
                        </HeroText>

                        {items.length > 0 && (
                            <HeroCount>
                                <strong>{items.length}</strong>
                                <span>{hasNextPage ? 'wczytanych zdarzeń' : 'zdarzeń'}</span>
                            </HeroCount>
                        )}
                    </HeroInner>
                </Hero>

                <ActivityFilterBar
                    filters={filters}
                    search={searchInput}
                    options={options}
                    preset={preset}
                    onChange={handleFiltersChange}
                    onSearchChange={setSearchInput}
                    onPresetChange={handlePresetChange}
                    onReset={handleReset}
                    isDefault={isDefault}
                />

                <Timeline aria-busy={isLoading}>
                    {isLoading && (
                        <div aria-label="Wczytywanie historii aktywności">
                            {[0, 1, 2, 3, 4].map(index => (
                                <SkeletonRow key={index}>
                                    <div className="time" />
                                    <div className="tile" />
                                    <div className="body">
                                        <div className="line-a" />
                                        <div className="line-b" />
                                        <div className="line-c" />
                                    </div>
                                </SkeletonRow>
                            ))}
                        </div>
                    )}

                    {!isLoading && isError && (
                        <StateBox>
                            <AlertCircle />
                            <h3>Nie udało się wczytać historii</h3>
                            <p>
                                Połączenie z serwerem zostało przerwane. Sprawdź sieć i spróbuj
                                ponownie.
                            </p>
                            <RetryButton type="button" onClick={() => void refetch()}>
                                Spróbuj ponownie
                            </RetryButton>
                        </StateBox>
                    )}

                    {!isLoading && !isError && items.length === 0 && (
                        <StateBox>
                            <Inbox />
                            <h3>Brak zdarzeń dla wybranych filtrów</h3>
                            <p>
                                {isDefault
                                    ? 'W tym studiu nie zarejestrowano jeszcze żadnych istotnych zdarzeń. Pojawią się tutaj automatycznie.'
                                    : 'Poszerz zakres dat albo zdejmij część filtrów, żeby zobaczyć więcej.'}
                            </p>
                        </StateBox>
                    )}

                    {!isLoading && !isError && groups.map(group => (
                        <DayGroup key={group.key}>
                            <DayHeader>{group.label}</DayHeader>
                            <DayRows>
                                {group.items.map(item => (
                                    <ActivityRow key={item.id} item={item} />
                                ))}
                            </DayRows>
                        </DayGroup>
                    ))}

                    {!isLoading && !isError && items.length > 0 && (
                        <div ref={sentinelRef}>
                            {isFetchingNextPage && (
                                <LoadMore>
                                    <Loader2 />
                                    Wczytywanie starszych zdarzeń
                                </LoadMore>
                            )}
                            {!hasNextPage && !isFetchingNextPage && (
                                <EndMarker>To już wszystko</EndMarker>
                            )}
                        </div>
                    )}
                </Timeline>
            </Content>
        </Page>
    );
};
