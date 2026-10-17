import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Lightbulb, LayoutDashboard, MoreHorizontal, Plus, Sparkles, UserRound, Users } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader/PageHeader';
import { TabBar as SharedTabBar, type TabDefinition } from '@/common/components/TabBar/TabBar';
import { useBreakpoint } from '@/common/hooks';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { OverviewTab } from '../components/overview/OverviewTab';
import { CompetitionTab } from '../components/competition/CompetitionTab';
import { InspirationTab } from '../components/inspiration/InspirationTab';
import { MyAccountsTab } from '../components/accounts/MyAccountsTab';
import { AdDetailModal } from '../components/AdDetailModal';
import { ProfilesDrawer } from '../components/ProfilesDrawer';
import { AddProfileModal } from '../components/AddProfileModal';
import { GeneratePostModal, type GeneratePostPrefill } from '../components/GeneratePostModal';
import type { CompetitionDays, HomeMarketEvent, HomeTodo } from '../types';
import { isCompetitionView, resolveLegacyUrl, type CompetitionView } from '../utils/moduleUrl';
import { prefillFromTodo } from '../utils/overview';

/**
 * Moduł Instagram, cztery zakładki według pytań właściciela, nie według źródeł danych:
 *   Przegląd:    co się zmieniło i co mam zrobić (domyślna),
 *   Moje konta:  własny Instagram i wizytówka Google - liczby, których scraper nie widzi,
 *   Konkurencja: profile (tabela, kalendarz publikacji, przyrost), reklamy, firmy w okolicy,
 *   Inspiracje:  posty, które zadziałały u innych, z „Zrób podobny".
 *
 * Wcześniej cztery zakładki (Tydzień, Porównanie, Treści, Reklamy) opowiadały o tym samym
 * tygodniu z czterech stron, a przełącznik okresu stał nad zakładką, na którą nie działał.
 * Stan (zakładka, widok, okres, rok) jest w adresie; stare adresy z powiadomień i zakładek
 * przeglądarki przekierowujemy na nowe ([resolveLegacyUrl]).
 */

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const ViewContainer = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: ${fadeUp} 300ms ease both;
`;

const PendingBadge = styled.span`
    background: ${st.accentAmber};
    color: #fff;
    font-size: ${st.fontXs};
    font-weight: 700;
    border-radius: ${st.radiusFull};
    padding: 1px 7px;
`;

// ─── Mobile: zakładki i menu w przyklejonym pasku ─────────────────────────────

const MobileToolbar = styled.div`
    position: sticky;
    top: 0;
    z-index: 20;
    background: ${st.bg};
    margin: -16px -16px 0;
    padding: 8px 16px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid ${st.border};

    > nav { flex: 1; min-width: 0; }
`;

const MenuWrap = styled.div`
    position: relative;
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

    &:hover, &:focus-visible { border-color: ${st.borderHover}; color: ${st.text}; outline: none; }
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

    &:hover { background: ${st.bgCardAlt}; }
    svg { width: 16px; height: 16px; color: ${st.textSecondary}; flex-shrink: 0; }
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

const MenuBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 25;
`;

// ─── Zakładki ─────────────────────────────────────────────────────────────────

type TabKey = 'przeglad' | 'moj' | 'konkurencja' | 'inspiracje';

const TABS: ReadonlyArray<TabDefinition<TabKey>> = [
    { key: 'przeglad', label: 'Przegląd', icon: <LayoutDashboard size={14} /> },
    { key: 'moj', label: 'Moje konta', icon: <UserRound size={14} /> },
    { key: 'konkurencja', label: 'Konkurencja', icon: <Users size={14} /> },
    { key: 'inspiracje', label: 'Inspiracje', icon: <Lightbulb size={14} /> },
];

/**
 * Na telefonie cztery zakładki z ikonami nie mieszczą się w pasku obok menu - ostatnia
 * chowała się za krawędzią. Bez ikon i z krótszą „Konta" mieszczą się wszystkie.
 */
const MOBILE_TABS: ReadonlyArray<TabDefinition<TabKey>> = TABS.map(({ key, label }) => ({
    key,
    label: key === 'moj' ? 'Konta' : label,
}));

const resolveTab = (raw: string | null): TabKey =>
    TABS.some(t => t.key === raw) ? (raw as TabKey) : 'przeglad';

/** Biblioteka reklam Meta trzyma rok historii - dwa lata to wszystko, co da się pokazać. */
const AD_YEARS = 2;

export const CompetitionMonitoringView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const isDesktop = useBreakpoint('md');
    const [menuOpen, setMenuOpen] = useState(false);

    // Stare adresy (powiadomienia, zakładki przeglądarki, podpowiedzi z Tablicy) → nowe.
    useEffect(() => {
        const next = resolveLegacyUrl(searchParams);
        if (next) setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const tab = resolveTab(searchParams.get('widok'));
    const viewParam = searchParams.get('pokaz');
    const competitionView: CompetitionView = isCompetitionView(viewParam) ? viewParam : 'profile';
    const days: CompetitionDays = searchParams.get('okres') === '365' ? 365 : 90;

    const currentYear = new Date().getFullYear();
    const yearParam = Number(searchParams.get('rok'));
    const year = Number.isInteger(yearParam) && yearParam > currentYear - AD_YEARS && yearParam <= currentYear
        ? yearParam
        : currentYear;

    const setUrlState = useCallback(
        (next: { tab?: TabKey; view?: CompetitionView; days?: CompetitionDays; year?: number }) => {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                if (next.tab) params.set('widok', next.tab);
                if (next.view) params.set('pokaz', next.view);
                if (next.days) params.set('okres', String(next.days));
                if (next.year) params.set('rok', String(next.year));
                // Widok i okres dotyczą wyłącznie Konkurencji - na innych zakładkach to szum w adresie.
                if (next.tab && next.tab !== 'konkurencja') {
                    params.delete('pokaz');
                    params.delete('okres');
                    params.delete('rok');
                }
                return params;
            }, { replace: true });
        },
        [setSearchParams]
    );

    const [openAdId, setOpenAdId] = useState<string | null>(null);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isAddOpen, setAddOpen] = useState(false);
    const [generatePrefill, setGeneratePrefill] = useState<GeneratePostPrefill | null>(null);

    const { profiles } = useInstagramProfiles();
    const pendingCount = profiles.filter(p => p.status === 'PENDING_APPROVAL').length;

    const openGenerator = (prefill: GeneratePostPrefill = {}) => setGeneratePrefill(prefill);
    const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

    const handleTodo = (todo: HomeTodo) => {
        switch (todo.target) {
            case 'GENERATE_POST':
                openGenerator(prefillFromTodo(todo));
                break;
            case 'OPEN_URL':
                if (todo.url) openExternal(todo.url);
                break;
            case 'OPEN_AREA':
                setUrlState({ tab: 'konkurencja', view: 'okolica' });
                break;
            case 'OPEN_ADS':
                setUrlState({ tab: 'konkurencja', view: 'reklamy' });
                break;
            case 'OPEN_COMPETITION':
                setUrlState({ tab: 'konkurencja', view: 'profile' });
                break;
            case 'OPEN_PROFILES':
                setDrawerOpen(true);
                break;
            case 'CONNECT':
            case 'OPEN_GOOGLE':
                setUrlState({ tab: 'moj' });
                break;
            case 'OPEN_LEADS':
                navigate('/leads');
                break;
        }
    };

    const handleMarket = (event: HomeMarketEvent) => {
        if (event.target === 'OPEN_ADS') setUrlState({ tab: 'konkurencja', view: 'reklamy' });
        else if (event.target === 'OPEN_AREA') setUrlState({ tab: 'konkurencja', view: 'okolica' });
        else if (event.url) openExternal(event.url);
    };

    const openMenuAction = (action: () => void) => () => {
        setMenuOpen(false);
        action();
    };

    const tabBar = (
        <SharedTabBar
            tabs={isDesktop ? TABS : MOBILE_TABS}
            activeKey={tab}
            onChange={key => setUrlState({ tab: key })}
            ariaLabel="Zakładki modułu Instagram"
        />
    );

    return (
        <ViewContainer>
            {isDesktop ? (
                <>
                    <PageHeader
                        title="Instagram"
                        subtitle="Twoje konta, konkurencja i pomysły na posty"
                        actions={
                            <>
                                <PageHeaderGhostButton onClick={() => openGenerator()}>
                                    <Sparkles /> Generuj post
                                </PageHeaderGhostButton>
                                <PageHeaderGhostButton onClick={() => setDrawerOpen(true)}>
                                    <Users /> Profile
                                    {pendingCount > 0 && <PendingBadge>{pendingCount}</PendingBadge>}
                                </PageHeaderGhostButton>
                            </>
                        }
                    />
                    {tabBar}
                </>
            ) : (
                <MobileToolbar>
                    {tabBar}
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
                                    <MenuItem type="button" role="menuitem" onClick={openMenuAction(() => openGenerator())}>
                                        <Sparkles /> Generuj post
                                    </MenuItem>
                                    <MenuItem type="button" role="menuitem" onClick={openMenuAction(() => setDrawerOpen(true))}>
                                        <Users /> Profile
                                        {pendingCount > 0 && <MenuBadgeInline>{pendingCount}</MenuBadgeInline>}
                                    </MenuItem>
                                    <MenuItem type="button" role="menuitem" onClick={openMenuAction(() => setAddOpen(true))}>
                                        <Plus /> Dodaj profil
                                    </MenuItem>
                                </MenuDropdown>
                            </>
                        )}
                    </MenuWrap>
                </MobileToolbar>
            )}

            {tab === 'przeglad' && (
                <OverviewTab
                    onTodo={handleTodo}
                    onMarket={handleMarket}
                    onOpenProfiles={() => setDrawerOpen(true)}
                    onOpenAccounts={() => setUrlState({ tab: 'moj' })}
                />
            )}

            {tab === 'moj' && <MyAccountsTab />}

            {tab === 'konkurencja' && (
                <CompetitionTab
                    view={competitionView}
                    days={days}
                    year={year}
                    onChange={next => setUrlState({ view: next.view, days: next.days, year: next.year })}
                    onAddProfile={() => setAddOpen(true)}
                    onOpenAd={setOpenAdId}
                />
            )}

            {tab === 'inspiracje' && <InspirationTab onMakeSimilar={openGenerator} />}

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
            {generatePrefill && (
                <GeneratePostModal prefill={generatePrefill} onClose={() => setGeneratePrefill(null)} />
            )}
        </ViewContainer>
    );
};
