import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Plus, Sparkles, Users } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    PageHeader,
    PageHeaderGhostButton,
    PageHeaderPrimaryButton,
} from '@/common/components/PageHeader/PageHeader';
import { useOverview, useBenchmark, useDigest } from '../hooks/useAnalytics';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { WeekTab } from '../components/WeekTab';
import { BenchmarkTab } from '../components/BenchmarkTab';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { ContentTab } from '../components/ContentTab';
import { ProfilesDrawer } from '../components/ProfilesDrawer';
import { AddProfileModal } from '../components/AddProfileModal';
import { GeneratePostModal } from '../components/GeneratePostModal';
import { CenterState, Spinner } from '../components/MetricBits';
import { WEEKS_OPTIONS, type WeeksOption } from '../types';

/**
 * Analiza konkurencji na Instagramie, trzy zakładki:
 *   Tydzień:    co zrobił każdy obserwowany profil w tym tygodniu (domyślna),
 *   Porównanie: tabela benchmarkowa + 2 wykresy z adnotacjami,
 *   Treści:     najskuteczniejsze posty, pory publikacji, hasztagi.
 *
 * Było ich cztery: „Przegląd" i „Raport" pokazywały te same insighty, te same
 * trzy metryki i tę samą pozycję w rankingu, tylko w innym układzie graficznym —
 * a raport dodatkowo dotyczył zamkniętego tygodnia, więc przez siedem dni
 * wyświetlał dane sprzed tygodnia i wymagał akapitu tłumaczącego dlaczego.
 *
 * Stan (zakładka, okres) trzymany w URL, widoki są linkowalne.
 */

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    animation: ${fadeUp} 300ms ease both;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: 32px;
    }
`;

const WeeksBar = styled.div`
    display: inline-flex;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: ${st.radiusFull};
    padding: 3px;
    gap: 2px;
`;

const WeeksBtn = styled.button<{ $active: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    border: none;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 400)};
    background: ${p => (p.$active ? 'rgba(255,255,255,0.14)' : 'transparent')};
    color: ${p => (p.$active ? '#f1f5f9' : '#64748b')};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover { color: ${p => (p.$active ? '#f1f5f9' : '#94a3b8')}; }
`;

const TabBar = styled.nav`
    display: flex;
    gap: 6px;
    border-bottom: 1px solid ${st.border};
`;

const TabBtn = styled.button<{ $active: boolean }>`
    padding: 10px 18px;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: ${st.fontMd};
    font-weight: ${p => (p.$active ? 700 : 500)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
    border-bottom: 2px solid ${p => (p.$active ? st.accentBlue : 'transparent')};
    margin-bottom: -1px;
    cursor: pointer;
    transition: color ${st.transition};
    display: inline-flex;
    align-items: center;
    gap: 7px;

    &:hover { color: ${p => (p.$active ? st.accentBlue : st.text)}; }
`;

const PendingBadge = styled.span`
    background: ${st.accentAmber};
    color: #fff;
    font-size: ${st.fontXs};
    font-weight: 700;
    border-radius: ${st.radiusFull};
    padding: 1px 7px;
`;

type TabKey = 'tydzien' | 'porownanie' | 'tresci';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'tydzien', label: 'Tydzień' },
    { key: 'porownanie', label: 'Porównanie' },
    { key: 'tresci', label: 'Treści' },
];

/**
 * Stare linki („Przegląd" i „Raport" zniknęły) lądują na Tygodniu zamiast
 * na pustym ekranie — obie zakładki i tak mówiły to, co on.
 */
const resolveTab = (raw: string | null): TabKey =>
    TABS.some(t => t.key === raw) ? (raw as TabKey) : 'tydzien';

export const CompetitionMonitoringView = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const tab = resolveTab(searchParams.get('widok'));
    const weeksParam = Number(searchParams.get('okres'));
    const weeks: WeeksOption = ([4, 12, 26, 52] as const).includes(weeksParam as WeeksOption)
        ? (weeksParam as WeeksOption)
        : 12;

    const setUrlState = useCallback(
        (next: { tab?: TabKey; weeks?: WeeksOption }) => {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                if (next.tab) params.set('widok', next.tab);
                if (next.weeks) params.set('okres', String(next.weeks));
                return params;
            }, { replace: true });
        },
        [setSearchParams]
    );

    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [isAddOpen, setAddOpen] = useState(false);
    const [isGenerateOpen, setGenerateOpen] = useState(false);

    // Overview zostaje wyłącznie dla paska synchronizacji nad zakładkami.
    const overviewQuery = useOverview(weeks);
    const digestQuery = useDigest(tab === 'tydzien');
    const benchmarkQuery = useBenchmark(weeks, tab === 'porownanie');
    const { profiles } = useInstagramProfiles();
    const pendingCount = profiles.filter(p => p.status === 'PENDING_APPROVAL').length;

    return (
        <ViewContainer>
            <PageHeader
                title="Konkurencja na Instagramie"
                subtitle="Co robi konkurencja, co u niej działa i co możesz z tym zrobić"
                actions={
                    <>
                        <WeeksBar>
                            {WEEKS_OPTIONS.map(option => (
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

            {overviewQuery.data && (
                <SyncStatusBar
                    lastSyncAt={overviewQuery.data.lastSyncAt}
                    nextDailySyncAt={overviewQuery.data.nextDailySyncAt}
                    nextDeepSyncAt={overviewQuery.data.nextDeepSyncAt}
                />
            )}

            <TabBar>
                {TABS.map(item => (
                    <TabBtn
                        key={item.key}
                        $active={tab === item.key}
                        onClick={() => setUrlState({ tab: item.key })}
                    >
                        {item.label}
                    </TabBtn>
                ))}
            </TabBar>

            {tab === 'tydzien' && (
                digestQuery.isLoading ? (
                    <CenterState><Spinner /></CenterState>
                ) : digestQuery.isError ? (
                    <CenterState>
                        <strong>Nie udało się pobrać danych</strong>
                        <span>Spróbuj odświeżyć stronę, jeśli problem wraca, daj nam znać.</span>
                    </CenterState>
                ) : (
                    <WeekTab digest={digestQuery.data ?? null} />
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
