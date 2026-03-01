/**
 * Analytics Section Component
 * Premium business metrics: revenue and call activity with trend comparison.
 */

import styled from 'styled-components';
import { TrendingUp, TrendingDown, DollarSign, Phone } from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatNumber } from '@/common/utils/formatters';
import type { BusinessMetric } from '../types';

interface AnalyticsSectionProps {
  revenue?: BusinessMetric;
  callActivity?: BusinessMetric;
}

// ─── Styled Components ───────────────────────────────────────────────────────

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MetricCard = styled.div`
  background-color: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.lg};
  box-shadow: ${(p) => p.theme.shadows.sm};
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.md};
`;

const MetricTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(p) => p.theme.spacing.md};
`;

const MetricIconWrap = styled.div<{ $color: string; $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${(p) => p.theme.radii.md};
  background-color: ${(p) => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
    color: ${(p) => p.$color};
  }
`;

const MetricTitleGroup = styled.div`
  flex: 1;
`;

const MetricTitle = styled.h3`
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0 0 2px 0;
`;

const MetricPeriod = styled.span`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
`;

const TrendBadge = styled.div<{ $positive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  border-radius: ${(p) => p.theme.radii.full};
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  background-color: ${(p) =>
    p.$positive ? p.theme.colors.successLight : p.theme.colors.errorLight};
  color: ${(p) => (p.$positive ? p.theme.colors.success : p.theme.colors.error)};
  flex-shrink: 0;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const CurrentValue = styled.div`
  font-size: 34px;
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${(p) => p.theme.colors.border};
`;

const CompareRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CompareLabel = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
`;

const CompareValue = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.textSecondary};
`;

const ProgressBar = styled.div`
  position: relative;
  height: 4px;
  background-color: ${(p) => p.theme.colors.surfaceAlt};
  border-radius: ${(p) => p.theme.radii.full};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number; $positive: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${(p) => Math.min(p.$percent, 100)}%;
  background-color: ${(p) => (p.$positive ? p.theme.colors.success : p.theme.colors.error)};
  border-radius: ${(p) => p.theme.radii.full};
  transition: width 600ms ease;
`;

const SkeletonCard = styled.div`
  background-color: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.lg};
  box-shadow: ${(p) => p.theme.shadows.sm};
`;

const SkeletonLine = styled.div<{ $w?: string; $h?: string }>`
  height: ${(p) => p.$h ?? '16px'};
  width: ${(p) => p.$w ?? '100%'};
  background: linear-gradient(
    90deg,
    ${(p) => p.theme.colors.surfaceAlt} 0%,
    ${(p) => p.theme.colors.surfaceHover} 50%,
    ${(p) => p.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: ${(p) => p.theme.radii.sm};
  margin-bottom: ${(p) => p.theme.spacing.sm};

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatValue = (value: number, unit: string): string => {
  if (unit === 'PLN') return formatCurrency(value);
  return formatNumber(value);
};

const getProgressPercent = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return (current / previous) * 100;
};

// ─── Metric Card Component ────────────────────────────────────────────────────

const MetricItem = ({
  metric,
  title,
  period,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  metric: BusinessMetric;
  title: string;
  period: string;
  icon: typeof DollarSign;
  iconColor: string;
  iconBg: string;
}) => {
  const isPositive = metric.deltaPercentage >= 0;
  const formattedDelta = Math.abs(metric.deltaPercentage).toFixed(1);
  const progressPercent = getProgressPercent(metric.currentValue, metric.previousValue);

  return (
    <MetricCard>
      <MetricTop>
        <MetricIconWrap $color={iconColor} $bg={iconBg}>
          <Icon />
        </MetricIconWrap>
        <MetricTitleGroup>
          <MetricTitle>{title}</MetricTitle>
          <MetricPeriod>{period}</MetricPeriod>
        </MetricTitleGroup>
        <TrendBadge $positive={isPositive}>
          {isPositive ? <TrendingUp /> : <TrendingDown />}
          {formattedDelta}%
        </TrendBadge>
      </MetricTop>

      <CurrentValue>{formatValue(metric.currentValue, metric.unit)}</CurrentValue>

      <ProgressBar>
        <ProgressFill $percent={progressPercent} $positive={isPositive} />
      </ProgressBar>

      <Divider />

      <CompareRow>
        <CompareLabel>{t.dashboard.metrics.realizedLastWeek}</CompareLabel>
        <CompareValue>{formatValue(metric.previousValue, metric.unit)}</CompareValue>
      </CompareRow>
    </MetricCard>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const AnalyticsSection = ({ revenue, callActivity }: AnalyticsSectionProps) => {
  return (
    <AnalyticsGrid>
      {revenue ? (
        <MetricItem
          metric={revenue}
          title={t.dashboard.metrics.revenueTitle}
          period={t.dashboard.metrics.plannedThisWeek}
          icon={DollarSign}
          iconColor="var(--brand-primary)"
          iconBg="rgba(14, 165, 233, 0.1)"
        />
      ) : (
        <SkeletonCard>
          <SkeletonLine $w="40px" $h="40px" />
          <SkeletonLine $w="60%" />
          <SkeletonLine $h="34px" $w="80%" />
          <SkeletonLine />
        </SkeletonCard>
      )}

      {callActivity ? (
        <MetricItem
          metric={callActivity}
          title={t.dashboard.metrics.callsTitle}
          period={t.dashboard.metrics.plannedThisWeek}
          icon={Phone}
          iconColor="#7c3aed"
          iconBg="rgba(124, 58, 237, 0.1)"
        />
      ) : (
        <SkeletonCard>
          <SkeletonLine $w="40px" $h="40px" />
          <SkeletonLine $w="60%" />
          <SkeletonLine $h="34px" $w="80%" />
          <SkeletonLine />
        </SkeletonCard>
      )}
    </AnalyticsGrid>
  );
};
