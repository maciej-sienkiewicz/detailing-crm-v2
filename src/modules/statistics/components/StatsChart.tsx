// src/modules/statistics/components/StatsChart.tsx
// Wykres przychodów: cienki wrapper na wspólny TrendChart.
import type { StatsDataPoint } from '../types';
import { t } from '@/common/i18n';
import { st } from './StatisticsTheme';
import { TrendChart } from './shared/TrendChart';

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

const formatAxisRevenue = (grosz: number) => {
    const pln = grosz / 100;
    return pln >= 1000 ? `${(pln / 1000).toFixed(0)}k` : `${pln.toFixed(0)}`;
};

const formatVisits = (n: number) =>
    `${n} ${n === 1 ? 'wizyta' : n < 5 ? 'wizyty' : 'wizyt'}`;

interface StatsChartProps {
    data: StatsDataPoint[];
    onBarClick?: (period: string) => void;
}

export const StatsChart = ({ data, onBarClick }: StatsChartProps) => (
    <TrendChart
        title="Przychody i wizyty"
        data={data.map(d => ({
            period: d.period,
            value:  d.totalRevenueGross,
            count:  d.orderCount,
        }))}
        valueLabel={t.statistics.chart.revenueLabel}
        countLabel={t.statistics.chart.ordersLabel}
        valueColor={st.accentGreen}
        valueHoverColor="#059669"
        countColor={st.accentBlue}
        formatValue={formatRevenue}
        formatAxisValue={formatAxisRevenue}
        formatCount={formatVisits}
        emptyText={t.statistics.chart.noData}
        onBarClick={onBarClick}
        clickHint={onBarClick ? 'Kliknij dowolny okres na wykresie, aby zobaczyć szczegóły wizyt, także tam, gdzie przychód wynosi 0 zł' : undefined}
    />
);
