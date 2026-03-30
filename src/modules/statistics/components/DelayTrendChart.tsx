// src/modules/statistics/components/DelayTrendChart.tsx
import styled from 'styled-components';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import type { DelayTrendPoint } from '../types';
import { st } from './StatisticsTheme';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    padding: 24px 24px 16px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 8px;
`;

const Title = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const LegendRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const LegendBar = styled.span<{ $color: string; $line?: boolean }>`
    display: inline-block;
    width: ${p => p.$line ? '20px' : '10px'};
    height: ${p => p.$line ? '3px' : '10px'};
    border-radius: ${p => p.$line ? '2px' : '3px'};
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const Empty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const fmtDays = (days: number) =>
    days < 1 ? `${Math.round(days * 24)} godz.` : `${days.toFixed(1)} dni`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const delay   = payload.find((e: any) => e.dataKey === 'avgDelayDays');
    const delayed = payload.find((e: any) => e.dataKey === 'delayedCount');
    const total   = payload.find((e: any) => e.dataKey === 'visitCount');

    return (
        <div style={{
            background: '#fff',
            border: `1px solid ${st.border}`,
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            minWidth: 180,
            boxShadow: st.shadowMd,
        }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, color: st.text, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </p>
            {delay && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 2, background: st.accentAmber, flexShrink: 0 }} />
                    <span style={{ color: st.accentAmber, fontWeight: 700, fontSize: 15 }}>
                        {fmtDays(delay.value)}
                    </span>
                    <span style={{ color: st.textMuted, fontSize: 12 }}>śr. opóźnienie</span>
                </div>
            )}
            {delayed && total && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: st.accentRed, opacity: 0.7, flexShrink: 0 }} />
                    <span style={{ color: st.textSecondary, fontSize: 13 }}>
                        {delayed.value} z {total.value} wizyt opóźnionych
                    </span>
                </div>
            )}
        </div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DelayTrendChartProps {
    data: DelayTrendPoint[];
    avgDelay: number;
}

export const DelayTrendChart = ({ data, avgDelay }: DelayTrendChartProps) => {
    if (data.length === 0) {
        return (
            <Wrapper>
                <Empty>Brak danych do wyświetlenia wykresu</Empty>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            <Header>
                <Title>Trend opóźnień w czasie</Title>
                <LegendRow>
                    <LegendItem>
                        <LegendBar $color={`${st.accentRed}99`} />
                        Wizyty z opóźnieniem
                    </LegendItem>
                    <LegendItem>
                        <LegendBar $color={st.accentAmber} $line />
                        Śr. opóźnienie (dni)
                    </LegendItem>
                </LegendRow>
            </Header>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                    <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12, fill: st.textMuted }}
                        tickLine={false}
                        axisLine={{ stroke: st.border }}
                    />
                    <YAxis
                        yAxisId="count"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: st.textMuted }}
                        allowDecimals={false}
                        width={32}
                    />
                    <YAxis
                        yAxisId="days"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: st.textMuted }}
                        tickFormatter={v => `${v.toFixed(1)}d`}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.03)' }} />
                    {/* Average reference line */}
                    <ReferenceLine
                        yAxisId="days"
                        y={avgDelay}
                        stroke={st.accentAmber}
                        strokeDasharray="6 3"
                        strokeWidth={1.5}
                        label={{
                            value: `śr. ${fmtDays(avgDelay)}`,
                            position: 'insideTopRight',
                            fill: st.accentAmber,
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    />
                    <Bar
                        yAxisId="count"
                        dataKey="delayedCount"
                        name="Wizyty z opóźnieniem"
                        fill={st.accentRed}
                        opacity={0.65}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                    <Line
                        yAxisId="days"
                        dataKey="avgDelayDays"
                        name="Śr. opóźnienie"
                        type="monotone"
                        stroke={st.accentAmber}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: st.accentAmber, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </Wrapper>
    );
};
