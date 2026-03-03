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

const PALETTE = [
    '#3B82F6',
    '#10B981',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#EF4444',
    '#06B6D4',
];

// ─── Styled ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const Header = styled.div`
    padding: 16px 20px 14px;
    border-bottom: 1px solid ${st.border};
`;

const CardTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const CardSub = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const Toggles = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-bottom: 1px solid ${st.border};
    flex-wrap: wrap;
`;

const ProfilePill = styled.button<{ $active: boolean; $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p => (p.$active ? p.$color : st.border)};
    background: ${p => (p.$active ? `${p.$color}18` : 'transparent')};
    color: ${p => (p.$active ? p.$color : st.textMuted)};

    &:hover {
        border-color: ${p => p.$color};
        color: ${p => p.$color};
    }
`;

const Dot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const ChartWrap = styled.div`
    height: 280px;
    padding: 16px 12px 8px 4px;

    @media (min-width: 640px) {
        height: 320px;
    }
`;

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const TipBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 10px 14px;
    box-shadow: ${st.shadowMd};
    min-width: 150px;
`;

const TipDate = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 7px;
`;

const TipRow = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 4px;
    &:last-child { margin-bottom: 0; }
`;

const TipDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const TipName = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    flex: 1;
`;

const TipVal = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const fmtWeek = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    return (
        <TipBox>
            <TipDate>{fmtWeek(label)}</TipDate>
            {payload.map(e => (
                <TipRow key={e.dataKey}>
                    <TipDot $color={e.color ?? st.accentBlue} />
                    <TipName>@{String(e.name).slice(0, 14)}</TipName>
                    <TipVal>{e.value} postów</TipVal>
                </TipRow>
            ))}
        </TipBox>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    summaries: ProfileSummary[];
}

export const EngagementTrendChart = ({ summaries }: Props) => {
    const [visibleIds, setVisibleIds] = useState<Set<string>>(
        () => new Set(summaries.map(s => s.id)),
    );

    const toggle = (id: string) =>
        setVisibleIds(prev => {
            const next = new Set(prev);
            if (next.has(id) && next.size > 1) next.delete(id);
            else next.add(id);
            return next;
        });

    const weekKeys = useMemo(() => {
        const all = new Set<string>();
        summaries.forEach(s => s.weeklyStats.forEach(w => all.add(w.weekStart)));
        return [...all].sort().slice(-12);
    }, [summaries]);

    const visible = summaries.filter(s => visibleIds.has(s.id));

    const chartData = useMemo(
        () =>
            weekKeys.map(weekStart => {
                const row: Record<string, string | number> = { weekStart };
                visible.forEach(s => {
                    const w = s.weeklyStats.find(x => x.weekStart === weekStart);
                    if (w) row[s.id] = w.postCount;
                });
                return row;
            }),
        [weekKeys, visible],
    );

    if (summaries.length === 0) return null;

    return (
        <Card>
            <Header>
                <CardTitle>Aktywność w czasie</CardTitle>
                <CardSub>Liczba postów opublikowanych w każdym tygodniu</CardSub>
            </Header>

            <Toggles>
                {summaries.map((s, idx) => {
                    const color = PALETTE[idx % PALETTE.length];
                    return (
                        <ProfilePill
                            key={s.id}
                            $active={visibleIds.has(s.id)}
                            $color={color}
                            onClick={() => toggle(s.id)}
                        >
                            <Dot $color={color} />
                            @{s.username}
                        </ProfilePill>
                    );
                })}
            </Toggles>

            <ChartWrap>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -4, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                        <XAxis
                            dataKey="weekStart"
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            tickLine={false}
                            axisLine={{ stroke: st.border }}
                            tickFormatter={fmtWeek}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {visible.map(s => {
                            const color = PALETTE[summaries.indexOf(s) % PALETTE.length];
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
        </Card>
    );
};
