/**
 * Operational Scorecard Component
 * Displays three high-contrast cards showing current operational statistics
 */

import styled from 'styled-components';
import { t } from '@/common/i18n';
import type { OperationalStats } from '../types';

interface OperationalScorecardProps {
  stats?: OperationalStats;
}

const ScorecardContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.md};

  @media (min-width: ${(props) => props.theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const StatCard = styled.div`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  transition: transform ${(props) => props.theme.transitions.normal},
    box-shadow ${(props) => props.theme.transitions.normal};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) => props.theme.shadows.lg};
  }
`;

const StatLabel = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: ${(props) => props.theme.spacing.sm};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: ${(props) => props.theme.fontSizes.xxxl};
  font-weight: ${(props) => props.theme.fontWeights.bold};
  color: ${(props) => props.theme.colors.primary};
  line-height: 1.2;

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    font-size: 40px;
  }
`;

const StatSkeleton = styled.div`
  height: 40px;
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

export const OperationalScorecard = ({ stats }: OperationalScorecardProps) => {
  return (
    <ScorecardContainer>
      <StatCard>
        <StatLabel>{t.dashboard.stats.inProgress}</StatLabel>
        {stats ? <StatValue>{stats.inProgress}</StatValue> : <StatSkeleton />}
      </StatCard>

      <StatCard>
        <StatLabel>{t.dashboard.stats.readyForPickup}</StatLabel>
        {stats ? <StatValue>{stats.readyForPickup}</StatValue> : <StatSkeleton />}
      </StatCard>

      <StatCard>
        <StatLabel>{t.dashboard.stats.arrivals}</StatLabel>
        {stats ? <StatValue>{stats.incomingToday}</StatValue> : <StatSkeleton />}
      </StatCard>
    </ScorecardContainer>
  );
};
