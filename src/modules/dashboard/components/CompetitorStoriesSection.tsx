import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { X, Volume2, VolumeX } from 'lucide-react';
import { instagramApi } from '@/modules/competition-monitoring/api/instagramApi';
import type { InstagramStory, StoryGroup } from '@/modules/competition-monitoring/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORY_DURATION_MS = 6000;

const PROFILE_COLORS = [
    '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#ef4444', '#06b6d4',
];

function profileColor(profileId: string): string {
    let h = 0;
    for (let i = 0; i < profileId.length; i++) h = (h * 31 + profileId.charCodeAt(i)) >>> 0;
    return PROFILE_COLORS[h % PROFILE_COLORS.length];
}

function initials(username: string): string {
    return username.slice(0, 2).toUpperCase();
}

function groupStories(stories: InstagramStory[]): StoryGroup[] {
    const map = new Map<string, StoryGroup>();
    for (const s of stories) {
        if (!map.has(s.profileId)) {
            map.set(s.profileId, { profileId: s.profileId, username: s.username, stories: [] });
        }
        map.get(s.profileId)!.stories.push(s);
    }
    for (const g of map.values()) {
        g.stories.sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
    }
    return Array.from(map.values());
}

function timeAgo(iso: string): string {
    const sec = (Date.now() - new Date(iso).getTime()) / 1000;
    if (sec < 3600) return `${Math.floor(sec / 60)} min temu`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} godz. temu`;
    return `${Math.floor(sec / 86400)} dni temu`;
}

function isVideo(story: InstagramStory): boolean {
    return !!story.videoUrl;
}

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const scaleIn = keyframes`
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
`;

const fillProgress = keyframes`
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
`;

// ─── Section shell ────────────────────────────────────────────────────────────

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: -${p => p.theme.spacing.md};
`;

const SectionTitle = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
`;

const SectionLine = styled.div`
    flex: 1;
    height: 1px;
    background: ${p => p.theme.colors.border};
`;

const StoriesCard = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.xl};
    border: 1px solid ${p => p.theme.colors.border};
    padding: 20px 24px;
    box-shadow: ${p => p.theme.shadows.sm};
`;

const StoriesRow = styled.div`
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

// ─── Story circle ─────────────────────────────────────────────────────────────

const CircleBtn = styled.button`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 12px;
    flex-shrink: 0;
    transition: transform 160ms ease;

    &:hover  { transform: translateY(-3px); }
    &:active { transform: scale(0.95); }
`;

const StoryRing = styled.div<{ $hasNew: boolean }>`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    padding: 2.5px;
    background: ${p =>
        p.$hasNew
            ? 'linear-gradient(45deg, #fcaf45, #ff3c5f 40%, #833ab4 70%, #405de6)'
            : p.theme.colors.border};
    transition: background 300ms ease;
`;

const AvatarInner = styled.div<{ $color: string }>`
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid ${p => p.theme.colors.surface};
    background: ${p => p.$color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.5px;
    overflow: hidden;
`;

const CircleUsername = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: ${p => p.theme.colors.textSecondary};
    max-width: 76px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
`;

const StoryCount = styled.span`
    font-size: 10px;
    color: ${p => p.theme.colors.textMuted};
`;

// ─── Skeletons ────────────────────────────────────────────────────────────────

const SkeletonBase = css`
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
`;

const SkeletonCircle = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    ${SkeletonBase}
`;

const SkeletonText = styled.div`
    width: 56px;
    height: 10px;
    border-radius: 4px;
    ${SkeletonBase}
`;

// ─── Viewer overlay ───────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${fadeIn} 180ms ease;
    backdrop-filter: blur(4px);
`;

const ViewerWrap = styled.div`
    position: relative;
    width: min(100vw, 400px);
    height: min(100vh, 710px);
    border-radius: 16px;
    overflow: hidden;
    background: #111;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    animation: ${scaleIn} 220ms ease;

    @media (max-width: 430px) {
        border-radius: 0;
        width: 100vw;
        height: 100dvh;
    }
`;

const MediaFill = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const VideoFill = styled.video`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const MediaPlaceholder = styled.div<{ $color: string }>`
    position: absolute;
    inset: 0;
    background: linear-gradient(150deg, ${p => p.$color}55, ${p => p.$color}11);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.18);
    letter-spacing: -2px;
