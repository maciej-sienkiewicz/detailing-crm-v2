import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useFinanceSummary } from '../hooks/useFinance';
import { formatMoney } from '../utils/formatters';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Card = styled.div<{ $accent: string; $bg: string }>`
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

const CardLabel = styled.span`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const CardValue = styled.span<{ $color: string }>`
  font-size: ${st.fontXxl};
  font-weight: 800;
  color: ${(p) => p.$color};
  font-feature-settings: 'tnum';
  line-height: 1;
  letter-spacing: -0.5px;
`;

const CardSub = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  margin-top: 2px;
`;

const SkeletonBox = styled.div<{ $width?: string; $height?: string }>`
  width: ${(p) => p.$width || '100%'};
  height: ${(p) => p.$height || '20px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 6px;
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
          <Card key={i} $accent={st.border} $bg={st.bgCard}>
            <SkeletonBox $height="11px" $width="55%" />
            <SkeletonBox $height="32px" $width="75%" />
            <SkeletonBox $height="11px" $width="40%" />
          </Card>
        ))}
      </CardsGrid>
    );
  }

  if (!summary) return null;

  return (
    <CardsGrid>
      <Card $accent={st.accentGreen} $bg={st.gradientCardGreen}>
        <CardLabel>Przychody</CardLabel>
        <CardValue $color={st.accentGreen}>{formatMoney(summary.totalRevenue)}</CardValue>
        <CardSub>opłacone faktury / paragony</CardSub>
      </Card>

      <Card $accent={st.accentRed} $bg={st.accentRedDim}>
        <CardLabel>Koszty</CardLabel>
        <CardValue $color={st.accentRed}>{formatMoney(summary.totalCosts)}</CardValue>
        <CardSub>opłacone faktury kosztowe</CardSub>
      </Card>

      <Card $accent={st.accentBlue} $bg={st.gradientCardBlue}>
        <CardLabel>Zysk</CardLabel>
        <CardValue $color={st.accentBlue}>{formatMoney(summary.profit)}</CardValue>
        <CardSub>przychody − koszty</CardSub>
      </Card>

      <Card $accent={st.accentAmber} $bg={st.accentAmberDim}>
        <CardLabel>Należności</CardLabel>
        <CardValue $color={st.accentAmber}>{formatMoney(summary.pendingReceivables)}</CardValue>
        <CardSub>
          {summary.overdueReceivables > 0
            ? `${summary.overdueReceivables} przeterminowane`
            : 'oczekujące płatności'}
        </CardSub>
      </Card>
    </CardsGrid>
  );
};
