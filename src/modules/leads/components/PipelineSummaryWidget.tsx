// src/modules/leads/components/PipelineSummaryWidget.tsx
import React from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { useLeadPipelineSummary } from '../hooks/useLeads';
import { formatCurrency } from '../utils/formatters';

// Styled Components
const WidgetContainer = styled.div`
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: ${props => props.theme.radii.xl};
  padding: ${props => props.theme.spacing.lg};
  display: none;

  @media (min-width: ${props => props.theme.breakpoints.lg}) {
    display: block;
  }
`;

const WidgetTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TotalValue = styled.div`
  font-size: ${props => props.theme.fontSizes.xxxl};
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
  line-height: 1.1;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.sm};
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
`;

const StatDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$color};
  flex-shrink: 0;
`;

const StatLabel = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textSecondary};
`;

const StatValue = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.semibold};
  color: ${props => props.theme.colors.text};
  margin-left: auto;
`;

const LoadingSkeleton = styled.div`
  height: 20px;
  background: #e5e7eb;
  border-radius: 4px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

/**
 * Widget showing total pipeline potential value
 * Displays sum of estimatedValue for IN_PROGRESS leads
 */
export const PipelineSummaryWidget: React.FC = () => {
  const { summary, isLoading } = useLeadPipelineSummary();

  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Potencjał pipeline'u</WidgetTitle>
        <LoadingSkeleton style={{ width: '150px', height: '40px', marginBottom: '16px' }} />
        <StatsGrid>
          <LoadingSkeleton style={{ width: '100%', height: '24px' }} />
          <LoadingSkeleton style={{ width: '100%', height: '24px' }} />
          <LoadingSkeleton style={{ width: '100%', height: '24px' }} />
          <LoadingSkeleton style={{ width: '100%', height: '24px' }} />
        </StatsGrid>
      </WidgetContainer>
    );
  }

  if (!summary) {
    return null;
  }

  const totalValue = formatCurrency(summary.totalPipelineValue);

  return (
    <WidgetContainer>
      <WidgetTitle>Potencjał pipeline'u</WidgetTitle>
      <TotalValue>{totalValue}</TotalValue>

      <StatsGrid>
        <StatItem>
          <StatDot $color="#60a5fa" />
          <StatLabel>{t.leads?.status?.inProgress || 'W kontakcie'}</StatLabel>
          <StatValue>{summary.inProgressCount}</StatValue>
        </StatItem>

        <StatItem>
          <StatDot $color="#4ade80" />
          <StatLabel>{t.leads?.status?.converted || 'Zrealizowany'}</StatLabel>
          <StatValue>{summary.convertedCount}</StatValue>
        </StatItem>

        <StatItem>
          <StatDot $color="#9ca3af" />
          <StatLabel>{t.leads?.status?.abandoned || 'Odpuszczony'}</StatLabel>
          <StatValue>{summary.abandonedCount}</StatValue>
        </StatItem>
      </StatsGrid>
    </WidgetContainer>
  );
};
