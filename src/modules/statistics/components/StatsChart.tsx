// src/modules/statistics/components/StatsChart.tsx
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
    Legend,
} from 'recharts';
import type { StatsDataPoint } from '../types';
import { t } from '@/common/i18n';

const ChartWrapper = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

const EmptyChart = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: ${props => props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const revenue = payload.find((e: any) => e.dataKey === 'totalRevenueGross');
    const orders = payload.find((e: any) => e.dataKey === 'orderCount');
    return (
        <div
            style={{
                background: 'var(--surface, #fff)',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                minWidth: 160,
            }}
        >
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#0f172a' }}>{label}</p>
            {revenue && (
                <p style={{ margin: '0 0 4px', color: '#10B981', fontWeight: 600 }}>
                    {formatRevenue(revenue.value)}
                </p>
            )}
            {orders && (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                    {orders.value} {orders.value === 1 ? 'wizyta' : orders.value < 5 ? 'wizyty' : 'wizyt'}
                </p>
            )}
        </div>
    );
};

interface StatsChartProps {
    data: StatsDataPoint[];
}

export const StatsChart = ({ data }: StatsChartProps) => {
    if (data.length === 0) {
        return (
            <ChartWrapper>
                <EmptyChart>{t.statistics.chart.noData}</EmptyChart>
            </ChartWrapper>
        );
    }

    return (
        <ChartWrapper>
            <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                    />
                    {/* Left axis: revenue (bars) */}
                    <YAxis
                        yAxisId="revenue"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={v => {
                            const pln = v / 100;
                            return pln >= 1000 ? `${(pln / 1000).toFixed(0)}k` : `${pln.toFixed(0)}`;
                        }}
                        width={42}
                    />
                    {/* Right axis: order count (line) */}
                    <YAxis
                        yAxisId="orders"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                        width={32}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        formatter={(value) => value === t.statistics.chart.revenueLabel
                            ? t.statistics.chart.revenueLabel
                            : t.statistics.chart.ordersLabel}
                    />
                    {/* Bars = revenue */}
                    <Bar
                        yAxisId="revenue"
                        dataKey="totalRevenueGross"
                        name={t.statistics.chart.revenueLabel}
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                    />
                    {/* Line = visit count */}
                    <Line
                        yAxisId="orders"
                        dataKey="orderCount"
                        name={t.statistics.chart.ordersLabel}
                        type="monotone"
                        stroke="var(--brand-primary, #3B82F6)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--brand-primary, #3B82F6)' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
};
