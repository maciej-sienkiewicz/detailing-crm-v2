/**
 * KPI Strip
 * Quick-glance metrics row at the top of the Growth Engine view.
 * Follows the "5-second rule" — instant understanding of market position.
 */

import styled, { keyframes } from 'styled-components';
import { ge } from './GrowthEngineTheme';
import type { ServiceIntent } from '../types';

interface KpiStripProps {
  intents: ServiceIntent[];
  opportunities: ServiceIntent[];
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const KpiCard = styled.div<{ $accent?: string }>`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radius};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: ${(p) => p.$accent ?? ge.neonCyan};
  }
`;

const KpiLabel = styled.span`
  font-size: ${ge.fontXs};
  color: ${ge.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const KpiValue = styled.span<{ $color?: string }>`
  font-size: ${ge.fontHero};
  font-weight: 800;
  color: ${(p) => p.$color ?? ge.text};
  line-height: 1;
`;

const KpiDetail = styled.span`
  font-size: ${ge.fontXs};
  color: ${ge.textSecondary};
`;

const AlertCard = styled(KpiCard)`
  border-color: ${ge.neonRed};
  background: linear-gradient(135deg, ${ge.bgCard} 0%, rgba(255, 77, 106, 0.05) 100%);

  &:hover {
    animation: ${pulse} 0.5s ease;
  }
`;

export const KpiStrip = ({ intents, opportunities }: KpiStripProps) => {
  const totalDemand = intents.reduce((s, i) => s + i.avgMonthlySearches, 0);
  const coveredDemand = intents
    .filter((i) => i.inOffer)
    .reduce((s, i) => s + i.avgMonthlySearches, 0);
  const coveragePercent = totalDemand > 0
    ? Math.round((coveredDemand / totalDemand) * 100)
    : 0;

  const topGrowing = intents
    .filter((i) => i.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum)[0];

  const gapCount = opportunities.length;

  return (
    <Container>
      <KpiCard $accent={ge.neonCyan}>
        <KpiLabel>Łączny popyt rynkowy</KpiLabel>
        <KpiValue>{totalDemand.toLocaleString('pl-PL')}</KpiValue>
        <KpiDetail>wyszukiwań / miesiąc w Twoim regionie</KpiDetail>
      </KpiCard>

      <KpiCard $accent={ge.neonGreen}>
        <KpiLabel>Pokrycie ofertą</KpiLabel>
        <KpiValue $color={ge.neonGreen}>{coveragePercent}%</KpiValue>
        <KpiDetail>popytu pokrywasz swoimi usługami</KpiDetail>
      </KpiCard>

      <AlertCard $accent={ge.neonRed}>
        <KpiLabel>Luki w ofercie</KpiLabel>
        <KpiValue $color={ge.neonRed}>{gapCount}</KpiValue>
        <KpiDetail>
          {gapCount === 1 ? 'usługa' : 'usług'} szukanych, a nie oferowanych
        </KpiDetail>
      </AlertCard>

      <KpiCard $accent={ge.neonAmber}>
        <KpiLabel>Najszybciej rosnące</KpiLabel>
        <KpiValue $color={ge.neonAmber}>
          {topGrowing ? `+${topGrowing.momentum}%` : '—'}
        </KpiValue>
        <KpiDetail>
          {topGrowing?.name ?? 'Brak danych'}
        </KpiDetail>
      </KpiCard>
    </Container>
  );
};
