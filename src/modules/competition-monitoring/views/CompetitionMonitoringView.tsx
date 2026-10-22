import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { Camera, Lightbulb, LayoutDashboard, MoreHorizontal, Plus, Sparkles, UserRound, Users } from 'lucide-react';
import { PageContainer, pageGutter } from '@/common/components/PageContainer';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader/PageHeader';
import { MobilePageHeader, MobilePageHeaderCountValue, MobilePageHeaderIconButton } from '@/common/components/PageHeader';
import { TabBar as SharedTabBar, type TabDefinition } from '@/common/components/TabBar/TabBar';
import { ActionMenu, MenuItem, ui, useActionMenu } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { pluralPl } from '@/common/utils/plural';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { OverviewTab } from '../components/overview/OverviewTab';
import { CompetitionTab } from '../components/competition/CompetitionTab';
import { InspirationTab } from '../components/inspiration/InspirationTab';
import { MyAccountsTab } from '../components/accounts/MyAccountsTab';
import { AdDetailModal } from '../components/AdDetailModal';
import { ProfilesDrawer } from '../components/ProfilesDrawer';
import { AddProfileModal, type AddProfileMode } from '../components/AddProfileModal';
import { GeneratePostModal, type GeneratePostPrefill } from '../components/GeneratePostModal';
import type { CompetitionDays, HomeMarketEvent, HomeTodo } from '../types';
import { isCompetitionView, resolveLegacyUrl, type CompetitionView } from '../utils/moduleUrl';
import { prefillFromTodo } from '../utils/overview';
import { PHONE } from '../utils/phone';
import { openInNewTab } from '@/common/utils/safeUrl';

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

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const ViewContainer = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: ${fadeUp} 300ms ease both;

    /* Na telefonie wejście bez przesunięcia. Animacja z transform i fill-mode both
       zostawia na kontenerze transform na stałe, a wtedy position: fixed w środku liczy
       się od kontenera, nie od ekranu: tło menu miało 1587 px wysokości przy ekranie
       866 px, a przypięty pasek zakładek odjeżdżałby razem z treścią. Ten sam błąd
       opisuje VisitDetailView. */
    ${PHONE} {
        gap: 16px;
        animation-name: ${fadeIn};
    }
`;

const PendingBadge = styled.span`
    background: ${st.accentAmber};
    color: #fff;
    font-size: ${st.fontXs};
    font-weight: 700;
    border-radius: ${st.radiusFull};
    padding: 1px 7px;
`;

// ─── Telefon: nagłówek modułu i zakładki ──────────────────────────────────────
//
// Wcześniej na telefonie był sam pasek zakładek z menu ⋯ obok: bez nazwy modułu (a w dolnym
// menu Instagrama nie ma, więc nie było wiadomo, gdzie się jest), z czwartą zakładką za
// krawędzią ekranu (Inspiracje nie istniały dla kogoś, kto nie wiedział, że pasek się
// przewija) i z dwiema kreskami 10 px od siebie. Teraz układ jak w pozostałych modułach
// mobilnych (ScheduledCommunicationView): karta nagłówka, a pod nią zakładki na całą szerokość.

const MobileTop = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

/** Przycisk akcji w karcie nagłówka: wygląd jak MobilePageHeaderIconButton, cel dotyku 44 px. */
const HeaderIconButton = styled(MobilePageHeaderIconButton)`
    position: relative;

    &::after {
        content: '';
        position: absolute;
        inset: -3px;
    }

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

/**
 * „Generuj" z napisem, nie samą ikoną: iskierki nic nie mówią komuś, kto nie zna
 * modułu, a to najczęstsza akcja. Odcień marki bez wypełnienia - wypełniony jest
 * w oknie krok następny (CLAUDE.md §2), np. „Otwórz rozmowy" w Przeglądzie.
 */
