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
import { useOutstandingBasis } from '../hooks/useOutstandingBasis';
import { formatMoney } from '../utils/formatters';
import { outstandingTile, type OutstandingSide } from '../utils/outstandingTile';

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

  @media (max-width: 639px) {
    gap: ${p => p.theme.spacing.sm};
  }

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

const OutstandingSub = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  width: 100%;
`;

/* Przełącznik netto/brutto: odcień bez wypełnienia (CLAUDE.md §2) - to ustawienie
   widoku, a nie krok następny. */
const BasisSwitch = styled.span`
  display: inline-flex;
  padding: 2px;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 999px;
  background: ${p => p.theme.colors.surface};
`;

const BasisOption = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 11px;
  font-weight: ${p => (p.$active ? 700 : 500)};
  color: ${p => (p.$active ? '#b45309' : p.theme.colors.textMuted)};
  background: ${p => (p.$active ? 'rgba(217, 119, 6, 0.12)' : 'transparent')};
  cursor: pointer;

  &:focus-visible { outline: 2px solid #d97706; outline-offset: 1px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  dateFrom?: string;
  dateTo?: string;
  /** Nad przychodami: ile klienci są winni; nad kosztami: ile Ty jesteś winien (utils/outstandingTile). */
  outstandingSide?: OutstandingSide;
}

export const FinanceSummaryCards: React.FC<Props> = ({ dateFrom, dateTo, outstandingSide = 'receivables' }) => {
  const { summary, isLoading } = useFinanceSummary(dateFrom, dateTo);
  const [basis, setBasis] = useOutstandingBasis();

  if (isLoading) {
    return (
      <CardsGrid>
        <StatTileSkeleton {...TILE_CONFIGS.revenue} compact />
        <StatTileSkeleton {...TILE_CONFIGS.costs} compact />
        <StatTileSkeleton {...TILE_CONFIGS.profit} compact />
        <StatTileSkeleton {...TILE_CONFIGS.receivables} compact />
      </CardsGrid>
    );
  }

  if (!summary) return null;

  const outstanding = outstandingTile(summary, outstandingSide, basis);

  return (
    <CardsGrid>
      <StatTile
        {...TILE_CONFIGS.revenue}
        compact
        value={formatMoney(summary.totalRevenue)}
        label="Przychody"
        subContent={<SubText>netto, opłacone faktury / paragony</SubText>}
      />

      <StatTile
        {...TILE_CONFIGS.costs}
        compact
        value={formatMoney(summary.totalCosts)}
        label="Koszty"
        subContent={<SubText>netto, opłacone faktury kosztowe</SubText>}
      />

      <StatTile
        {...TILE_CONFIGS.profit}
        compact
        value={formatMoney(summary.profit)}
        label="Zysk"
        subContent={<SubText>netto, przychody − koszty</SubText>}
      />

      <StatTile
        {...TILE_CONFIGS.receivables}
        compact
        value={formatMoney(outstanding.amountCents)}
        label={outstanding.label}
        subContent={
          <OutstandingSub>
            <SubText>{outstanding.note}</SubText>
            {outstanding.grossAvailable && (
              <BasisSwitch role="group" aria-label="Kwota należności">
                <BasisOption type="button" $active={outstanding.basis === 'net'} aria-pressed={outstanding.basis === 'net'} onClick={() => setBasis('net')}>
                  netto
                </BasisOption>
                <BasisOption type="button" $active={outstanding.basis === 'gross'} aria-pressed={outstanding.basis === 'gross'} onClick={() => setBasis('gross')}>
                  brutto
                </BasisOption>
              </BasisSwitch>
            )}
          </OutstandingSub>
        }
      />
    </CardsGrid>
  );
};
