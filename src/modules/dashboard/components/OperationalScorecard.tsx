/**
 * Operational Scorecard Component
 * Premium 4-KPI command strip + right-side visit drawer.
 */

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Clock,
  AlertTriangle,
  ChevronRight,
  Wrench,
  CheckCircle2,
  CalendarDays,
  XCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/common/i18n';
import { formatCurrency, formatPhoneNumber, formatDate } from '@/common/utils/formatters';
import type { OperationalStats, VisitDetail } from '../types';

// ─── Config ──────────────────────────────────────────────────────────────────

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
    bgGradient: 'linear-gradient(140deg, #f0f9ff 0%, #ffffff 55%)',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    icon: Wrench,
  },
  readyForPickup: {
    accentColor: '#16a34a',
    bgGradient: 'linear-gradient(140deg, #f0fdf4 0%, #ffffff 55%)',
    iconBg: 'rgba(22, 163, 74, 0.1)',
    icon: CheckCircle2,
  },
  incomingToday: {
    accentColor: '#d97706',
    bgGradient: 'linear-gradient(140deg, #fffbeb 0%, #ffffff 55%)',
    iconBg: 'rgba(217, 119, 6, 0.1)',
    icon: CalendarDays,
  },
  abandoned: {
    accentColor: '#dc2626',
    bgGradient: 'linear-gradient(140deg, #fef2f2 0%, #ffffff 55%)',
    iconBg: 'rgba(220, 38, 38, 0.1)',
    icon: XCircle,
  },
};

interface OperationalScorecardProps {
  stats?: OperationalStats;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const slideInRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

// ─── Scorecard Grid ───────────────────────────────────────────────────────────

const ScorecardContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${p => p.theme.spacing.md};
  margin-top: ${p => p.theme.spacing.md};

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// ─── KPI Card ────────────────────────────────────────────────────────────────

const Card = styled.div<{ $variant: CardVariant; $isActive: boolean; $clickable: boolean }>`
  position: relative;
  background: ${p => CARD_CONFIG[p.$variant].bgGradient};
  border: 1px solid ${p => p.theme.colors.border};
  border-top: 3px solid ${p => CARD_CONFIG[p.$variant].accentColor};
  border-radius: ${p => p.theme.radii.xl};
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 150ms ease;

  ${p => p.$clickable && css`
    cursor: pointer;
    user-select: none;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.09), 0 16px 40px rgba(0,0,0,0.06);
    }
  `}

  ${p => p.$isActive && css`
    border-color: ${CARD_CONFIG[p.$variant].accentColor}50;
    box-shadow: 0 4px 14px rgba(0,0,0,0.09), 0 16px 40px rgba(0,0,0,0.06),
      0 0 0 3px ${CARD_CONFIG[p.$variant].accentColor}18;
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
  border-radius: 11px;
  background: ${p => CARD_CONFIG[p.$variant].iconBg};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
    color: ${p => CARD_CONFIG[p.$variant].accentColor};
    stroke-width: 1.75;
  }
`;

const CardArrow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  color: ${p => p.theme.colors.textMuted};
  transition: transform 200ms ease, color 150ms ease;
  transform: ${p => p.$active ? 'rotate(90deg)' : 'rotate(0deg)'};

  svg { width: 15px; height: 15px; }
`;

const CardValue = styled.div`
  font-size: 48px;
  font-weight: 800;
  color: ${p => p.theme.colors.text};
  line-height: 1;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -2px;
`;

const CardLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
`;

const OverdueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(220, 38, 38, 0.07);
  color: ${p => p.theme.colors.error};
  border: 1px solid rgba(220, 38, 38, 0.15);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;

  svg { width: 10px; height: 10px; }
`;

const SubLabel = styled.span<{ $variant: CardVariant }>`
  font-size: 11px;
  color: ${p => CARD_CONFIG[p.$variant].accentColor};
  font-weight: 500;
`;

