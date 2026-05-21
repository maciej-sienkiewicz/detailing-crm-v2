import { useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary, WeeksOption } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartTab = 'activity' | 'posts' | 'stories' | 'followers';

interface Props {
    profiles: ProfileSummary[];
    colorMap: Record<string, string>;
    weeks: WeeksOption;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORIES_PINK = '#ec4899';

// ─── Data helpers ─────────────────────────────────────────────────────────────

type DataPoint = Record<string, string | number | null>;

function normalizeWeekly(profiles: ProfileSummary[]): DataPoint[] {
    const weekSet = new Set<string>();
    profiles.forEach(p => p.weeklyStats.forEach(w => weekSet.add(w.weekStart)));
    const sorted = [...weekSet].sort();

    return sorted.map(weekStart => {
        const pt: DataPoint = { weekStart, label: fmtWeek(weekStart) };
        profiles.forEach(p => {
            const w = p.weeklyStats.find(s => s.weekStart === weekStart);
            pt[`${p.id}_posts`]    = w?.postCount  ?? 0;
            pt[`${p.id}_stories`]  = w?.storyCount ?? 0;
            pt[`${p.id}_activity`] = (w?.postCount ?? 0) + (w?.storyCount ?? 0);
            // null when no posts that week — prevents misleading zero on the avg line
            pt[`${p.id}_likes`]    = w && w.postCount > 0 ? (w.avgLikes    ?? null) : null;
            pt[`${p.id}_comments`] = w && w.postCount > 0 ? (w.avgComments ?? null) : null;
        });
        return pt;
    });
}

function normalizeDailyStories(profiles: ProfileSummary[]): DataPoint[] {
    const dateSet = new Set<string>();
    profiles.forEach(p => (p.dailyStoryStats ?? []).forEach(d => dateSet.add(d.date)));
    const sorted = [...dateSet].sort();

    return sorted.map(date => {
        const pt: DataPoint = { date, label: fmtDate(date) };
        profiles.forEach(p => {
            const entry = (p.dailyStoryStats ?? []).find(d => d.date === date);
            pt[`${p.id}_stories`] = entry?.storyCount ?? 0;
        });
        return pt;
    });
}

function normalizeFollowers(profiles: ProfileSummary[]): DataPoint[] {
    const dateSet = new Set<string>();
    profiles.forEach(p => (p.followerHistory ?? []).forEach(h => dateSet.add(h.date)));
    const sorted = [...dateSet].sort();

    return sorted.map(date => {
        const pt: DataPoint = { date, label: fmtDate(date) };
        profiles.forEach(p => {
            const h = (p.followerHistory ?? []).find(e => e.date === date);
            pt[`${p.id}_followers`] = h?.followerCount ?? null;
        });
        return pt;
    });
}

function fmtWeek(iso: string): string {
    const [, m, d] = iso.split('-');
    const months = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function fmtDate(iso: string): string {
    const [, m, d] = iso.split('-');
    const months = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function tickInterval(dataLen: number): number {
    if (dataLen <= 8)  return 0;
    if (dataLen <= 16) return 1;
    if (dataLen <= 26) return 2;
    if (dataLen <= 52) return 3;
    return Math.ceil(dataLen / 13);
}

function barSize(dataLen: number, profileCount: number): number {
    return Math.max(4, Math.min(24, Math.floor(280 / (dataLen * profileCount + 1))));
}

const fmt = (v: number | null | undefined) =>
    v == null ? '—' : v % 1 === 0 ? String(v) : v.toFixed(1);

// ─── Styled components ────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const TabRow = styled.div`
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid ${st.border};
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const ChartTabBtn = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    padding: 13px 20px;
    font-size: ${st.fontSm};
    font-weight: ${p => p.$active ? 600 : 400};
    border: none;
    background: transparent;
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    border-bottom: 2px solid ${p => p.$active ? st.accentBlue : 'transparent'};
    margin-bottom: -1px;
    cursor: pointer;
    white-space: nowrap;
    transition: color ${st.transition}, border-color ${st.transition};
    font-family: inherit;

    &:hover { color: ${p => p.$active ? st.accentBlue : st.text}; }
`;

const Body = styled.div`
    padding: 20px 20px 8px;
`;

const ChartArea = styled.div`
    width: 100%;
    height: 280px;
`;

const SubChartArea = styled.div`
    width: 100%;
    height: 180px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed ${st.border};
`;

const SubLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${st.textMuted};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const LegendDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const EmptyState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 280px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    flex-direction: column;
    gap: 8px;
    text-align: center;
`;

const TooltipBox = styled.div`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowMd};
    padding: 10px 14px;
    font-size: 12px;
    min-width: 160px;
`;

const TooltipTitle = styled.div`
    font-weight: 700;
    color: ${st.text};
    margin-bottom: 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const TooltipRow = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${st.textSecondary};
    padding: 2px 0;

    &::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${p => p.$color};
        flex-shrink: 0;
    }
`;

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

interface TooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; payload: DataPoint }>;
    label?: string;
    profiles: ProfileSummary[];
    colorMap: Record<string, string>;
    mode: 'activity' | 'posts' | 'stories';
}

const WeeklyTooltip = ({ active, payload, label, profiles, colorMap, mode }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    const pt = payload[0]?.payload as DataPoint;
    return (
        <TooltipBox>
            <TooltipTitle>{label}</TooltipTitle>
            {profiles.map(p => {
                const color = colorMap[p.id] ?? '#888';
                if (mode === 'activity') {
                    const posts   = pt[`${p.id}_posts`]   as number ?? 0;
                    const stories = pt[`${p.id}_stories`] as number ?? 0;
                    return (
                        <TooltipRow key={p.id} $color={color}>
                            <span style={{ flex: 1 }}>@{p.username}</span>
                            <span>
                                <strong>{posts + stories}</strong>
                                <span style={{ color: st.textMuted }}> ({posts}p + <span style={{ color: STORIES_PINK }}>{stories}s</span>)</span>
                            </span>
                        </TooltipRow>
                    );
                }
                if (mode === 'posts') {
                    const posts    = pt[`${p.id}_posts`]    as number ?? 0;
                    const likes    = pt[`${p.id}_likes`]    as number | null;
                    const comments = pt[`${p.id}_comments`] as number | null;
                    return (
                        <TooltipRow key={p.id} $color={color}>
                            <span style={{ flex: 1 }}>@{p.username}</span>
                            <span>{posts} post{posts !== 1 ? 'y' : ''} · ❤️ {fmt(likes)} · 💬 {fmt(comments)}</span>
                        </TooltipRow>
                    );
                }
                const stories = pt[`${p.id}_stories`] as number ?? 0;
                return (
                    <TooltipRow key={p.id} $color={color}>
                        <span style={{ flex: 1 }}>@{p.username}</span>
                        <span><strong>{stories}</strong> stories</span>
                    </TooltipRow>
                );
            })}
        </TooltipBox>
    );
};

interface FollowerTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
    profiles: ProfileSummary[];
    colorMap: Record<string, string>;
}

