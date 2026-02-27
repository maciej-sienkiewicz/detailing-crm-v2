// src/modules/statistics/components/StatsTotalsBar.tsx
import styled from 'styled-components';
import type { StatsTotals } from '../types';
import { t } from '@/common/i18n';

const Bar = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.md};
`;

const TotalCard = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

const TotalLabel = styled.p`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const TotalValue = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

interface StatsTotalsBarProps {
    totals: StatsTotals;
}

const formatRevenue = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

export const StatsTotalsBar = ({ totals }: StatsTotalsBarProps) => (
    <Bar>
        <TotalCard>
            <TotalLabel>{t.statistics.totals.orderCount}</TotalLabel>
            <TotalValue>{totals.orderCount}</TotalValue>
        </TotalCard>
        <TotalCard>
            <TotalLabel>{t.statistics.totals.revenueGross}</TotalLabel>
            <TotalValue>{formatRevenue(totals.totalRevenueGross)}</TotalValue>
        </TotalCard>
    </Bar>
);
