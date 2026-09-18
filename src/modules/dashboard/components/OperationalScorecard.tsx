/**
 * Operational Scorecard Component
 * Kompaktowy pasek 4 liczników + szuflada z listą wizyt.
 *
 * Kafelki są celowo małe i JEDNOKOLOROWE. Wcześniej każdy miał własny akcent
 * (niebieski / zielony / bursztynowy / czerwony) - cztery nasycone kolory obok
 * siebie czytały się jak przypadkowa paleta i sugerowały ważność, której tu nie
 * ma: to są cztery równorzędne liczby do podejrzenia, a nie statusy. Kolor
 * został tylko tam, gdzie niesie informację - na znaczniku "po terminie"
 * (wymaga reakcji) - oraz jako akcent stanu (najechanie / otwarta szuflada).
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { acquireScrollLock } from '@/common/utils/scrollLock';
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
import { useCalendarNavigation } from '@/common/context/CalendarNavigationContext';

// ─── Config ──────────────────────────────────────────────────────────────────

type CardVariant = 'inProgress' | 'readyForPickup' | 'incomingToday' | 'abandoned';

/** Jedyny akcent kafelków - stan interakcji, nie kategoria. */
const ACCENT = 'var(--brand-primary, #0ea5e9)';

/** Ikony zostają wyłącznie w nagłówku szuflady, gdzie identyfikują kontekst. */
const CARD_ICON: Record<CardVariant, LucideIcon> = {
  inProgress: Wrench,
  readyForPickup: CheckCircle2,
  incomingToday: CalendarDays,
  abandoned: XCircle,
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

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

// ─── Scorecard Grid ───────────────────────────────────────────────────────────
//
// Dwie kolumny do 768px, cztery powyżej. Kafelek niesie znacznik, podpis i
// liczbę, więc w 1/4 szerokości telefonu podpis musiałby zostać ucięty, a
// licznik bez czytelnej etykiety jest bezużyteczny.
//
// O tym, ile tekstu wchodzi do kafelka, decyduje SZEROKOŚĆ KAFELKA (@container),
// nie szerokość okna. Przy tej samej szerokości okna kolumna bywa różna - raz
// jest boczne menu, raz go nie ma - więc próg liczony z viewportu ucinałby
// podpis dokładnie tam, gdzie menu zabiera miejsce.

const ScorecardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 0;

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    gap: 12px;
  }

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

/* Pełna nazwa i chevron pojawiają się dopiero w kafelku, który ma na nie
   miejsce; węższy nosi skrót - zamiast ucinać tekst wielokropkiem. Skrót jest
   wartością domyślną, więc przeglądarka bez @container pokazuje po prostu
   krótszy wariant.
   Próg mierzy pole TREŚCI kafelka (tak działa container-type: inline-size),
   czyli bez paddingu: 145px to chevron 22 i wciąż ~123px na najdłuższy
   podpis ("Do przyjęcia dzisiaj"). */
const WIDE_TILE = '@container stat-tile (min-width: 145px)';

const tileSurface = `
  background: #ffffff;
  border-radius: 14px;
`;

/* Kolor wchodzi górną krawędzią - tak jak w pierwotnej wersji kafelka.
   Zmienia się tylko to, że jest JEDEN dla wszystkich czterech: wcześniej
   cztery nasycone akcenty udawały kategorie, tutaj to wspólna listwa, po
   której poznaje się kafelek stanu. Cała reszta powierzchni zostaje biała,
   więc listwa jest jedynym kolorem, jaki kafelek zużywa. */
