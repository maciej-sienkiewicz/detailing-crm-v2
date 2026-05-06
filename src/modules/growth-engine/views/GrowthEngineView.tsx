import styled from 'styled-components';
import { ge } from '../components/GrowthEngineTheme';
import { ContextHeader } from '../components/ContextHeader';
import { SeasonalityPulse } from '../components/SeasonalityPulse';
import { GrowthEngineSkeleton } from '../components/GrowthEngineSkeleton';
import { useGrowthEngine } from '../hooks';

// ─── Layout ──────────────────────────────────────────────────────

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
`;

const ErrorCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};
  box-shadow: ${ge.shadowSm};
  text-align: center;
  gap: 12px;
`;

const ErrorTitle = styled.h2`
  font-size: ${ge.fontXl};
  font-weight: 700;
  color: ${ge.accentRed};
  margin: 0;
`;

const ErrorMessage = styled.p`
  font-size: ${ge.fontMd};
  color: ${ge.textSecondary};
  margin: 0;
`;

const RetryButton = styled.button`
  padding: 10px 24px;
  background: ${ge.accentBlue};
  border: none;
  border-radius: ${ge.radiusSm};
  color: #fff;
  font-size: ${ge.fontSm};
  font-weight: 600;
  cursor: pointer;
  transition: opacity ${ge.transition};

  &:hover {
    opacity: 0.85;
  }
`;

// ─── View ────────────────────────────────────────────────────────

export const GrowthEngineView = () => {
  const {
    allKeywords,
    effectiveSelected,
    chartData,
    keywordColors,
    locations,
    locationName,
    locationCode,
    setLocationCode,
    granularity,
    setGranularity,
    isLoading,
    isError,
    toggle,
    isSelected,
    refetch,
  } = useGrowthEngine();

  return (
    <ViewContainer>
      {isError && (
        <ErrorCard>
          <ErrorTitle>Nie udało się załadować danych</ErrorTitle>
          <ErrorMessage>Sprawdź połączenie i spróbuj ponownie.</ErrorMessage>
          <RetryButton onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
        </ErrorCard>
      )}

      {isLoading && <GrowthEngineSkeleton />}

      {!isLoading && !isError && (
        <>
          <ContextHeader
            locationCode={locationCode}
            onLocationChange={setLocationCode}
            locations={locations}
            locationName={locationName}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />

          <SeasonalityPulse
            allKeywords={allKeywords}
            effectiveSelected={effectiveSelected}
            keywordColors={keywordColors}
            chartData={chartData}
            onToggle={toggle}
            isSelected={isSelected}
          />
        </>
      )}
    </ViewContainer>
  );
};
