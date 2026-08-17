import React from 'react';
import styled from 'styled-components';
import { ExternalLink, Film, Image, Images, Sparkles, X } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useWeekDetail } from '../hooks/useAnalytics';
import type { WeekDetailPost } from '../types';
import { formatNumber } from './MetricBits';

/**
 * Panel pod wykresem "Przyrost obserwujących": po kliknięciu słupka tłumaczy,
 * co wydarzyło się na profilu w tym tygodniu (publikacje, skoki oglądalności,
 * wykryte promocje/konkursy). Korelacja, nie dowód przyczynowości — copy mówi
 * "prawdopodobnie", nigdy "na pewno".
 */

const Panel = styled.div`
    margin-top: 14px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bg};
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const PanelHead = styled.div`
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;

    strong { font-size: ${st.fontSm}; color: ${st.text}; }
    span { font-size: ${st.fontXs}; color: ${st.textMuted}; }
`;

const CloseBtn = styled.button`
    margin-left: auto;
    border: none;
    background: none;
    color: ${st.textMuted};
    cursor: pointer;
    padding: 2px;
    display: inline-flex;

    svg { width: 15px; height: 15px; }
    &:hover { color: ${st.text}; }
`;

const Narrative = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;

    strong { color: ${st.text}; }
`;

const PostRow = styled.a`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    font-size: ${st.fontSm};
    color: ${st.text};
    text-decoration: none;
    transition: border-color ${st.transition};

    &:hover { border-color: ${st.accentBlue}; }

    svg { width: 14px; height: 14px; color: ${st.textMuted}; flex-shrink: 0; }
`;

const PostCaption = styled.span`
    flex: 1;
    min-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${st.textSecondary};
`;

const PostStats = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

const SpikeBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    background: ${st.accentGreenDim};
    color: #047857;
    font-size: ${st.fontXs};
    font-weight: 700;
    white-space: nowrap;

    svg { width: 11px; height: 11px; color: currentColor; }
`;

const InsightLine = styled.div`
    font-size: ${st.fontXs};
    color: #92400E;
    background: ${st.bgAccentAmber};
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: ${st.radiusSm};
    padding: 6px 10px;
`;

const FORMAT_META: Record<string, { label: string; icon: React.ReactNode }> = {
    REELS: { label: 'rolka', icon: <Film /> },
    CAROUSEL: { label: 'karuzela', icon: <Images /> },
    PHOTO: { label: 'zdjęcie', icon: <Image /> },
};

const SPIKE_FACTOR = 2;

const spikeRatio = (post: WeekDetailPost, medianViews: number | null, medianEngagement: number | null): number | null => {
    if (post.viewCount != null && medianViews != null && medianViews > 0) {
        const ratio = post.viewCount / medianViews;
        if (ratio >= SPIKE_FACTOR) return ratio;
    }
    if (medianEngagement != null && medianEngagement > 0) {
        const ratio = post.engagement / medianEngagement;
        if (ratio >= SPIKE_FACTOR) return ratio;
    }
    return null;
};

const plural = (n: number, one: string, few: string, many: string) => {
    if (n === 1) return one;
    const mod10 = n % 10;
    const mod100 = n % 100;
    return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
};

const buildNarrative = (
    posts: WeekDetailPost[],
    spikes: number,
    followerDelta: number | null,
): string => {
    if (posts.length === 0) {
        return 'W tym tygodniu profil nie opublikował nic nowego — przyrost prawdopodobnie przyszedł ' +
            'z zewnątrz (oznaczenia u innych, prasa, reklama) albo ze starszych treści.';
    }
    const reels = posts.filter(p => p.format === 'REELS').length;
    const parts: string[] = [];
    if (reels > 0) parts.push(`${reels} ${plural(reels, 'rolkę', 'rolki', 'rolek')}`);
    const rest = posts.length - reels;
    if (rest > 0) parts.push(`${rest} ${plural(rest, 'post', 'posty', 'postów')}`);

    let text = `W tym tygodniu profil opublikował ${parts.join(' i ')}`;
    if (spikes > 0) {
        text += `, w tym ${spikes} ${plural(spikes, 'publikację', 'publikacje', 'publikacji')} z wyraźnym skokiem ` +
            'oglądalności lub zaangażowania względem mediany profilu';
    }
    text += '.';
    if (followerDelta != null && followerDelta > 0 && spikes > 0) {
        text += ' To najbardziej prawdopodobne źródło przyrostu obserwujących.';
    }
    return text;
};

interface WeekExplainPanelProps {
    profileId: string;
    username: string;
    weekStart: string;
    onClose: () => void;
}

export const WeekExplainPanel: React.FC<WeekExplainPanelProps> = ({ profileId, username, weekStart, onClose }) => {
    const { data, isLoading, isError } = useWeekDetail(profileId, weekStart);

    // Backend normalizuje kliknięty dzień do poniedziałku ISO — preferuj jego wartość.
    const weekLabel = new Date(`${data?.weekStart ?? weekStart}T00:00:00Z`).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
    });

    return (
        <Panel>
            <PanelHead>
                <strong>@{username} · tydzień od {weekLabel}</strong>
                {data?.followerDelta != null && (
                    <span>{data.followerDelta > 0 ? '+' : ''}{formatNumber(data.followerDelta)} obserwujących</span>
                )}
                <CloseBtn onClick={onClose} aria-label="Zamknij"><X /></CloseBtn>
            </PanelHead>

            {isLoading && <Narrative>Analizuję tydzień…</Narrative>}
            {isError && <Narrative>Nie udało się pobrać szczegółów tego tygodnia.</Narrative>}

            {data && (
                <>
                    <Narrative>
                        {buildNarrative(
                            data.posts,
                            data.posts.filter(p => spikeRatio(p, data.medianViews, data.medianEngagement) !== null).length,
                            data.followerDelta,
                        )}
                    </Narrative>

                    {data.insights.map((insight, index) => (
                        <InsightLine key={index}>{insight.title}</InsightLine>
                    ))}

                    {data.posts.map(post => {
                        const meta = FORMAT_META[post.format] ?? FORMAT_META.PHOTO;
                        const ratio = spikeRatio(post, data.medianViews, data.medianEngagement);
                        return (
                            <PostRow key={post.postId} href={post.permalink} target="_blank" rel="noopener noreferrer">
                                {meta.icon}
                                <PostCaption>{post.caption || `(${meta.label} bez opisu)`}</PostCaption>
                                {ratio !== null && (
                                    <SpikeBadge><Sparkles /> {ratio.toFixed(1).replace('.', ',')}× mediana</SpikeBadge>
                                )}
                                <PostStats>
                                    {post.viewCount != null ? `${formatNumber(post.viewCount)} wyśw. · ` : ''}
                                    {formatNumber(post.engagement)} reakcji
                                </PostStats>
                                <ExternalLink />
                            </PostRow>
                        );
                    })}
                </>
            )}
        </Panel>
    );
};
