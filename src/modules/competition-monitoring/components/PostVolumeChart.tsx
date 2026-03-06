import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

// ─── Styled Components ────────────────────────────────────────────────────────

const ChartWrapper = styled.div`
    padding: 20px 20px 16px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
`;

const ChartHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: 12px;
    flex-wrap: wrap;
`;

const ChartTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const LegendDots = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    cursor: default;
`;

const LegendLine = styled.span<{ $color: string }>`
    display: inline-block;
    width: 20px;
    height: 3px;
    border-radius: 2px;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const EmptyChart = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
    st.accentBlue,
    st.accentGreen,
    '#8B5CF6',
    st.accentAmber,
    '#EC4899',
    '#06B6D4',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWeekLabel(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    } catch {
        return iso;
    }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({
    active,
    payload,
    label,
    profiles,
}: any) => {
    if (!active || !payload?.length) return null;

    return (
        <div
            style={{
                background: '#FFFFFF',
                border: `1px solid ${st.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 13,
                minWidth: 160,
                boxShadow: st.shadowMd,
            }}
        >
            <p
                style={{
                    margin: '0 0 10px',
                    fontWeight: 700,
                    color: st.text,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}
            >
                Tydzień od {label}
            </p>
            {payload.map((entry: any, idx: number) => (
                <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}
                >
                    <span
                        style={{
                            display: 'inline-block',
                            width: 10,
                            height: 3,
                            borderRadius: 2,
                            background: entry.stroke,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ color: st.textSecondary, fontSize: 12 }}>
                        @{entry.dataKey}
                    </span>
                    <span style={{ color: st.text, fontWeight: 700, marginLeft: 'auto', paddingLeft: 12 }}>
                        {entry.value ?? '–'}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const PostVolumeChart: React.FC<{ summaries: ProfileSummary[] }> = ({ summaries }) => {
    const { chartData, activeProfiles } = useMemo(() => {
        const weeksMap: Record<string, Record<string, number>> = {};

        summaries.forEach(profile => {
            profile.weeklyStats.forEach(stat => {
                if (!weeksMap[stat.weekStart]) {
                    weeksMap[stat.weekStart] = {};
                }
                weeksMap[stat.weekStart][profile.username] = stat.postCount;
            });
        });

        const data = Object.entries(weeksMap)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([weekStart, counts]) => ({
                name: formatWeekLabel(weekStart),
                ...counts,
            }));

        // Only include profiles that have at least one data point
        const active = summaries.filter(p =>
            p.weeklyStats.some(s => s.postCount > 0)
        );

        return { chartData: data, activeProfiles: active };
    }, [summaries]);

    if (chartData.length === 0) {
        return (
            <ChartWrapper>
                <EmptyChart>Brak danych do wyświetlenia wykresu</EmptyChart>
            </ChartWrapper>
        );
    }

    return (
        <ChartWrapper>
            <ChartHeader>
                <ChartTitle>Trend liczby postów tygodniowo</ChartTitle>
                <LegendDots>
                    {activeProfiles.map((p, idx) => (
                        <LegendItem key={p.id}>
                            <LegendLine $color={COLORS[idx % COLORS.length]} />
                            @{p.username}
                        </LegendItem>
                    ))}
                </LegendDots>
            </ChartHeader>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={st.border}
                        vertical={false}
                    />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: st.textMuted }}
                        tickLine={false}
                        axisLine={{ stroke: st.border }}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: st.textMuted }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={28}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: st.border, strokeWidth: 1 }}
                    />
                    {activeProfiles.map((profile, idx) => (
                        <Line
                            key={profile.id}
                            type="monotone"
                            dataKey={profile.username}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: COLORS[idx % COLORS.length], strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
};
