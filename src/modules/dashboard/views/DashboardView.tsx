/**
 * Dashboard View — Premium Command Center
 * At-a-glance operational overview: KPIs, metrics, leads, and brand health.
 */

import { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { RefreshCw, AlertCircle, Wifi, Clock } from 'lucide-react';
import { OperationalScorecard } from '../components/OperationalScorecard';
import { AnalyticsSection } from '../components/AnalyticsSection';
import { GoogleReviewsSection } from '../components/GoogleReviewsSection';
import { useDashboard, useDashboardSocket } from '../hooks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Dzień dobry';
  if (h >= 12 && h < 18) return 'Dzień dobry';
  return 'Dobry wieczór';
};

const formatLocalDate = (): string =>
  new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatTime = (): string =>
  new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.xl};
  padding: ${p => p.theme.spacing.lg};
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeUp} 300ms ease both;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    padding: ${p => p.theme.spacing.xl} ${p => p.theme.spacing.xl};
  }
`;

// ─── Hero Header ──────────────────────────────────────────────────────────────

const HeroCard = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c2340 100%);
  border-radius: ${p => p.theme.radii.xl};
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${p => p.theme.spacing.md};
  flex-wrap: wrap;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 8px 32px rgba(0, 0, 0, 0.18);

  /* Decorative gradient orbs */
  &::before {
    content: '';
    position: absolute;
    top: -60px;
    right: -40px;
    width: 280px;
    height: 280px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, transparent 70%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -80px;
    left: 30%;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    padding: 20px;
  }
`;

const HeroLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  z-index: 1;
`;

const HeroGreeting = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.5px;
  line-height: 1.1;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    font-size: 32px;
  }
`;

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 2px;
  flex-wrap: wrap;
`;

const HeroDate = styled.span`
  font-size: 13.5px;
  color: #64748b;
  font-weight: 500;
`;

const HeroTimeDivider = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #334155;
  flex-shrink: 0;
`;

const HeroTime = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #475569;
  font-weight: 500;
  font-variant-numeric: tabular-nums;

  svg { width: 13px; height: 13px; color: #475569; }
`;

const HeroStatusChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  color: #4ade80;
  letter-spacing: 0.02em;
`;

const StatusPulse = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: ${pulse} 2s ease infinite;
`;

const HeroRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.sm};
  position: relative;
  z-index: 1;
`;

const RefreshBtn = styled.button<{ $spinning?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${p => p.theme.radii.md};
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: ${p => p.theme.fontWeights.medium};
  color: #94a3b8;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
    animation: ${p => p.$spinning ? spin : 'none'} 700ms linear infinite;
  }

  &:hover {
    background: rgba(14, 165, 233, 0.15);
    border-color: rgba(14, 165, 233, 0.35);
    color: #38bdf8;
  }
`;

// ─── Section Label ────────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: -${p => p.theme.spacing.md};
`;

const SectionLabelText = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const SectionLabelLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${p => p.theme.colors.border};
`;

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.md};
  padding: ${p => p.theme.spacing.lg};
  background-color: ${p => p.theme.colors.errorLight};
  border: 1px solid ${p => p.theme.colors.error};
  border-radius: ${p => p.theme.radii.lg};
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.p`
  font-size: ${p => p.theme.fontSizes.md};
  font-weight: ${p => p.theme.fontWeights.semibold};
  color: ${p => p.theme.colors.error};
  margin: 0 0 4px 0;
`;

const ErrorMsg = styled.p`
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textSecondary};
  margin: 0;
`;

const RetryBtn = styled.button`
  flex-shrink: 0;
  padding: 8px 16px;
  background-color: ${p => p.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${p => p.theme.radii.md};
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: ${p => p.theme.fontWeights.semibold};
  cursor: pointer;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.88; }
`;

const ErrorIcon = styled(AlertCircle)`
  width: 24px;
  height: 24px;
  color: ${p => p.theme.colors.error};
  flex-shrink: 0;
`;

// ─── View ─────────────────────────────────────────────────────────────────────

export const DashboardView = () => {
  useDashboardSocket();

  const {
    stats,
    revenue,
    callActivity,
    instagramPhotos,
    googleReviews,
    isFetching,
    isError,
    refetch,
  } = useDashboard();

  const greeting = useMemo(() => getGreeting(), []);
  const localDate = useMemo(() => capitalize(formatLocalDate()), []);
  const currentTime = useMemo(() => formatTime(), []);

  return (
    <ViewContainer>

      {/* ── Hero Header ── */}
      <HeroCard>
        <HeroLeft>
          <HeroGreeting>{greeting}!</HeroGreeting>
          <HeroMeta>
            <HeroDate>{localDate}</HeroDate>
            <HeroTimeDivider />
            <HeroTime>
              <Clock />
              {currentTime}
            </HeroTime>
          </HeroMeta>
          <div style={{ marginTop: '10px' }}>
            <HeroStatusChip>
              <StatusPulse />
              Połączono z serwerem
            </HeroStatusChip>
          </div>
        </HeroLeft>

        <HeroRight>
          <RefreshBtn
            onClick={() => refetch()}
            $spinning={isFetching}
            title="Odśwież dane"
          >
            <RefreshCw />
            Odśwież
          </RefreshBtn>
        </HeroRight>
      </HeroCard>

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

      {/* ── KPI Strip ── */}
      <div>
        <SectionLabel>
          <SectionLabelText>Status operacyjny</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        <OperationalScorecard stats={stats} />
      </div>

      {/* ── Metrics ── */}
      <div>
        <SectionLabel>
          <SectionLabelText>Analityka</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        <AnalyticsSection
          revenue={revenue}
          callActivity={callActivity}
          instagramPhotos={instagramPhotos}
        />
      </div>

      {/* ── Google Reviews ── */}
      <div>
        <SectionLabel>
          <SectionLabelText>Opinie Google</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        <GoogleReviewsSection data={googleReviews} />
      </div>

    </ViewContainer>
  );
};