const HeaderGenerateButton = styled.button`
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 14px 0 12px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${ui.brandLineSoft};
    background: ${ui.brandTint};
    color: ${ui.brandInk};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms ease;

    svg { width: 16px; height: 16px; }

    &::after {
        content: '';
        position: absolute;
        inset: -3px 0;
    }

    &:active { background: ${ui.brandTintHover}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

/** Liczba profili do akceptacji na ⋯ - jedyny ślad, że w menu coś czeka. */
const MenuBadge = styled.span`
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: ${ui.radiusPill};
    background: ${st.accentAmber};
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid ${ui.surface};
`;

const MenuCount = styled.span`
    margin-left: auto;
    padding: 1px 8px;
    border-radius: ${ui.radiusPill};
    background: ${st.accentAmber};
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
`;

/**
 * Miejsce zakładek w układzie strony. Trzyma wysokość paska, gdy ten przypina się
 * do góry ekranu - bez tego treść podskakiwałaby o wysokość paska w chwili przypięcia.
 */
const TabsSlot = styled.div`
    min-width: 0;
`;

const dockIn = keyframes`
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
`;

/**
 * Zakładki na telefonie: wszystkie cztery widoczne naraz. Przy 360 px zajmują ok. 300 px
 * z 328 px, więc rosną do szerokości ekranu zamiast stać przy lewej krawędzi.
 *
 * Po przewinięciu za zakładki pasek przypina się do góry ekranu: „Konta" mają kilka
 * ekranów, „Inspiracje" kilkanaście, a powrót na górę tylko po to, żeby zmienić zakładkę,
 * był najczęstszym ruchem kciuka w tym module. `position: sticky` tu nie działa - kontener
 * układu aplikacji ma `overflow-x: hidden` i to on, a nie dokument, jest dla sticky
 * przewijanym rodzicem. Zmiana tego w powłoce przestawiłaby sticky w całej aplikacji,
 * więc przypinamy sam ten pasek.
 */
const TabsDock = styled.div<{ $docked: boolean }>`
    > nav { gap: 0; }

    > nav > button {
        flex: 1 1 auto;
        justify-content: center;
        min-width: 0;
        padding: 11px 6px;
        font-size: 14px;
    }

    ${p => p.$docked && css`
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 90;
        padding-top: calc(env(safe-area-inset-top, 0px) + 4px);
        ${pageGutter}
        background: rgba(238, 242, 247, 0.94);
        backdrop-filter: blur(14px) saturate(1.4);
        -webkit-backdrop-filter: blur(14px) saturate(1.4);
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        animation: ${dockIn} 160ms ease-out;

        @media (prefers-reduced-motion: reduce) { animation: none; }
    `}