`;

const TopGrad = styled.div`
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 130px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.72), transparent);
    pointer-events: none;
    z-index: 10;
`;

const BotGrad = styled.div`
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 80px;
    background: linear-gradient(to top, rgba(0,0,0,0.55), transparent);
    pointer-events: none;
    z-index: 10;
`;

// ─── Progress bars ────────────────────────────────────────────────────────────

const Bars = styled.div`
    position: absolute;
    top: 10px; left: 10px; right: 10px;
    display: flex;
    gap: 3px;
    z-index: 20;
`;

const BarTrack = styled.div`
    flex: 1;
    height: 2px;
    background: rgba(255, 255, 255, 0.28);
    border-radius: 2px;
    overflow: hidden;
`;

const BarFill = styled.div<{ $state: 'done' | 'active' | 'pending'; $duration: number }>`
    height: 100%;
    border-radius: 2px;
    background: #fff;
    transform-origin: left;

    ${p => p.$state === 'done'    && css`transform: scaleX(1);`}
    ${p => p.$state === 'pending' && css`transform: scaleX(0);`}
    ${p => p.$state === 'active'  && css`
        animation: ${fillProgress} ${p.$duration}ms linear forwards;
    `}
`;

// ─── Viewer header ────────────────────────────────────────────────────────────

const ViewerHeader = styled.div`
    position: absolute;
    top: 22px; left: 12px; right: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 20;
`;

const ViewerAvatar = styled.div<{ $color: string }>`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$color};
    border: 2px solid rgba(255, 255, 255, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
`;

const ViewerMeta = styled.div`
    flex: 1;
    min-width: 0;
`;

const ViewerUsername = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    line-height: 1.2;
`;

const ViewerTime = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.65);
    margin-top: 1px;
`;

const IconBtn = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,0.85);
    padding: 6px;
    border-radius: 50%;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 150ms;
    flex-shrink: 0;

    &:hover { background: rgba(255,255,255,0.15); }
    svg { width: 18px; height: 18px; }
`;

// ─── Tap zones ────────────────────────────────────────────────────────────────

const TapZone = styled.div<{ $side: 'left' | 'right' }>`
    position: absolute;
    top: 0;
    ${p => (p.$side === 'left' ? 'left: 0;' : 'right: 0;')}
    width: 40%;
    height: 100%;
    z-index: 15;
    cursor: pointer;
`;

// ─── Story viewer component ───────────────────────────────────────────────────

interface ViewerProps {
    groups: StoryGroup[];
    initialGroup: number;
    onClose: () => void;
}

