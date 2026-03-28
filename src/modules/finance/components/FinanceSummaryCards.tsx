import React from 'react';
import styled from 'styled-components';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Clock,
} from 'lucide-react';
import { StatTile, StatTileSkeleton } from '@/common/components/StatTile';
import { useFinanceSummary } from '../hooks/useFinance';
import { formatMoney } from '../utils/formatters';

// ─── Tile configs ─────────────────────────────────────────────────────────────

const TILE_CONFIGS = {
  revenue: {
    accentColor: '#16a34a',
    bgGradient: 'linear-gradient(140deg, #f0fdf4 0%, #ffffff 55%)',
    iconBg: 'rgba(22, 163, 74, 0.1)',
    icon: TrendingUp,
  },
  costs: {
    accentColor: '#dc2626',
    bgGradient: 'linear-gradient(140deg, #fef2f2 0%, #ffffff 55%)',
    iconBg: 'rgba(220, 38, 38, 0.1)',
    icon: TrendingDown,
  },
  profit: {
    accentColor: '#0ea5e9',
    bgGradient: 'linear-gradient(140deg, #f0f9ff 0%, #ffffff 55%)',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    icon: BarChart2,
  },
  receivables: {
    accentColor: '#d97706',
    bgGradient: 'linear-gradient(140deg, #fffbeb 0%, #ffffff 55%)',
    iconBg: 'rgba(217, 119, 6, 0.1)',
    icon: Clock,
  },
} as const;

// ─── Grid ─────────────────────────────────────────────────────────────────────

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${p => p.theme.spacing.md};
  margin-top: ${p => p.theme.spacing.md};

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// ─── Sub label ────────────────────────────────────────────────────────────────

const SubText = styled.span`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
  font-weight: 500;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  dateFrom?: string;
  dateTo?: string;
}

export const FinanceSummaryCards: React.FC<Props> = ({ dateFrom, dateTo }) => {
  const { summary, isLoading } = useFinanceSummary(dateFrom, dateTo);

  if (isLoading) {
    return (
      <CardsGrid>
        <StatTileSkeleton {...TILE_CONFIGS.revenue} />
        <StatTileSkeleton {...TILE_CONFIGS.costs} />
        <StatTileSkeleton {...TILE_CONFIGS.profit} />
        <StatTileSkeleton {...TILE_CONFIGS.receivables} />
      </CardsGrid>
    );
  }

  if (!summary) return null;

  return (
    <CardsGrid>
      <StatTile
        {...TILE_CONFIGS.revenue}
        value={formatMoney(summary.totalRevenue)}
        label="Przychody"
        subContent={<SubText>opłacone faktury / paragony</SubText>}
      />

      <StatTile
        {...TILE_CONFIGS.costs}
        value={formatMoney(summary.totalCosts)}
        label="Koszty"
        subContent={<SubText>opłacone faktury kosztowe</SubText>}
      />

      <StatTile
        {...TILE_CONFIGS.profit}
        value={formatMoney(summary.profit)}
        label="Zysk"
        subContent={<SubText>przychody − koszty</SubText>}
      />

      <StatTile
        {...TILE_CONFIGS.receivables}
        value={formatMoney(summary.pendingReceivables)}
        label="Należności"
        subContent={
          <SubText>
            {summary.overdueReceivables > 0
              ? `${summary.overdueReceivables} przeterminowane`
              : 'oczekujące płatności'}
          </SubText>
        }
      />
    </CardsGrid>
  );
};