const StatButton = styled.button<{ $clickable: boolean; $isActive: boolean }>`
  ${tileSurface}
  container-type: inline-size;
  container-name: stat-tile;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  min-width: 0;
  width: 100%;
  padding: 10px 12px 11px;
  border: 1px solid ${p => p.$isActive ? ACCENT : p.theme.colors.border};
  border-top: 3px solid ${ACCENT};
  box-shadow: ${p => p.$isActive
    ? `0 1px 2px rgba(15, 23, 42, 0.05), 0 0 0 3px color-mix(in srgb, ${ACCENT} 14%, transparent)`
    : '0 1px 2px rgba(15, 23, 42, 0.05)'};
  text-align: left;
  font-family: inherit;
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};
  -webkit-tap-highlight-color: transparent;
  transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    gap: 6px;
    padding: 12px 15px 13px;
  }

  ${p => p.$clickable && `
    &:hover {
      border-color: #cbd5e1;
      border-top-color: ${ACCENT};
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.06);
    }
    &:active { background: #f8fafc; }
  `}

  &:focus-visible {
    outline: 2px solid ${ACCENT};
    outline-offset: 2px;
  }
`;

const StatLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

/* 10px wersalikami w kolorze textMuted czytało się jak podpis pod podpisem.
   Wielkość zdaniowa, wyraźniejszy kolor, normalny światłostan - podpis ma być
   czytany, a nie odszyfrowywany. */
const StatLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: ${p => p.theme.colors.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    font-size: 13px;
  }
`;

const WideOnly = styled.span`
  display: none;

  ${WIDE_TILE} {
    display: inline;
  }
`;

const NarrowOnly = styled.span`
  display: inline;

  ${WIDE_TILE} {
    display: none;
  }
`;

const StatChevron = styled.span<{ $active: boolean }>`
  display: none;
  flex-shrink: 0;
  color: ${p => p.theme.colors.textMuted};
  transition: transform 200ms ease;
  transform: rotate(${p => p.$active ? '90deg' : '0deg'});

  svg { width: 14px; height: 14px; display: block; }

  ${WIDE_TILE} {
    display: block;
  }
`;

/* Liczba jest tu treścią, a nie podpisem - dostaje rozmiar i ciężar, który to
   mówi. Cyfry tabelaryczne, żeby "12" i "7" stały w tym samym miejscu w
   sąsiednich kafelkach i nie skakały przy odświeżeniu danych. */
const StatValue = styled.span`
  font-size: 25px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: ${p => p.theme.colors.text};
  font-variant-numeric: tabular-nums;

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    font-size: 28px;
  }
`;

/* Dopisek NIE stoi obok liczby - pigułka doklejona do cyfry rozbijała ją na
   dwa równorzędne elementy i wyglądała jak ozdoba. Stoi pod liczbą, jako
   zwykły wiersz tekstu: jedno miejsce i jedno potraktowanie dla obu
   przypadków. Różni je tylko to, co faktycznie się różni - szary opisuje
   zakres liczby, czerwony z ikoną mówi, że coś wymaga reakcji. */
const StatMeta = styled.span<{ $alert: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 11px;
  font-weight: ${p => p.$alert ? 600 : 500};
  line-height: 1.3;
  color: ${p => p.$alert ? p.theme.colors.error : p.theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg { width: 12px; height: 12px; stroke-width: 2.2; flex-shrink: 0; }
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonTile = styled.div`
  ${tileSurface}
  border: 1px solid ${p => p.theme.colors.border};
  border-top: 3px solid color-mix(in srgb, ${ACCENT} 35%, #e2e8f0);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 10px 12px 11px;

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    gap: 10px;
    padding: 12px 15px 13px;
  }
`;

const SkeletonBar = styled.div<{ $w: string; $h: string }>`
  width: ${p => p.$w};
  height: ${p => p.$h};
  border-radius: 5px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
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

/* Ten sam znacznik co na kafelku, z ktorego szuflada zostala otwarta -
   dlatego ten sam akcent, a nie neutralna szarosc. */
const DrawerIconWrap = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: color-mix(in srgb, ${ACCENT} 11%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
    color: ${ACCENT};
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

const BrandAvatar = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: ${p => p.theme.colors.surfaceAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.theme.colors.textSecondary};
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
  onRowClick,
}: {
  visit: VisitDetail;
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
      <BrandAvatar>{visit.brand.charAt(0).toUpperCase()}</BrandAvatar>

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
            {isOverdue && ' (po terminie)'}
          </DateLine>
        )}
      </VisitBody>
    </VisitItem>
  );
};

// ─── Stat Tile ───────────────────────────────────────────────────────────────

/** Wiersz pod liczbą. Najwyżej jeden na kafelek. */
interface TileMeta {
  /** Czerwony z ikoną (wymaga reakcji) czy szary (opisuje zakres liczby). */
  alert: boolean;
  text: string;
}

