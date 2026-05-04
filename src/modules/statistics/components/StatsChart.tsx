// src/modules/statistics/components/StatsChart.tsx
import { useState } from 'react';
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
    Cell,
} from 'recharts';
import type { StatsDataPoint } from '../types';
import { t } from '@/common/i18n';
import { st } from './StatisticsTheme';

const ChartWrapper = styled.div`
    padding: 24px 24px 16px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
`;

const ChartHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
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
    gap: 16px;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const LegendDot = styled.span<{ $color: string; $variant?: 'bar' | 'line' }>`
    display: inline-block;
    width: ${p => p.$variant === 'line' ? '20px' : '10px'};
    height: ${p => p.$variant === 'line' ? '3px' : '10px'};
    border-radius: ${p => p.$variant === 'line' ? '2px' : '3px'};
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const ClickHint = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-left: auto;
    padding-right: 4px;
`;

const HintIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid ${st.border};
    font-size: 9px;
    color: ${st.textMuted};
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

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const revenue = payload.find((e: any) => e.dataKey === 'totalRevenueGross');
    const orders = payload.find((e: any) => e.dataKey === 'orderCount');
    return (
        <div
            style={{
                background: '#FFFFFF',
                border: `1px solid ${st.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 13,
                minWidth: 190,
                boxShadow: st.shadowMd,
            }}
        >
            <p style={{ margin: '0 0 10px', fontWeight: 700, color: st.text, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            {revenue && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: st.accentGreen, flexShrink: 0 }} />
                    <span style={{ color: st.accentGreen, fontWeight: 700, fontSize: 15 }}>
                        {formatRevenue(revenue.value)}
                    </span>
                </div>
            )}
            {orders && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 2, background: st.accentBlue, flexShrink: 0 }} />
                    <span style={{ color: st.textSecondary, fontSize: 13 }}>
                        {orders.value} {orders.value === 1 ? 'wizyta' : orders.value < 5 ? 'wizyty' : 'wizyt'}
                    </span>
                </div>
            )}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                paddingTop: 8,
                borderTop: `1px solid ${st.border}`,
                color: st.accentBlue,
                fontSize: 11,
                fontWeight: 600,
            }}>
                <span style={{ fontSize: 13 }}>↗</span>
                Kliknij, aby zobaczyć wizyty
            </div>
        </div>
    );
};

// ─── Custom bar shape ─────────────────────────────────────────────────────────

const ActiveBarShape = (props: any) => {
    const { x, y, width, height, fill, isActive } = props;
    if (!height || height <= 0) return null;
    return (
        <g>
            {isActive && (
                <rect
                    x={x - 3}
                    y={y - 4}
                    width={width + 6}
                    height={height + 4}
                    rx={7}
                    ry={7}
                    fill={st.accentGreen}
                    opacity={0.12}
                />
            )}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={5}
                ry={5}
                fill={isActive ? '#059669' : fill}
                opacity={isActive ? 1 : 0.85}
            />
        </g>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface StatsChartProps {
    data: StatsDataPoint[];
    onBarClick?: (period: string) => void;
}

export const StatsChart = ({ data, onBarClick }: StatsChartProps) => {
    const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

    if (data.length === 0) {
        return (
            <ChartWrapper>
                <EmptyChart>{t.statistics.chart.noData}</EmptyChart>
            </ChartWrapper>
        );
    }

    const handleBarClick = (barData: any) => {
        if (onBarClick && barData?.activePayload?.[0]?.payload?.period) {
            onBarClick(barData.activePayload[0].payload.period);
        }
    };

    return (
        <ChartWrapper>
            <ChartHeader>
                <ChartTitle>Przychody i wizyty</ChartTitle>
                <LegendDots>
                    <LegendItem>
                        <LegendDot $color={st.accentGreen} $variant="bar" />
                        {t.statistics.chart.revenueLabel}
                    </LegendItem>
                    <LegendItem>
                        <LegendDot $color={st.accentBlue} $variant="line" />
                        {t.statistics.chart.ordersLabel}
                    </LegendItem>
                    {onBarClick && (
                        <ClickHint>
                            <HintIcon>↗</HintIcon>
                            kliknij słupek
                        </ClickHint>
                    )}
                </LegendDots>
            </ChartHeader>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                    data={data}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    onClick={onBarClick ? handleBarClick : undefined}
                    style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                    onMouseMove={(state: any) => {
                        if (state?.activePayload?.[0]?.payload?.period) {
                            setHoveredPeriod(state.activePayload[0].payload.period);
                        }
                    }}
                    onMouseLeave={() => setHoveredPeriod(null)}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={st.border} vertical={false} />
                    <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12, fill: st.textMuted }}
                        tickLine={false}
                        axisLine={{ stroke: st.border }}
                    />
                    <YAxis
                        yAxisId="revenue"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: st.textMuted }}
                        tickFormatter={v => {
                            const pln = v / 100;
                            return pln >= 1000 ? `${(pln / 1000).toFixed(0)}k` : `${pln.toFixed(0)}`;
                        }}
                        width={42}
                    />
                    <YAxis
                        yAxisId="orders"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: st.textMuted }}
                        allowDecimals={false}
                        width={32}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.03)' }} />
                    <Bar
                        yAxisId="revenue"
                        dataKey="totalRevenueGross"
                        name={t.statistics.chart.revenueLabel}
                        fill={st.accentGreen}
                        maxBarSize={48}
                        shape={(props: any) => (
                            <ActiveBarShape
                                {...props}
                                isActive={props.period === hoveredPeriod}
                            />
                        )}
                    >
                        {data.map(entry => (
                            <Cell
                                key={entry.period}
                                fill={st.accentGreen}
                            />
                        ))}
                    </Bar>
                    <Line
                        yAxisId="orders"
                        dataKey="orderCount"
                        name={t.statistics.chart.ordersLabel}
                        type="monotone"
                        stroke={st.accentBlue}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: st.accentBlue, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
};
