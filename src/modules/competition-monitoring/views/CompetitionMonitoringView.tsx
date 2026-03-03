import { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAuth } from '@/core/context/AuthContext';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useProfileActions } from '../hooks/useProfileActions';
import { ProfileCard } from '../components/ProfileCard';
import { AddProfileModal } from '../components/AddProfileModal';
import { PostsModal } from '../components/PostsModal';
import type { InstagramProfile, InstagramProfileStatus } from '../types';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
`;

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

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
    padding: 6px 16px;
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

const ContentSection = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const ProfileList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;

    & > * + * {
        border-top: 1px solid ${st.border};
    }
`;

const ProfileRow = styled.div`
    padding: 8px 16px;
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

const ErrorText = styled.p`
    margin: 0 0 16px;
    font-size: ${st.fontMd};
`;

const RetryButton = styled.button`
    padding: 8px 20px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlue};
        color: #fff;
    }
`;

const EmptyState = styled.div`
    padding: 64px 32px;
    text-align: center;
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.35;
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
    max-width: 380px;
    margin-inline: auto;
    line-height: 1.6;
`;

const InfoBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: ${st.bgAccentBlue};
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

const SectionDivider = styled.div`
    padding: 8px 20px 4px;
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
`;

type FilterType = 'ALL' | InstagramProfileStatus;

const FILTER_LABELS: Record<FilterType, string> = {
    ALL: 'Wszystkie',
    ACTIVE: 'Aktywne',
    PENDING_APPROVAL: 'Oczekujące',
    REJECTED: 'Odrzucone',
};

export const CompetitionMonitoringView = () => {
    const { user } = useAuth();
    const { profiles, isLoading, isError, refetch } = useInstagramProfiles();
    const { approveProfile, isApproving, rejectProfile, isRejecting, removeProfile, isRemoving } =
        useProfileActions();

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

    const renderContent = () => {
        if (isLoading) {
            return (
                <LoadingOverlay><Spinner /></LoadingOverlay>
            );
        }

        if (isError) {
            return (
                <ErrorContainer>
                    <ErrorText>Nie udało się załadować listy profili.</ErrorText>
                    <RetryButton onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
                </ErrorContainer>
            );
        }

        if (filtered.length === 0 && profiles.length === 0) {
            return (
                <EmptyState>
                    <EmptyIcon>🔍</EmptyIcon>
                    <EmptyTitle>Brak obserwowanych profili</EmptyTitle>
                    <EmptyDesc>
                        Dodaj profile konkurentów na Instagramie, aby śledzić ich aktywność i porównywać zaangażowanie.
                    </EmptyDesc>
                </EmptyState>
            );
        }

        if (filtered.length === 0) {
            return (
                <EmptyState>
                    <EmptyIcon>📋</EmptyIcon>
                    <EmptyTitle>Brak profili w tej kategorii</EmptyTitle>
                    <EmptyDesc>Zmień filtr, aby zobaczyć inne profile.</EmptyDesc>
                </EmptyState>
            );
        }

        return (
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
        );
    };

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <PageTitle>Monitoring Konkurencji</PageTitle>
                    <PageMeta>
                        <PageSubtitle>Obserwuj profile Instagram konkurentów</PageSubtitle>
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

            {!isLoading && !isError && pendingCount > 0 && isManagerOrOwner && (
                <InfoBanner>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={st.accentBlue} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Masz {pendingCount} {pendingCount === 1 ? 'profil' : 'profile'} oczekujące na akceptację. Zatwierdź je, aby zostały uwzględnione w niedzielnej synchronizacji danych.
                </InfoBanner>
            )}

            <ContentSection>
                {!isLoading && !isError && profiles.length > 0 && (
                    <SectionDivider>
                        <FilterBar>
                            {(Object.keys(FILTER_LABELS) as FilterType[]).map(key => (
                                <FilterBtn
                                    key={key}
                                    $active={activeFilter === key}
                                    onClick={() => setActiveFilter(key)}
                                >
                                    {FILTER_LABELS[key]}
                                    {key !== 'ALL' && (
                                        <> · {profiles.filter(p => p.status === key).length}</>
                                    )}
                                    {key === 'ALL' && <> · {profiles.length}</>}
                                </FilterBtn>
                            ))}
                        </FilterBar>
                    </SectionDivider>
                )}

                {renderContent()}
            </ContentSection>

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
