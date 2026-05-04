/**
 * Dashboard View — Command Center
 */

import { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertCircle, CalendarPlus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { OperationalScorecard } from '../components/OperationalScorecard';
import { UpcomingVisitsPanel } from '../components/UpcomingVisitsPanel';
import { TasksPanel } from '../components/TasksPanel';
import { RevenueKpiCard } from '../components/RevenueKpiCard';
import { CompetitorStoriesSection } from '../components/CompetitorStoriesSection';
import { GeneratePostModal } from '@/modules/competition-monitoring/components/GeneratePostModal';
import { useDashboard, useDashboardSocket } from '../hooks';
import type { OperationalStats } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 18) return 'Dzień dobry';
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

const getHeroDesc = (stats?: OperationalStats): string => {
  if (!stats) return '';
  const parts: string[] = [];
  if (stats.incomingToday > 0) {
    const n = stats.incomingToday;
    const suffix = n === 1 ? 'wizyta' : n < 5 ? 'wizyty' : 'wizyt';
    parts.push(`Dziś na warsztacie ${n} ${suffix}`);
  }
  if (stats.inProgress > 0) parts.push(`${stats.inProgress} w trakcie realizacji`);
  if (stats.readyForPickup > 0) parts.push(`${stats.readyForPickup} gotowych do wydania`);
  return parts.length > 0 ? parts.join(' · ') + '.' : 'Brak aktywnych wizyt na dziś.';
};

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
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
    padding: ${p => p.theme.spacing.xl};
  }
`;

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HeroCard = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
  border-radius: ${p => p.theme.radii.xl};
  padding: 32px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.16);

  &::before {
    content: '';
    position: absolute;
    top: -120px;
    right: -80px;
    width: 360px;
    height: 360px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(14,165,233,0.35) 0%, rgba(14,165,233,0) 60%);
    pointer-events: none;
  }

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    padding: 22px 20px;
  }
`;

const HeroRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    flex-direction: column;
    gap: 24px;
  }
`;

const HeroLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const HeroEyebrow = styled.p`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: 0 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const LiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
  animation: ${pulse} 2s infinite;
  flex-shrink: 0;
`;

const HeroGreeting = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0 0 8px 0;
  font-size: 34px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
  line-height: 1.1;

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    font-size: 28px;
  }
`;

const HeroDesc = styled.p`
  font-size: 14px;
  color: #94a3b8;
  max-width: 520px;
  margin: 0 0 20px;
  line-height: 1.55;
`;

const HeroActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const HeroBtnPrimary = styled.button`
  background: #0ea5e9;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(14,165,233,0.28);
  transition: all 180ms ease;
  font-family: inherit;

  &:hover {
    background: #0284c7;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(14,165,233,0.36);
  }

  svg { width: 16px; height: 16px; stroke-width: 2; }
`;

const HeroBtnGhost = styled.button`
  background: rgba(255,255,255,0.08);
  color: #f1f5f9;
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(4px);
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 180ms ease;
  font-family: inherit;

  &:hover { background: rgba(255,255,255,0.14); }
  svg { width: 16px; height: 16px; stroke-width: 2; }
`;

// ─── Two-column panels grid ───────────────────────────────────────────────────

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [instagramModalOpen, setInstagramModalOpen] = useState(false);

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
    const heroDesc = useMemo(() => getHeroDesc(stats), [stats]);

  return (
    <ViewContainer>

      <HeroCard>
        <HeroRow>
          <HeroLeft>
            <HeroEyebrow>
              <LiveDot />
              Status operacyjny · na żywo
            </HeroEyebrow>
              <HeroGreeting>{greeting}{user?.firstName ? `, ${user.firstName}` : ''}!</HeroGreeting>
              {heroDesc && <HeroDesc>{heroDesc}</HeroDesc>}
              <HeroActions>
              <HeroBtnPrimary onClick={() => navigate('/checkin/new')}>
                <CalendarPlus />
                Nowa wizyta
              </HeroBtnPrimary>
              <HeroBtnGhost onClick={() => setInstagramModalOpen(true)}>
                <Sparkles />
                Generuj post
              </HeroBtnGhost>
            </HeroActions>
          </HeroLeft>
          <RevenueKpiCard />
        </HeroRow>
      </HeroCard>

      {instagramModalOpen && (
        <GeneratePostModal onClose={() => setInstagramModalOpen(false)} />
      )}

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

      <TwoColGrid>
        <UpcomingVisitsPanel />
        <TasksPanel />
      </TwoColGrid>

      <CompetitorStoriesSection />

    </ViewContainer>
  );
};
