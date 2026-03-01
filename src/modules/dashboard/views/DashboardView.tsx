/**
 * Dashboard View — Premium Command Center
 * At-a-glance operational overview: KPIs, metrics, leads, and brand health.
 */

import { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  CalendarPlus,
  Users,
  BarChart2,
  Wrench,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { OperationalScorecard } from '../components/OperationalScorecard';
import { AnalyticsSection } from '../components/AnalyticsSection';
import { LeadInbox } from '../components/LeadInbox';
import { GoogleReviewsSection } from '../components/GoogleReviewsSection';
import { useDashboard, useDashboardSocket } from '../hooks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Dzień dobry';
  if (hour >= 12 && hour < 17) return 'Dobry dzień';
  return 'Dobry wieczór';
};

const formatLocalDate = (): string =>
  new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Nowa wizyta', icon: CalendarPlus, path: '/appointments/create', accent: 'var(--brand-primary)', bg: 'rgba(14,165,233,0.08)' },
  { label: 'Klienci', icon: Users, path: '/customers', accent: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  { label: 'Statystyki', icon: BarChart2, path: '/statistics', accent: '#059669', bg: 'rgba(5,150,105,0.08)' },
  { label: 'Usługi', icon: Wrench, path: '/services', accent: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  { label: 'Growth Engine', icon: TrendingUp, path: '/growth-engine', accent: '#00F5A0', bg: 'rgba(0,245,160,0.08)' },
] as const;

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.lg};
  padding: ${(p) => p.theme.spacing.lg};
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeIn} 280ms ease both;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    padding: ${(p) => p.theme.spacing.xl};
  }
`;

// ─── Command Header ───────────────────────────────────────────────────────────

const CommandHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.spacing.md};
  flex-wrap: wrap;
`;

const GreetingBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const GreetingText = styled.h1`
  font-size: ${(p) => p.theme.fontSizes.xxl};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  margin: 0;
  letter-spacing: -0.3px;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    font-size: 28px;
  }
`;

const DateText = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
  font-weight: ${(p) => p.theme.fontWeights.medium};
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.spacing.sm};
`;

const RefreshBtn = styled.button<{ $spinning?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;

  svg {
    width: 14px;
    height: 14px;
    animation: ${(p) => (p.$spinning ? spin : 'none')} 700ms linear infinite;
  }

  &:hover {
    background-color: ${(p) => p.theme.colors.surfaceAlt};
    border-color: var(--brand-primary);
    color: var(--brand-primary);
  }
`;

// ─── Quick Actions Bar ────────────────────────────────────────────────────────

const QuickActionsBar = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.sm};
  flex-wrap: wrap;
`;

const QuickActionBtn = styled.button<{ $accent: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: ${(p) => p.$bg};
  border: 1px solid transparent;
  border-radius: ${(p) => p.theme.radii.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  color: ${(p) => p.$accent};
  cursor: pointer;
  transition: background-color 150ms ease, box-shadow 150ms ease;
  white-space: nowrap;

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover {
    background-color: ${(p) => p.$bg.replace('0.08', '0.14')};
    box-shadow: 0 0 0 1px ${(p) => p.$accent}40;
  }
`;

// ─── Main Grid ────────────────────────────────────────────────────────────────

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(p) => p.theme.spacing.lg};

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: 2fr 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.lg};
`;

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.spacing.md};
  padding: ${(p) => p.theme.spacing.lg};
  background-color: ${(p) => p.theme.colors.errorLight};
  border: 1px solid ${(p) => p.theme.colors.error};
  border-radius: ${(p) => p.theme.radii.lg};
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.p`
  font-size: ${(p) => p.theme.fontSizes.md};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.error};
  margin: 0 0 4px 0;
`;

const ErrorMsg = styled.p`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textSecondary};
  margin: 0;
`;

const RetryBtn = styled.button`
  flex-shrink: 0;
  padding: 8px 16px;
  background-color: ${(p) => p.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${(p) => p.theme.radii.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  cursor: pointer;
  transition: opacity 150ms ease;

  &:hover {
    opacity: 0.88;
  }
`;

const ErrorIcon = styled(AlertCircle)`
  width: 24px;
  height: 24px;
  color: ${(p) => p.theme.colors.error};
  flex-shrink: 0;
`;

// ─── View ─────────────────────────────────────────────────────────────────────

export const DashboardView = () => {
  useDashboardSocket();

  const {
    stats,
    revenue,
    callActivity,
    recentCalls,
    googleReviews,
    isFetching,
    isError,
    refetch,
    onAccept,
    onReject,
    onEdit,
  } = useDashboard();

  const navigate = useNavigate();

  const greeting = useMemo(() => getGreeting(), []);
  const localDate = useMemo(() => capitalize(formatLocalDate()), []);

  return (
    <ViewContainer>
      {/* ── Command Header ── */}
      <CommandHeader>
        <GreetingBlock>
          <GreetingText>{greeting}!</GreetingText>
          <DateText>{localDate}</DateText>
        </GreetingBlock>

        <HeaderActions>
          <RefreshBtn
            onClick={() => refetch()}
            $spinning={isFetching}
            title="Odśwież dane"
          >
            <RefreshCw />
            Odśwież
          </RefreshBtn>
        </HeaderActions>
      </CommandHeader>

      {/* ── Error Banner ── */}
      {isError && (
        <ErrorBox>
          <ErrorIcon />
          <ErrorContent>
            <ErrorTitle>Nie udało się załadować danych</ErrorTitle>
            <ErrorMsg>Sprawdź połączenie z serwerem i spróbuj ponownie.</ErrorMsg>
          </ErrorContent>
          <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
        </ErrorBox>
      )}

      {/* ── Quick Actions ── */}
      <QuickActionsBar>
        {QUICK_ACTIONS.map((action) => (
          <QuickActionBtn
            key={action.path}
            $accent={action.accent}
            $bg={action.bg}
            onClick={() => navigate(action.path)}
          >
            <action.icon />
            {action.label}
          </QuickActionBtn>
        ))}
      </QuickActionsBar>

      {/* ── KPI Strip ── */}
      <OperationalScorecard stats={stats} />

      {/* ── Main Content Grid ── */}
      <ContentGrid>
        {/* Left: Metrics */}
        <LeftColumn>
          <AnalyticsSection revenue={revenue} callActivity={callActivity} />
        </LeftColumn>

        {/* Right: Lead Inbox */}
        <LeadInbox
          calls={recentCalls}
          onAccept={onAccept}
          onEdit={onEdit}
          onReject={onReject}
        />
      </ContentGrid>

      {/* ── Google Reviews (full width) ── */}
      <GoogleReviewsSection data={googleReviews} />
    </ViewContainer>
  );
};
