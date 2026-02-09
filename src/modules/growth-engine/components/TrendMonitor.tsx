/**
 * Trend Monitor - Top Movers Horizontal Bar Chart
 * Shows Top 10 services with the highest month-over-month momentum.
 * "Hot" badge for leaders, color-coded by offer status.
 */

import styled, { keyframes } from 'styled-components';
import { ge } from './GrowthEngineTheme';
import type { ServiceIntent } from '../types';

interface TrendMonitorProps {
  topMovers: ServiceIntent[];
}

// ─── Animations ─────────────────────────────────────────────────

const barGrow = keyframes`
  from { width: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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
  gap: 2px;
  margin-bottom: 20px;
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

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: ${ge.bgInput};
  border-radius: ${ge.radiusSm};
  transition: background ${ge.transition};

  &:hover {
    background: ${ge.bgCardHover};
  }
`;

const Rank = styled.span`
  width: 24px;
  font-size: ${ge.fontSm};
  font-weight: 700;
  color: ${ge.textMuted};
  text-align: center;
  flex-shrink: 0;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
  flex-shrink: 0;

  @media (max-width: 640px) {
    min-width: 100px;
  }
`;

const IntentName = styled.span`
  font-size: ${ge.fontSm};
  font-weight: 600;
  color: ${ge.text};
`;

const OfferStatus = styled.span<{ $inOffer: boolean }>`
  font-size: ${ge.fontXs};
  color: ${(p) => (p.$inOffer ? ge.neonGreen : ge.neonRed)};
`;

const BarWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const BarFill = styled.div<{ $width: number; $inOffer: boolean }>`
  height: 100%;
  width: ${(p) => p.$width}%;
  background: ${(p) =>
    p.$inOffer ? ge.gradientGreen : ge.gradientRed};
  border-radius: 12px;
  animation: ${barGrow} 0.8s ease-out;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
  }
`;

const MomentumValue = styled.span<{ $hot: boolean }>`
  font-size: ${ge.fontSm};
  font-weight: 700;
  color: ${ge.neonGreen};
  white-space: nowrap;
  min-width: 55px;
  text-align: right;
  flex-shrink: 0;
`;

const HotBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  background: ${ge.neonAmberDim};
  color: ${ge.neonAmber};
  border-radius: 10px;
  font-size: ${ge.fontXs};
  font-weight: 700;
  flex-shrink: 0;
  animation: ${pulseGlow} 2s ease-in-out infinite;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${ge.textMuted};
  font-size: ${ge.fontSm};
`;

// ─── Component ───────────────────────────────────────────────────

export const TrendMonitor = ({ topMovers }: TrendMonitorProps) => {
  const maxMomentum = Math.max(...topMovers.map((i) => i.momentum), 1);

  return (
    <Container>
      <Header>
        <SectionTitle>Trend Monitor</SectionTitle>
        <SectionSubtitle>
          Top 10 usług z najwyższym wzrostem popularności (miesiąc do miesiąca)
        </SectionSubtitle>
      </Header>

      {topMovers.length === 0 ? (
        <EmptyState>Brak danych o trendach wzrostowych</EmptyState>
      ) : (
        <List>
          {topMovers.map((intent, index) => {
            const barWidth = Math.max((intent.momentum / maxMomentum) * 100, 5);
            const isHot = index < 3;

            return (
              <Row key={intent.id}>
                <Rank>{index + 1}</Rank>
                <Info>
                  <IntentName>{intent.name}</IntentName>
                  <OfferStatus $inOffer={intent.inOffer}>
                    {intent.inOffer ? 'W ofercie' : 'Brak w ofercie'}
                  </OfferStatus>
                </Info>
                <BarWrapper>
                  <BarTrack>
                    <BarFill $width={barWidth} $inOffer={intent.inOffer} />
                  </BarTrack>
                </BarWrapper>
                <MomentumValue $hot={isHot}>
                  +{intent.momentum}%
                </MomentumValue>
                {isHot && <HotBadge>HOT</HotBadge>}
              </Row>
            );
          })}
        </List>
      )}
    </Container>
  );
};