const FollowerTooltip = ({ active, payload, label, profiles, colorMap }: FollowerTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
        <TooltipBox>
            <TooltipTitle>{label}</TooltipTitle>
            {profiles.map(p => {
                const entry = payload.find(x => x.name === `${p.id}_followers`);
                const color = colorMap[p.id] ?? '#888';
                return (
                    <TooltipRow key={p.id} $color={color}>
                        <span style={{ flex: 1 }}>@{p.username}</span>
                        <span><strong>{entry?.value != null ? entry.value.toLocaleString('pl-PL') : '—'}</strong></span>
                    </TooltipRow>
                );
            })}
        </TooltipBox>
    );
};

// ─── Chart renderers ──────────────────────────────────────────────────────────

const AXIS_STYLE = { fontSize: 11, fill: st.textMuted };
const GRID_PROPS = { stroke: st.border, strokeDasharray: '3 3' };

function ActivityChart({ weekData, profiles, colorMap }: { weekData: DataPoint[]; profiles: ProfileSummary[]; colorMap: Record<string, string> }) {
    const interval = tickInterval(weekData.length);
    const bs = barSize(weekData.length, profiles.length);
    return (
        <>
            <SubLabel>
                Posty + Stories na tydzień
                <LegendDot $color={STORIES_PINK} /> <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Stories</span>
            </SubLabel>
            <ChartArea>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weekData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" tick={AXIS_STYLE} interval={interval} />
                        <YAxis tick={AXIS_STYLE} allowDecimals={false} width={32} />
                        <Tooltip content={<WeeklyTooltip profiles={profiles} colorMap={colorMap} mode="activity" />} />
                        {profiles.flatMap(p => [
                            <Bar key={`${p.id}-posts`}   dataKey={`${p.id}_posts`}   stackId={p.id}
                                fill={colorMap[p.id]} radius={[0, 0, 0, 0]} barSize={bs} />,
                            <Bar key={`${p.id}-stories`} dataKey={`${p.id}_stories`} stackId={p.id}
                                fill={STORIES_PINK}   radius={[3, 3, 0, 0]} barSize={bs} />,
                        ])}
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartArea>
        </>
    );
}

