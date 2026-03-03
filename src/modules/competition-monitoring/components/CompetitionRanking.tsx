import { useMemo } from 'react';
import styled from 'styled-components';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    type TooltipProps,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

// ─── Engagement score: likes + comments weighted ──────────────────────────────
const engScore = (s: ProfileSummary) => Math.round(s.avgLikes + s.avgComments * 2.5);

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD7C54']; // gold, silver, bronze
const CHART_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];
const MEDALS = ['🥇', '🥈', '🥉'];

// ─── Styled components ────────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const SectionTitle = styled.h2`
    margin: 0 0 4px;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const SectionSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;

    @media (min-width: 900px) {
        grid-template-columns: 380px 1fr;
    }
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const CardHeader = styled.div`
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${st.border};
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: ${st.textMuted};
`;

// ─── Leaderboard ──────────────────────────────────────────────────────────────

const LeaderList = styled.ol`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const LeaderItem = styled.li<{ $rank: number }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${st.bgCardAlt};
    }

    ${p => p.$rank === 0 && `background: rgba(245,158,11,0.04);`}
`;

const RankBadge = styled.span<{ $rank: number }>`
    width: 28px;
    height: 28px;
    border-radius: ${st.radiusSm};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
    background: ${p =>
        p.$rank < 3
            ? `${RANK_COLORS[p.$rank]}22`
            : st.bgCardAlt};
    color: ${p =>
        p.$rank < 3
            ? RANK_COLORS[p.$rank]
            : st.textMuted};
`;

const LeaderAvatar = styled.div<{ $color: string }>`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${p => p.$color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    text-transform: uppercase;
`;

const LeaderInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const LeaderName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const LeaderMeta = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 2px;
`;

const ScoreBar = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
`;

const ScoreValue = styled.div<{ $rank: number }>`
    font-size: ${st.fontMd};
    font-weight: 800;
    color: ${p => p.$rank === 0 ? st.accentAmber : st.text};
`;

const ScoreLabel = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const ProgressBar = styled.div`
    width: 80px;
    height: 4px;
    border-radius: ${st.radiusFull};
    background: ${st.border};
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number; $rank: number }>`
    height: 100%;
    width: ${p => p.$pct}%;
    border-radius: ${st.radiusFull};
    background: ${p => p.$rank < 3 ? RANK_COLORS[p.$rank] : st.accentBlue};
`;

// ─── Chart ────────────────────────────────────────────────────────────────────

const ChartWrap = styled.div`
    padding: 16px 20px 20px;
    height: 320px;
`;

const ChartLegend = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 0 20px 12px;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-weight: 500;
`;

const LegendDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

// ─── KPI strip ────────────────────────────────────────────────────────────────

const KpiStrip = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const KpiCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 18px 20px;
    box-shadow: ${st.shadowXs};
`;

const KpiLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: ${st.textMuted};
    margin-bottom: 8px;
`;

const KpiValue = styled.div`
    font-size: ${st.fontXxl};
    font-weight: 800;
    color: ${st.text};
    line-height: 1;
`;

const KpiSub = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 4px;
`;

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const TooltipBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 12px 16px;
    box-shadow: ${st.shadowMd};
    font-size: ${st.fontSm};
    min-width: 160px;
`;

const TooltipTitle = styled.div`
    font-weight: 700;
    color: ${st.text};
    margin-bottom: 8px;
    font-size: ${st.fontXs};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const TooltipRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    &:last-child { margin-bottom: 0; }
`;

const TooltipDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    return (
        <TooltipBox>
            <TooltipTitle>@{label}</TooltipTitle>
            {payload.map(entry => (
                <TooltipRow key={entry.dataKey}>
                    <TooltipDot $color={entry.color ?? st.accentBlue} />
                    <span style={{ color: st.textSecondary, flex: 1 }}>{entry.name}</span>
                    <span style={{ fontWeight: 700, color: st.text }}>{Math.round(entry.value as number)}</span>
                </TooltipRow>
            ))}
        </TooltipBox>
    );
};

// ─── Avatar color palette ─────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg,#f9a825,#e91e63)',
    'linear-gradient(135deg,#3B82F6,#8B5CF6)',
    'linear-gradient(135deg,#10B981,#059669)',
    'linear-gradient(135deg,#F59E0B,#EF4444)',
    'linear-gradient(135deg,#EC4899,#8B5CF6)',
    'linear-gradient(135deg,#06B6D4,#3B82F6)',
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CompetitionRankingProps {
    summaries: ProfileSummary[];
}

