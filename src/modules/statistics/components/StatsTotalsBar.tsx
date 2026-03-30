// src/modules/statistics/components/StatsTotalsBar.tsx
import styled from 'styled-components';
import { CalendarCheck, Banknote } from 'lucide-react';
import { StatTile } from '@/common/components/StatTile/StatTile';
import type { StatsTotals } from '../types';
import { t } from '@/common/i18n';

const Bar = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
`;

const Sub = styled.span`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

interface StatsTotalsBarProps {
    totals: StatsTotals;
}

export const StatsTotalsBar = ({ totals }: StatsTotalsBarProps) => (
    <Bar>
        <StatTile
            compact
            accentColor="#3B82F6"
            bgGradient="linear-gradient(135deg, #fff 0%, rgba(59,130,246,0.04) 100%)"
            iconBg="rgba(59,130,246,0.10)"
            icon={CalendarCheck}
            value={totals.orderCount}
            label={t.statistics.totals.orderCount}
            subContent={<Sub>zleceń w wybranym okresie</Sub>}
        />
        <StatTile
            compact
            accentColor="#10B981"
            bgGradient="linear-gradient(135deg, #fff 0%, rgba(16,185,129,0.04) 100%)"
            iconBg="rgba(16,185,129,0.10)"
            icon={Banknote}
            value={formatRevenue(totals.totalRevenueGross)}
            label={t.statistics.totals.revenueGross}
            subContent={<Sub>łączny przychód brutto</Sub>}
        />
    </Bar>
);
