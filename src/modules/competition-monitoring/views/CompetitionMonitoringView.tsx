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
import type { InstagramProfile } from '../types';

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
`;

const ViewHeader = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
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

// ─── States ───────────────────────────────────────────────────────────────────

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

const ErrorMsg = styled.div`
    padding: 48px 32px;
    text-align: center;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
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
    display: block;
    margin-inline: auto;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlue};
        color: #fff;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 72px 32px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Profiles section ─────────────────────────────────────────────────────────

const ProfilesSection = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const ProfilesSectionHeader = styled.div`
    padding: 12px 20px;
    border-bottom: 1px solid ${st.border};
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
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

// ─── View ─────────────────────────────────────────────────────────────────────

export const CompetitionMonitoringView = () => {
    const { user } = useAuth();
    const { profiles, isLoading: profilesLoading, isError: profilesError, refetch: refetchProfiles } = useInstagramProfiles();
    const { summaries, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useCompetitionSummary();
    const { approveProfile, isApproving, rejectProfile, isRejecting, removeProfile, isRemoving } = useProfileActions();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<InstagramProfile | null>(null);

    const isManagerOrOwner = user?.role === 'MANAGER' || user?.role === 'OWNER';

    const handleViewPosts = useCallback((profile: InstagramProfile) => setSelectedProfile(profile), []);
    const handleClosePosts = useCallback(() => setSelectedProfile(null), []);

    // ─── Analytics ────────────────────────────────────────────────────────────

    const renderAnalytics = () => {
        if (summaryLoading) return <LoadingOverlay><Spinner /></LoadingOverlay>;
        if (summaryError) return (
            <ErrorMsg>
                Nie udało się załadować danych.
                <RetryButton onClick={() => refetchSummary()}>Spróbuj ponownie</RetryButton>
            </ErrorMsg>
        );
        if (summaries.length === 0) return (
            <EmptyState>Dodaj aktywne profile, aby zobaczyć dane.</EmptyState>
        );
        return (
            <>
                <EngagementTrendChart summaries={summaries} />
                <CompetitionRanking summaries={summaries} />
            </>
        );
    };

    // ─── Profiles ─────────────────────────────────────────────────────────────

    const renderProfiles = () => {
        if (profilesLoading) return <LoadingOverlay><Spinner /></LoadingOverlay>;
        if (profilesError) return (
            <ErrorMsg>
                Nie udało się załadować profili.
                <RetryButton onClick={() => refetchProfiles()}>Spróbuj ponownie</RetryButton>
            </ErrorMsg>
        );
        if (profiles.length === 0) return (
            <EmptyState>Brak obserwowanych profili.</EmptyState>
        );
        return (
            <ProfileList>
                {profiles.map(profile => (
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
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <ViewContainer>
            <ViewHeader>
                <PageTitle>Monitoring Konkurencji</PageTitle>
                <AddButton onClick={() => setIsAddModalOpen(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Dodaj profil
                </AddButton>
            </ViewHeader>

            {renderAnalytics()}

            <ProfilesSection>
                <ProfilesSectionHeader>Obserwowane profile</ProfilesSectionHeader>
                {renderProfiles()}
            </ProfilesSection>

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
