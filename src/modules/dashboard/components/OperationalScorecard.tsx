/**
 * Operational Scorecard Component
 * Premium 4-KPI command strip — instant at-a-glance operational status.
 * Cards: In Progress · Ready for Pickup · Incoming Today · Abandoned (30 days)
 */

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ExternalLink, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
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

// ─── Animations ──────────────────────────────────────────────────────────────

const panelFadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Scorecard Grid ───────────────────────────────────────────────────────────

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

// ─── KPI Card ────────────────────────────────────────────────────────────────

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
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
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

  svg { width: 11px; height: 11px; }
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

// ─── Expanded Panel ───────────────────────────────────────────────────────────

const ExpandedPanel = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  min-width: 320px;
  background-color: ${(p) => p.theme.colors.surface};
  border-radius: ${(p) => p.theme.radii.lg};
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid ${(p) => p.theme.colors.border};
  z-index: 20;
  max-height: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: ${(p) => (p.$isVisible ? 1 : 0)};
  pointer-events: ${(p) => (p.$isVisible ? 'auto' : 'none')};
  animation: ${(p) => (p.$isVisible ? panelFadeIn : 'none')} 180ms ease both;

  @media (max-width: ${(p) => p.theme.breakpoints.sm}) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    min-width: unset;
    max-height: 70vh;
    border-radius: ${(p) => p.theme.radii.lg} ${(p) => p.theme.radii.lg} 0 0;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;
`;

const PanelTitle = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PanelCount = styled.span<{ $variant: CardVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background-color: ${(p) => CARD_CONFIG[p.$variant].accentColor}18;
  color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
  border-radius: ${(p) => p.theme.radii.full};
  font-size: 11px;
  font-weight: ${(p) => p.theme.fontWeights.bold};
`;

const VisitScrollArea = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const EmptyPanel = styled.div`
  padding: ${(p) => p.theme.spacing.xl};
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: ${(p) => p.theme.fontSizes.sm};
`;

// ─── Visit Item ───────────────────────────────────────────────────────────────

const VisitItem = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  border-left: 3px solid ${(p) => (p.$overdue ? p.theme.colors.error : 'transparent')};
  transition: background-color 120ms ease;

  &:last-child { border-bottom: none; }

  &:hover {
    background-color: ${(p) => p.theme.colors.surfaceHover};
  }
`;

const BrandAvatar = styled.div<{ $variant: CardVariant }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  background-color: ${(p) => CARD_CONFIG[p.$variant].accentColor}15;
  border: 1.5px solid ${(p) => CARD_CONFIG[p.$variant].accentColor}35;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
  flex-shrink: 0;
  margin-top: 1px;
`;

const VisitBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const VisitMainRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const VehicleName = styled.span`
  font-size: ${(p) => p.theme.fontSizes.md};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
`;

const VisitAmount = styled.span`
  font-size: ${(p) => p.theme.fontSizes.md};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: var(--brand-primary);
  white-space: nowrap;
  flex-shrink: 0;
`;

const VisitSecondRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  flex-wrap: wrap;
`;

const CustomerName = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
`;

const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: ${(p) => p.theme.colors.textMuted};
  flex-shrink: 0;
`;

const PhoneChip = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  letter-spacing: -0.3px;
`;

const DateLine = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  font-size: 11px;
  font-weight: ${(p) => (p.$overdue ? p.theme.fontWeights.semibold : p.theme.fontWeights.normal)};
  color: ${(p) => (p.$overdue ? p.theme.colors.error : p.theme.colors.textMuted)};

  svg { width: 11px; height: 11px; flex-shrink: 0; }
`;

const OpenButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  min-width: 30px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: transparent;
  color: ${(p) => p.theme.colors.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  align-self: center;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;

  svg { width: 14px; height: 14px; }

  &:hover {
    background-color: var(--brand-primary);
    color: white;
    border-color: var(--brand-primary);
  }
`;

const PanelFooter = styled.div`
  padding: 10px 16px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background-color: ${(p) => p.theme.colors.surfaceAlt};
  flex-shrink: 0;
`;

const ViewAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: var(--brand-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 120ms ease;

  svg { width: 13px; height: 13px; }

  &:hover { opacity: 0.72; }
`;

// ─── Visit Row Component ──────────────────────────────────────────────────────

const VisitRow = ({
  visit,
  variant,
  showActions,
  onOpen,
}: {
  visit: VisitDetail;
  variant: CardVariant;
  showActions: boolean;
  onOpen: () => void;
}) => {
  const isOverdue = Boolean(
    visit.estimatedCompletionDate && new Date(visit.estimatedCompletionDate) < new Date()
  );

  return (
    <VisitItem $overdue={isOverdue}>
      <BrandAvatar $variant={variant}>{visit.brand.charAt(0).toUpperCase()}</BrandAvatar>

      <VisitBody>
        <VisitMainRow>
          <VehicleName>{visit.brand} {visit.model}</VehicleName>
          <VisitAmount>{formatCurrency(visit.amount)}</VisitAmount>
        </VisitMainRow>

        <VisitSecondRow>
          <CustomerName>{visit.customerFirstName} {visit.customerLastName}</CustomerName>
          {visit.phoneNumber && (
            <>
              <Dot />
              <PhoneChip>{formatPhoneNumber(visit.phoneNumber)}</PhoneChip>
            </>
          )}
        </VisitSecondRow>

        {visit.estimatedCompletionDate && (
          <DateLine $overdue={isOverdue}>
            {isOverdue ? <AlertTriangle /> : <Clock />}
            {t.dashboard.stats.estimatedCompletion}: {formatDate(visit.estimatedCompletionDate)}
            {isOverdue && ' — po terminie'}
          </DateLine>
        )}
      </VisitBody>

      {showActions && (
        <OpenButton onClick={onOpen} title="Otwórz wizytę">
          <ExternalLink />
        </OpenButton>
      )}
    </VisitItem>
  );
};

// ─── Visits Panel ─────────────────────────────────────────────────────────────

const VisitsPanel = ({
  visits,
  label,
  variant,
  showActions = false,
}: {
  visits: VisitDetail[];
  label: string;
  variant: CardVariant;
  showActions?: boolean;
}) => {
  const navigate = useNavigate();

  return (
    <>
      <PanelHeader>
        <PanelTitle>{label}</PanelTitle>
        <PanelCount $variant={variant}>{visits.length}</PanelCount>
      </PanelHeader>

      <VisitScrollArea>
        {visits.length === 0 ? (
          <EmptyPanel>Brak wizyt w tej kategorii</EmptyPanel>
        ) : (
          visits.map((visit) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              variant={variant}
              showActions={showActions}
              onOpen={() => navigate(`/visits/${visit.id}`)}
            />
          ))
        )}
      </VisitScrollArea>

      {visits.length > 0 && (
        <PanelFooter>
          <ViewAllBtn onClick={() => navigate('/calendar')}>
            Pokaż w kalendarzu
            <ChevronRight />
          </ViewAllBtn>
        </PanelFooter>
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
          <VisitsPanel
            visits={details}
            label={label}
            variant={variant}
            showActions={showActions}
          />
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
  background-color: rgba(0, 0, 0, 0.35);
  z-index: 15;
  backdrop-filter: blur(1px);
`;

// ─── Main Component ───────────────────────────────────────────────────────────

export const OperationalScorecard = ({ stats }: OperationalScorecardProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    setExpandedCard((prev) => (prev === key ? null : key));
  };

  return (
    <>
      <ScorecardContainer>
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

      {expandedCard && <Overlay onClick={() => setExpandedCard(null)} />}
    </>
  );
};
