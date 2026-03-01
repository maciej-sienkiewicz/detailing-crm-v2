/**
 * Operational Scorecard Component
 * Premium 4-KPI command strip — instant at-a-glance operational status.
 * Cards: In Progress · Ready for Pickup · Incoming Today · Abandoned (30 days)
 */

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatPhoneNumber, formatDate } from '@/common/utils/formatters';
import type { OperationalStats, VisitDetail } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type CardVariant = 'inProgress' | 'readyForPickup' | 'incomingToday' | 'abandoned';

interface CardConfig {
  accentColor: string;
  valueColor: string;
  bgTint: string;
}

const CARD_CONFIG: Record<CardVariant, CardConfig> = {
  inProgress: {
    accentColor: 'var(--brand-primary)',
    valueColor: 'var(--brand-primary)',
    bgTint: 'rgba(14, 165, 233, 0.03)',
  },
  readyForPickup: {
    accentColor: '#16a34a',
    valueColor: '#16a34a',
    bgTint: 'rgba(22, 163, 74, 0.03)',
  },
  incomingToday: {
    accentColor: '#d97706',
    valueColor: '#d97706',
    bgTint: 'rgba(217, 119, 6, 0.03)',
  },
  abandoned: {
    accentColor: '#dc2626',
    valueColor: '#dc2626',
    bgTint: 'rgba(220, 38, 38, 0.03)',
  },
};

interface OperationalScorecardProps {
  stats?: OperationalStats;
}

// ─── Styled Components ───────────────────────────────────────────────────────

const ScorecardContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const CardWrapper = styled.div`
  position: relative;
`;

const Card = styled.div<{ $variant: CardVariant; $isExpanded: boolean; $clickable: boolean }>`
  position: relative;
  background-color: ${(p) => CARD_CONFIG[p.$variant].bgTint};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-left: 4px solid ${(p) => CARD_CONFIG[p.$variant].accentColor};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.lg};
  box-shadow: ${(p) => p.theme.shadows.sm};
  box-sizing: border-box;
  width: 100%;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease,
    background-color 180ms ease;

  ${(p) =>
    p.$clickable &&
    css`
      cursor: pointer;
      user-select: none;

      &:hover {
        transform: translateY(-2px);
        box-shadow: ${p.theme.shadows.md};
        background-color: ${CARD_CONFIG[p.$variant].bgTint.replace('0.03', '0.06')};
      }
    `}

  ${(p) =>
    p.$isExpanded &&
    css`
      box-shadow: ${p.theme.shadows.md};
      border-color: ${CARD_CONFIG[p.$variant].accentColor};
    `}
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${(p) => p.theme.spacing.sm};
`;

const CardLabel = styled.span`
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  line-height: 1.4;
`;

const ExpandChevron = styled(ChevronDown)<{ $isExpanded: boolean }>`
  width: 16px;
  height: 16px;
  color: ${(p) => p.theme.colors.textMuted};
  flex-shrink: 0;
  margin-top: 1px;
  transition: transform 200ms ease;
  transform: ${(p) => (p.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const CardValue = styled.div<{ $variant: CardVariant }>`
  font-size: 42px;
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => CARD_CONFIG[p.$variant].valueColor};
  line-height: 1;
  margin-bottom: ${(p) => p.theme.spacing.sm};
  font-variant-numeric: tabular-nums;
