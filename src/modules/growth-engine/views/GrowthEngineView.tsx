/**
 * Growth Engine View
 * Main page for market demand analysis, trend monitoring, and opportunity detection.
 * Dark luxury theme with neon accents for premium auto-detailing segment.
 */

import { useState } from 'react';
import styled from 'styled-components';
import { ge } from '../components/GrowthEngineTheme';
import { ContextHeader } from '../components/ContextHeader';
import { KpiStrip } from '../components/KpiStrip';
import { SeasonalityPulse } from '../components/SeasonalityPulse';
import { TrendMonitor } from '../components/TrendMonitor';
import { OpportunityScanner } from '../components/OpportunityScanner';
import { AddToOfferModal } from '../components/AddToOfferModal';
import { GrowthEngineSkeleton } from '../components/GrowthEngineSkeleton';
import { useGrowthEngine, useChartSelection } from '../hooks';
import type { ServiceIntent } from '../types';

// ─── Dark Theme Wrapper ──────────────────────────────────────────

const DarkWrapper = styled.div`
  background: ${ge.bg};
  min-height: 100vh;
  color: ${ge.text};
  margin: -24px;
  padding: 24px;

  @media (min-width: 768px) {
    margin: -32px;
    padding: 32px;
  }

  /* Override any light-mode leaks from parent */
  *, *::before, *::after {
    border-color: ${ge.border};
  }

  /* Custom scrollbar for dark mode */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: ${ge.bg};
  }
  ::-webkit-scrollbar-thumb {
    background: ${ge.border};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${ge.borderHover};
  }
`;

const ContentContainer = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  background: ${ge.bgCard};
  border: 1px solid ${ge.neonRed};
  border-radius: ${ge.radiusLg};
  text-align: center;
`;

const ErrorTitle = styled.h2`
  font-size: ${ge.fontXl};
  font-weight: 700;
  color: ${ge.neonRed};
  margin: 0 0 8px 0;
`;

const ErrorMessage = styled.p`
  font-size: ${ge.fontMd};
  color: ${ge.textSecondary};
  margin: 0 0 20px 0;
`;

const RetryButton = styled.button`
  padding: 10px 24px;
  background: ${ge.neonGreen};
  border: none;
  border-radius: ${ge.radiusSm};
  color: ${ge.bg};
  font-size: ${ge.fontSm};
  font-weight: 700;
  cursor: pointer;
  transition: all ${ge.transition};

  &:hover {
    box-shadow: ${ge.neonGreenGlow};
  }
`;

// ─── View Component ──────────────────────────────────────────────

export const GrowthEngineView = () => {
  const {
    intents,
    allIntents,
    top5ByVolume,
    top10ByMomentum,
    opportunities,
    locations,
    lastUpdated,
    locationName,
    location,
    setLocation,
    isLoading,
    isError,
    refetch,
  } = useGrowthEngine();

  const { selectedIds, toggle, isSelected } = useChartSelection(top5ByVolume);
  const [modalIntent, setModalIntent] = useState<ServiceIntent | null>(null);

  const handleAddToOffer = (intent: ServiceIntent) => {
    setModalIntent(intent);
  };

  const handleConfirmAdd = (data: { name: string; category: string; description: string }) => {
    // In production, this would call an API to add the service to CRM
    console.log('[Growth Engine] Adding service to offer:', data);
    setModalIntent(null);
  };

  return (
    <DarkWrapper>
      <ContentContainer>
        {/* Error state */}
        {isError && (
          <ErrorContainer>
            <ErrorTitle>Nie udało się załadować danych</ErrorTitle>
            <ErrorMessage>
              Sprawdź połączenie internetowe i spróbuj ponownie.
            </ErrorMessage>
            <RetryButton onClick={() => refetch()}>
              Spróbuj ponownie
            </RetryButton>
          </ErrorContainer>
        )}

        {/* Loading state */}
        {isLoading && <GrowthEngineSkeleton />}

        {/* Loaded state */}
        {!isLoading && !isError && (
          <>
            {/* A. Global Context Header */}
            <ContextHeader
              location={location}
              onLocationChange={setLocation}
              locations={locations}
              locationName={locationName}
              lastUpdated={lastUpdated}
            />

            {/* KPI Summary Strip */}
            <KpiStrip intents={intents} opportunities={opportunities} />

            {/* B. Seasonality Pulse Chart */}
            <SeasonalityPulse
              allIntents={allIntents}
              selectedIds={selectedIds}
              onToggle={toggle}
              isSelected={isSelected}
            />

            {/* C. Trend Monitor */}
            <TrendMonitor topMovers={top10ByMomentum} />

            {/* D. Opportunity Scanner */}
            <OpportunityScanner
              opportunities={opportunities}
              locationName={locationName}
              onAddToOffer={handleAddToOffer}
            />
          </>
        )}

        {/* Add to Offer Modal */}
        {modalIntent && (
          <AddToOfferModal
            intent={modalIntent}
            onClose={() => setModalIntent(null)}
            onConfirm={handleConfirmAdd}
          />
        )}
      </ContentContainer>
    </DarkWrapper>
  );
};