`;

// ─── Zakładki ─────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'mine' | 'competition' | 'inspiration';

const TABS: ReadonlyArray<TabDefinition<TabKey>> = [
    { key: 'overview', label: 'Przegląd', icon: <LayoutDashboard size={14} /> },
    { key: 'mine', label: 'Moje konta', icon: <UserRound size={14} /> },
    { key: 'competition', label: 'Konkurencja', icon: <Users size={14} /> },
    { key: 'inspiration', label: 'Inspiracje', icon: <Lightbulb size={14} /> },
];

/**
 * Na telefonie zakładki bez ikon i z krótszą „Konta": z ikonami i pełną „Moje konta"
 * cztery zakładki potrzebują ok. 430 px, a ekran telefonu ma 360-412 px.
 */
const MOBILE_TABS: ReadonlyArray<TabDefinition<TabKey>> = TABS.map(({ key, label }) => ({
    key,
    label: key === 'mine' ? 'Konta' : label,
}));

const resolveTab = (raw: string | null): TabKey =>
    TABS.some(t => t.key === raw) ? (raw as TabKey) : 'overview';

/** Biblioteka reklam Meta trzyma rok historii - dwa lata to wszystko, co da się pokazać. */
const AD_YEARS = 2;

/**
 * Przypięcie paska zakładek na telefonie: prawda, gdy miejsce zakładek wyjechało za górną
 * krawędź ekranu. Liczone przy przewijaniu (passive, w klatce animacji), a nie przez
 * IntersectionObserver - potrzebna jest strona, po której zakładki zniknęły, nie samo „widać/nie".
 */
function useDockedTabs(slotRef: RefObject<HTMLDivElement | null>, enabled: boolean): boolean {
    const [docked, setDocked] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let frame = 0;
        const check = () => {
            frame = 0;
            const slot = slotRef.current;
            if (slot) setDocked(slot.getBoundingClientRect().top < 0);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(check);
        };
        // Widok mógł się otworzyć już przewinięty (powrót z innej karty) - pierwszy pomiar od razu.
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [slotRef, enabled]);

    // Na desktopie (albo po obrocie do szerokości desktopu) nic się nie przypina.
    return enabled && docked;
}

export const CompetitionMonitoringView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const isDesktop = useBreakpoint('md');
    const moreMenu = useActionMenu();

    // Stare adresy (powiadomienia, zakładki przeglądarki, podpowiedzi z Tablicy) → nowe.
    useEffect(() => {
        const next = resolveLegacyUrl(searchParams);
        if (next) setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const tab = resolveTab(searchParams.get('view'));
    const viewParam = searchParams.get('show');
    const competitionView: CompetitionView = isCompetitionView(viewParam) ? viewParam : 'profiles';
    const days: CompetitionDays = searchParams.get('period') === '365' ? 365 : 90;

    const currentYear = new Date().getFullYear();
    const yearParam = Number(searchParams.get('year'));
    const year = Number.isInteger(yearParam) && yearParam > currentYear - AD_YEARS && yearParam <= currentYear
        ? yearParam
        : currentYear;

    const setUrlState = useCallback(
        (next: { tab?: TabKey; view?: CompetitionView; days?: CompetitionDays; year?: number }) => {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                if (next.tab) params.set('view', next.tab);
                if (next.view) params.set('show', next.view);
                if (next.days) params.set('period', String(next.days));
                if (next.year) params.set('year', String(next.year));
                // Widok i okres dotyczą wyłącznie Konkurencji - na innych zakładkach to szum w adresie.
                if (next.tab && next.tab !== 'competition') {
                    params.delete('show');
                    params.delete('period');
                    params.delete('year');
                }
                return params;
            }, { replace: true });
        },
        [setSearchParams]
    );

    const [openAdId, setOpenAdId] = useState<string | null>(null);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [addMode, setAddMode] = useState<AddProfileMode | null>(null);
    const [generatePrefill, setGeneratePrefill] = useState<GeneratePostPrefill | null>(null);

    const { profiles } = useInstagramProfiles();
    const pendingCount = profiles.filter(p => p.status === 'PENDING_APPROVAL').length;

    const slotRef = useRef<HTMLDivElement>(null);
    const docked = useDockedTabs(slotRef, !isDesktop);
    const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

    // Wysokość miejsca mierzymy, póki pasek stoi w układzie; przypięty trzyma ją jako odstęp.
    useLayoutEffect(() => {
        if (!docked && slotRef.current) setSlotHeight(slotRef.current.offsetHeight);
    }, [docked, isDesktop]);

    const openGenerator = (prefill: GeneratePostPrefill = {}) => setGeneratePrefill(prefill);
    const openExternal = (url: string) => openInNewTab(url);

    const handleTodo = (todo: HomeTodo) => {
        switch (todo.target) {
            case 'GENERATE_POST':
                openGenerator(prefillFromTodo(todo));
                break;
            case 'OPEN_URL':
                if (todo.url) openExternal(todo.url);
                break;
            case 'OPEN_AREA':
                setUrlState({ tab: 'competition', view: 'area' });
                break;
            case 'OPEN_ADS':
                setUrlState({ tab: 'competition', view: 'ads' });
                break;
            case 'OPEN_COMPETITION':
                setUrlState({ tab: 'competition', view: 'profiles' });
                break;
            case 'OPEN_PROFILES':
                setDrawerOpen(true);
                break;
            case 'CONNECT':
            case 'OPEN_GOOGLE':
                setUrlState({ tab: 'mine' });
                break;
            case 'OPEN_LEADS':
                navigate('/leads');
                break;
        }
    };

    const handleMarket = (event: HomeMarketEvent) => {
        if (event.target === 'OPEN_ADS') setUrlState({ tab: 'competition', view: 'ads' });
        else if (event.target === 'OPEN_AREA') setUrlState({ tab: 'competition', view: 'area' });
        else if (event.url) openExternal(event.url);
    };

    const changeTab = (key: TabKey) => {
        setUrlState({ tab: key });
        // Zakładka zmieniona z przypiętego paska: nowa treść ma zaczynać się od góry, a nie
        // w połowie (albo za końcem) strony, na której pasek akurat był.
        if (docked && slotRef.current) {
            window.scrollTo({ top: slotRef.current.getBoundingClientRect().top + window.scrollY });
        }
    };

    const tabBar = (
        <SharedTabBar
            tabs={isDesktop ? TABS : MOBILE_TABS}
            activeKey={tab}
            onChange={isDesktop ? key => setUrlState({ tab: key }) : changeTab}
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
                <MobileTop>
                    <MobilePageHeader
                        icon={<Camera />}
                        title="Instagram"
                        // Podpis tylko, gdy coś czeka: stały opis modułu mieścił się przy 360 px
                        // jako „Konta i konk…" obok „Generuj" i ⋯, a ucięty podpis wygląda na błąd.
                        subtitle={pendingCount > 0
                            ? <><MobilePageHeaderCountValue>{pendingCount}</MobilePageHeaderCountValue> do akceptacji</>
                            : undefined}
                        actions={
                            <>
                                <HeaderGenerateButton type="button" onClick={() => openGenerator()}>
                                    <Sparkles aria-hidden="true" /> Generuj
                                </HeaderGenerateButton>
                                <HeaderIconButton
                                    type="button"
                                    aria-label={pendingCount > 0
                                        ? `Więcej akcji, ${pendingCount} ${pluralPl(pendingCount, 'profil czeka', 'profile czekają', 'profili czeka')} na akceptację`
                                        : 'Więcej akcji'}
                                    aria-haspopup="menu"
                                    aria-expanded={moreMenu.isOpen()}
                                    onClick={e => moreMenu.toggle(e, null)}
                                >
                                    <MoreHorizontal />
                                    {pendingCount > 0 && <MenuBadge aria-hidden="true">{pendingCount}</MenuBadge>}
                                </HeaderIconButton>
                            </>
                        }
                    />
                    <TabsSlot ref={slotRef} style={docked ? { height: slotHeight } : undefined}>
                        <TabsDock $docked={docked}>{tabBar}</TabsDock>
                    </TabsSlot>
                    <ActionMenu anchor={moreMenu.menu?.anchor ?? null} onClose={moreMenu.close} label="Więcej akcji">
                        <MenuItem icon={<Users />} onClick={() => setDrawerOpen(true)}>
                            Obserwowane profile
                            {pendingCount > 0 && <MenuCount aria-label={`${pendingCount} do akceptacji`}>{pendingCount}</MenuCount>}
                        </MenuItem>
                        <MenuItem icon={<Plus />} onClick={() => setAddMode('competitor')}>
                            Dodaj konkurenta
                        </MenuItem>
                    </ActionMenu>
                </MobileTop>
            )}

            {tab === 'overview' && (
                <OverviewTab
                    onTodo={handleTodo}
                    onPickVisit={() => openGenerator({ pickVisit: true })}
                    onMarket={handleMarket}
                    onOpenProfiles={() => setDrawerOpen(true)}
                    onOpenAccounts={() => setUrlState({ tab: 'mine' })}
                />
            )}

            {tab === 'mine' && <MyAccountsTab />}

            {tab === 'competition' && (
                <CompetitionTab
                    view={competitionView}
                    days={days}
                    year={year}
                    onChange={next => setUrlState({ view: next.view, days: next.days, year: next.year })}
                    onAddProfile={() => setAddMode('competitor')}
                    onOpenAd={setOpenAdId}
                />
            )}

            {tab === 'inspiration' && <InspirationTab onMakeSimilar={openGenerator} />}

            {openAdId && <AdDetailModal adId={openAdId} onClose={() => setOpenAdId(null)} />}

            <ProfilesDrawer
                open={isDrawerOpen}
                onClose={() => setDrawerOpen(false)}
                onAddProfile={() => {
                    setDrawerOpen(false);
                    setAddMode('competitor');
                }}
                onAddSelf={() => {
                    setDrawerOpen(false);
                    setAddMode('self');
                }}
            />
            <AddProfileModal isOpen={addMode !== null} mode={addMode ?? 'competitor'} onClose={() => setAddMode(null)} />
            {generatePrefill && (
                <GeneratePostModal prefill={generatePrefill} onClose={() => setGeneratePrefill(null)} />
            )}
        </ViewContainer>
    );
};