// ─── Skeleton ────────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonPulse = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '14px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    ${p => p.theme.colors.surfaceAlt} 0%,
    ${p => p.theme.colors.surfaceHover} 50%,
    ${p => p.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Drawer Overlay ───────────────────────────────────────────────────────────

const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(3px);
  z-index: 1050;
  animation: ${fadeIn} 200ms ease;
`;

// ─── Drawer ───────────────────────────────────────────────────────────────────

const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  background: #ffffff;
  z-index: 1051;
  display: flex;
  flex-direction: column;
  box-shadow: -1px 0 0 ${p => p.theme.colors.border},
    -4px 0 40px rgba(0,0,0,0.12);
  animation: ${slideInRight} 280ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    width: 100%;
    height: 80vh;
    top: auto;
    bottom: 0;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 40px rgba(0,0,0,0.14);
  }
`;

const DrawerHeader = styled.div<{ $variant: CardVariant }>`
  padding: 20px 22px;
  background: ${p => CARD_CONFIG[p.$variant].bgGradient};
  border-bottom: 1px solid ${p => p.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
`;

const DrawerIconWrap = styled.div<{ $variant: CardVariant }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${p => CARD_CONFIG[p.$variant].iconBg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
    color: ${p => CARD_CONFIG[p.$variant].accentColor};
    stroke-width: 1.9;
  }
`;

const DrawerTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

const DrawerTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  letter-spacing: -0.1px;
`;

const DrawerSubtitle = styled.div`
  font-size: 12px;
  color: ${p => p.theme.colors.textMuted};
  margin-top: 1px;
`;

const DrawerCountBadge = styled.div<{ $variant: CardVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  background: ${p => CARD_CONFIG[p.$variant].accentColor}15;
  color: ${p => CARD_CONFIG[p.$variant].accentColor};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
`;

const DrawerCloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${p => p.theme.colors.border};
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${p => p.theme.colors.textMuted};
  flex-shrink: 0;
  transition: background 140ms ease, color 140ms ease;

  svg { width: 15px; height: 15px; }

  &:hover {
    background: #ffffff;
    color: ${p => p.theme.colors.text};
  }
`;

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${p => p.theme.colors.border};
    border-radius: 2px;
  }
`;

const EmptyDrawer = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: ${p => p.theme.colors.textMuted};
  font-size: 14px;
`;

const DrawerFooter = styled.div`
  padding: 12px 22px;
  border-top: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.surfaceAlt};
  flex-shrink: 0;
`;

const ViewAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 120ms ease;

  svg { width: 14px; height: 14px; }
  &:hover { opacity: 0.72; }
`;

// ─── Visit Item ───────────────────────────────────────────────────────────────

const VisitItem = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 22px;
  border-bottom: 1px solid ${p => p.theme.colors.border};
  border-left: 3px solid ${p => p.$overdue ? p.theme.colors.error : 'transparent'};
  transition: background 120ms ease;

  &:last-child { border-bottom: none; }
  &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
`;

const BrandAvatar = styled.div<{ $variant: CardVariant }>`
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 10px;
  background: ${p => CARD_CONFIG[p.$variant].iconBg};
  border: 1.5px solid ${p => CARD_CONFIG[p.$variant].accentColor}28;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: ${p => CARD_CONFIG[p.$variant].accentColor};
  flex-shrink: 0;
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
  color: ${p => p.theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  color: ${p => p.theme.colors.textSecondary};
`;

const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${p => p.theme.colors.textMuted};
`;

const PhoneChip = styled.span`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  letter-spacing: -0.3px;
`;

const DateLine = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  font-weight: ${p => p.$overdue ? 600 : 400};
  color: ${p => p.$overdue ? p.theme.colors.error : p.theme.colors.textMuted};

  svg { width: 11px; height: 11px; flex-shrink: 0; }
`;

const OpenButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  min-width: 30px;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  background: transparent;
  color: ${p => p.theme.colors.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  align-self: center;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;

  svg { width: 13px; height: 13px; }

  &:hover {
    background: var(--brand-primary);
    color: #fff;
    border-color: var(--brand-primary);
  }
`;

// ─── Visit Row ────────────────────────────────────────────────────────────────

const VisitRow = ({
  visit,
  variant,
  showActions,
}: {
  visit: VisitDetail;
  variant: CardVariant;
  showActions: boolean;
}) => {
  const navigate = useNavigate();
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
        <OpenButton
          onClick={() => navigate(`/visits/${visit.id}`)}
          title="Otwórz wizytę"
        >
          <ExternalLink />
        </OpenButton>
      )}
    </VisitItem>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  variant: CardVariant;
  label: string;
  value: number;
  hasDetails: boolean;
  isActive: boolean;
  onToggle: () => void;
  overdueBadge?: number;
  subLabel?: string;
}

const KpiCard = ({
  variant,
  label,
  value,
  hasDetails,
  isActive,
  onToggle,
  overdueBadge,
  subLabel,
}: KpiCardProps) => {
  const Icon = CARD_CONFIG[variant].icon;

  return (
    <Card
      $variant={variant}
      $isActive={isActive}
      $clickable={hasDetails}
      onClick={() => hasDetails && onToggle()}
    >
      <CardTop>
        <CardIconWrap $variant={variant}>
          <Icon />
        </CardIconWrap>
        {hasDetails && (
          <CardArrow $active={isActive}>
            <ChevronRight />
          </CardArrow>
        )}
      </CardTop>

      <CardValue>{value}</CardValue>
      <CardLabel>{label}</CardLabel>

      <BadgeRow>
        {typeof overdueBadge === 'number' && overdueBadge > 0 && (
          <OverdueBadge>
            <AlertTriangle />
            {t.dashboard.stats.overdue}: {overdueBadge}
          </OverdueBadge>
        )}
        {subLabel && <SubLabel $variant={variant}>{subLabel}</SubLabel>}
      </BadgeRow>
    </Card>
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

const SkeletonCard = ({ variant }: { variant: CardVariant }) => (
  <Card $variant={variant} $isActive={false} $clickable={false}>
    <CardTop>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: '#f1f5f9' }} />
    </CardTop>
    <SkeletonPulse $h="48px" $w="60px" style={{ marginBottom: 8 }} />
    <SkeletonPulse $h="11px" $w="55%" style={{ marginBottom: 10 }} />
    <BadgeRow />
  </Card>
);

// ─── Visit Drawer ─────────────────────────────────────────────────────────────

interface DrawerData {
  variant: CardVariant;
  label: string;
  visits: VisitDetail[];
  showActions: boolean;
}

const VisitDrawer = ({
  data,
  onClose,
}: {
  data: DrawerData;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const Icon = CARD_CONFIG[data.variant].icon;

  return (
    <>
      <DrawerOverlay onClick={onClose} />
      <Drawer>
        <DrawerHeader $variant={data.variant}>
          <DrawerIconWrap $variant={data.variant}>
            <Icon />
          </DrawerIconWrap>
          <DrawerTitleGroup>
            <DrawerTitle>{data.label}</DrawerTitle>
            <DrawerSubtitle>Lista wizyt</DrawerSubtitle>
          </DrawerTitleGroup>
          <DrawerCountBadge $variant={data.variant}>{data.visits.length}</DrawerCountBadge>
          <DrawerCloseBtn onClick={onClose} aria-label="Zamknij">
            <X />
          </DrawerCloseBtn>
        </DrawerHeader>

        <DrawerBody>
          {data.visits.length === 0 ? (
            <EmptyDrawer>Brak wizyt w tej kategorii</EmptyDrawer>
          ) : (
            data.visits.map(visit => (
              <VisitRow
                key={visit.id}
                visit={visit}
                variant={data.variant}
                showActions={data.showActions}
              />
            ))
          )}
        </DrawerBody>

        {data.visits.length > 0 && (
          <DrawerFooter>
            <ViewAllBtn onClick={() => { navigate('/calendar'); onClose(); }}>
              Pokaż w kalendarzu
              <ChevronRight />
            </ViewAllBtn>
          </DrawerFooter>
        )}
      </Drawer>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OperationalScorecard = ({ stats }: OperationalScorecardProps) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const toggle = (key: string) =>
    setActiveKey(prev => (prev === key ? null : key));

  const getDrawerData = (): DrawerData | null => {
    if (!activeKey || !stats) return null;
    switch (activeKey) {
      case 'inProgress':
        return { variant: 'inProgress', label: t.dashboard.stats.inProgress, visits: stats.inProgressDetails ?? [], showActions: true };
      case 'readyForPickup':
        return { variant: 'readyForPickup', label: t.dashboard.stats.readyForPickup, visits: stats.readyForPickupDetails ?? [], showActions: true };
      case 'incomingToday':
        return { variant: 'incomingToday', label: t.dashboard.stats.arrivals, visits: stats.incomingTodayDetails ?? [], showActions: false };
      default:
        return null;
    }
  };

  const drawerData = getDrawerData();

  return (
    <>
      <ScorecardContainer>
        {stats ? (
          <KpiCard
            variant="inProgress"
            label={t.dashboard.stats.inProgress}
            value={stats.inProgress}
            hasDetails={!!stats.inProgressDetails}
            isActive={activeKey === 'inProgress'}
            onToggle={() => toggle('inProgress')}
            overdueBadge={stats.overdue}
          />
        ) : <SkeletonCard variant="inProgress" />}

        {stats ? (
          <KpiCard
            variant="readyForPickup"
            label={t.dashboard.stats.readyForPickup}
            value={stats.readyForPickup}
            hasDetails={!!stats.readyForPickupDetails}
            isActive={activeKey === 'readyForPickup'}
            onToggle={() => toggle('readyForPickup')}
          />
        ) : <SkeletonCard variant="readyForPickup" />}

        {stats ? (
          <KpiCard
            variant="incomingToday"
            label={t.dashboard.stats.arrivals}
            value={stats.incomingToday}
            hasDetails={!!stats.incomingTodayDetails}
            isActive={activeKey === 'incomingToday'}
            onToggle={() => toggle('incomingToday')}
          />
        ) : <SkeletonCard variant="incomingToday" />}

        {stats ? (
          <KpiCard
            variant="abandoned"
            label={t.dashboard.stats.abandoned}
            value={stats.abandonedLast30Days}
            hasDetails={false}
            isActive={false}
            onToggle={() => {}}
            subLabel={t.dashboard.stats.abandonedSubLabel}
          />
        ) : <SkeletonCard variant="abandoned" />}
      </ScorecardContainer>

      {drawerData && (
        <VisitDrawer data={drawerData} onClose={() => setActiveKey(null)} />
      )}
    </>
  );
};
