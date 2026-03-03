import { useMemo } from 'react';
import styled from 'styled-components';
import {
    ScatterChart,
    Scatter,
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

const Legend = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 10px 20px;
    border-bottom: 1px solid ${st.border};
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
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const ChartWrap = styled.div`
    height: 280px;
    padding: 16px 16px 8px 4px;

    @media (min-width: 640px) {
        height: 320px;
    }
`;

const AxisLabel = styled.text`
    font-size: 11px;
    fill: ${st.textMuted};
`;

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const TipBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 10px 14px;
    box-shadow: ${st.shadowMd};
`;

const TipProfile = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${p => p.$color};
    margin-bottom: 6px;
`;

const TipDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
`;

const TipRow = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    margin-bottom: 3px;
    &:last-child { margin-bottom: 0; }

    strong {
        color: ${st.text};
        font-weight: 700;
    }
`;

function buildTooltip(profiles: { username: string; color: string }[]) {
    return function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload as { x: number; y: number; username: string };
        const profile = profiles.find(p => p.username === d.username);
        const color = profile?.color ?? st.accentBlue;
        return (
            <TipBox>
                <TipProfile $color={color}>
                    <TipDot $color={color} />
                    @{d.username}
                </TipProfile>
                <TipRow>Postów w tygodniu: <strong>{d.x}</strong></TipRow>
                <TipRow>Śr. polubień: <strong>{d.y}</strong></TipRow>
            </TipBox>
        );
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    summaries: ProfileSummary[];
}

export const CompetitionRanking = ({ summaries }: Props) => {
    const series = useMemo(
        () =>
            summaries.map((s, idx) => ({
                username: s.username,
                color: PALETTE[idx % PALETTE.length],
                data: s.weeklyStats
                    .filter(w => w.postCount > 0)
                    .map(w => ({
                        x: w.postCount,
                        y: Math.round(w.avgLikes),
                        username: s.username,
                    })),
            })),
        [summaries],
    );

    const profiles = series.map(s => ({ username: s.username, color: s.color }));
    const CustomTooltip = useMemo(() => buildTooltip(profiles), [summaries]);

    if (summaries.length === 0) return null;

    return (
        <Card>
            <Header>
                <CardTitle>Aktywność vs Zaangażowanie</CardTitle>
                <CardSub>Każdy punkt = jeden tydzień · oś X: liczba postów, oś Y: śr. polubień</CardSub>
            </Header>

            <Legend>
                {series.map(s => (
                    <LegendItem key={s.username}>
                        <LegendDot $color={s.color} />
                        @{s.username}
                    </LegendItem>
                ))}
            </Legend>

            <ChartWrap>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 20, left: -4, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={st.border} />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Posty"
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            tickLine={false}
                            axisLine={{ stroke: st.border }}
                            allowDecimals={false}
                            label={
                                <AxisLabel x={0} y={0} dy={16} textAnchor="middle" fill={st.textMuted}>
                                    postów w tygodniu
                                </AxisLabel>
                            }
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Polubienia"
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            tickLine={false}
                            axisLine={false}
                            width={38}
                            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        {series.map(s => (
                            <Scatter
                                key={s.username}
                                name={s.username}
                                data={s.data}
                                fill={s.color}
                                fillOpacity={0.75}
                                r={5}
                            />
                        ))}
                    </ScatterChart>
                </ResponsiveContainer>
            </ChartWrap>
        </Card>
    );
};
