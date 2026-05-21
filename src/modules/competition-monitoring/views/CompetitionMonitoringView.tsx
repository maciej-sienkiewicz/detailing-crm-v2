import { useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAuth } from '@/core/context/AuthContext';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useCompetitionSummary } from '../hooks/useCompetitionSummary';
import { useProfileActions } from '../hooks/useProfileActions';
import { ProfileCard } from '../components/ProfileCard';
import { AddProfileModal } from '../components/AddProfileModal';
import { PostsModal } from '../components/PostsModal';
import { TrendCharts } from '../components/TrendCharts';
import { RankingTable } from '../components/RankingTable';
import { ProfileChipSelector } from '../components/ProfileChipSelector';
import { GeneratePostModal } from '../components/GeneratePostModal';
import { PROFILE_COLORS } from '../types';
import type { InstagramProfile, InstagramProfileStatus, WeeksOption } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    max-width: 1920px;
    margin: 0 auto;
    width: 100%;
    animation: ${fadeUp} 300ms ease both;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: 32px;
    }
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const PageTopRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
`;

const PageSubtitle = styled.p`
    margin: 4px 0 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const ActionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const WeeksBar = styled.div`
    display: inline-flex;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
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
    font-weight: ${p => p.$active ? 700 : 400};
    background: ${p => p.$active ? '#fff' : 'transparent'};
    color: ${p => p.$active ? st.text : st.textMuted};
    box-shadow: ${p => p.$active ? st.shadowXs : 'none'};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover { color: ${p => p.$active ? st.text : st.textSecondary}; }
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    font-size: ${st.fontSm};
    font-weight: 600;
    font-family: inherit;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover { background: #2563eb; transform: translateY(-1px); }
    &:active { transform: none; }
`;

const GenerateButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    font-size: ${st.fontSm};
    font-weight: 600;
    font-family: inherit;
    background: ${st.bgCard};
    color: ${st.textSecondary};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusFull};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }
`;

// ─── Selector + Charts card ────────────────────────────────────────────────────

const SelectorCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const SelectorTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-bottom: 14px;
    border-bottom: 1px solid ${st.border};
    margin-bottom: 16px;
`;

const MaxNote = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

// ─── Info banner ──────────────────────────────────────────────────────────────

const InfoBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: ${st.bgAccentBlue};
    border: 1px solid rgba(59,130,246,0.18);
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

// ─── Panel Card (profiles tab) ────────────────────────────────────────────────

const PanelCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const TabBar = styled.nav`
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid ${st.border};
    background: ${st.bgCard};
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const TabButton = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    padding: 13px 20px;
    font-size: ${st.fontSm};
    font-weight: ${p => p.$active ? 600 : 400};
    cursor: pointer;
    border: none;
    font-family: inherit;
    background: transparent;
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    border-bottom: 2px solid ${p => p.$active ? st.accentBlue : 'transparent'};
    margin-bottom: -1px;
    transition: color ${st.transition}, border-color ${st.transition};
    display: flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;

    &:hover { color: ${p => p.$active ? st.accentBlue : st.text}; }
`;

const TabBadge = styled.span<{ $active: boolean }>`
    padding: 1px 7px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    background: ${p => p.$active ? st.accentBlueDim : st.bgCardAlt};
    color: ${p => p.$active ? st.accentBlue : st.textMuted};
`;

const TabBadgeAmber = styled.span`
    padding: 1px 7px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    background: rgba(245,158,11,0.12);
    color: #92400e;
`;

// ─── Loading / error states ────────────────────────────────────────────────────

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const ErrorBox = styled.div`
    padding: 48px 32px;
    text-align: center;
    color: #dc2626;
`;

const RetryBtn = styled.button`
    margin-top: 12px;
    padding: 8px 20px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all ${st.transition};
    display: block;
    margin-inline: auto;

    &:hover { background: ${st.accentBlue}; color: #fff; }
`;

const EmptyAnalytics = styled.div`
    text-align: center;
    padding: 72px 32px;
    color: ${st.textMuted};
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
`;

const EmptyTitle = styled.h3`
    margin: 0 0 8px;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const EmptyDesc = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    max-width: 360px;
    margin-inline: auto;
    line-height: 1.6;
`;

// ─── Profile management tab ────────────────────────────────────────────────────

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 16px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
`;

const FilterBtn = styled.button<{ $active: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlueDim : st.bgCard};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};

    &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }
`;

const ProfileList = styled.div`
    display: flex;
    flex-direction: column;
    & > * + * { border-top: 1px solid ${st.border}; }
`;

