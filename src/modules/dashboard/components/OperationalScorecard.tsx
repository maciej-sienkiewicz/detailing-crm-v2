/**
 * Operational Scorecard Component
 * Premium 4-KPI command strip — instant at-a-glance operational status.
 * Cards: In Progress · Ready for Pickup · Incoming Today · Abandoned (30 days)
 */

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  Clock,
  AlertTriangle,
  ChevronRight,
  Wrench,
  CheckCircle2,
  CalendarDays,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatPhoneNumber, formatDate } from '@/common/utils/formatters';
import type { OperationalStats, VisitDetail } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type CardVariant = 'inProgress' | 'readyForPickup' | 'incomingToday' | 'abandoned';

interface CardConfig {
  accentColor: string;
  bgGradient: string;
  iconBg: string;
  icon: LucideIcon;
}

const CARD_CONFIG: Record<CardVariant, CardConfig> = {
  inProgress: {
    accentColor: '#0ea5e9',
    bgGradient: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 60%)',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    icon: Wrench,
  },
  readyForPickup: {
    accentColor: '#16a34a',
    bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%)',
    iconBg: 'rgba(22, 163, 74, 0.1)',
    icon: CheckCircle2,
  },
  incomingToday: {
    accentColor: '#d97706',
    bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 60%)',
    iconBg: 'rgba(217, 119, 6, 0.1)',
    icon: CalendarDays,
  },
  abandoned: {
    accentColor: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 60%)',
    iconBg: 'rgba(220, 38, 38, 0.1)',
    icon: XCircle,
  },
};

interface OperationalScorecardProps {
  stats?: OperationalStats;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const panelFadeIn = keyframes`
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

// ─── Scorecard Grid ───────────────────────────────────────────────────────────

const ScorecardContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(p) => p.theme.spacing.md};
  margin-top: ${(p) => p.theme.spacing.md};

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
  background: ${(p) => CARD_CONFIG[p.$variant].bgGradient};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-top: 3px solid ${(p) => CARD_CONFIG[p.$variant].accentColor};
  border-radius: ${(p) => p.theme.radii.xl};
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  box-sizing: border-box;
  width: 100%;
  transition: transform 180ms ease, box-shadow 180ms ease;

  ${(p) =>
    p.$clickable &&
    css`
      cursor: pointer;
      user-select: none;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 16px 40px rgba(0,0,0,0.07);
      }
    `}

  ${(p) =>
    p.$isExpanded &&
    css`
      box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 16px 40px rgba(0,0,0,0.07);
      border-color: ${CARD_CONFIG[p.$variant].accentColor}60;
    `}
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CardIconWrap = styled.div<{ $variant: CardVariant }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${(p) => CARD_CONFIG[p.$variant].iconBg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
    color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
    stroke-width: 1.8;
  }
`;

const CardChevronWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CardLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ExpandChevron = styled(ChevronDown)<{ $isExpanded: boolean }>`
  width: 16px;
  height: 16px;
  color: ${(p) => p.theme.colors.textMuted};
  transition: transform 200ms ease;
  transform: ${(p) => (p.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const CardValue = styled.div<{ $variant: CardVariant }>`
  font-size: 48px;
  font-weight: 800;
  color: ${(p) => p.theme.colors.text};
  line-height: 1;
  margin-bottom: 10px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -2px;
