/**
 * Dashboard View — Command Center
 */

import { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertCircle } from 'lucide-react';
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
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
    padding: ${p => p.theme.spacing.xl};
  }
`;

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HeroCard = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
  border-radius: ${p => p.theme.radii.xl};
  padding: 28px 32px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.16);

  &::before {
    content: '';
    position: absolute;
    top: -80px;
    right: -60px;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, transparent 65%);
    pointer-events: none;
  }

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    padding: 22px 20px;
  }
`;

const HeroGreeting = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0 0 4px 0;
  font-size: 30px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.5px;
  line-height: 1.1;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    font-size: 34px;
  }
`;

const HeroDate = styled.p`
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 14px;
  color: #475569;
  font-weight: 500;
`;

// ─── Section Divider ──────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: -${p => p.theme.spacing.md};
`;

const SectionLabelText = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
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
  background: ${p => p.theme.colors.errorLight};
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: ${p => p.theme.radii.xl};
`;

const ErrorIcon = styled(AlertCircle)`
  width: 22px;
  height: 22px;
  color: ${p => p.theme.colors.error};
  flex-shrink: 0;
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.colors.error};
  margin: 0 0 2px;
`;

const ErrorMsg = styled.p`
  font-size: 13px;
  color: ${p => p.theme.colors.textSecondary};
  margin: 0;
`;

const RetryBtn = styled.button`
  flex-shrink: 0;
  padding: 8px 16px;
  background: ${p => p.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${p => p.theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms ease;
  &:hover { opacity: 0.85; }
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
    isError,
    refetch,
  } = useDashboard();

  const greeting = useMemo(() => getGreeting(), []);
  const localDate = useMemo(() => capitalize(formatLocalDate()), []);

  return (
    <ViewContainer>

      <HeroCard>
        <HeroGreeting>{greeting}!</HeroGreeting>
        <HeroDate>{localDate}</HeroDate>
      </HeroCard>

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

      <div>
        <SectionLabel>
          <SectionLabelText>Status operacyjny</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        <OperationalScorecard stats={stats} />
      </div>

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
