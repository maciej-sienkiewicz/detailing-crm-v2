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
    padding: 24px 24px 0;
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
    flex-wrap: wrap;
    gap: 8px;
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

const EmptyChart = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

// Stały hint pod wykresem — nie ucieka, bo nie jest tooltipem
const ClickHintBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 0 10px;
    border-top: 1px solid ${st.border};
    margin-top: 8px;
    font-size: 11px;
    color: ${st.textMuted};
`;

const HintDot = styled.span`
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${st.accentGreen};
    opacity: 0.25;
    flex-shrink: 0;
`;

// ─── Tooltip — tylko dane, bez CTA ───────────────────────────────────────────

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

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
                minWidth: 170,
                boxShadow: st.shadowMd,
                pointerEvents: 'none', // tooltip nigdy nie przechwytuje kliknięć
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 2, background: st.accentBlue, flexShrink: 0 }} />
                    <span style={{ color: st.textSecondary, fontSize: 13 }}>
                        {orders.value} {orders.value === 1 ? 'wizyta' : orders.value < 5 ? 'wizyty' : 'wizyt'}
                    </span>
                </div>
            )}
        </div>
    );
};

// ─── Custom bar shape z hover glow ────────────────────────────────────────────

const ActiveBarShape = (props: any) => {
    const { x, y, width, height, fill, isHovered } = props;
    if (!height || height <= 0) return null;
    return (
        <g style={{ cursor: 'pointer' }}>
            {isHovered && (
                <rect
                    x={x - 4}
                    y={y - 6}
                    width={width + 8}
                    height={height + 6}
                    rx={8}
                    ry={8}
                    fill={st.accentGreen}
                    opacity={0.14}
                />
            )}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={5}
                ry={5}
                fill={isHovered ? '#059669' : fill}
                opacity={isHovered ? 1 : 0.85}
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
                </LegendDots>
            </ChartHeader>

            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                    data={data}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    onMouseMove={(state: any) => {
                        const period = state?.activePayload?.[0]?.payload?.period ?? null;
                        setHoveredPeriod(period);
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
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                    />
                    <Bar
                        yAxisId="revenue"
                        dataKey="totalRevenueGross"
                        name={t.statistics.chart.revenueLabel}
                        fill={st.accentGreen}
                        maxBarSize={48}
                        // onClick na Bar — Recharts daje data.period bezpośrednio
                        onClick={(data: any) => onBarClick?.(data.period)}
                        shape={(props: any) => (
                            <ActiveBarShape
                                {...props}
                                isHovered={props.period === hoveredPeriod}
                            />
                        )}
                    >
                        {data.map(entry => (
                            <Cell key={entry.period} fill={st.accentGreen} />
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

            {onBarClick && (
                <ClickHintBar>
                    <HintDot />
                    Kliknij dowolny słupek, aby zobaczyć szczegóły wizyt z danego okresu
                </ClickHintBar>
            )}
        </ChartWrapper>
    );
};
