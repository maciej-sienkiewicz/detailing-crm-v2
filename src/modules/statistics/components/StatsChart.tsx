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
    return (
        <div
            style={{
                background: 'var(--surface, #fff)',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
            }}
        >
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.dataKey} style={{ margin: '2px 0', color: entry.color }}>
                    {entry.name}: {entry.dataKey === 'totalRevenueGross'
                        ? formatRevenue(entry.value)
                        : entry.value}
                </p>
            ))}
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
                    <YAxis
                        yAxisId="orders"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                        label={{ value: t.statistics.chart.ordersLabel, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }}
                    />
                    <YAxis
                        yAxisId="revenue"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={v => `${(v / 100).toFixed(0)} PLN`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        formatter={(value) => value === 'orderCount'
                            ? t.statistics.chart.ordersLabel
                            : t.statistics.chart.revenueLabel}
                    />
                    <Bar
                        yAxisId="orders"
                        dataKey="orderCount"
                        name={t.statistics.chart.ordersLabel}
                        fill="var(--brand-primary, #3B82F6)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                    />
                    <Line
                        yAxisId="revenue"
                        dataKey="totalRevenueGross"
                        name={t.statistics.chart.revenueLabel}
                        type="monotone"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#10B981' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
};
