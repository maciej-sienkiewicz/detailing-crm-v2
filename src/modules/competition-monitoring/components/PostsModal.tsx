import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useInstagramPosts } from '../hooks/useInstagramPosts';
import type { InstagramProfile } from '../types';

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    animation: ${fadeIn} 200ms ease;

    @media (min-width: 640px) {
        align-items: center;
        padding: 16px;
    }
`;

const Panel = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radiusLg} ${st.radiusLg} 0 0;
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 860px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    animation: ${slideUp} 260ms ease;
    overflow: hidden;

    @media (min-width: 640px) {
        border-radius: ${st.radiusLg};
        max-height: 85vh;
    }
`;

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid ${st.border};
    flex-shrink: 0;
`;

const PanelTitleGroup = styled.div`
    flex: 1;
    min-width: 0;
`;

const PanelTitle = styled.h2`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PanelSubtitle = styled.p`
    margin: 2px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const CloseBtn = styled.button`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.textSecondary};
    cursor: pointer;
    font-size: 16px;
    flex-shrink: 0;
    transition: all ${st.transition};

    &:hover {
        background: ${st.bgAccentRed};
        border-color: ${st.accentRed};
        color: ${st.accentRed};
    }
`;

const PanelBody = styled.div`
    overflow-y: auto;
    flex: 1;
    padding: 20px 24px 24px;
`;

const PostGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;

    @media (min-width: 480px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (min-width: 720px) {
        grid-template-columns: 1fr 1fr 1fr;
    }
`;

const PostCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 16px;
    box-shadow: ${st.shadowXs};
    transition: box-shadow ${st.transition}, border-color ${st.transition};

    &:hover {
        box-shadow: ${st.shadowMd};
        border-color: ${st.borderHover};
    }
`;

const PostCaption = styled.p`
    margin: 0 0 12px;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 3.375em;
`;

const PostStats = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
`;

const StatItem = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-weight: 500;
`;

const PostDate = styled.div`
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid ${st.border};
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const EmptyPosts = styled.div`
    text-align: center;
    padding: 48px 0;
    color: ${st.textMuted};
`;

const EmptyIcon = styled.div`
    font-size: 40px;
    margin-bottom: 12px;
    opacity: 0.4;
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 500;
`;

const EmptyHint = styled.p`
    margin: 6px 0 0;
    font-size: ${st.fontSm};
`;

const LoadingWrap = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
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

const ErrorWrap = styled.div`
    text-align: center;
    padding: 40px;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
`;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const formatNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

interface PostsModalProps {
    profile: InstagramProfile;
    onClose: () => void;
}

export const PostsModal = ({ profile, onClose }: PostsModalProps) => {
    const { posts, isLoading, isError } = useInstagramPosts(profile.id);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <Overlay onClick={handleOverlayClick}>
            <Panel>
                <PanelHeader>
                    <PanelTitleGroup>
                        <PanelTitle>@{profile.username}</PanelTitle>
                        <PanelSubtitle>
                            Posty z ostatniej synchronizacji
                            {posts.length > 0 && ` · ${posts.length} postów`}
                        </PanelSubtitle>
                    </PanelTitleGroup>
                    <CloseBtn onClick={onClose} title="Zamknij">✕</CloseBtn>
                </PanelHeader>

                <PanelBody>
                    {isLoading && (
                        <LoadingWrap><Spinner /></LoadingWrap>
                    )}

                    {isError && (
                        <ErrorWrap>Nie udało się wczytać postów. Spróbuj ponownie.</ErrorWrap>
                    )}

                    {!isLoading && !isError && posts.length === 0 && (
                        <EmptyPosts>
                            <EmptyIcon>📷</EmptyIcon>
                            <EmptyText>Brak postów</EmptyText>
                            <EmptyHint>
                                Dane są odświeżane raz w tygodniu (niedziela).
                            </EmptyHint>
                        </EmptyPosts>
                    )}

                    {!isLoading && !isError && posts.length > 0 && (
                        <PostGrid>
                            {posts.map(post => (
                                <PostCard key={post.id}>
                                    <PostCaption>
                                        {post.caption ?? <em style={{ color: st.textMuted }}>Brak opisu</em>}
                                    </PostCaption>
                                    <PostStats>
                                        <StatItem title="Polubienia">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: st.accentRed }}>
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                            {formatNum(post.likeCount)}
                                        </StatItem>
                                        <StatItem title="Komentarze">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: st.accentBlue }}>
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                            </svg>
                                            {formatNum(post.commentCount)}
                                        </StatItem>
                                        {post.viewCount !== null && (
                                            <StatItem title="Wyświetlenia">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: st.accentGreen }}>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </svg>
                                                {formatNum(post.viewCount)}
                                            </StatItem>
                                        )}
                                    </PostStats>
                                    <PostDate>{formatDate(post.takenAt)}</PostDate>
                                </PostCard>
                            ))}
                        </PostGrid>
                    )}
                </PanelBody>
            </Panel>
        </Overlay>
    );
};
