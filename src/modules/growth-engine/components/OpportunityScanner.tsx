/**
 * Opportunity Scanner - Action Card Grid
 * Displays service gaps as actionable opportunity cards.
 * Each card shows an intent the studio doesn't offer but has local search demand.
 */

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ge } from './GrowthEngineTheme';
import type { ServiceIntent } from '../types';

interface OpportunityScannerProps {
  opportunities: ServiceIntent[];
  locationName: string;
  onAddToOffer: (intent: ServiceIntent) => void;
}

// ─── Animations ─────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─── Styled Components ───────────────────────────────────────────

const Container = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SectionTitle = styled.h2`
  font-size: ${ge.fontLg};
  font-weight: 700;
  color: ${ge.text};
  margin: 0;
`;

const SectionSubtitle = styled.p`
  font-size: ${ge.fontXs};
  color: ${ge.textMuted};
  margin: 0;
`;

const Counter = styled.span`
  font-size: ${ge.fontSm};
  color: ${ge.neonRed};
  font-weight: 600;
  padding: 4px 12px;
  background: ${ge.neonRedDim};
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.div<{ $index: number }>`
  position: relative;
  background: ${ge.gradientCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radius};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all ${ge.transitionSlow};
  animation: ${fadeIn} 0.4s ease-out;
  animation-delay: ${(p) => p.$index * 60}ms;
  animation-fill-mode: backwards;
  overflow: hidden;

  &:hover {
    border-color: ${ge.neonRed};
    box-shadow: ${ge.neonRedGlow};
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${ge.gradientRed};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

const IntentName = styled.h3`
  font-size: ${ge.fontMd};
  font-weight: 700;
  color: ${ge.text};
  margin: 0;
  line-height: 1.3;
`;

const CategoryBadge = styled.span`
  font-size: ${ge.fontXs};
  color: ${ge.neonCyan};
  background: ${ge.neonCyanDim};
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const MetricRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MetricLabel = styled.span`
  font-size: ${ge.fontXs};
  color: ${ge.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.span`
  font-size: ${ge.fontXl};
  font-weight: 700;
  color: ${ge.text};

  small {
    font-size: ${ge.fontSm};
    color: ${ge.textSecondary};
    font-weight: 400;
  }
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${ge.neonRedDim};
  border-radius: ${ge.radiusSm};
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${ge.neonRed};
`;

const StatusText = styled.span`
  font-size: ${ge.fontXs};
  color: ${ge.neonRed};
  font-weight: 600;
`;

const MomentumTag = styled.span`
  margin-left: auto;
  font-size: ${ge.fontXs};
  color: ${ge.neonGreen};
  font-weight: 600;
`;

const AddButton = styled.button`
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid ${ge.neonGreen};
  border-radius: ${ge.radiusSm};
  color: ${ge.neonGreen};
  font-size: ${ge.fontSm};
  font-weight: 600;
  cursor: pointer;
  transition: all ${ge.transition};
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${ge.neonGreenDim};
    box-shadow: ${ge.neonGreenGlow};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -200%;
    width: 200%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 245, 160, 0.1),
      transparent
    );
    animation: ${shimmer} 3s infinite;
  }
`;

const ShowMoreButton = styled.button`
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: ${ge.bgInput};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.textSecondary};
  font-size: ${ge.fontSm};
  cursor: pointer;
  transition: all ${ge.transition};

  &:hover {
    border-color: ${ge.borderHover};
    color: ${ge.text};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${ge.textMuted};

  h3 {
    font-size: ${ge.fontLg};
    color: ${ge.neonGreen};
    margin: 0 0 8px 0;
  }

  p {
    font-size: ${ge.fontSm};
    margin: 0;
  }
`;

// ─── Component ───────────────────────────────────────────────────

export const OpportunityScanner = ({
  opportunities,
  locationName,
  onAddToOffer,
}: OpportunityScannerProps) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? opportunities : opportunities.slice(0, 6);
  const hasMore = opportunities.length > 6;

  if (opportunities.length === 0) {
    return (
      <Container>
        <Header>
          <TitleGroup>
            <SectionTitle>Skaner Okazji</SectionTitle>
          </TitleGroup>
        </Header>
        <EmptyState>
          <h3>Pełna oferta!</h3>
          <p>Twoje studio pokrywa wszystkie popularne usługi w regionie.</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <TitleGroup>
          <SectionTitle>Skaner Okazji</SectionTitle>
          <SectionSubtitle>
            Usługi których szukają klienci, a Ty ich nie oferujesz
          </SectionSubtitle>
        </TitleGroup>
        <Counter>
          {opportunities.length} {opportunities.length === 1 ? 'luka' : 'luk'} w ofercie
        </Counter>
      </Header>

      <Grid>
        {visible.map((intent, index) => (
          <Card key={intent.id} $index={index}>
            <CardHeader>
              <IntentName>{intent.name}</IntentName>
              <CategoryBadge>{intent.category}</CategoryBadge>
            </CardHeader>

            <MetricRow>
              <MetricLabel>Potencjał lokalny</MetricLabel>
              <MetricValue>
                {intent.avgMonthlySearches.toLocaleString('pl-PL')}{' '}
                <small>os. / miesiąc szuka w {locationName}</small>
              </MetricValue>
            </MetricRow>

            <StatusBar>
              <StatusDot />
              <StatusText>Brak w Twoim cenniku</StatusText>
              {intent.momentum > 0 && (
                <MomentumTag>+{intent.momentum}% wzrost</MomentumTag>
              )}
            </StatusBar>

            <AddButton onClick={() => onAddToOffer(intent)}>
              + Dodaj do oferty
            </AddButton>
          </Card>
        ))}
      </Grid>

      {hasMore && !showAll && (
        <ShowMoreButton onClick={() => setShowAll(true)}>
          Pokaż wszystkie ({opportunities.length}) okazje
        </ShowMoreButton>
      )}
    </Container>
  );
};
