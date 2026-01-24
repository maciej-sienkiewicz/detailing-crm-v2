/**
 * Operational Scorecard Component
 * Displays three high-contrast cards showing current operational statistics
 * with expandable hover lists showing detailed visit information
 */

import { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatPhoneNumber } from '@/common/utils/formatters';
import type { OperationalStats, VisitDetail } from '../types';

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

const StatCardWrapper = styled.div`
  position: relative;
`;

const StatCard = styled.div<{ $isExpanded: boolean }>`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  transition: transform ${(props) => props.theme.transitions.normal},
    box-shadow ${(props) => props.theme.transitions.normal},
    border-color ${(props) => props.theme.transitions.normal};
  cursor: pointer;
  user-select: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) => props.theme.shadows.lg};
    border-color: ${(props) => props.theme.colors.primary};
  }

  ${(props) =>
    props.$isExpanded &&
    `
    border-color: ${props.theme.colors.primary};
    box-shadow: ${props.theme.shadows.lg};
  `}
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.sm};
`;

const StatLabel = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  color: ${(props) => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ExpandIcon = styled(ChevronDown)<{ $isExpanded: boolean }>`
  width: 20px;
  height: 20px;
  color: ${(props) => props.theme.colors.primary};
  transition: transform ${(props) => props.theme.transitions.normal};
  transform: ${(props) => (props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)')};
  flex-shrink: 0;
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

const HintText = styled.div`
  font-size: ${(props) => props.theme.fontSizes.xs};
  color: ${(props) => props.theme.colors.textMuted};
  margin-top: ${(props) => props.theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.8;
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

const ExpandedList = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: calc(100% + ${(props) => props.theme.spacing.sm});
  left: 0;
  right: 0;
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  box-shadow: ${(props) => props.theme.shadows.xl};
  border: 1px solid ${(props) => props.theme.colors.primary};
  z-index: 10;
  max-height: 400px;
  overflow-y: auto;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  transform: ${(props) => (props.$isVisible ? 'translateY(0)' : 'translateY(-10px)')};
  pointer-events: ${(props) => (props.$isVisible ? 'auto' : 'none')};
  transition: opacity ${(props) => props.theme.transitions.normal},
    transform ${(props) => props.theme.transitions.normal};

  /* Mobile: full width */
  @media (max-width: ${(props) => props.theme.breakpoints.sm}) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 60vh;
    border-radius: ${(props) => props.theme.radii.lg} ${(props) => props.theme.radii.lg} 0 0;
  }
`;

const VisitItem = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  transition: background-color ${(props) => props.theme.transitions.fast};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const VehicleInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: ${(props) => props.theme.spacing.xs};
`;

const VehicleName = styled.div`
  font-size: ${(props) => props.theme.fontSizes.md};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
`;

const VisitAmount = styled.div`
  font-size: ${(props) => props.theme.fontSizes.md};
  font-weight: ${(props) => props.theme.fontWeights.bold};
  color: ${(props) => props.theme.colors.primary};
`;

const CustomerInfo = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: ${(props) => props.theme.spacing.xs};
`;

const PhoneInfo = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textMuted};
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
    monospace;
`;

const EmptyMessage = styled.div`
  padding: ${(props) => props.theme.spacing.lg};
  text-align: center;
  color: ${(props) => props.theme.colors.textMuted};
  font-size: ${(props) => props.theme.fontSizes.sm};
`;

const ListHeader = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.colors.surfaceAlt};
  border-bottom: 2px solid ${(props) => props.theme.colors.border};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.text};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const VisitList = ({ visits, label }: { visits: VisitDetail[]; label: string }) => {
  return (
    <>
      <ListHeader>{label}</ListHeader>
      {visits.length === 0 ? (
        <EmptyMessage>Brak wizyt</EmptyMessage>
      ) : (
        visits.map((visit) => (
          <VisitItem key={visit.id}>
            <VehicleInfo>
              <VehicleName>
                {visit.brand} {visit.model}
              </VehicleName>
              <VisitAmount>{formatCurrency(visit.amount)}</VisitAmount>
            </VehicleInfo>
            <CustomerInfo>
              {visit.customerFirstName} {visit.customerLastName}
            </CustomerInfo>
            {visit.phoneNumber && <PhoneInfo>{formatPhoneNumber(visit.phoneNumber)}</PhoneInfo>}
          </VisitItem>
        ))
      )}
    </>
  );
};