`;

const CardSkeleton = styled.div`
  height: 44px;
  background: linear-gradient(
    90deg,
    ${(p) => p.theme.colors.surfaceAlt} 0%,
    ${(p) => p.theme.colors.surfaceHover} 50%,
    ${(p) => p.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: ${(p) => p.theme.radii.md};
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

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.spacing.xs};
  min-height: 22px;
`;

const OverdueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background-color: ${(p) => p.theme.colors.errorLight};
  color: ${(p) => p.theme.colors.error};
  border: 1px solid ${(p) => p.theme.colors.error};
  border-radius: ${(p) => p.theme.radii.full};
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};

  svg {
    width: 11px;
    height: 11px;
  }
`;

const SubLabel = styled.span<{ $variant: CardVariant }>`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  opacity: 0.85;
`;

const ClickHint = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  margin-top: ${(p) => p.theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: 3px;
`;

// ─── Expanded Visit List ──────────────────────────────────────────────────────

const ExpandedPanel = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: calc(100% + ${(p) => p.theme.spacing.sm});
  left: 0;
  right: 0;
  background-color: ${(p) => p.theme.colors.surface};
  border-radius: ${(p) => p.theme.radii.lg};
  box-shadow: ${(p) => p.theme.shadows.xl};
  border: 1px solid ${(p) => p.theme.colors.border};
  z-index: 20;
  max-height: 420px;
  overflow-y: auto;
  opacity: ${(p) => (p.$isVisible ? 1 : 0)};
  transform: ${(p) => (p.$isVisible ? 'translateY(0)' : 'translateY(-8px)')};
  pointer-events: ${(p) => (p.$isVisible ? 'auto' : 'none')};
  transition: opacity 200ms ease, transform 200ms ease;

  @media (max-width: ${(p) => p.theme.breakpoints.sm}) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 60vh;
    border-radius: ${(p) => p.theme.radii.lg} ${(p) => p.theme.radii.lg} 0 0;
  }
`;

const PanelHeader = styled.div`
  padding: ${(p) => p.theme.spacing.md};
  background-color: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const VisitRow = styled.div<{ $overdue?: boolean }>`
  padding: ${(p) => p.theme.spacing.md};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background-color: ${(p) => (p.$overdue ? p.theme.colors.errorLight : 'transparent')};
  transition: background-color 150ms ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${(p) =>
      p.$overdue ? 'rgba(254, 226, 226, 0.8)' : p.theme.colors.surfaceHover};
  }
`;

const VisitTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.spacing.md};
  flex-wrap: wrap;

  @media (min-width: ${(p) => p.theme.breakpoints.sm}) {
    flex-wrap: nowrap;
  }
`;

const VehicleName = styled.span`
  font-size: ${(p) => p.theme.fontSizes.md};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
`;

const VisitAmount = styled.span`
  font-size: ${(p) => p.theme.fontSizes.md};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: var(--brand-primary);
  margin-left: ${(p) => p.theme.spacing.md};
`;

const VisitSubRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: ${(p) => p.theme.spacing.xs};
`;

const CustomerText = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
`;

const PhoneText = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textMuted};
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
`;

const DateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  margin-top: 2px;
`;

const OverdueIcon = styled(Clock)`
  width: 12px;
  height: 12px;
  color: ${(p) => p.theme.colors.error};
`;

const ViewBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background-color: var(--brand-primary);
  color: white;
  border: none;
  border-radius: ${(p) => p.theme.radii.md};
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  cursor: pointer;
  transition: opacity 150ms ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    opacity: 0.88;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const EmptyPanel = styled.div`
  padding: ${(p) => p.theme.spacing.xl};
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: ${(p) => p.theme.fontSizes.sm};
`;

// ─── Visit List Sub-Component ─────────────────────────────────────────────────

const VisitList = ({
  visits,
  label,
  showActions = false,
}: {
  visits: VisitDetail[];
  label: string;
  showActions?: boolean;
}) => {
  const navigate = useNavigate();

  return (
    <>
      <PanelHeader>{label}</PanelHeader>
      {visits.length === 0 ? (
        <EmptyPanel>Brak wizyt</EmptyPanel>
      ) : (
        visits.map((visit) => {
          const isOverdue = Boolean(
            visit.estimatedCompletionDate && new Date(visit.estimatedCompletionDate) < new Date()
          );
          return (
            <VisitRow key={visit.id} $overdue={isOverdue}>
              <VisitTopRow>
                <div>
                  <VehicleName>
                    {visit.brand} {visit.model}
                  </VehicleName>
                  <VisitAmount>{formatCurrency(visit.amount)}</VisitAmount>
                </div>
                {showActions && (
                  <ViewBtn onClick={() => navigate(`/visits/${visit.id}`)}>
                    Otwórz
                    <ArrowRight />
                  </ViewBtn>
                )}
              </VisitTopRow>
              <VisitSubRow>
                <CustomerText>
                  {visit.customerFirstName} {visit.customerLastName}
                </CustomerText>
                {visit.phoneNumber && (
                  <PhoneText>{formatPhoneNumber(visit.phoneNumber)}</PhoneText>
                )}
                {visit.estimatedCompletionDate && (
                  <DateRow>
                    {isOverdue && <OverdueIcon />}
                    <span>
                      {t.dashboard.stats.estimatedCompletion}:{' '}
                      {formatDate(visit.estimatedCompletionDate)}
                    </span>
                  </DateRow>
                )}
              </VisitSubRow>
            </VisitRow>
          );
        })
      )}
    </>
  );
};

