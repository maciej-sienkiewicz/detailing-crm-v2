// src/modules/activity/views/ActivityView.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, Inbox, Loader2, Users } from 'lucide-react';
import { useBreakpoint } from '@/common/hooks';
import { MobilePageHeader } from '@/common/components/PageHeader';
import { PageContainer } from '@/common/components/PageContainer';
import { ui } from '@/common/components/ui';
import { ActivityFilterBar } from '../components/ActivityFilterBar';
import type { ActivityPerson } from '../components/ActivityFilterBar';
import { ActivityRow } from '../components/ActivityRow';
import {
    activityKeys,
    NEWER_PROBE_LIMIT,
    useActivityActors,
    useActivityFeed,
    useActivityFilterOptions,
    useNewerActivityCount,
} from '../hooks/useActivityFeed';
import { customRange, formatToday, groupByDay, presetToRange, PRESET_PHRASE } from '../activityTheme';
import type { DateRangePreset } from '../activityTheme';
import { groupByGesture } from '../utils/groupByGesture';
import { DEFAULT_ACTIVITY_FILTERS, employeeOf, whoForEmployee } from '../types';
import type { ActivityArea, ActivityFilters, ActivityWho } from '../types';
import { pluralPl } from '@/common/utils/plural';

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
`;

const Content = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.lg};
`;

const Columns = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 20px;
`;

const MainColumn = styled.div`
    flex: 999 1 560px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const SideColumn = styled.aside`
    flex: 1 1 260px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 2px;
`;

// ─── hero ─────────────────────────────────────────────────────────────────────

// Sam tytuł, opis i data. Kafelki z obrotem, rabatami i akceptacjami zniknęły celowo:
// to, czy te liczby coś znaczą, zależy od wielkości studia - dla części firm byłyby
// tylko szumem nad listą, po którą ktoś tu przyszedł.
const Hero = styled.header`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    border-radius: ${p => p.theme.radii.xl};
    padding: 26px 32px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 8px 32px rgba(0, 0, 0, 0.16);

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
    color: #cbd5e1;
`;

const HeroDate = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: #cbd5e1;

    &::first-letter { text-transform: uppercase; }
`;

// ─── feed card ────────────────────────────────────────────────────────────────

// Jedyna wyniesiona powierzchnia w kolumnie (CLAUDE.md §2): pasek marki u góry,
// dwa cienie. Filtry nad nią leżą płasko na tle.
const Timeline = styled.section`
    background: ${ui.surface};
    border-radius: ${ui.radiusPanel};
    box-shadow: ${ui.shadowCard};
    overflow: hidden;

    &::before {
        content: '';
        display: block;
        height: 4px;
        background: linear-gradient(90deg, ${ui.brand}, ${ui.brandInk});
    }
`;

const FeedHead = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 16px 20px 14px;
    border-bottom: 1px solid ${ui.line};
`;

const FeedTitle = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1 1 320px;

    h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.2px;
        color: ${ui.ink};
    }

    p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: ${ui.textSecondary};
    }
`;

// Zabarwione, nie wypełnione: to informacja „jest coś nowego", a nie krok następny.
const NewerPill = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 0 14px;
    border: 1px solid ${ui.brandLine};
    border-radius: ${ui.radiusControl};
    background: ${ui.brandTintHover};
    color: ${ui.brandDeep};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;

    &::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: ${ui.brandStrong};
    }

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const DayGroup = styled.div`
    animation: ${fadeSlide} 240ms ease both;

    & + & {
        border-top: 1px solid ${ui.line};
    }
`;

// Nazwa dnia pismem tekstowym z datą obok - zamiast wersalików 11 px w szarości,
// które były jedyną ramą sekcji (CLAUDE.md §2).
const DayHeader = styled.h3`
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0;
    padding: 12px 20px 8px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(6px);
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};

    span {
        font-size: 13px;
        font-weight: 500;
        color: ${ui.textMuted};
    }
`;

const DayRows = styled.div`
    padding: 0 0 4px;