export const OperationalScorecard = ({ stats }: OperationalScorecardProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    setExpandedCard((prev) => (prev === cardId ? null : cardId));
  };

  const handleClose = () => {
    setExpandedCard(null);
  };

  return (
    <ScorecardContainer>
      {/* In Progress */}
      <StatCardWrapper>
        <StatCard
          $isExpanded={expandedCard === 'inProgress'}
          onClick={() => stats && handleCardClick('inProgress')}
        >
          <StatHeader>
            <StatLabel>{t.dashboard.stats.inProgress}</StatLabel>
            {stats && <ExpandIcon $isExpanded={expandedCard === 'inProgress'} />}
          </StatHeader>
          {stats ? (
            <>
              <StatValue>{stats.inProgress}</StatValue>
              <HintText>Kliknij aby zobaczyć szczegóły</HintText>
            </>
          ) : (
            <StatSkeleton />
          )}
        </StatCard>
        {stats && (
          <ExpandedList
            $isVisible={expandedCard === 'inProgress'}
            onClick={(e) => e.stopPropagation()}
          >
            <VisitList
              visits={stats.inProgressDetails}
              label={t.dashboard.stats.inProgress}
            />
          </ExpandedList>
        )}
      </StatCardWrapper>

      {/* Ready for Pickup */}
      <StatCardWrapper>
        <StatCard
          $isExpanded={expandedCard === 'readyForPickup'}
          onClick={() => stats && handleCardClick('readyForPickup')}
        >
          <StatHeader>
            <StatLabel>{t.dashboard.stats.readyForPickup}</StatLabel>
            {stats && <ExpandIcon $isExpanded={expandedCard === 'readyForPickup'} />}
          </StatHeader>
          {stats ? (
            <>
              <StatValue>{stats.readyForPickup}</StatValue>
              <HintText>Kliknij aby zobaczyć szczegóły</HintText>
            </>
          ) : (
            <StatSkeleton />
          )}
        </StatCard>
        {stats && (
          <ExpandedList
            $isVisible={expandedCard === 'readyForPickup'}
            onClick={(e) => e.stopPropagation()}
          >
            <VisitList
              visits={stats.readyForPickupDetails}
              label={t.dashboard.stats.readyForPickup}
            />
          </ExpandedList>
        )}
      </StatCardWrapper>

      {/* Incoming Today */}
      <StatCardWrapper>
        <StatCard
          $isExpanded={expandedCard === 'incomingToday'}
          onClick={() => stats && handleCardClick('incomingToday')}
        >
          <StatHeader>
            <StatLabel>{t.dashboard.stats.arrivals}</StatLabel>
            {stats && <ExpandIcon $isExpanded={expandedCard === 'incomingToday'} />}
          </StatHeader>
          {stats ? (
            <>
              <StatValue>{stats.incomingToday}</StatValue>
              <HintText>Kliknij aby zobaczyć szczegóły</HintText>
            </>
          ) : (
            <StatSkeleton />
          )}
        </StatCard>
        {stats && (
          <ExpandedList
            $isVisible={expandedCard === 'incomingToday'}
            onClick={(e) => e.stopPropagation()}
          >
            <VisitList
              visits={stats.incomingTodayDetails}
              label={t.dashboard.stats.arrivals}
            />
          </ExpandedList>
        )}
      </StatCardWrapper>

      {/* Overlay for mobile to close expanded list */}
      {expandedCard && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9,
            display: window.innerWidth < 640 ? 'block' : 'none',
          }}
        />
      )}
    </ScorecardContainer>
  );
};