function FollowerSubChart({ profiles, colorMap }: { profiles: ProfileSummary[]; colorMap: Record<string, string> }) {
    const dailyData = useMemo(() => normalizeFollowers(profiles), [profiles]);
    const interval  = tickInterval(dailyData.length);
    if (!dailyData.length) return null;
    return (
        <SubChartArea>
            <SubLabel>Trend obserwujących</SubLabel>
            <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" tick={AXIS_STYLE} interval={interval} />
                        <YAxis tick={AXIS_STYLE} width={48} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                        <Tooltip content={<FollowerTooltip profiles={profiles} colorMap={colorMap} />} />
                        {profiles.map(p => (
                            <Line key={p.id} type="monotone" dataKey={`${p.id}_followers`}
                                stroke={colorMap[p.id]} strokeWidth={2} dot={false}
                                name={`${p.id}_followers`} connectNulls />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </SubChartArea>
    );
}

function PostsChart({ weekData, profiles, colorMap }: { weekData: DataPoint[]; profiles: ProfileSummary[]; colorMap: Record<string, string> }) {
    const interval = tickInterval(weekData.length);
    const bs = barSize(weekData.length, profiles.length);
    return (
        <>
            <SubLabel>Posty / tydzień · Śr. lajki (tylko tygodnie z postami)</SubLabel>
            <ChartArea>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weekData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" tick={AXIS_STYLE} interval={interval} />
                        <YAxis yAxisId="left"  tick={AXIS_STYLE} allowDecimals={false} width={32} />
                        <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} width={48} />
                        <Tooltip content={<WeeklyTooltip profiles={profiles} colorMap={colorMap} mode="posts" />} />
                        {profiles.map(p => (
                            <Bar key={`bar-${p.id}`} yAxisId="left" dataKey={`${p.id}_posts`}
                                fill={colorMap[p.id]} radius={[3, 3, 0, 0]} name={p.username}
                                barSize={bs} />
                        ))}
                        {profiles.map(p => (
                            <Line key={`line-${p.id}`} yAxisId="right" type="monotone"
                                dataKey={`${p.id}_likes`} stroke={colorMap[p.id]}
                                strokeWidth={2} dot={false} strokeDasharray="4 2"
                                name={`${p.username} avg ❤️`} connectNulls />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartArea>
        </>
    );
}

function StoriesChart({
    weekData, dailyData, isDaily, profiles, colorMap,
}: {
    weekData: DataPoint[];
    dailyData: DataPoint[];
    isDaily: boolean;
    profiles: ProfileSummary[];
    colorMap: Record<string, string>;
}) {
    const data     = isDaily ? dailyData : weekData;
    const interval = tickInterval(data.length);
    const bs       = barSize(data.length, profiles.length);

    return (
        <>
            <SubLabel>
                Stories {isDaily ? '— granulacja dzienna (ostatnie 4 tygodnie)' : '— granulacja tygodniowa'}
            </SubLabel>
            <ChartArea>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" tick={AXIS_STYLE} interval={interval} />
                        <YAxis tick={AXIS_STYLE} allowDecimals={false} width={32} />
                        <Tooltip content={<WeeklyTooltip profiles={profiles} colorMap={colorMap} mode="stories" />} />
                        {profiles.map(p => (
                            <Bar key={p.id} dataKey={`${p.id}_stories`} name={p.username}
                                fill={colorMap[p.id]} radius={[3, 3, 0, 0]} barSize={bs} />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartArea>
        </>
    );
}

function FollowersChart({ profiles, colorMap }: { profiles: ProfileSummary[]; colorMap: Record<string, string> }) {
    const dailyData = useMemo(() => normalizeFollowers(profiles), [profiles]);
    const interval  = tickInterval(dailyData.length);
    if (!dailyData.length) return <EmptyState><span>Brak historii obserwujących</span></EmptyState>;
    return (
        <>
            <SubLabel>Obserwujący (dziennie)</SubLabel>
            <ChartArea>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" tick={AXIS_STYLE} interval={interval} />
                        <YAxis tick={AXIS_STYLE} width={52}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                        <Tooltip content={<FollowerTooltip profiles={profiles} colorMap={colorMap} />} />
                        <Legend formatter={(v) => {
                            const p = profiles.find(p => `${p.id}_followers` === v);
                            return p ? `@${p.username}` : v;
                        }} />
                        {profiles.map(p => (
                            <Line key={p.id} type="monotone" dataKey={`${p.id}_followers`}
                                stroke={colorMap[p.id]} strokeWidth={2.5} dot={false}
                                name={`${p.id}_followers`} connectNulls />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartArea>
        </>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS: { id: ChartTab; label: string }[] = [
    { id: 'activity',  label: 'Łączna aktywność' },
    { id: 'posts',     label: 'Posty'            },
    { id: 'stories',   label: 'Stories'          },
    { id: 'followers', label: 'Obserwujący'      },
];

export const TrendCharts = ({ profiles, colorMap, weeks }: Props) => {
    const [activeTab, setActiveTab] = useState<ChartTab>('activity');

    const weekData       = useMemo(() => normalizeWeekly(profiles),        [profiles]);
    const dailyStoryData = useMemo(() => normalizeDailyStories(profiles),  [profiles]);

    if (profiles.length === 0) {
        return (
            <Card>
                <TabRow>
                    {TABS.map(t => <ChartTabBtn key={t.id} $active={false} onClick={() => setActiveTab(t.id)}>{t.label}</ChartTabBtn>)}
                </TabRow>
                <Body>
                    <EmptyState>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={st.textMuted} strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" />
                        </svg>
                        <span>Wybierz co najmniej jeden profil powyżej</span>
                    </EmptyState>
                </Body>
            </Card>
        );
    }

    return (
        <Card>
            <TabRow>
                {TABS.map(t => (
                    <ChartTabBtn key={t.id} $active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </ChartTabBtn>
                ))}
            </TabRow>
            <Body>
                {activeTab === 'activity' && (
                    <>
                        <ActivityChart weekData={weekData} profiles={profiles} colorMap={colorMap} />
                        <FollowerSubChart profiles={profiles} colorMap={colorMap} />
                    </>
                )}
                {activeTab === 'posts' && (
                    <PostsChart weekData={weekData} profiles={profiles} colorMap={colorMap} />
                )}
                {activeTab === 'stories' && (
                    <StoriesChart
                        weekData={weekData}
                        dailyData={dailyStoryData}
                        isDaily={weeks === 4}
                        profiles={profiles}
                        colorMap={colorMap}
                    />
                )}
                {activeTab === 'followers' && (
                    <FollowersChart profiles={profiles} colorMap={colorMap} />
                )}
            </Body>
        </Card>
    );
};
