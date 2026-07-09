/**
 * Operational Scorecard Component
 * Premium 4-KPI command strip + right-side visit drawer.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ReservationContextMenu } from '@/common/components/ReservationContextMenu';
import {
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
import { PiiValue, joinPiiName } from '@/common/pii';
import { formatCurrency, formatPhoneNumber, formatDate } from '@/common/utils/formatters';
import type { OperationalStats, VisitDetail } from '../types';
import { StatTile, StatTileSkeleton } from '@/common/components/StatTile';
import { useCalendarNavigation } from '@/common/context/CalendarNavigationContext';
import { visitApi } from '@/modules/visits/api/visitApi';

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

const slideInBottom = keyframes`
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
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

const SubLabel = styled.span<{ $variant: CardVariant }>`
  font-size: 11px;
  color: ${p => CARD_CONFIG[p.$variant].accentColor};
  font-weight: 500;
`;

const OverdueFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const OverdueLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.colors.error};

  svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const OverdueCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: rgba(220, 38, 38, 0.1);
  color: ${p => p.theme.colors.error};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

// ─── Drawer Overlay ───────────────────────────────────────────────────────────

const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(3px);
  z-index: 1050;
  animation: ${fadeIn} 200ms ease;
  touch-action: none;
  overscroll-behavior: contain;
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
    height: 85vh;
    top: auto;
    bottom: 0;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 40px rgba(0,0,0,0.14);
    animation: ${slideInBottom} 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

const DrawerHeader = styled.div`
  padding: 18px 22px 14px;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
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
  font-size: 16px;
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  letter-spacing: -0.1px;
  margin: 0;
`;

const DrawerSubtitle = styled.div`
  font-size: 12px;
  color: ${p => p.theme.colors.textMuted};
  margin-top: 2px;
`;

const DrawerCountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 9px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

const DrawerCloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  flex-shrink: 0;
  transition: background 140ms ease, color 140ms ease;

  svg { width: 15px; height: 15px; }

  &:hover {
    background: #e2e8f0;
    color: ${p => p.theme.colors.text};
  }
`;

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

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
  padding: 14px 22px;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  flex-shrink: 0;
`;

const ViewAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #0284c7;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: opacity 150ms ease;

  svg { width: 14px; height: 14px; stroke-width: 2; }
  &:hover { opacity: 0.75; }
`;

// ─── Visit Item ───────────────────────────────────────────────────────────────

const VisitItem = styled.div<{ $overdue: boolean; $clickable: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 22px;
  border-bottom: 1px solid #f1f5f9;
  border-left: 3px solid ${p => p.$overdue ? p.theme.colors.error : 'transparent'};
  transition: background 150ms ease;
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};

  &:last-child { border-bottom: none; }
  &:hover { background: ${p => p.$clickable ? '#f8fafc' : 'transparent'}; }
`;

const BrandAvatar = styled.div<{ $variant: CardVariant }>`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: ${p => CARD_CONFIG[p.$variant].iconBg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
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
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const VehicleName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const VisitAmount = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
`;

const VisitSecondRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  flex-wrap: wrap;
`;

const CustomerName = styled.span`
  font-size: 11px;
  color: #64748b;
`;

const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
`;

const PhoneChip = styled.span`
  font-size: 11px;
  color: #64748b;
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
  color: ${p => p.$overdue ? p.theme.colors.error : '#94a3b8'};

  svg { width: 11px; height: 11px; flex-shrink: 0; }
`;

// ─── Visit Row ────────────────────────────────────────────────────────────────

const VisitRow = ({
  visit,
  variant,
  onRowClick,
}: {
  visit: VisitDetail;
  variant: CardVariant;
  onRowClick?: (id: string, scheduledDate?: string, rect?: DOMRect) => void;
}) => {
  const isOverdue = Boolean(
    visit.estimatedCompletionDate && new Date(visit.estimatedCompletionDate) < new Date()
  );

  return (
    <VisitItem
      $overdue={isOverdue}
      $clickable={!!onRowClick}
      onClick={e => onRowClick?.(visit.id, visit.scheduledDate, (e.currentTarget as HTMLElement).getBoundingClientRect())}
    >
      <BrandAvatar $variant={variant}>{visit.brand.charAt(0).toUpperCase()}</BrandAvatar>

      <VisitBody>
        <VisitMainRow>
          <VehicleName>{visit.name}</VehicleName>
          <VisitAmount>{formatCurrency(visit.amount)}</VisitAmount>
        </VisitMainRow>

        <VisitSecondRow>
          { (visit.customerFirstName && visit.customerLastName) && (
              <>
                <CustomerName><PiiValue value={joinPiiName(visit.customerFirstName, visit.customerLastName)} kind="name" /></CustomerName>
                <Dot />
              </>
          )}
          {visit.phoneNumber && (
            <>
              <PhoneChip><PiiValue value={visit.phoneNumber} kind="phone" format={formatPhoneNumber} /></PhoneChip>
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
  const cfg = CARD_CONFIG[variant];

  const subContent = subLabel
    ? <SubLabel $variant={variant}>{subLabel}</SubLabel>
    : undefined;

  const footerContent = typeof overdueBadge === 'number' && overdueBadge > 0
    ? (
      <OverdueFooter>
        <OverdueLeft>
          <AlertTriangle />
          {t.dashboard.stats.overdue}
        </OverdueLeft>
        <OverdueCount>{overdueBadge}</OverdueCount>
      </OverdueFooter>
    )
    : undefined;

  return (
    <StatTile
      accentColor={cfg.accentColor}
      bgGradient={cfg.bgGradient}
      iconBg={cfg.iconBg}
      icon={cfg.icon}
      value={value}
      label={label}
      subContent={subContent}
      footerContent={footerContent}
      onClick={hasDetails ? onToggle : undefined}
      isActive={isActive}
    />
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

const SkeletonCard = ({ variant }: { variant: CardVariant }) => (
  <StatTileSkeleton
    accentColor={CARD_CONFIG[variant].accentColor}
    bgGradient={CARD_CONFIG[variant].bgGradient}
    iconBg={CARD_CONFIG[variant].iconBg}
  />
);

// ─── Visit Drawer ─────────────────────────────────────────────────────────────

interface DrawerData {
  variant: CardVariant;
  label: string;
  subtitle: string;
  visits: VisitDetail[];
  onRowClick?: (id: string, scheduledDate?: string, rect?: DOMRect) => void;
  footerLabel?: string;
  footerPath?: string;
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <>
      <DrawerOverlay onClick={onClose} />
      <Drawer>
        <DrawerHeader>
          <DrawerIconWrap $variant={data.variant}>
            <Icon />
          </DrawerIconWrap>
          <DrawerTitleGroup>
            <DrawerTitle>{data.label}</DrawerTitle>
            <DrawerSubtitle>{data.subtitle}</DrawerSubtitle>
          </DrawerTitleGroup>
          <DrawerCountBadge>{data.visits.length}</DrawerCountBadge>
          <DrawerCloseBtn onClick={onClose} aria-label="Zamknij">
            <X />
          </DrawerCloseBtn>
        </DrawerHeader>

        <DrawerBody>
          {data.visits.length === 0 ? (
            <EmptyDrawer>
              {data.variant === 'abandoned'
                ? 'Brak porzuconych ani anulowanych rezerwacji'
                : 'Brak wizyt w tej kategorii'}
            </EmptyDrawer>
          ) : (
            data.visits.map(visit => (
              <VisitRow
                key={visit.id}
                visit={visit}
                variant={data.variant}
                onRowClick={data.onRowClick}
              />
            ))
          )}
        </DrawerBody>

        {data.visits.length > 0 && (
          <DrawerFooter>
            <ViewAllBtn onClick={() => { navigate(data.footerPath ?? '/calendar'); onClose(); }}>
              {data.footerLabel ?? 'Pokaż w kalendarzu'}
              <ChevronRight />
            </ViewAllBtn>
          </DrawerFooter>
        )}
      </Drawer>
    </>,
    document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OperationalScorecard = ({ stats }: OperationalScorecardProps) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const navigate = useNavigate();
  const { start: startNavAnim } = useCalendarNavigation();

  const toggle = (key: string) =>
    setActiveKey(prev => (prev === key ? null : key));

  const navigateToVisitOrCalendar = (visit: VisitDetail, variant: CardVariant, rect?: DOMRect) => {
    if (variant === 'inProgress' || variant === 'readyForPickup') {
      setActiveKey(null);
      navigate(`/visits/${visit.id}`);
      return;
    }

    const dateBox = { value: visit.scheduledDate ?? '' };

    const snap = {
      id: visit.id,
      label: `${visit.brand} ${visit.model ?? ''}`.trim() || visit.name,
      customer: joinPiiName(visit.customerFirstName, visit.customerLastName) ?? '',
      amount: formatCurrency(visit.amount),
      accentColor: CARD_CONFIG[variant].accentColor,
      sourceRect: rect ?? new DOMRect(window.innerWidth / 2 - 150, window.innerHeight / 2 - 34, 300, 68),
      scheduledDate: dateBox.value || undefined,
    };
    const doNavigate = () => navigate('/calendar', { state: { highlightEventId: visit.id, highlightDate: dateBox.value || undefined } });
    startNavAnim(snap, doNavigate);
    setActiveKey(null);
  };

  const getDrawerData = (): DrawerData | null => {
    if (!activeKey || !stats) return null;
    switch (activeKey) {
      case 'inProgress':
        return { variant: 'inProgress', label: t.dashboard.stats.inProgress, subtitle: 'Lista wizyt', visits: stats.inProgressDetails ?? [], onRowClick: (id, scheduledDate, rect) => { const v = stats.inProgressDetails?.find(x => x.id === id); if (v) navigateToVisitOrCalendar(v, 'inProgress', rect); } };
      case 'readyForPickup':
        return { variant: 'readyForPickup', label: t.dashboard.stats.readyForPickup, subtitle: 'Lista wizyt', visits: stats.readyForPickupDetails ?? [], onRowClick: (id, scheduledDate, rect) => { const v = stats.readyForPickupDetails?.find(x => x.id === id); if (v) navigateToVisitOrCalendar(v, 'readyForPickup', rect); } };
      case 'incomingToday':
        return { variant: 'incomingToday', label: t.dashboard.stats.arrivals, subtitle: 'Lista wizyt', visits: stats.incomingTodayDetails ?? [], onRowClick: (id, scheduledDate, rect) => { const v = stats.incomingTodayDetails?.find(x => x.id === id); if (v) navigateToVisitOrCalendar(v, 'incomingToday', rect); } };
      case 'abandoned':
        return { variant: 'abandoned', label: t.dashboard.stats.abandoned, subtitle: 'Ostatnie 30 dni · Porzucone i Anulowane', visits: stats.abandonedDetails ?? [], onRowClick: (id, scheduledDate, rect) => { const v = stats.abandonedDetails?.find(x => x.id === id); if (v) navigateToVisitOrCalendar(v, 'abandoned', rect); }, footerLabel: 'Pokaż rezerwacje', footerPath: '/appointments' };
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
            hasDetails={stats.abandonedLast30Days > 0}
            isActive={activeKey === 'abandoned'}
            onToggle={() => toggle('abandoned')}
            subLabel={t.dashboard.stats.abandonedSubLabel}
          />
        ) : <SkeletonCard variant="abandoned" />}
      </ScorecardContainer>

      {drawerData && (
        <VisitDrawer data={drawerData} onClose={() => setActiveKey(null)} />
      )}

      {ctxMenu && (
        <ReservationContextMenu
          appointmentId={ctxMenu.id}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
};