const ProfileRow = styled.div`
    padding: 8px 16px;
`;

const ListEmpty = styled.div`
    text-align: center;
    padding: 56px 32px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CHART_PROFILES = 4;

const WEEKS_OPTIONS: { value: WeeksOption; label: string }[] = [
    { value: 4,  label: '4 tyg.'  },
    { value: 13, label: '3 mies.' },
    { value: 26, label: '6 mies.' },
    { value: 52, label: 'Rok'     },
];

type MainTab    = 'analytics' | 'profiles';
type FilterType = 'ALL' | InstagramProfileStatus;

const FILTER_LABELS: Record<FilterType, string> = {
    ALL: 'Wszystkie',
    ACTIVE: 'Aktywne',
    PENDING_APPROVAL: 'Oczekujące',
    REJECTED: 'Odrzucone',
};

// ─── View ─────────────────────────────────────────────────────────────────────

export const CompetitionMonitoringView = () => {
    const { user } = useAuth();

    const [weeks, setWeeks]                         = useState<WeeksOption>(13);
    const [activeTab, setActiveTab]                 = useState<MainTab>('analytics');
    const [isAddModalOpen, setIsAddModalOpen]       = useState(false);
    const [isGenerateOpen, setIsGenerateOpen]       = useState(false);
    const [selectedProfile, setSelectedProfile]     = useState<InstagramProfile | null>(null);
    const [activeFilter, setActiveFilter]           = useState<FilterType>('ALL');
    const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());

    const { profiles, isLoading: pLoading, isError: pError, refetch: refetchProfiles } = useInstagramProfiles();
    const { summaries, isLoading: sLoading, isError: sError, refetch: refetchSummary }  = useCompetitionSummary(weeks);
    const { approveProfile, isApproving, rejectProfile, isRejecting, removeProfile, isRemoving } = useProfileActions();

    const isManagerOrOwner = user?.role === 'MANAGER' || user?.role === 'OWNER';
    const pendingCount     = profiles.filter(p => p.status === 'PENDING_APPROVAL').length;
    const activeCount      = summaries.length;

    // Assign stable colors per profile id
    const colorMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        summaries.forEach((p, i) => { map[p.id] = PROFILE_COLORS[i % PROFILE_COLORS.length]; });
        return map;
    }, [summaries]);

    // Auto-select first MAX_CHART_PROFILES on first load
    useMemo(() => {
        if (summaries.length > 0 && selectedIds.size === 0) {
            setSelectedIds(new Set(summaries.slice(0, MAX_CHART_PROFILES).map(p => p.id)));
        }
    }, [summaries]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleId = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    }, []);

    const selectedProfiles = useMemo(
        () => summaries.filter(p => selectedIds.has(p.id)),
        [summaries, selectedIds]
    );

    const filteredManagement = activeFilter === 'ALL'
        ? profiles
        : profiles.filter(p => p.status === activeFilter);

    // ─── Analytics content ────────────────────────────────────────────────────

    const renderAnalytics = () => {
        if (sLoading) return <LoadingOverlay><Spinner /></LoadingOverlay>;

        if (sError) return (
            <ErrorBox>
                <p>Nie udało się załadować danych analitycznych.</p>
                <RetryBtn onClick={() => refetchSummary()}>Spróbuj ponownie</RetryBtn>
            </ErrorBox>
        );

        if (summaries.length === 0) return (
            <EmptyAnalytics>
                <EmptyIcon>📊</EmptyIcon>
                <EmptyTitle>Brak danych do analizy</EmptyTitle>
                <EmptyDesc>
                    Dodaj aktywne profile i poczekaj na pierwszą niedzielną synchronizację, aby zobaczyć rankingi i trendy.
                </EmptyDesc>
            </EmptyAnalytics>
        );

        return null;
    };

    const analyticsEmpty = renderAnalytics();

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <ViewContainer>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <PageTopRow>
                <div>
                    <PageTitle>Analityka Instagram</PageTitle>
                    <PageSubtitle>Obserwuj i porównuj profile konkurentów</PageSubtitle>
                </div>
                <ActionRow>
                    <WeeksBar>
                        {WEEKS_OPTIONS.map(o => (
                            <WeeksBtn key={o.value} $active={weeks === o.value} onClick={() => setWeeks(o.value)}>
                                {o.label}
                            </WeeksBtn>
                        ))}
                    </WeeksBar>
                    <GenerateButton onClick={() => setIsGenerateOpen(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        Generuj post
                    </GenerateButton>
                    <AddButton onClick={() => setIsAddModalOpen(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Dodaj profil
                    </AddButton>
                </ActionRow>
            </PageTopRow>

            {/* ── Pending banner ───────────────────────────────────────────── */}
            {pendingCount > 0 && isManagerOrOwner && (
                <InfoBanner>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.accentBlue} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {pendingCount} {pendingCount === 1 ? 'profil oczekuje' : 'profile oczekują'} na akceptację.
                    Przejdź do zakładki <strong style={{ marginInline: 4 }}>Profile</strong>, aby je zatwierdzić.
                </InfoBanner>
            )}

            {/* ── Main tabs ────────────────────────────────────────────────── */}
            <PanelCard>
                <TabBar>
                    <TabButton $active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Analityka
                        {activeCount > 0 && <TabBadge $active={activeTab === 'analytics'}>{activeCount}</TabBadge>}
                    </TabButton>
                    <TabButton $active={activeTab === 'profiles'} onClick={() => setActiveTab('profiles')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Profile
                        {profiles.length > 0 && <TabBadge $active={activeTab === 'profiles'}>{profiles.length}</TabBadge>}
                        {pendingCount > 0 && <TabBadgeAmber>{pendingCount}</TabBadgeAmber>}
                    </TabButton>
                </TabBar>

                {/* Analytics tab */}
                {activeTab === 'analytics' && (
                    analyticsEmpty ?? (
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Profile chip selector */}
                            <SelectorCard>
                                <SelectorTop>
                                    <ProfileChipSelector
                                        profiles={summaries}
                                        selectedIds={selectedIds}
                                        colorMap={colorMap}
                                        onToggle={toggleId}
                                        maxSelected={MAX_CHART_PROFILES}
                                    />
                                    <MaxNote>Maks. {MAX_CHART_PROFILES} profile na wykresie</MaxNote>
                                </SelectorTop>

                                {/* Charts with 4 tabs */}
                                <TrendCharts
                                    profiles={selectedProfiles}
                                    colorMap={colorMap}
                                />
                            </SelectorCard>

                            {/* Ranking table — all profiles */}
                            <RankingTable
                                profiles={summaries}
                                colorMap={colorMap}
                                selectedIds={selectedIds}
                                onToggle={toggleId}
                            />
                        </div>
                    )
                )}

                {/* Profiles management tab */}
                {activeTab === 'profiles' && (
                    pLoading ? <LoadingOverlay><Spinner /></LoadingOverlay>
                    : pError  ? (
                        <ErrorBox>
                            <p>Nie udało się załadować listy profili.</p>
                            <RetryBtn onClick={() => refetchProfiles()}>Spróbuj ponownie</RetryBtn>
                        </ErrorBox>
                    ) : (
                        <>
                            {profiles.length > 0 && (
                                <FilterBar>
                                    {(Object.keys(FILTER_LABELS) as FilterType[]).map(key => (
                                        <FilterBtn key={key} $active={activeFilter === key} onClick={() => setActiveFilter(key)}>
                                            {FILTER_LABELS[key]} · {key === 'ALL' ? profiles.length : profiles.filter(p => p.status === key).length}
                                        </FilterBtn>
                                    ))}
                                </FilterBar>
                            )}
                            {filteredManagement.length === 0 ? (
                                <ListEmpty>
                                    {profiles.length === 0
                                        ? 'Brak obserwowanych profili. Kliknij „Dodaj profil", aby zacząć.'
                                        : 'Brak profili w tej kategorii.'}
                                </ListEmpty>
                            ) : (
                                <ProfileList>
                                    {filteredManagement.map(profile => (
                                        <ProfileRow key={profile.id}>
                                            <ProfileCard
                                                profile={profile}
                                                isManagerOrOwner={isManagerOrOwner}
                                                isApproving={isApproving}
                                                isRejecting={isRejecting}
                                                isRemoving={isRemoving}
                                                onApprove={approveProfile}
                                                onReject={rejectProfile}
                                                onRemove={removeProfile}
                                                onViewPosts={(p) => setSelectedProfile(p)}
                                            />
                                        </ProfileRow>
                                    ))}
                                </ProfileList>
                            )}
                        </>
                    )
                )}
            </PanelCard>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            <AddProfileModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            {selectedProfile && <PostsModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
            {isGenerateOpen  && <GeneratePostModal onClose={() => setIsGenerateOpen(false)} />}
        </ViewContainer>
    );
};
