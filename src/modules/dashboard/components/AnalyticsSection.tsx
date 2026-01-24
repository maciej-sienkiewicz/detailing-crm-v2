/**
 * Analytics Section Component
 * Displays revenue and call activity metrics with week-over-week comparison
 */

import styled from 'styled-components';
import { TrendingUp, TrendingDown, Phone } from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatNumber } from '@/common/utils/formatters';
import type { BusinessMetric } from '../types';

interface AnalyticsSectionProps {
  revenue?: BusinessMetric;
  callActivity?: BusinessMetric;
}

const AnalyticsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.md};

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MetricCard = styled.div`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.md};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const MetricTitle = styled.h3`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
  margin: 0;
`;

const TrendBadge = styled.div<{ $isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.radii.full};
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  background-color: ${(props) =>
    props.$isPositive ? props.theme.colors.successLight : props.theme.colors.errorLight};
  color: ${(props) => (props.$isPositive ? props.theme.colors.success : props.theme.colors.error)};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ComparisonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const ValueRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: ${(props) => props.theme.spacing.sm} 0;
`;

const ValueLabel = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  color: ${(props) => props.theme.colors.textSecondary};
`;

const ValueAmount = styled.div<{ $isPrimary?: boolean }>`
  font-size: ${(props) => (props.$isPrimary ? props.theme.fontSizes.xxl : props.theme.fontSizes.lg)};
  font-weight: ${(props) => props.theme.fontWeights.bold};
  color: ${(props) => (props.$isPrimary ? props.theme.colors.primary : props.theme.colors.text)};
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${(props) => props.theme.colors.border};
  margin: ${(props) => props.theme.spacing.sm} 0;
`;

const MetricSkeleton = styled.div`
  height: 120px;
  background: linear-gradient(
    90deg,
    ${(props) => props.theme.colors.surfaceAlt} 0%,
    ${(props) => props.theme.colors.surfaceHover} 50%,
    ${(props) => props.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: ${(props) => props.theme.radii.md};

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const formatMetricValue = (value: number, unit: string): string => {
  if (unit === 'PLN') {
    return formatCurrency(value);
  }
  return formatNumber(value);
};

const MetricComparison = ({
  metric,
  title,
}: {
  metric: BusinessMetric;
  title: string;
}) => {
  const isPositive = metric.deltaPercentage >= 0;
  const formattedDelta = Math.abs(metric.deltaPercentage).toFixed(1);

  return (
    <MetricCard>
      <MetricHeader>
        <MetricTitle>{title}</MetricTitle>
        <TrendBadge $isPositive={isPositive}>
          {isPositive ? <TrendingUp /> : <TrendingDown />}
          {formattedDelta}%
        </TrendBadge>
      </MetricHeader>

      <ComparisonContainer>
        <ValueRow>
          <ValueLabel>{t.dashboard.metrics.plannedThisWeek}</ValueLabel>
          <ValueAmount $isPrimary>
            {formatMetricValue(metric.currentValue, metric.unit)}
          </ValueAmount>
        </ValueRow>

        <Divider />

        <ValueRow>
          <ValueLabel>{t.dashboard.metrics.realizedLastWeek}</ValueLabel>
          <ValueAmount>{formatMetricValue(metric.previousValue, metric.unit)}</ValueAmount>
        </ValueRow>
      </ComparisonContainer>
    </MetricCard>
  );
};

export const AnalyticsSection = ({ revenue, callActivity }: AnalyticsSectionProps) => {
  return (
    <AnalyticsContainer>
      {revenue ? (
        <MetricComparison metric={revenue} title={t.dashboard.metrics.revenueTitle} />
      ) : (
        <MetricCard>
          <MetricSkeleton />
        </MetricCard>
      )}

      {callActivity ? (
        <MetricComparison metric={callActivity} title={t.dashboard.metrics.callsTitle} />
      ) : (
        <MetricCard>
          <MetricSkeleton />
        </MetricCard>
      )}
    </AnalyticsContainer>
  );
};
