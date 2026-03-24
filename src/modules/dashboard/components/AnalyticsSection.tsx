/**
 * Analytics Section Component
 * Premium business metrics: revenue, call activity, and Instagram activity.
 */

import styled, { keyframes } from 'styled-components';
import { TrendingUp, TrendingDown, DollarSign, Phone, Instagram } from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatNumber } from '@/common/utils/formatters';
import type { BusinessMetric } from '../types';

interface AnalyticsSectionProps {
  revenue?: BusinessMetric;
  callActivity?: BusinessMetric;
  instagramPhotos?: BusinessMetric;
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

const AnalyticsGrid = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${p => p.theme.spacing.md};
  margin-top: ${p => p.theme.spacing.md};

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: repeat(${p => Math.min(p.$count, 2)}, 1fr);
  }

  @media (min-width: ${p => p.theme.breakpoints.xl}) {
    grid-template-columns: repeat(${p => p.$count}, 1fr);
  }
`;

// ─── Card ─────────────────────────────────────────────────────────────────────

const MetricCard = styled.div`
  background: #ffffff;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.xl};
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  transition: transform 180ms ease, box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.06);
  }
`;

// ─── Header row ───────────────────────────────────────────────────────────────

const MetricHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
`;

const MetricMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const MetricCategory = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${p => p.theme.colors.textMuted};
`;

const MetricPeriod = styled.div`
  font-size: 12px;
  color: ${p => p.theme.colors.textMuted};
`;

const TrendChip = styled.div<{ $positive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  background: ${p => p.$positive
    ? 'rgba(22, 163, 74, 0.08)'
    : 'rgba(220, 38, 38, 0.08)'};
  color: ${p => p.$positive ? p.theme.colors.success : p.theme.colors.error};

  svg { width: 12px; height: 12px; stroke-width: 2.5; }
`;

// ─── Value row ────────────────────────────────────────────────────────────────

const MetricValueRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

const MetricValue = styled.div`
  font-size: 38px;
  font-weight: 800;
  color: ${p => p.theme.colors.text};
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1.5px;
`;

const MetricIconWrap = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${p => p.$color}12;
  border: 1px solid ${p => p.$color}22;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 24px;
    height: 24px;
    color: ${p => p.$color};
    stroke-width: 1.5;
  }
`;

// ─── Progress ─────────────────────────────────────────────────────────────────

const ProgressTrack = styled.div`
  height: 3px;
  background: ${p => p.theme.colors.border};
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 14px;
`;

const ProgressFill = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  width: ${p => Math.min(p.$percent, 100)}%;
  background: ${p => p.$color};
  border-radius: 99px;
  transition: width 800ms cubic-bezier(0.4, 0, 0.2, 1);
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

const MetricFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid ${p => p.theme.colors.border};
`;

const FooterLabel = styled.span`
  font-size: 12px;
  color: ${p => p.theme.colors.textSecondary};
`;

const FooterValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.colors.textSecondary};
  font-variant-numeric: tabular-nums;
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonCard = styled.div`
  background: #ffffff;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.xl};
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SkeletonLine = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '14px'};
  width: ${p => p.$w ?? '100%'};
  background: linear-gradient(
    90deg,
    ${p => p.theme.colors.surfaceAlt} 0%,
    ${p => p.theme.colors.surfaceHover} 50%,
    ${p => p.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: ${p => p.theme.radii.sm};
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatValue = (value: number, unit: string): string =>
  unit === 'PLN' ? formatCurrency(value) : formatNumber(value);

const getProgressPercent = (current: number, previous: number): number =>
  previous === 0 ? 0 : (current / previous) * 100;

// ─── Metric Card Component ────────────────────────────────────────────────────

const MetricItem = ({
  metric,
  title,
  period,
  icon: Icon,
  iconColor,
}: {
  metric: BusinessMetric;
  title: string;
  period: string;
  icon: typeof DollarSign;
  iconColor: string;
}) => {
  const isPositive = metric.deltaPercentage >= 0;
  const formattedDelta = Math.abs(metric.deltaPercentage).toFixed(1);
  const progressPercent = getProgressPercent(metric.currentValue, metric.previousValue);

  return (
    <MetricCard>
      <MetricHeader>
        <MetricMeta>
          <MetricCategory>{title}</MetricCategory>
          <MetricPeriod>{period}</MetricPeriod>
        </MetricMeta>
        <TrendChip $positive={isPositive}>
          {isPositive ? <TrendingUp /> : <TrendingDown />}
          {formattedDelta}%
        </TrendChip>
      </MetricHeader>

      <MetricValueRow>
        <MetricValue>{formatValue(metric.currentValue, metric.unit)}</MetricValue>
        <MetricIconWrap $color={iconColor}>
          <Icon />
        </MetricIconWrap>
      </MetricValueRow>

      <ProgressTrack>
        <ProgressFill $percent={progressPercent} $color={iconColor} />
      </ProgressTrack>

      <MetricFooter>
        <FooterLabel>{t.dashboard.metrics.realizedLastWeek}</FooterLabel>
        <FooterValue>{formatValue(metric.previousValue, metric.unit)}</FooterValue>
      </MetricFooter>
    </MetricCard>
  );
};

const MetricSkeleton = () => (
  <SkeletonCard>
    <SkeletonLine $w="55%" $h="11px" />
    <SkeletonLine $w="40px" $h="38px" />
    <SkeletonLine $h="3px" />
    <SkeletonLine $w="70%" $h="12px" />
  </SkeletonCard>
);

// ─── Main Export ──────────────────────────────────────────────────────────────

export const AnalyticsSection = ({
  revenue,
  callActivity,
  instagramPhotos,
}: AnalyticsSectionProps) => {
  const count = [revenue, callActivity, instagramPhotos].filter(Boolean).length || 3;

  return (
    <AnalyticsGrid $count={count}>
      {revenue ? (
        <MetricItem
          metric={revenue}
          title={t.dashboard.metrics.revenueTitle}
          period={t.dashboard.metrics.plannedThisWeek}
          icon={DollarSign}
          iconColor="#0ea5e9"
        />
      ) : <MetricSkeleton />}

      {callActivity ? (
        <MetricItem
          metric={callActivity}
          title={t.dashboard.metrics.callsTitle}
          period={t.dashboard.metrics.plannedThisWeek}
          icon={Phone}
          iconColor="#7c3aed"
        />
      ) : <MetricSkeleton />}

      {instagramPhotos ? (
        <MetricItem
          metric={instagramPhotos}
          title={t.dashboard.metrics.instagramTitle}
          period={t.dashboard.metrics.instagramSubLabel}
          icon={Instagram}
          iconColor="#e1306c"
        />
      ) : <MetricSkeleton />}
    </AnalyticsGrid>
  );
};
