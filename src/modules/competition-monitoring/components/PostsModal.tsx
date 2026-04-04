import { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useInstagramPosts } from '../hooks/useInstagramPosts';
import type { InstagramProfile } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const overlayIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const modalIn = keyframes`
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
`;

const reactionPop = keyframes`
    0%   { transform: scale(1); }
    35%  { transform: scale(1.45); }
    65%  { transform: scale(0.87); }
    100% { transform: scale(1); }
`;

// ─── Overlay / Shell ──────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.52);
    backdrop-filter: blur(6px);
    animation: ${overlayIn} 220ms ease;

    @media (max-width: 480px) {
        padding: 0;
        align-items: flex-end;
    }
`;

const Panel = styled.div`
    background: #ffffff;
    border-radius: 20px;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 4px 8px -2px rgba(0, 0, 0, 0.06),
        0 20px 48px -8px rgba(0, 0, 0, 0.18);
    width: 100%;
    max-width: 960px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${modalIn} 280ms cubic-bezier(0.32, 0.72, 0, 1);

    @media (max-width: 480px) {
        border-radius: 20px 20px 0 0;
        max-height: 92vh;
    }
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 28px;
    border-bottom: 1px solid ${st.border};
    flex-shrink: 0;
`;

const InstagramDot = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
`;

const TitleGroup = styled.div`
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
    margin: 3px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const HeaderMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const AiHint = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.18);
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    color: #6366f1;
    white-space: nowrap;

    @media (max-width: 600px) {
        display: none;
    }
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid ${st.border};
    border-radius: 50%;
    cursor: pointer;
    color: ${st.textSecondary};
    transition: all 150ms ease;

    &:hover {
        background: ${st.border};
        color: ${st.text};
    }
`;

// ─── Body / Grid ──────────────────────────────────────────────────────────────

const PanelBody = styled.div`
    overflow-y: auto;
    flex: 1;
    padding: 24px 28px 28px;
    min-height: 0;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: ${st.border};
        border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb:hover { background: ${st.borderHover}; }

    @media (max-width: 480px) {
        padding: 16px;
    }
`;

const PostGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @media (min-width: 500px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (min-width: 780px) {
        grid-template-columns: 1fr 1fr 1fr;
    }
`;

// ─── Post Card ────────────────────────────────────────────────────────────────

const PostCard = styled.div<{ $reaction: 'liked' | 'disliked' | null }>`
    background: ${st.bgCard};
    border: 1.5px solid ${p =>
        p.$reaction === 'liked'   ? 'rgba(16, 185, 129, 0.35)' :
        p.$reaction === 'disliked' ? 'rgba(239, 68, 68, 0.30)'  :
        st.border};
    border-radius: ${st.radius};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 0;
    box-shadow: ${p =>
        p.$reaction === 'liked'   ? '0 0 0 3px rgba(16, 185, 129, 0.08)' :
        p.$reaction === 'disliked' ? '0 0 0 3px rgba(239, 68, 68, 0.07)'  :
        st.shadowXs};
    transition: box-shadow 220ms ease, border-color 220ms ease;

    &:hover {
        box-shadow: ${p =>
            p.$reaction === 'liked'   ? '0 4px 14px rgba(16, 185, 129, 0.14)' :
            p.$reaction === 'disliked' ? '0 4px 14px rgba(239, 68, 68, 0.12)'  :
            st.shadowMd};
        border-color: ${p =>
            p.$reaction === 'liked'   ? 'rgba(16, 185, 129, 0.5)' :
            p.$reaction === 'disliked' ? 'rgba(239, 68, 68, 0.45)' :
            st.borderHover};
    }
`;

const PostCaption = styled.p`
    margin: 0 0 14px;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
`;

const PostStats = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
`;

const StatItem = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-weight: 500;
`;

const PostFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 12px;
    border-top: 1px solid ${st.border};
    flex-wrap: wrap;
`;

const PostDate = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

// ─── Reaction buttons ─────────────────────────────────────────────────────────

const ReactionRow = styled.div`
    display: flex;
    gap: 6px;
`;

const ReactionBtn = styled.button<{
    $active: boolean;
    $type: 'like' | 'dislike';
    $animating: boolean;
}>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid;
    transition: background 180ms ease, border-color 180ms ease, color 180ms ease;

    ${p => p.$animating && css`
        animation: ${reactionPop} 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
    `}

    ${p => !p.$active && p.$type === 'like' && css`
        background: transparent;
        border-color: ${st.border};
        color: ${st.textMuted};
        &:hover {
            background: rgba(16, 185, 129, 0.07);
            border-color: ${st.accentGreen};
            color: ${st.accentGreen};
        }
    `}
    ${p => p.$active && p.$type === 'like' && css`
        background: rgba(16, 185, 129, 0.10);
        border-color: ${st.accentGreen};
        color: ${st.accentGreen};
    `}

    ${p => !p.$active && p.$type === 'dislike' && css`
        background: transparent;
        border-color: ${st.border};
        color: ${st.textMuted};
        &:hover {
            background: rgba(239, 68, 68, 0.07);
            border-color: ${st.accentRed};
            color: ${st.accentRed};
        }
    `}
    ${p => p.$active && p.$type === 'dislike' && css`
        background: rgba(239, 68, 68, 0.09);
        border-color: ${st.accentRed};
        color: ${st.accentRed};
    `}
`;

// ─── Empty / Loading / Error states ──────────────────────────────────────────

const StateWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    gap: 8px;
    text-align: center;
`;

const StateIcon = styled.div`
    font-size: 40px;
    opacity: 0.35;
    margin-bottom: 4px;
`;

const StateTitle = styled.p`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 600;
    color: ${st.text};
`;

const StateHint = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.accentRed};
`;

const Spinner = styled.div`
    width: 34px;
    height: 34px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const formatNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const REACTIONS_KEY = 'ig_post_reactions';