// ─── Single KPI Card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  variant: CardVariant;
  label: string;
  value: number;
  details?: VisitDetail[];
  expandKey: string;
  expandedCard: string | null;
  onToggle: (key: string) => void;
  overdueBadge?: number;
  subLabel?: string;
  showActions?: boolean;
}

const KpiCard = ({
  variant,
  label,
  value,
  details,
  expandKey,
  expandedCard,
  onToggle,
  overdueBadge,
  subLabel,
  showActions,
}: KpiCardProps) => {
  const isExpanded = expandedCard === expandKey;
  const isExpandable = !!details;

  return (
    <CardWrapper>
      <Card
        $variant={variant}
        $isExpanded={isExpanded}
        $clickable={isExpandable}
        onClick={() => isExpandable && onToggle(expandKey)}
      >
        <CardHeader>
          <CardLabel>{label}</CardLabel>
          {isExpandable && <ExpandChevron $isExpanded={isExpanded} />}
        </CardHeader>

        <CardValue $variant={variant}>{value}</CardValue>

        <BadgeRow>
          {typeof overdueBadge === 'number' && overdueBadge > 0 && (
            <OverdueBadge>
              <AlertTriangle />
              {t.dashboard.stats.overdue}: {overdueBadge}
            </OverdueBadge>
          )}
          {subLabel && <SubLabel $variant={variant}>{subLabel}</SubLabel>}
        </BadgeRow>

        {isExpandable && (
          <ClickHint>Kliknij aby zobaczyć szczegóły</ClickHint>
        )}
      </Card>

      {isExpandable && details && (
        <ExpandedPanel
          $isVisible={isExpanded}
          onClick={(e) => e.stopPropagation()}
        >
          <VisitList visits={details} label={label} showActions={showActions} />
        </ExpandedPanel>
      )}
    </CardWrapper>
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

const SkeletonCard = ({ variant }: { variant: CardVariant }) => (
  <Card $variant={variant} $isExpanded={false} $clickable={false}>
    <CardHeader>
      <CardSkeleton style={{ height: '14px', width: '60%' }} />
    </CardHeader>
    <CardSkeleton />
    <BadgeRow />
  </Card>
);

// ─── Overlay ─────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 15;
`;

// ─── Main Component ───────────────────────────────────────────────────────────

export const OperationalScorecard = ({ stats }: OperationalScorecardProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    setExpandedCard((prev) => (prev === key ? null : key));
  };

  const handleClose = () => setExpandedCard(null);

  return (
    <>
      <ScorecardContainer>
        {/* In Progress */}
        {stats ? (
          <KpiCard
            variant="inProgress"
            label={t.dashboard.stats.inProgress}
            value={stats.inProgress}
            details={stats.inProgressDetails}
            expandKey="inProgress"
            expandedCard={expandedCard}
            onToggle={handleToggle}
            overdueBadge={stats.overdue}
            showActions={true}
          />
        ) : (
          <SkeletonCard variant="inProgress" />
        )}

        {/* Ready for Pickup */}
        {stats ? (
          <KpiCard
            variant="readyForPickup"
            label={t.dashboard.stats.readyForPickup}
            value={stats.readyForPickup}
            details={stats.readyForPickupDetails}
            expandKey="readyForPickup"
            expandedCard={expandedCard}
            onToggle={handleToggle}
            showActions={true}
          />
        ) : (
          <SkeletonCard variant="readyForPickup" />
        )}

        {/* Incoming Today */}
        {stats ? (
          <KpiCard
            variant="incomingToday"
            label={t.dashboard.stats.arrivals}
            value={stats.incomingToday}
            details={stats.incomingTodayDetails}
            expandKey="incomingToday"
            expandedCard={expandedCard}
            onToggle={handleToggle}
          />
        ) : (
          <SkeletonCard variant="incomingToday" />
        )}

        {/* Abandoned (last 30 days) */}
        {stats ? (
          <KpiCard
            variant="abandoned"
            label={t.dashboard.stats.abandoned}
            value={stats.abandonedLast30Days}
            expandKey="abandoned"
            expandedCard={expandedCard}
            onToggle={handleToggle}
            subLabel={t.dashboard.stats.abandonedSubLabel}
          />
        ) : (
          <SkeletonCard variant="abandoned" />
        )}
      </ScorecardContainer>

      {/* Mobile overlay to close expanded panel */}
      {expandedCard && <Overlay onClick={handleClose} />}
    </>
  );
};
