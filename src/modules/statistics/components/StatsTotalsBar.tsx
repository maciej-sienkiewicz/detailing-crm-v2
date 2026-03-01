// src/modules/statistics/components/StatsTotalsBar.tsx
import styled from 'styled-components';
import type { StatsTotals } from '../types';
import { t } from '@/common/i18n';
import { st } from './StatisticsTheme';

const Bar = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
`;

const KpiCard = styled.div<{ $accent: string; $bg: string }>`
    background: ${(p) => p.$bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    overflow: hidden;
    box-shadow: ${st.shadowSm};
    transition: box-shadow ${st.transition}, transform ${st.transition};

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: ${(p) => p.$accent};
        border-radius: 0 2px 2px 0;
    }

    &:hover {
        box-shadow: ${st.shadowMd};
        transform: translateY(-1px);
    }
`;

const KpiLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const KpiValue = styled.span<{ $color: string }>`
    font-size: ${st.fontHero};
    font-weight: 800;
    color: ${(p) => p.$color};
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
`;

const KpiDetail = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 2px;
`;

interface StatsTotalsBarProps {
    totals: StatsTotals;
}

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

export const StatsTotalsBar = ({ totals }: StatsTotalsBarProps) => (
    <Bar>
        <KpiCard $accent={st.accentBlue} $bg={st.gradientCardBlue}>
            <KpiLabel>{t.statistics.totals.orderCount}</KpiLabel>
            <KpiValue $color={st.accentBlue}>{totals.orderCount}</KpiValue>
            <KpiDetail>zleceń w wybranym okresie</KpiDetail>
        </KpiCard>
        <KpiCard $accent={st.accentGreen} $bg={st.gradientCardGreen}>
            <KpiLabel>{t.statistics.totals.revenueGross}</KpiLabel>
            <KpiValue $color={st.accentGreen}>{formatRevenue(totals.totalRevenueGross)}</KpiValue>
            <KpiDetail>łączny przychód brutto</KpiDetail>
        </KpiCard>
    </Bar>
);