type Reaction = 'liked' | 'disliked';
type ReactionsMap = Record<string, Reaction>;

const loadReactions = (): ReactionsMap => {
    try {
        const raw = localStorage.getItem(REACTIONS_KEY);
        return raw ? (JSON.parse(raw) as ReactionsMap) : {};
    } catch {
        return {};
    }
};

const saveReactions = (map: ReactionsMap) => {
    try {
        localStorage.setItem(REACTIONS_KEY, JSON.stringify(map));
    } catch { /* ignore */ }
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PostsModalProps {
    profile: InstagramProfile;
    onClose: () => void;
}

export const PostsModal = ({ profile, onClose }: PostsModalProps) => {
    const { posts, isLoading, isError } = useInstagramPosts(profile.id);
    const [reactions, setReactions] = useState<ReactionsMap>(loadReactions);
    const [animatingKey, setAnimatingKey] = useState<string | null>(null);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleReact = useCallback((postId: string, type: Reaction) => {
        const key = `${postId}-${type}`;
        setAnimatingKey(key);
        setTimeout(() => setAnimatingKey(null), 450);

        setReactions(prev => {
            const next = { ...prev };
            if (next[postId] === type) {
                delete next[postId];   // toggle off
            } else {
                next[postId] = type;
            }
            saveReactions(next);
            return next;
        });
    }, []);

    const likedCount   = posts.filter(p => reactions[p.id] === 'liked').length;
    const dislikedCount = posts.filter(p => reactions[p.id] === 'disliked').length;

    return (
        <Overlay onClick={handleOverlayClick}>
            <Panel>
                {/* Header */}
                <PanelHeader>
                    <InstagramDot>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                            <circle cx="12" cy="12" r="4" />
                            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                        </svg>
                    </InstagramDot>
                    <TitleGroup>
                        <PanelTitle>@{profile.username}</PanelTitle>
                        <PanelSubtitle>
                            Posty z ostatniej synchronizacji
                            {posts.length > 0 && ` · ${posts.length} postów`}
                            {likedCount > 0 && ` · ${likedCount} 👍`}
                            {dislikedCount > 0 && ` · ${dislikedCount} 👎`}
                        </PanelSubtitle>
                    </TitleGroup>
                    <HeaderMeta>
                        <AiHint>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14.5h-2v-6h2v6zm0-8h-2V6h2v2.5z" />
                            </svg>
                            Oceny trenują AI
                        </AiHint>
                        <CloseBtn onClick={onClose} title="Zamknij (Esc)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </CloseBtn>
                    </HeaderMeta>
                </PanelHeader>

                {/* Body */}
                <PanelBody>
                    {isLoading && (
                        <StateWrap><Spinner /></StateWrap>
                    )}

                    {isError && (
                        <StateWrap>
                            <StateIcon>⚠️</StateIcon>
                            <ErrorText>Nie udało się wczytać postów. Spróbuj ponownie.</ErrorText>
                        </StateWrap>
                    )}

                    {!isLoading && !isError && posts.length === 0 && (
                        <StateWrap>
                            <StateIcon>📷</StateIcon>
                            <StateTitle>Brak postów</StateTitle>
                            <StateHint>Dane są odświeżane raz w tygodniu (niedziela).</StateHint>
                        </StateWrap>
                    )}

                    {!isLoading && !isError && posts.length > 0 && (
                        <PostGrid>
                            {posts.map(post => {
                                const reaction = reactions[post.id] ?? null;
                                return (
                                    <PostCard key={post.id} $reaction={reaction}>
                                        <PostCaption>
                                            {post.caption ?? <em style={{ color: st.textMuted }}>Brak opisu</em>}
                                        </PostCaption>

                                        <PostStats>
                                            {/* Engagement count — neutral gray heart to avoid confusion */}
                                            <StatItem title="Polubienia na Instagramie">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: st.textMuted }}>
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                                {formatNum(post.likeCount)}
                                            </StatItem>
                                            <StatItem title="Komentarze">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: st.accentBlue }}>
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                </svg>
                                                {formatNum(post.commentCount)}
                                            </StatItem>
                                            {post.viewCount !== null && (
                                                <StatItem title="Wyświetlenia">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: st.accentGreen }}>
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                    {formatNum(post.viewCount)}
                                                </StatItem>
                                            )}
                                        </PostStats>

                                        <PostFooter>
                                            <PostDate>{formatDate(post.takenAt)}</PostDate>
                                            <ReactionRow>
                                                <ReactionBtn
                                                    $type="like"
                                                    $active={reaction === 'liked'}
                                                    $animating={animatingKey === `${post.id}-liked`}
                                                    onClick={() => handleReact(post.id, 'liked')}
                                                    title="Dobry styl — użyj jako wzorzec dla AI"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill={reaction === 'liked' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                                    </svg>
                                                    Dobry
                                                </ReactionBtn>
                                                <ReactionBtn
                                                    $type="dislike"
                                                    $active={reaction === 'disliked'}
                                                    $animating={animatingKey === `${post.id}-disliked`}
                                                    onClick={() => handleReact(post.id, 'disliked')}
                                                    title="Słaby styl — pomiń przy generowaniu"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill={reaction === 'disliked' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                                                        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                                                    </svg>
                                                    Słaby
                                                </ReactionBtn>
                                            </ReactionRow>
                                        </PostFooter>
                                    </PostCard>
                                );
                            })}
                        </PostGrid>
                    )}
                </PanelBody>
            </Panel>
        </Overlay>
    );
};
