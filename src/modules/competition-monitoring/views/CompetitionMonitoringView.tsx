import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { BarChart3, Calendar, Grid3x3, Megaphone, MoreHorizontal, Plus, Sparkles, Users } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    PageHeader,
    PageHeaderGhostButton,
    PageHeaderPrimaryButton,
} from '@/common/components/PageHeader/PageHeader';
import { TabBar as SharedTabBar, type TabDefinition } from '@/common/components/TabBar/TabBar';
import { useBreakpoint } from '@/common/hooks';
import { useOverview, useBenchmark, useDigest } from '../hooks/useAnalytics';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useAdCalendar } from '../hooks/useAds';
import { WeekTab } from '../components/WeekTab';
import { BenchmarkTab } from '../components/BenchmarkTab';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { ContentTab } from '../components/ContentTab';
import { AdsTab } from '../components/AdsTab';
import { AdDetailModal } from '../components/AdDetailModal';
import { ProfilesDrawer } from '../components/ProfilesDrawer';
import { AddProfileModal } from '../components/AddProfileModal';
import { GeneratePostModal } from '../components/GeneratePostModal';
import { CenterState, Spinner } from '../components/MetricBits';
import { WEEKS_OPTIONS, type WeeksOption } from '../types';

/**
 * Analiza konkurencji na Instagramie, cztery zakładki:
 *   Tydzień:    co zrobił każdy obserwowany profil w tym tygodniu (domyślna),
 *   Porównanie: tabela benchmarkowa + 2 wykresy z adnotacjami,
 *   Treści:     najskuteczniejsze posty, pory publikacji, hasztagi,
 *   Reklamy:    kalendarz reklam Meta (rok) i podsumowanie.
 *
 * Stan (zakładka, okres, rok) trzymany w URL, widoki są linkowalne.
 *
 * Mobile: hero card z gradientem znika w całości — akcje wchodzą w overflow
 * menu w sticky toolbar pod zakładkami, wybór okresu / roku ląduje w drugim
 * rzędzie tego samego toolbara. Reklamy i Porównanie mają osobne mobilne
 * bliźniaki (patrz AdsTabMobile, BenchmarkTabMobile) — tabele desktopowe są
 * fizycznie nieczytelne na 375 px.
 */

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 16px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    animation: ${fadeUp} 300ms ease both;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: 32px;
        gap: 20px;
    }