interface StatProps {
  labelFull: string;
  labelShort: string;
  value: number;
  hasDetails: boolean;
  isActive: boolean;
  onToggle: () => void;
  meta?: TileMeta;
}

const StatCell = ({
  labelFull,
  labelShort,
  value,
  hasDetails,
  isActive,
  onToggle,
  meta,
}: StatProps) => (
  <StatButton
    type="button"
    $clickable={hasDetails}
    $isActive={isActive}
    onClick={hasDetails ? onToggle : undefined}
    aria-expanded={hasDetails ? isActive : undefined}
    aria-disabled={hasDetails ? undefined : true}
    aria-label={`${labelFull}: ${value}${meta ? `, ${meta.text}` : ''}`}
  >
    <StatLabelRow>
      <StatLabel aria-hidden="true">
        <WideOnly>{labelFull}</WideOnly>
        <NarrowOnly>{labelShort}</NarrowOnly>
      </StatLabel>
      {hasDetails && (
        <StatChevron $active={isActive} aria-hidden="true">
          <ChevronRight />
        </StatChevron>
      )}
    </StatLabelRow>

    <StatValue aria-hidden="true">{value}</StatValue>

    {meta && (
      <StatMeta $alert={meta.alert} aria-hidden="true">
        {meta.alert && <AlertTriangle />}
        {meta.text}
      </StatMeta>
    )}
  </StatButton>
);

const StatCellSkeleton = () => (
  <SkeletonTile aria-hidden="true">
    <SkeletonBar $w="62%" $h="13px" />
    <SkeletonBar $w="30%" $h="26px" />
  </SkeletonTile>
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
  const Icon = CARD_ICON[data.variant];

  // Blokada przez współdzielony scrollLock (CLAUDE.md §3): własna migawka
  // stylów przywracała nieaktualne `hidden` przy nakładających się oknach.
  useEffect(() => acquireScrollLock(), []);

  return createPortal(
    <>
      <DrawerOverlay onClick={onClose} />
      <Drawer>
        <DrawerHeader>
          <DrawerIconWrap>
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

// Skróty na wąskie ekrany: pełne nazwy nie mieszczą się w 1/4 szerokości telefonu.
const SHORT_LABEL: Record<CardVariant, string> = {
  inProgress: 'W trakcie',
  readyForPickup: 'Gotowe',
  incomingToday: 'Dziś',
  abandoned: 'Porzucone',
};

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
      accentColor: ACCENT,
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
          <StatCell
            labelFull={t.dashboard.stats.inProgress}
            labelShort={SHORT_LABEL.inProgress}
            value={stats.inProgress}
            hasDetails={!!stats.inProgressDetails}
            isActive={activeKey === 'inProgress'}
            onToggle={() => toggle('inProgress')}
            meta={stats.overdue
              ? { alert: true, text: `${stats.overdue} ${t.dashboard.stats.overdue.toLowerCase()}` }
              : undefined}
          />
        ) : <StatCellSkeleton />}

        {stats ? (
          <StatCell
            labelFull={t.dashboard.stats.readyForPickup}
            labelShort={SHORT_LABEL.readyForPickup}
            value={stats.readyForPickup}
            hasDetails={!!stats.readyForPickupDetails}
            isActive={activeKey === 'readyForPickup'}
            onToggle={() => toggle('readyForPickup')}
          />
        ) : <StatCellSkeleton />}

        {stats ? (
          <StatCell
            labelFull={t.dashboard.stats.arrivals}
            labelShort={SHORT_LABEL.incomingToday}
            value={stats.incomingToday}
            hasDetails={!!stats.incomingTodayDetails}
            isActive={activeKey === 'incomingToday'}
            onToggle={() => toggle('incomingToday')}
          />
        ) : <StatCellSkeleton />}

        {stats ? (
          <StatCell
            labelFull={t.dashboard.stats.abandoned}
            labelShort={SHORT_LABEL.abandoned}
            value={stats.abandonedLast30Days}
            hasDetails={stats.abandonedLast30Days > 0}
            isActive={activeKey === 'abandoned'}
            onToggle={() => toggle('abandoned')}
            meta={{ alert: false, text: t.dashboard.stats.abandonedSubLabel }}
          />
        ) : <StatCellSkeleton />}
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