`;

// ─── side column ──────────────────────────────────────────────────────────────

const SideTitle = styled.h2`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 4px;
    padding: 0 4px;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};

    span {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: ${ui.surface};
        border: 1.5px solid ${ui.line};
        color: ${ui.inkSoft};
    }

    svg { width: 16px; height: 16px; }
`;

const PersonButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid ${p => p.$active ? ui.brandLine : 'transparent'};
    border-radius: 12px;
    background: ${p => p.$active ? ui.brandTintHover : 'transparent'};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    strong {
        font-size: 13.5px;
        font-weight: 600;
        color: ${ui.ink};
    }

    span {
        flex-shrink: 0;
        font-size: 12.5px;
        font-weight: 600;
        color: ${ui.textSecondary};
        font-variant-numeric: tabular-nums;
    }

    &:hover { background: ${p => p.$active ? ui.brandTintHover : ui.surface}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const SideEmpty = styled.p`
    margin: 0;
    padding: 0 4px;
    font-size: 13px;
    color: ${ui.textSecondary};
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
        color: ${ui.textMuted};
    }

    h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: ${ui.ink};
    }

    p {
        margin: 0;
        max-width: 46ch;
        font-size: 13.5px;
        line-height: 1.5;
        color: ${ui.textSecondary};
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
        background: ${ui.surfaceAlt};
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
    border-top: 1px solid ${ui.line};
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textMuted};

    svg {
        width: 15px;
        height: 15px;
        animation: ${spin} 900ms linear infinite;
    }
`;

const EndMarker = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 16px 20px;
    border-top: 1px solid ${ui.line};
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textMuted};
`;

