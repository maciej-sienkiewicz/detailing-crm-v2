// src/modules/leads/components/LeadStatsBar.tsx
import React from 'react';
import styled from 'styled-components';
import { useLeadPipelineSummary } from '../hooks';
import { formatCurrency } from '../utils/formatters';
import type { LeadSource } from '../types';

// Icons
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const CurrencyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

// Styled components
const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.lg};
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};
`;

const IconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: ${props => props.theme.radii.md};
  background: ${props => props.$color}15;
  color: ${props => props.$color};
  flex-shrink: 0;
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StatLabel = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textSecondary};
  font-weight: ${props => props.theme.fontWeights.medium};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.span`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-feature-settings: 'tnum';
`;

const StatSubValue = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textSecondary};
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-feature-settings: 'tnum';
`;

const StatTrend = styled.div<{ $positive: boolean; $neutral?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.$neutral ? props.theme.colors.textMuted : (props.$positive ? '#16a34a' : '#dc2626')};
  margin-top: 2px;
`;

const TrendText = styled.span`
  color: ${props => props.theme.colors.textMuted};
  margin-left: 4px;
`;

const SkeletonCard = styled(StatCard)`
  min-height: 84px;
`;

const SkeletonLine = styled.div<{ $width?: string }>`
  height: 14px;
  width: ${props => props.$width || '100%'};
  background: ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.sm};
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const SkeletonValue = styled(SkeletonLine)`
  height: 24px;
  margin-top: 4px;
`;

interface LeadStatsBarProps {
  sourceFilter?: LeadSource[];
}

/**
 * LeadStatsBar - Displays key lead metrics in a horizontal stats bar
 */
export const LeadStatsBar: React.FC<LeadStatsBarProps> = ({ sourceFilter }) => {
  const { summary, isLoading } = useLeadPipelineSummary(sourceFilter);

  if (isLoading) {
    return (
      <StatsContainer>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i}>
            <IconWrapper $color="#94a3b8">
              <div style={{ width: 20, height: 20, background: '#e2e8f0', borderRadius: 4 }} />
            </IconWrapper>
            <StatContent>
              <SkeletonLine $width="80px" />
              <SkeletonValue $width="120px" />
            </StatContent>
          </SkeletonCard>
        ))}
      </StatsContainer>
    );
  }

  if (!summary) {
    return null;
  }

  // Calculate week-over-week difference for conversions
  const countDiff = summary.convertedThisWeekCount - summary.convertedPreviousWeekCount;
  const isPositiveTrend = countDiff > 0;
  const isNeutralTrend = countDiff === 0;

  return (
    <StatsContainer>
      {/* Active Leads */}
      <StatCard>
        <IconWrapper $color="#3b82f6">
          <UsersIcon />
        </IconWrapper>
        <StatContent>
          <StatLabel>Aktywne leady</StatLabel>
          <StatValue>{summary.activeLeadsCount}</StatValue>
        </StatContent>
      </StatCard>

      {/* Converted This Week */}
      <StatCard>
        <IconWrapper $color="#8b5cf6">
          <CheckCircleIcon />
        </IconWrapper>
        <StatContent>
          <StatLabel>Zrealizowane (tydzień)</StatLabel>
          <StatValue>{summary.convertedThisWeekCount}</StatValue>
          <StatSubValue>{formatCurrency(summary.convertedThisWeekValue)}</StatSubValue>
          <StatTrend $positive={isPositiveTrend} $neutral={isNeutralTrend}>
            {!isNeutralTrend && (isPositiveTrend ? <TrendUpIcon /> : <TrendDownIcon />)}
            {isNeutralTrend ? '—' : `${isPositiveTrend ? '+' : ''}${countDiff}`}
            <TrendText>vs poprzedni tydzień</TrendText>
          </StatTrend>
        </StatContent>
      </StatCard>

      {/* This Month Value */}
      <StatCard>
        <IconWrapper $color="#10b981">
          <CurrencyIcon />
        </IconWrapper>
        <StatContent>
          <StatLabel>Wartość (ten miesiąc)</StatLabel>
          <StatValue>{formatCurrency(summary.leadsValueThisMonth)}</StatValue>
        </StatContent>
      </StatCard>
    </StatsContainer>
  );
};
