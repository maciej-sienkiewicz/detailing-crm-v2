import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    type TooltipProps,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

// ─── Palette ──────────────────────────────────────────────────────────────────

const LINE_PALETTE = [
    '#3B82F6',
    '#10B981',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#EF4444',
    '#06B6D4',
];

// ─── Metric options ───────────────────────────────────────────────────────────

type Metric = 'avgLikes' | 'avgComments' | 'engagement';

const METRIC_LABELS: Record<Metric, string> = {
    avgLikes: 'Śr. polubień',
    avgComments: 'Śr. komentarzy',
    engagement: 'Wynik zaangażowania',
};

const metricValue = (metric: Metric, week: { avgLikes: number; avgComments: number }) => {
    if (metric === 'avgLikes') return Math.round(week.avgLikes);
    if (metric === 'avgComments') return Math.round(week.avgComments);
    return Math.round(week.avgLikes + week.avgComments * 2.5);
};

// ─── Styled components ────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px 14px;
    border-bottom: 1px solid ${st.border};
    flex-wrap: wrap;
`;

const TitleGroup = styled.div``;

const CardTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const CardSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const Controls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const MetricPill = styled.button<{ $active: boolean }>`
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlueDim : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

const Divider = styled.div`
    width: 1px;
    height: 20px;
    background: ${st.border};
`;

const WindowPill = styled.button<{ $active: boolean }>`
    padding: 5px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => p.$active ? st.borderFocus : st.border};
    background: ${p => p.$active ? st.bgAccentBlue : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    transition: all ${st.transition};
`;

const ToggleArea = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-bottom: 1px solid ${st.border};
    flex-wrap: wrap;
`;

const ToggleLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
`;

const ProfileToggle = styled.button<{ $active: boolean; $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p => p.$active ? p.$color : st.border};
    background: ${p => p.$active ? `${p.$color}18` : 'transparent'};
    color: ${p => p.$active ? p.$color : st.textMuted};

    &:hover {
        border-color: ${p => p.$color};
        color: ${p => p.$color};
    }
`;

const ToggleDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const ChartWrap = styled.div`
    height: 300px;
    padding: 16px 12px 8px 4px;

    @media (min-width: 640px) {
        height: 360px;
    }
`;

const EmptyState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 240px;
    flex-direction: column;
    gap: 8px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const TooltipBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 12px 16px;
    box-shadow: ${st.shadowMd};
    min-width: 170px;
`;

const TooltipTitle = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
`;

const TooltipRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
    &:last-child { margin-bottom: 0; }
`;

const TooltipDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const TooltipName = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
`;

const TooltipValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const formatWeekLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
};

const makeCustomTooltip = (metric: Metric) =>
    function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
        if (!active || !payload?.length) return null;
        return (
            <TooltipBox>
                <TooltipTitle>{formatWeekLabel(label)}</TooltipTitle>
                {payload.map(entry => (
                    <TooltipRow key={entry.dataKey}>
                        <TooltipDot $color={entry.color ?? st.accentBlue} />
                        <TooltipName>@{String(entry.name).slice(0, 12)}</TooltipName>
                        <TooltipValue>
                            {Math.round(entry.value as number)}
                            {metric === 'engagement' ? ' pkt' : ''}
                        </TooltipValue>
                    </TooltipRow>
                ))}
            </TooltipBox>
        );
    };

// ─── Component ────────────────────────────────────────────────────────────────

interface EngagementTrendChartProps {
    summaries: ProfileSummary[];
}

const WINDOW_OPTIONS = [
    { label: '4 tyg.', weeks: 4 },
    { label: '8 tyg.', weeks: 8 },
    { label: '12 tyg.', weeks: 12 },
];

export const EngagementTrendChart = ({ summaries }: EngagementTrendChartProps) => {
    const [metric, setMetric] = useState<Metric>('avgLikes');
    const [windowWeeks, setWindowWeeks] = useState(8);
    const [visibleIds, setVisibleIds] = useState<Set<string>>(
        () => new Set(summaries.map(s => s.id)),
    );

    const toggleProfile = (id: string) => {
        setVisibleIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                if (next.size > 1) next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const visibleSummaries = useMemo(
        () => summaries.filter(s => visibleIds.has(s.id)),
        [summaries, visibleIds],
    );

    // Build unified week keys from the union of all profiles' weekly stats
    const weekKeys = useMemo(() => {
        const allWeeks = new Set<string>();
        summaries.forEach(s => s.weeklyStats.forEach(w => allWeeks.add(w.weekStart)));
        return [...allWeeks].sort().slice(-windowWeeks);
    }, [summaries, windowWeeks]);

    const chartData = useMemo(() => {
        return weekKeys.map(weekStart => {
            const entry: Record<string, string | number> = { weekStart };
            visibleSummaries.forEach(s => {
                const week = s.weeklyStats.find(w => w.weekStart === weekStart);
                if (week) {
                    entry[s.id] = metricValue(metric, week);
                }
            });
            return entry;
        });
    }, [weekKeys, visibleSummaries, metric]);

    if (summaries.length === 0) return null;

    const CustomTooltip = useMemo(() => makeCustomTooltip(metric), [metric]);

    return (
        <Card>
            <Header>
                <TitleGroup>
                    <CardTitle>Trendy w czasie</CardTitle>
                    <CardSubtitle>Tygodniowa zmiana zaangażowania</CardSubtitle>
                </TitleGroup>
                <Controls>
                    {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
                        <MetricPill
                            key={m}
                            $active={metric === m}
                            onClick={() => setMetric(m)}
                        >
                            {METRIC_LABELS[m]}
                        </MetricPill>
                    ))}
                    <Divider />
                    {WINDOW_OPTIONS.map(opt => (
                        <WindowPill
                            key={opt.weeks}
                            $active={windowWeeks === opt.weeks}
                            onClick={() => setWindowWeeks(opt.weeks)}
                        >
                            {opt.label}
                        </WindowPill>
                    ))}
                </Controls>
            </Header>

            <ToggleArea>
                <ToggleLabel>Profile:</ToggleLabel>
                {summaries.map((s, idx) => {
                    const color = LINE_PALETTE[idx % LINE_PALETTE.length];
                    return (
                        <ProfileToggle
                            key={s.id}
                            $active={visibleIds.has(s.id)}
                            $color={color}
                            onClick={() => toggleProfile(s.id)}
                        >
                            <ToggleDot $color={color} />
                            @{s.username}
                        </ProfileToggle>
                    );
                })}
            </ToggleArea>

            {visibleSummaries.length === 0 ? (
                <EmptyState>
                    <span style={{ fontSize: 32, opacity: 0.3 }}>📉</span>
                    Wybierz co najmniej jeden profil
                </EmptyState>
            ) : (
                <ChartWrap>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -4, bottom: 5 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={st.border}
                                vertical={false}
                            />
                            <XAxis
                                dataKey="weekStart"
                                tick={{ fontSize: 11, fill: st.textMuted }}
                                tickLine={false}
                                axisLine={{ stroke: st.border }}
                                tickFormatter={formatWeekLabel}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: st.textMuted }}
                                tickLine={false}
                                axisLine={false}
                                width={38}
                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {visibleSummaries.map((s, idx) => {
                                const color = LINE_PALETTE[
                                    summaries.findIndex(x => x.id === s.id) % LINE_PALETTE.length
                                ];
                                return (
                                    <Line
                                        key={s.id}
                                        type="monotone"
                                        dataKey={s.id}
                                        name={s.username}
                                        stroke={color}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5, fill: color, stroke: st.bgCard, strokeWidth: 2 }}
                                        connectNulls
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartWrap>
            )}
        </Card>
    );
};
