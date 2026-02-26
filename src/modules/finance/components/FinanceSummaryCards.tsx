import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useFinanceSummary } from '../hooks/useFinance';
import { formatMoney } from '../utils/formatters';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Card = styled.div<{ $accent?: string }>`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-left: 3px solid ${(p) => p.$accent || 'var(--brand-primary)'};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.xs};
`;

const CardLabel = styled.span`
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CardValue = styled.span`
  font-size: ${(p) => p.theme.fontSizes.xl};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  font-feature-settings: 'tnum';
`;

const CardSub = styled.span`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
`;

const SkeletonBox = styled.div<{ $width?: string; $height?: string }>`
  width: ${(p) => p.$width || '100%'};
  height: ${(p) => p.$height || '20px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

interface Props {
  dateFrom?: string;
  dateTo?: string;
}

export const FinanceSummaryCards: React.FC<Props> = ({ dateFrom, dateTo }) => {
  const { summary, isLoading } = useFinanceSummary(dateFrom, dateTo);

  if (isLoading) {
    return (
      <CardsGrid>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <SkeletonBox $height="12px" $width="60%" />
            <SkeletonBox $height="28px" $width="80%" />
            <SkeletonBox $height="12px" $width="40%" />
          </Card>
        ))}
      </CardsGrid>
    );
  }

  if (!summary) return null;

  return (
    <CardsGrid>
      <Card $accent="#22c55e">
        <CardLabel>Przychody</CardLabel>
        <CardValue>{formatMoney(summary.totalRevenue)}</CardValue>
        <CardSub>opłacone faktury / paragony</CardSub>
      </Card>

      <Card $accent="#ef4444">
        <CardLabel>Koszty</CardLabel>
        <CardValue>{formatMoney(summary.totalCosts)}</CardValue>
        <CardSub>opłacone faktury kosztowe</CardSub>
      </Card>

      <Card $accent="var(--brand-primary)">
        <CardLabel>Zysk</CardLabel>
        <CardValue>{formatMoney(summary.profit)}</CardValue>
        <CardSub>przychody − koszty</CardSub>
      </Card>

      <Card $accent="#f59e0b">
        <CardLabel>Należności</CardLabel>
        <CardValue>{formatMoney(summary.pendingReceivables)}</CardValue>
        <CardSub>
          {summary.overdueReceivables > 0
            ? `${summary.overdueReceivables} przeterminowane`
            : 'oczekujące płatności'}
        </CardSub>
      </Card>
    </CardsGrid>
  );
};