`;

const CardSkeleton = styled.div`
  height: 48px;
  background: linear-gradient(
    90deg,
    ${(p) => p.theme.colors.surfaceAlt} 0%,
    ${(p) => p.theme.colors.surfaceHover} 50%,
    ${(p) => p.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: ${(p) => p.theme.radii.md};
  margin-bottom: 10px;

  @keyframes shimmer {
    0%   { background-position: 200% 0; }
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
  padding: 3px 8px;
  background-color: ${(p) => p.theme.colors.errorLight};
  color: ${(p) => p.theme.colors.error};
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: ${(p) => p.theme.radii.full};
  font-size: 11px;
  font-weight: 600;

  svg { width: 11px; height: 11px; }
`;

const SubLabel = styled.span<{ $variant: CardVariant }>`
  font-size: 11px;
  color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
  font-weight: 500;
`;

// ─── Expanded Panel (Popover) ─────────────────────────────────────────────────

const ExpandedPanel = styled.div<{ $isVisible: boolean; $variant: CardVariant }>`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  min-width: 340px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.06),
    0 8px 24px rgba(0,0,0,0.1),
    0 32px 64px rgba(0,0,0,0.08);
  z-index: 20;
  max-height: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: ${(p) => (p.$isVisible ? 1 : 0)};
  pointer-events: ${(p) => (p.$isVisible ? 'auto' : 'none')};
  animation: ${(p) => (p.$isVisible ? panelFadeIn : 'none')} 180ms cubic-bezier(0.4, 0, 0.2, 1) both;

  @media (max-width: ${(p) => p.theme.breakpoints.sm}) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    min-width: unset;
    max-height: 72vh;
    border-radius: 20px 20px 0 0;
  }
`;

const PanelHeader = styled.div<{ $variant: CardVariant }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: ${(p) => CARD_CONFIG[p.$variant].bgGradient};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;
`;

const PanelTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PanelIconWrap = styled.div<{ $variant: CardVariant }>`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: ${(p) => CARD_CONFIG[p.$variant].iconBg};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 15px;
    height: 15px;
    color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
    stroke-width: 2;
  }
`;

const PanelTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const PanelCount = styled.span<{ $variant: CardVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: ${(p) => CARD_CONFIG[p.$variant].accentColor}18;
  color: ${(p) => CARD_CONFIG[p.$variant].accentColor};
  border-radius: ${(p) => p.theme.radii.full};
  font-size: 12px;
  font-weight: 700;
`;

const VisitScrollArea = styled.div`
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${(p) => p.theme.colors.border};
    border-radius: 2px;
  }
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
  padding: 12px 18px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  border-left: 3px solid ${(p) => (p.$overdue ? p.theme.colors.error : 'transparent')};
  transition: background-color 120ms ease;

  &:last-child { border-bottom: none; }

  &:hover { background-color: ${(p) => p.theme.colors.surfaceAlt}; }
`;

const BrandAvatar = styled.div<{ $variant: CardVariant }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 9px;
  background: ${(p) => CARD_CONFIG[p.$variant].iconBg};
  border: 1.5px solid ${(p) => CARD_CONFIG[p.$variant].accentColor}30;
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
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
`;

const VisitAmount = styled.span`
  font-size: 13px;
  font-weight: 700;
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
  font-size: 12.5px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${(p) => p.theme.colors.textMuted};
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
  font-weight: ${(p) => (p.$overdue ? 600 : 400)};
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
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;

  svg { width: 13px; height: 13px; }

  &:hover {
    background: var(--brand-primary);
    color: white;
    border-color: var(--brand-primary);
  }
`;

const PanelFooter = styled.div`
  padding: 10px 18px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};
  flex-shrink: 0;
`;

const ViewAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
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
  const Icon = CARD_CONFIG[variant].icon;

  return (
    <>
      <PanelHeader $variant={variant}>
        <PanelTitleGroup>
          <PanelIconWrap $variant={variant}>
            <Icon />
          </PanelIconWrap>
          <PanelTitle>{label}</PanelTitle>
        </PanelTitleGroup>
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
  const Icon = CARD_CONFIG[variant].icon;

  return (
    <CardWrapper>
      <Card
        $variant={variant}
        $isExpanded={isExpanded}
        $clickable={isExpandable}
        onClick={() => isExpandable && onToggle(expandKey)}
      >
        <CardTop>
          <CardIconWrap $variant={variant}>
            <Icon />
          </CardIconWrap>
          {isExpandable && (
            <CardChevronWrap>
              <ExpandChevron $isExpanded={isExpanded} />
            </CardChevronWrap>
          )}
        </CardTop>

        <CardValue $variant={variant}>{value}</CardValue>
        <CardLabel>{label}</CardLabel>

        <BadgeRow style={{ marginTop: '10px' }}>
          {typeof overdueBadge === 'number' && overdueBadge > 0 && (
            <OverdueBadge>
              <AlertTriangle />
              {t.dashboard.stats.overdue}: {overdueBadge}
            </OverdueBadge>
          )}
          {subLabel && <SubLabel $variant={variant}>{subLabel}</SubLabel>}
        </BadgeRow>
      </Card>

      {isExpandable && details && (
        <ExpandedPanel
          $isVisible={isExpanded}
          $variant={variant}
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
    <CardTop>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9' }} />
    </CardTop>
    <CardSkeleton />
    <CardSkeleton style={{ height: '14px', width: '60%' }} />
    <BadgeRow />
  </Card>
);

// ─── Overlay ─────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 15;
  backdrop-filter: blur(2px);
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
