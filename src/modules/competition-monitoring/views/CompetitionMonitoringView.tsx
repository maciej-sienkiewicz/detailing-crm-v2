import { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAuth } from '@/core/context/AuthContext';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useCompetitionSummary } from '../hooks/useCompetitionSummary';
import { useProfileActions } from '../hooks/useProfileActions';
import { ProfileCard } from '../components/ProfileCard';
import { AddProfileModal } from '../components/AddProfileModal';
import { PostsModal } from '../components/PostsModal';
import { CompetitionRanking } from '../components/CompetitionRanking';
import { EngagementTrendChart } from '../components/EngagementTrendChart';
import type { InstagramProfile, InstagramProfileStatus } from '../types';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};
    animation: ${fadeIn} 280ms ease both;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 32px;
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: 40px 48px;
    }
`;

const ViewHeader = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const TitleSection = styled.div`
    flex: 1;
    min-width: 0;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    line-height: 1.2;
`;

const PageMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    flex-wrap: wrap;
`;

const PageSubtitle = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const CountChip = styled.span<{ $color?: string; $bg?: string }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    background: ${p => p.$bg ?? st.accentBlueDim};
    color: ${p => p.$color ?? st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1px;
`;

const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all ${st.transition};
    box-shadow: 0 1px 4px rgba(59, 130, 246, 0.25);

    &:hover {
        background: #2563EB;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
    }

    &:active {
        transform: translateY(0);
    }
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabBar = styled.nav`
    display: flex;
    gap: 0;
    border-bottom: 2px solid ${st.border};
`;

const TabButton = styled.button<{ $active: boolean }>`
    padding: 10px 20px;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: transparent;
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    border-bottom: 2px solid ${p => p.$active ? st.accentBlue : 'transparent'};
    margin-bottom: -2px;
    transition: all ${st.transition};
    display: flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;

    &:hover {
        color: ${st.accentBlue};
    }
`;

const TabBadge = styled.span<{ $active: boolean }>`
    padding: 1px 7px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    background: ${p => p.$active ? st.accentBlueDim : st.bgCardAlt};
    color: ${p => p.$active ? st.accentBlue : st.textMuted};
    transition: all ${st.transition};
`;

// ─── Analytics tab ────────────────────────────────────────────────────────────

const AnalyticsSection = styled.section`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

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

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ErrorContainer = styled.div`
    padding: 48px 32px;
    text-align: center;
    color: ${st.accentRed};
`;

const RetryButton = styled.button`
    margin-top: 12px;
    padding: 8px 20px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    display: block;
    margin-inline: auto;

    &:hover {
        background: ${st.accentBlue};
        color: #fff;
    }
`;

const EmptyAnalytics = styled.div`
    text-align: center;
    padding: 72px 32px;
    color: ${st.textMuted};
`;

const EmptyIcon = styled.div`
    font-size: 52px;
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

// ─── Management tab ───────────────────────────────────────────────────────────

const ContentSection = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 20px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
`;

const FilterBtn = styled.button<{ $active: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlueDim : st.bgCard};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

const ProfileList = styled.div`
    display: flex;
    flex-direction: column;

    & > * + * {
        border-top: 1px solid ${st.border};
    }
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

const InfoBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: ${st.bgAccentBlue};
    border: 1px solid rgba(59, 130, 246, 0.18);
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'analytics' | 'profiles';
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
    const { profiles, isLoading: profilesLoading, isError: profilesError, refetch: refetchProfiles } = useInstagramProfiles();
    const { summaries, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useCompetitionSummary();
    const { approveProfile, isApproving, rejectProfile, isRejecting, removeProfile, isRemoving } =
        useProfileActions();

    const [activeTab, setActiveTab] = useState<Tab>('analytics');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<InstagramProfile | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

    const isManagerOrOwner = user?.role === 'MANAGER' || user?.role === 'OWNER';

    const filtered = activeFilter === 'ALL'
        ? profiles
        : profiles.filter(p => p.status === activeFilter);

    const pendingCount = profiles.filter(p => p.status === 'PENDING_APPROVAL').length;
    const activeCount = profiles.filter(p => p.status === 'ACTIVE').length;

    const handleViewPosts = useCallback((profile: InstagramProfile) => {
        setSelectedProfile(profile);
    }, []);

    const handleClosePosts = useCallback(() => {
        setSelectedProfile(null);
    }, []);

    // ─── Analytics tab content ────────────────────────────────────────────────

    const renderAnalytics = () => {
        if (summaryLoading) {
            return <LoadingOverlay><Spinner /></LoadingOverlay>;
        }

        if (summaryError) {
            return (
                <ErrorContainer>
                    <p>Nie udało się załadować danych analitycznych.</p>
                    <RetryButton onClick={() => refetchSummary()}>Spróbuj ponownie</RetryButton>
                </ErrorContainer>
            );
        }

        if (summaries.length === 0) {
            return (
                <EmptyAnalytics>
                    <EmptyIcon>📊</EmptyIcon>
                    <EmptyTitle>Brak danych do analizy</EmptyTitle>
                    <EmptyDesc>
                        Dodaj aktywne profile konkurentów i poczekaj na pierwszą niedzielną synchronizację, aby zobaczyć ranking i trendy.
                    </EmptyDesc>
                </EmptyAnalytics>
            );
        }

        return (
            <AnalyticsSection>
                <CompetitionRanking summaries={summaries} />
                <EngagementTrendChart summaries={summaries} />
            </AnalyticsSection>
        );
    };

    // ─── Profiles tab content ─────────────────────────────────────────────────

    const renderProfiles = () => {
        if (profilesLoading) {
            return <LoadingOverlay><Spinner /></LoadingOverlay>;
        }

        if (profilesError) {
            return (
                <ErrorContainer>
                    <p>Nie udało się załadować listy profili.</p>
                    <RetryButton onClick={() => refetchProfiles()}>Spróbuj ponownie</RetryButton>
                </ErrorContainer>
            );
        }

        return (
            <ContentSection>
                {profiles.length > 0 && (
                    <FilterBar>
                        {(Object.keys(FILTER_LABELS) as FilterType[]).map(key => (
                            <FilterBtn
                                key={key}
                                $active={activeFilter === key}
                                onClick={() => setActiveFilter(key)}
                            >
                                {FILTER_LABELS[key]}
                                {' · '}
                                {key === 'ALL'
                                    ? profiles.length
                                    : profiles.filter(p => p.status === key).length}
                            </FilterBtn>
                        ))}
                    </FilterBar>
                )}

                {filtered.length === 0 ? (
                    <ListEmpty>
                        {profiles.length === 0
                            ? 'Brak obserwowanych profili. Kliknij „Dodaj profil", aby zacząć.'
                            : 'Brak profili w tej kategorii.'}
                    </ListEmpty>
                ) : (
                    <ProfileList>
                        {filtered.map(profile => (
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
                                    onViewPosts={handleViewPosts}
                                />
                            </ProfileRow>
                        ))}
                    </ProfileList>
                )}
            </ContentSection>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Monitoring Konkurencji</PageTitle>
                    <PageMeta>
                        <PageSubtitle>Obserwuj i analizuj profile Instagram konkurentów</PageSubtitle>
                        {activeCount > 0 && (
                            <CountChip $bg={st.accentGreenDim} $color={st.accentGreen}>
                                {activeCount} aktywnych
                            </CountChip>
                        )}
                        {pendingCount > 0 && (
                            <CountChip $bg={st.accentAmberDim} $color={st.accentAmber}>
                                {pendingCount} oczekujących
                            </CountChip>
                        )}
                    </PageMeta>
                </TitleSection>

                <AddButton onClick={() => setIsAddModalOpen(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Dodaj profil
                </AddButton>
            </ViewHeader>

            {pendingCount > 0 && isManagerOrOwner && (
                <InfoBanner>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.accentBlue} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Masz {pendingCount} {pendingCount === 1 ? 'profil' : 'profile'} oczekujące na akceptację. Przejdź do zakładki <strong style={{ marginInline: 4 }}>Profile</strong>, aby je zatwierdzić.
                </InfoBanner>
            )}

            <TabBar>
                <TabButton
                    $active={activeTab === 'analytics'}
                    onClick={() => setActiveTab('analytics')}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Analityka
                    {summaries.length > 0 && (
                        <TabBadge $active={activeTab === 'analytics'}>{summaries.length}</TabBadge>
                    )}
                </TabButton>
                <TabButton
                    $active={activeTab === 'profiles'}
                    onClick={() => setActiveTab('profiles')}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Profile
                    {profiles.length > 0 && (
                        <TabBadge $active={activeTab === 'profiles'}>{profiles.length}</TabBadge>
                    )}
                    {pendingCount > 0 && (
                        <CountChip $bg={st.accentAmberDim} $color={st.accentAmber}>
                            {pendingCount}
                        </CountChip>
                    )}
                </TabButton>
            </TabBar>

            {activeTab === 'analytics' ? renderAnalytics() : renderProfiles()}

            <AddProfileModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            {selectedProfile && (
                <PostsModal
                    profile={selectedProfile}
                    onClose={handleClosePosts}
                />
            )}
        </ViewContainer>
    );
};