export const CompetitionRanking = ({ summaries }: CompetitionRankingProps) => {
    const ranked = useMemo(
        () => [...summaries].sort((a, b) => engScore(b) - engScore(a)),
        [summaries],
    );

    const topScore = ranked[0] ? engScore(ranked[0]) : 1;

    const chartData = useMemo(
        () =>
            ranked.map(s => ({
                username: s.username,
                Polubienia: Math.round(s.avgLikes),
                Komentarze: Math.round(s.avgComments),
            })),
        [ranked],
    );

    const avgLikesAll = ranked.length
        ? Math.round(ranked.reduce((acc, s) => acc + s.avgLikes, 0) / ranked.length)
        : 0;

    const topPerformer = ranked[0];
    const mostActive = [...summaries].sort((a, b) => b.postsPerWeek - a.postsPerWeek)[0];
    const totalPosts = summaries.reduce((acc, s) => acc + s.postCount, 0);

    if (ranked.length === 0) {
        return (
            <Section>
                <div>
                    <SectionTitle>Ranking zaangażowania</SectionTitle>
                    <SectionSubtitle>Brak aktywnych profili do porównania.</SectionSubtitle>
                </div>
            </Section>
        );
    }

    return (
        <Section>
            <div>
                <SectionTitle>Ranking zaangażowania</SectionTitle>
                <SectionSubtitle>
                    Wynik = śr. polubień + śr. komentarzy × 2,5 · na post · z ostatniej synchronizacji
                </SectionSubtitle>
            </div>

            {/* KPI strip */}
            <KpiStrip>
                <KpiCard>
                    <KpiLabel>Lider rankingu</KpiLabel>
                    <KpiValue style={{ fontSize: st.fontLg }}>@{topPerformer?.username ?? '—'}</KpiValue>
                    <KpiSub>wynik {topScore} pkt</KpiSub>
                </KpiCard>
                <KpiCard>
                    <KpiLabel>Śr. polubień / post</KpiLabel>
                    <KpiValue>{avgLikesAll}</KpiValue>
                    <KpiSub>across {ranked.length} profili</KpiSub>
                </KpiCard>
                <KpiCard>
                    <KpiLabel>Najaktywniejszy</KpiLabel>
                    <KpiValue style={{ fontSize: st.fontLg }}>@{mostActive?.username ?? '—'}</KpiValue>
                    <KpiSub>{mostActive?.postsPerWeek.toFixed(1) ?? 0} postów / tydz.</KpiSub>
                </KpiCard>
                <KpiCard>
                    <KpiLabel>Posty śledzone</KpiLabel>
                    <KpiValue>{totalPosts}</KpiValue>
                    <KpiSub>łącznie</KpiSub>
                </KpiCard>
            </KpiStrip>

            {/* Leaderboard + Chart */}
            <TwoCol>
                {/* Leaderboard */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ranking profili</CardTitle>
                    </CardHeader>
                    <LeaderList>
                        {ranked.map((s, idx) => {
                            const score = engScore(s);
                            const pct = Math.round((score / topScore) * 100);
                            return (
                                <LeaderItem key={s.id} $rank={idx}>
                                    <RankBadge $rank={idx}>
                                        {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
                                    </RankBadge>
                                    <LeaderAvatar $color={AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]}>
                                        {s.username.charAt(0)}
                                    </LeaderAvatar>
                                    <LeaderInfo>
                                        <LeaderName>@{s.username}</LeaderName>
                                        <LeaderMeta>
                                            {Math.round(s.avgLikes)} polubiеń · {s.postsPerWeek.toFixed(1)}/tydz.
                                        </LeaderMeta>
                                    </LeaderInfo>
                                    <ScoreBar>
                                        <ScoreValue $rank={idx}>{score}</ScoreValue>
                                        <ScoreLabel>pkt</ScoreLabel>
                                        <ProgressBar>
                                            <ProgressFill $pct={pct} $rank={idx} />
                                        </ProgressBar>
                                    </ScoreBar>
                                </LeaderItem>
                            );
                        })}
                    </LeaderList>
                </Card>

                {/* Bar chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Porównanie · śr. interakcji na post</CardTitle>
                    </CardHeader>
                    <ChartLegend>
                        <LegendItem>
                            <LegendDot $color={st.accentBlue} />
                            Polubienia
                        </LegendItem>
                        <LegendItem>
                            <LegendDot $color={st.accentGreen} />
                            Komentarze
                        </LegendItem>
                    </ChartLegend>
                    <ChartWrap>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 4, right: 16, left: -8, bottom: 4 }}
                                barGap={4}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={st.border}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="username"
                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                    tickLine={false}
                                    axisLine={{ stroke: st.border }}
                                    tickFormatter={v => `@${v.slice(0, 10)}${v.length > 10 ? '…' : ''}`}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: st.textMuted }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={36}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.03)' }} />
                                <Bar dataKey="Polubienia" radius={[5, 5, 0, 0]} maxBarSize={40}>
                                    {chartData.map((_, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={idx === 0 ? st.accentBlue : `${st.accentBlue}99`}
                                        />
                                    ))}
                                </Bar>
                                <Bar dataKey="Komentarze" radius={[5, 5, 0, 0]} maxBarSize={40}>
                                    {chartData.map((_, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={idx === 0 ? st.accentGreen : `${st.accentGreen}99`}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartWrap>
                </Card>
            </TwoCol>
        </Section>
    );
};