`;

const WeeksBar = styled.div<{ $onLight?: boolean }>`
    display: inline-flex;
    background: ${p => (p.$onLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)')};
    border: 1px solid ${p => (p.$onLight ? st.border : 'rgba(255, 255, 255, 0.1)')};
    border-radius: ${st.radiusFull};
    padding: 3px;
    gap: 2px;
`;

const WeeksBtn = styled.button<{ $active: boolean; $onLight?: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    border: none;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 500)};
    background: ${p => {
        if (p.$active) return p.$onLight ? '#fff' : 'rgba(255,255,255,0.14)';
        return 'transparent';
    }};
    color: ${p => {
        if (p.$onLight) return p.$active ? st.text : st.textSecondary;
        return p.$active ? '#f1f5f9' : '#64748b';
    }};
    box-shadow: ${p => (p.$active && p.$onLight ? st.shadowXs : 'none')};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover { color: ${p => {
        if (p.$onLight) return p.$active ? st.text : st.text;
        return p.$active ? '#f1f5f9' : '#94a3b8';
    }}; }
`;

const PendingBadge = styled.span`
    background: ${st.accentAmber};
    color: #fff;
    font-size: ${st.fontXs};
    font-weight: 700;
    border-radius: ${st.radiusFull};
    padding: 1px 7px;
`;

// ─── Mobile sticky toolbar ────────────────────────────────────────────────────

const MobileToolbar = styled.div`
    position: sticky;
    top: 0;
    z-index: 20;
    background: ${st.bg};
    margin: -16px -16px 0;
    padding: 8px 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-bottom: 1px solid ${st.border};
`;

const ToolbarRow1 = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    /* TabBar bierze cały dostępny obszar, menu zostaje z prawej. */
    > nav { flex: 1; min-width: 0; }
`;

const MenuButton = styled.button`
    position: relative;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover, &:focus-visible {
        border-color: ${st.borderHover};
        color: ${st.text};
        outline: none;
    }

    svg { width: 18px; height: 18px; }
`;

const MenuBadge = styled.span`
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: ${st.radiusFull};
    background: ${st.accentAmber};
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid ${st.bg};
`;

const ToolbarRow2 = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const MenuDropdown = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 220px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowLg};
    padding: 6px;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const MenuItem = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: ${st.radiusSm};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    text-align: left;
    cursor: pointer;
    transition: background ${st.transition};

    &:hover { background: ${st.bgCardAlt}; }

    svg { width: 16px; height: 16px; color: ${st.textSecondary}; flex-shrink: 0; }
`;

const MenuItemPrimary = styled(MenuItem)`
    color: ${st.accentBlue};
    font-weight: 600;

    svg { color: ${st.accentBlue}; }
`;

const MenuBadgeInline = styled.span`
    margin-left: auto;
    background: ${st.accentAmber};
    color: #fff;
    font-size: ${st.fontXs};
    font-weight: 700;
    border-radius: ${st.radiusFull};
    padding: 1px 7px;
`;

const MenuWrap = styled.div`
    position: relative;
`;

const MenuBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 25;
`;

// ─── Zakładki i konfiguracja ──────────────────────────────────────────────────

type TabKey = 'tydzien' | 'porownanie' | 'tresci' | 'reklamy';

const TABS: ReadonlyArray<TabDefinition<TabKey>> = [
    { key: 'tydzien', label: 'Tydzień', icon: <Calendar size={14} /> },
    { key: 'porownanie', label: 'Porównanie', icon: <BarChart3 size={14} /> },
    { key: 'tresci', label: 'Treści', icon: <Grid3x3 size={14} /> },
    { key: 'reklamy', label: 'Reklamy', icon: <Megaphone size={14} /> },
];

/**
 * Reklamy mierzy się latami, a nie tygodniami: kampania trwa miesiącami, a
 * Biblioteka reklam Meta trzyma dokładnie rok historii. Dlatego ta jedna zakładka
 * ma nad sobą wybór roku zamiast wyboru okresu.
 */
const AD_YEARS = 2;

const resolveTab = (raw: string | null): TabKey =>
    TABS.some(t => t.key === raw) ? (raw as TabKey) : 'tydzien';

export const CompetitionMonitoringView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isDesktop = useBreakpoint('md');
    const [menuOpen, setMenuOpen] = useState(false);

    const tab = resolveTab(searchParams.get('widok'));
    const weeksParam = Number(searchParams.get('okres'));
    const weeks: WeeksOption = ([4, 12, 26, 52] as const).includes(weeksParam as WeeksOption)
        ? (weeksParam as WeeksOption)
        : 12;

    const setUrlState = useCallback(
        (next: { tab?: TabKey; weeks?: WeeksOption; year?: number }) => {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                if (next.tab) params.set('widok', next.tab);
                if (next.weeks) params.set('okres', String(next.weeks));
                if (next.year) params.set('rok', String(next.year));
                return params;
            }, { replace: true });
        },
        [setSearchParams]
    );

    const currentYear = new Date().getFullYear();
    const yearParam = Number(searchParams.get('rok'));
    const year = Number.isInteger(yearParam) && yearParam > currentYear - AD_YEARS && yearParam <= currentYear
        ? yearParam
        : currentYear;

    const [openAdId, setOpenAdId] = useState<string | null>(null);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isAddOpen, setAddOpen] = useState(false);
    const [isGenerateOpen, setGenerateOpen] = useState(false);

    const overviewQuery = useOverview(weeks);
    const digestQuery = useDigest(tab === 'tydzien');
    const benchmarkQuery = useBenchmark(weeks, tab === 'porownanie');
    const adsQuery = useAdCalendar(year, tab === 'reklamy');
    const { profiles } = useInstagramProfiles();
    const pendingCount = profiles.filter(p => p.status === 'PENDING_APPROVAL').length;

    const openMenuAction = (action: () => void) => () => {
        setMenuOpen(false);
        action();
    };

    /** Header i akcje w toolbarze mobilnym pokazują to samo API; oddzielamy tylko szatę graficzną. */
    const desktopHeader = isDesktop && (
        <PageHeader
            title="Konkurencja na Instagramie"
            subtitle="Co robi konkurencja, co u niej działa i co możesz z tym zrobić"
            actions={
                <>
                    <WeeksBar>
                        {tab === 'reklamy'
                            ? Array.from({ length: AD_YEARS }, (_, index) => currentYear - AD_YEARS + 1 + index)
                                .map(option => (
                                    <WeeksBtn
                                        key={option}
                                        $active={year === option}
                                        onClick={() => setUrlState({ year: option })}
                                    >
                                        {option}
                                    </WeeksBtn>
                                ))
                            : WEEKS_OPTIONS.map(option => (
                                <WeeksBtn
                                    key={option.value}
                                    $active={weeks === option.value}
                                    onClick={() => setUrlState({ weeks: option.value })}
                                >
                                    {option.label}
                                </WeeksBtn>
                            ))}
                    </WeeksBar>
                    <PageHeaderGhostButton onClick={() => setGenerateOpen(true)}>
                        <Sparkles /> Generuj post
                    </PageHeaderGhostButton>
                    <PageHeaderGhostButton onClick={() => setDrawerOpen(true)}>
                        <Users /> Profile
                        {pendingCount > 0 && <PendingBadge>{pendingCount}</PendingBadge>}
                    </PageHeaderGhostButton>
                    <PageHeaderPrimaryButton onClick={() => setAddOpen(true)}>
                        <Plus /> Dodaj profil
                    </PageHeaderPrimaryButton>
                </>
            }
        />
    );

    /**
     * Mobile toolbar: sticky pasek z tabami i menu w rzędzie 1,
     * wybór okresu/roku w rzędzie 2. Zastępuje gradient hero card, którego
     * właściciel nie potrzebuje na 5-sekundowy rzut oka do telefonu.
     */
    const mobileToolbar = !isDesktop && (
        <MobileToolbar>
            <ToolbarRow1>
                <SharedTabBar
                    tabs={TABS}
                    activeKey={tab}
                    onChange={key => setUrlState({ tab: key })}
                    ariaLabel="Zakładki widoku Instagram"
                />
                <MenuWrap>
                    <MenuButton
                        type="button"
                        aria-label="Więcej akcji"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(open => !open)}
                    >
                        <MoreHorizontal />
                        {pendingCount > 0 && <MenuBadge>{pendingCount}</MenuBadge>}
                    </MenuButton>
                    {menuOpen && (
                        <>
                            <MenuBackdrop onClick={() => setMenuOpen(false)} />
                            <MenuDropdown role="menu">
                                <MenuItemPrimary type="button" role="menuitem" onClick={openMenuAction(() => setAddOpen(true))}>
                                    <Plus /> Dodaj profil
                                </MenuItemPrimary>
                                <MenuItem type="button" role="menuitem" onClick={openMenuAction(() => setDrawerOpen(true))}>
                                    <Users /> Profile
                                    {pendingCount > 0 && <MenuBadgeInline>{pendingCount}</MenuBadgeInline>}
                                </MenuItem>
                                <MenuItem type="button" role="menuitem" onClick={openMenuAction(() => setGenerateOpen(true))}>
                                    <Sparkles /> Generuj post
                                </MenuItem>
                            </MenuDropdown>
                        </>
                    )}
                </MenuWrap>
            </ToolbarRow1>
            <ToolbarRow2>
                <WeeksBar $onLight>
                    {tab === 'reklamy'
                        ? Array.from({ length: AD_YEARS }, (_, index) => currentYear - AD_YEARS + 1 + index)
                            .map(option => (
                                <WeeksBtn
                                    key={option}
                                    $active={year === option}
                                    $onLight
                                    onClick={() => setUrlState({ year: option })}
                                >
                                    {option}
                                </WeeksBtn>
                            ))
                        : WEEKS_OPTIONS.map(option => (
                            <WeeksBtn
                                key={option.value}
                                $active={weeks === option.value}
                                $onLight
                                onClick={() => setUrlState({ weeks: option.value })}
                            >
                                {option.label}
                            </WeeksBtn>
                        ))}
                </WeeksBar>
            </ToolbarRow2>
        </MobileToolbar>
    );

    /** Zakładki na desktopie: pod hero, pełny SyncStatusBar; na mobile są już w toolbarze. */
    const desktopTabs = isDesktop && (
        <SharedTabBar
            tabs={TABS}
            activeKey={tab}
            onChange={key => setUrlState({ tab: key })}
            ariaLabel="Zakładki widoku Instagram"
        />
    );

    return (
        <ViewContainer>
            {desktopHeader}
            {mobileToolbar}

            {overviewQuery.data && (
                <SyncStatusBar
                    lastSyncAt={overviewQuery.data.lastSyncAt}
                    nextDailySyncAt={overviewQuery.data.nextDailySyncAt}
                    nextDeepSyncAt={overviewQuery.data.nextDeepSyncAt}
                />
            )}

            {desktopTabs}

            {tab === 'tydzien' && (
                digestQuery.isLoading ? (
                    <CenterState><Spinner /></CenterState>
                ) : digestQuery.isError ? (
                    <CenterState>
                        <strong>Nie udało się pobrać danych</strong>
                        <span>Spróbuj odświeżyć stronę, jeśli problem wraca, daj nam znać.</span>
                    </CenterState>
                ) : (
                    <WeekTab digest={digestQuery.data ?? null} onOpenAd={setOpenAdId} />
                )
            )}

            {tab === 'porownanie' && (
                benchmarkQuery.isLoading ? (
                    <CenterState><Spinner /></CenterState>
                ) : benchmarkQuery.isError ? (
                    <CenterState>
                        <strong>Nie udało się pobrać danych</strong>
                        <span>Spróbuj odświeżyć stronę.</span>
                    </CenterState>
                ) : benchmarkQuery.data && benchmarkQuery.data.rows.length > 0 ? (
                    <BenchmarkTab benchmark={benchmarkQuery.data} />
                ) : (
                    <CenterState>
                        <strong>Brak danych do porównania</strong>
                        <span>Dodaj profile konkurencji i poczekaj na pierwszą synchronizację.</span>
                    </CenterState>
                )
            )}

            {tab === 'tresci' && <ContentTab weeks={weeks} />}

            {tab === 'reklamy' && (
                adsQuery.isLoading ? (
                    <CenterState><Spinner /></CenterState>
                ) : adsQuery.isError ? (
                    <CenterState>
                        <strong>Nie udało się pobrać danych o reklamach</strong>
                        <span>Spróbuj odświeżyć stronę.</span>
                    </CenterState>
                ) : adsQuery.data ? (
                    <AdsTab calendar={adsQuery.data} onOpenAd={setOpenAdId} />
                ) : null
            )}

            {openAdId && <AdDetailModal adId={openAdId} onClose={() => setOpenAdId(null)} />}

            <ProfilesDrawer
                open={isDrawerOpen}
                onClose={() => setDrawerOpen(false)}
                onAddProfile={() => {
                    setDrawerOpen(false);
                    setAddOpen(true);
                }}
            />
            <AddProfileModal isOpen={isAddOpen} onClose={() => setAddOpen(false)} />
            {isGenerateOpen && <GeneratePostModal onClose={() => setGenerateOpen(false)} />}
        </ViewContainer>
    );
};