const OlderButton = styled.button`
    min-height: 36px;
    padding: 0 16px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface};
    color: ${ui.inkSoft};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;

    &:hover { border-color: ${ui.lineStrong}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

// ─── copy ─────────────────────────────────────────────────────────────────────

/** Co pokazuje obszar - jedno zdanie pod tytułem listy, żeby nikt nie zgadywał. */
const AREA_HINT: Record<ActivityArea | 'ALL', string> = {
    ALL: 'Każde zdarzenie w studiu. Przypomnienia i automatyczne wiadomości, które doszły bez błędu, są ukryte, dopóki nie włączysz „Pokaż automaty".',
    VISITS: 'Przyjęcia, wydania, zmiany w wizytach, terminy rezerwacji i dokumenty wizyt.',
    MONEY: 'Wydania, rabaty, korekty kasy i rozliczeń, ceny w cenniku, faktury i dane do faktur.',
    CLIENTS: 'Co zrobili klienci i co ich dotyczy: akceptacje, odpowiedzi, wiadomości, leady, dane klientów.',
    TEAM: 'Pracownicy, ich konta, role i uprawnienia, urlopy i czas pracy.',
};

const PERIOD_SHORT: Record<DateRangePreset, string> = {
    TODAY: 'Dzisiaj',
    YESTERDAY: 'Wczoraj',
    WEEK: 'Ostatnie 7 dni',
    MONTH: 'Ostatnie 30 dni',
    CUSTOM: 'Wybrany zakres',
    ALL: 'Cały okres',
};

const eventsCount = (count: number): string =>
    `${count} ${pluralPl(count, 'zdarzenie', 'zdarzenia', 'zdarzeń')}`;

const newerLabel = (count: number, more: boolean): string => {
    if (more) return `Ponad ${NEWER_PROBE_LIMIT} nowych zdarzeń, pokaż`;
    return `${count} ${pluralPl(count, 'nowe zdarzenie', 'nowe zdarzenia', 'nowych zdarzeń')}, pokaż`;
};

// ─── view ─────────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PRESET: DateRangePreset = 'WEEK';

const initialFilters = (): ActivityFilters => ({
    ...DEFAULT_ACTIVITY_FILTERS,
    ...presetToRange(DEFAULT_PRESET),
});

export const ActivityView = () => {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<ActivityFilters>(initialFilters);
    const [preset, setPreset] = useState<DateRangePreset>(DEFAULT_PRESET);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Nazwisko wybranego pracownika, na wypadek gdy po zmianie okresu wypadnie
    // z listy aktywnych - filtr nie może wtedy zniknąć z pola „Kto".
    const [pickedName, setPickedName] = useState<string | null>(null);

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
    const groups = useMemo(() => groupByDay(groupByGesture(items)), [items]);

    const newestOccurredAt = items[0]?.occurredAt ?? null;
    const { data: newer } = useNewerActivityCount(filters, newestOccurredAt);

    const todayStart = useMemo(() => presetToRange('TODAY').from, []);
    const { data: periodActors } = useActivityActors(filters.from, filters.to);
    const { data: todayActors } = useActivityActors(todayStart, null);

    const people: ActivityPerson[] = useMemo(() => {
        const list = (periodActors?.actors ?? []).map(actor => ({
            who: whoForEmployee(actor.id),
            name: actor.displayName,
        }));
        const pickedId = employeeOf(filters.who);
        if (pickedId && !list.some(person => person.who === filters.who)) {
            list.unshift({ who: filters.who, name: pickedName ?? 'Wybrany pracownik' });
        }
        return list;
    }, [periodActors, filters.who, pickedName]);

    const isDesktop = useBreakpoint('md');

    const isDefault = filters.area === null
        && filters.who === 'ALL'
        && filters.hideAutomated
        && filters.search === ''
        && preset === DEFAULT_PRESET;

    const applyPreset = useCallback((next: DateRangePreset) => {
        setPreset(next);
        if (next === 'CUSTOM') {
            setFilters(current => ({ ...current, ...customRange(customFrom, customTo) }));
        } else {
            setFilters(current => ({ ...current, ...presetToRange(next) }));
        }
    }, [customFrom, customTo]);

    const handleCustomRange = useCallback((from: string, to: string) => {
        setCustomFrom(from);
        setCustomTo(to);
        setFilters(current => ({ ...current, ...customRange(from, to) }));
    }, []);

    const handleWho = useCallback((who: ActivityWho, name?: string) => {
        if (name) setPickedName(name);
        setFilters(current => ({ ...current, who }));
    }, []);

    const handleReset = useCallback(() => {
        setSearchInput('');
        setPreset(DEFAULT_PRESET);
        setCustomFrom('');
        setCustomTo('');
        setFilters(initialFilters());
    }, []);

    const showNewer = useCallback(() => {
        void queryClient.resetQueries({ queryKey: activityKeys.feed(filters) });
    }, [queryClient, filters]);

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

    const areaLabel = filters.area
        ? options?.areas.find(area => area.value === filters.area)?.label ?? 'Wybrany obszar'
        : 'Wszystko';

    const whoLabel = (() => {
        if (filters.who === 'ALL') return 'wszyscy';
        if (filters.who === 'CUSTOMERS') return 'klienci';
        if (filters.who === 'AUTOMATIONS') return 'automaty';
        return people.find(person => person.who === filters.who)?.name ?? pickedName ?? 'wybrana osoba';
    })();

    return (
        <Page>
            <Content>
                {isDesktop ? (
                    <Hero>
                        <HeroInner>
                            <HeroText>
                                <HeroTitle>Aktywność</HeroTitle>
                                <HeroSubtitle>
                                    Kto co zrobił, kiedy i na jaką kwotę. Razem z tym, co robią klienci na
                                    swoich Kartach wizyty.
                                </HeroSubtitle>
                            </HeroText>
                            <HeroDate>Dziś, {formatToday()}</HeroDate>
                        </HeroInner>
                    </Hero>
                ) : (
                    /* Mobile: gradient hero znika, wspólny app-bar jak na "Wizyty". */
                    <MobilePageHeader
                        icon={<Activity />}
                        title="Aktywność"
                        subtitle={`${PERIOD_SHORT[preset]}, ${whoLabel}`}
                    />
                )}

                <Columns>
                    <MainColumn>
                        <ActivityFilterBar
                            filters={filters}
                            search={searchInput}
                            preset={preset}
                            customFrom={customFrom}
                            customTo={customTo}
                            areas={options?.areas}
                            people={people}
                            onAreaChange={area => setFilters(current => ({ ...current, area }))}
                            onWhoChange={who => handleWho(who)}
                            onSearchChange={setSearchInput}
                            onPresetChange={applyPreset}
                            onCustomRangeChange={handleCustomRange}
                            onHideAutomatedChange={hideAutomated => setFilters(current => ({ ...current, hideAutomated }))}
                            onReset={handleReset}
                            isDefault={isDefault}
                        />

                        <Timeline aria-busy={isLoading} aria-label="Zdarzenia">
                            <FeedHead>
                                <FeedTitle>
                                    <h2>{areaLabel} {PRESET_PHRASE[preset]}</h2>
                                    <p>{AREA_HINT[filters.area ?? 'ALL']}</p>
                                </FeedTitle>
                                {newer && newer.count > 0 && (
                                    <NewerPill type="button" onClick={showNewer}>
                                        {newerLabel(newer.count, newer.more)}
                                    </NewerPill>
                                )}
                            </FeedHead>

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
                                    <p>Sprawdź internet i spróbuj ponownie.</p>
                                    <RetryButton type="button" onClick={() => void refetch()}>
                                        Spróbuj ponownie
                                    </RetryButton>
                                </StateBox>
                            )}

                            {!isLoading && !isError && items.length === 0 && (
                                <StateBox>
                                    <Inbox />
                                    <h3>{isDefault ? `Nic się jeszcze nie wydarzyło ${PRESET_PHRASE[preset]}` : 'Brak zdarzeń dla wybranych filtrów'}</h3>
                                    <p>
                                        {isDefault
                                            ? 'Nowe zdarzenia zapowie przycisk nad listą.'
                                            : 'Poszerz zakres dat albo zdejmij część filtrów, żeby zobaczyć więcej.'}
                                    </p>
                                </StateBox>
                            )}

                            {!isLoading && !isError && groups.map(group => (
                                <DayGroup key={group.key}>
                                    <DayHeader>
                                        {group.label}
                                        {group.date && <span>{group.date}</span>}
                                    </DayHeader>
                                    <DayRows>
                                        {group.items.map(entry => (
                                            <ActivityRow
                                                key={entry.item.id}
                                                item={entry.item}
                                                steps={entry.steps}
                                                stepsLabel={entry.stepsLabel}
                                            />
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
                                        <EndMarker>
                                            {preset === 'ALL'
                                                ? 'To już wszystko'
                                                : `To wszystko ${PRESET_PHRASE[preset]}.`}
                                            {preset !== 'ALL' && (
                                                <OlderButton type="button" onClick={() => applyPreset('ALL')}>
                                                    Pokaż starsze zdarzenia
                                                </OlderButton>
                                            )}
                                        </EndMarker>
                                    )}
                                </div>
                            )}
                        </Timeline>
                    </MainColumn>

                    {isDesktop && (
                        <SideColumn aria-label="Kto dziś działał">
                            <SideTitle>
                                <span><Users aria-hidden="true" /></span>
                                Kto dziś działał
                            </SideTitle>
                            {(todayActors?.actors ?? []).length === 0 && (
                                <SideEmpty>Dziś nikt jeszcze nic nie zrobił.</SideEmpty>
                            )}
                            {(todayActors?.actors ?? []).map(actor => {
                                const who = whoForEmployee(actor.id);
                                const active = filters.who === who;
                                return (
                                    <PersonButton
                                        key={actor.id}
                                        type="button"
                                        $active={active}
                                        aria-pressed={active}
                                        onClick={() => handleWho(active ? 'ALL' : who, actor.displayName)}
                                    >
                                        <strong>{actor.displayName}</strong>
                                        <span>{eventsCount(actor.eventCount)}</span>
                                    </PersonButton>
                                );
                            })}
                        </SideColumn>
                    )}
                </Columns>
            </Content>
        </Page>
    );
};