function StoryViewer({ groups, initialGroup, onClose }: ViewerProps) {
    const [gi, setGi] = useState(initialGroup);
    const [si, setSi] = useState(0);
    const [muted, setMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const group = groups[gi];
    const story = group?.stories[si];
    const color = profileColor(group?.profileId ?? '');
    const storyIsVideo = story ? isVideo(story) : false;

    const advance = useCallback(() => {
        if (!group) return;
        if (si < group.stories.length - 1) {
            setSi(i => i + 1);
        } else if (gi < groups.length - 1) {
            setGi(i => i + 1);
            setSi(0);
        } else {
            onClose();
        }
    }, [group, si, gi, groups.length, onClose]);

    const goBack = useCallback(() => {
        if (si > 0) {
            setSi(i => i - 1);
        } else if (gi > 0) {
            setGi(i => i - 1);
            setSi(0);
        }
    }, [si, gi]);

    // Auto-advance (only for images; videos advance when they end)
    useEffect(() => {
        if (storyIsVideo) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(advance, STORY_DURATION_MS);
        return () => clearTimeout(timerRef.current);
    }, [gi, si, storyIsVideo, advance]);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape')      onClose();
            else if (e.key === 'ArrowRight') advance();
            else if (e.key === 'ArrowLeft')  goBack();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, advance, goBack]);

    if (!group || !story) return null;

    const barState = (i: number): 'done' | 'active' | 'pending' => {
        if (i < si) return 'done';
        if (i === si) return 'active';
        return 'pending';
    };

    return createPortal(
        <Overlay onClick={onClose}>
            <ViewerWrap onClick={e => e.stopPropagation()}>

                {/* Media */}
                {storyIsVideo ? (
                    <VideoFill
                        ref={videoRef}
                        key={story.storyId}
                        src={story.videoUrl!}
                        autoPlay
                        playsInline
                        muted={muted}
                        onEnded={advance}
                    />
                ) : story.imageUrl ? (
                    <MediaFill key={story.storyId} src={story.imageUrl} alt="" />
                ) : (
                    <MediaPlaceholder $color={color}>
                        {initials(group.username)}
                    </MediaPlaceholder>
                )}

                <TopGrad />
                <BotGrad />

                {/* Progress bars */}
                <Bars>
                    {group.stories.map((_, i) => (
                        <BarTrack key={`${gi}-${i}`}>
                            <BarFill
                                key={`${gi}-${si}-${i}`}
                                $state={storyIsVideo && i === si ? 'pending' : barState(i)}
                                $duration={STORY_DURATION_MS}
                            />
                        </BarTrack>
                    ))}
                </Bars>

                {/* Header */}
                <ViewerHeader>
                    <ViewerAvatar $color={color}>
                        {initials(group.username)}
                    </ViewerAvatar>
                    <ViewerMeta>
                        <ViewerUsername>@{group.username}</ViewerUsername>
                        <ViewerTime>{timeAgo(story.takenAt)}</ViewerTime>
                    </ViewerMeta>
                    {storyIsVideo && (
                        <IconBtn
                            onClick={() => setMuted(m => !m)}
                            aria-label={muted ? 'Włącz dźwięk' : 'Wycisz'}
                        >
                            {muted ? <VolumeX /> : <Volume2 />}
                        </IconBtn>
                    )}
                    <IconBtn onClick={onClose} aria-label="Zamknij">
                        <X />
                    </IconBtn>
                </ViewerHeader>

                {/* Tap zones */}
                <TapZone $side="left"  onClick={goBack} />
                <TapZone $side="right" onClick={advance} />

            </ViewerWrap>
        </Overlay>,
        document.body,
    );
}

// ─── Main section component ───────────────────────────────────────────────────

export function CompetitorStoriesSection() {
    const [viewer, setViewer] = useState<{ open: boolean; groupIdx: number }>({
        open: false,
        groupIdx: 0,
    });

    const { data: stories = [], isLoading } = useQuery({
        queryKey: ['instagram', 'stories', 72],
        queryFn: () => instagramApi.getStories(72),
        staleTime: 5 * 60_000,
        refetchInterval: 10 * 60_000,
    });

    const groups = useMemo(() => groupStories(stories), [stories]);

    if (!isLoading && groups.length === 0) return null;

    return (
        <div>
            <SectionHeader>
                <SectionTitle>Co robiła konkurencja przez ostatnie 3 dni?</SectionTitle>
                <SectionLine />
            </SectionHeader>

            <StoriesCard>
                <StoriesRow>
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                              <div
                                  key={i}
                                  style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: 7,
                                      padding: 4,
                                  }}
                              >
                                  <SkeletonCircle />
                                  <SkeletonText />
                              </div>
                          ))
                        : groups.map((group, idx) => (
                              <CircleBtn
                                  key={group.profileId}
                                  onClick={() => setViewer({ open: true, groupIdx: idx })}
                                  aria-label={`Stories: @${group.username}`}
                              >
                                  <StoryRing $hasNew>
                                      <AvatarInner $color={profileColor(group.profileId)}>
                                          {initials(group.username)}
                                      </AvatarInner>
                                  </StoryRing>
                                  <CircleUsername>@{group.username}</CircleUsername>
                                  <StoryCount>
                                      {group.stories.length}{' '}
                                      {group.stories.length === 1 ? 'story' : 'stories'}
                                  </StoryCount>
                              </CircleBtn>
                          ))}
                </StoriesRow>
            </StoriesCard>

            {viewer.open && groups.length > 0 && (
                <StoryViewer
                    groups={groups}
                    initialGroup={viewer.groupIdx}
                    onClose={() => setViewer(v => ({ ...v, open: false }))}
                />
            )}
        </div>
    );
}
