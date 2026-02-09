/**
 * Growth Engine Loading Skeleton
 * Shown while data is being fetched
 */

import styled, { keyframes } from 'styled-components';
import { ge } from './GrowthEngineTheme';

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const SkeletonBlock = styled.div<{ $h?: string; $w?: string }>`
  height: ${(p) => p.$h ?? '20px'};
  width: ${(p) => p.$w ?? '100%'};
  background: linear-gradient(
    90deg,
    ${ge.bgCard} 25%,
    ${ge.bgCardHover} 37%,
    ${ge.bgCard} 63%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 1.8s ease-in-out infinite;
  border-radius: ${ge.radiusSm};
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const KpiSkeleton = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radius};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChartSkeleton = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};
  padding: 24px;
`;

export const GrowthEngineSkeleton = () => (
  <Container>
    {/* Header */}
    <SkeletonBlock $h="80px" />

    {/* KPI Strip */}
    <KpiRow>
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiSkeleton key={i}>
          <SkeletonBlock $h="12px" $w="60%" />
          <SkeletonBlock $h="36px" $w="40%" />
          <SkeletonBlock $h="12px" $w="80%" />
        </KpiSkeleton>
      ))}
    </KpiRow>

    {/* Chart */}
    <ChartSkeleton>
      <SkeletonBlock $h="16px" $w="200px" />
      <div style={{ height: 12 }} />
      <SkeletonBlock $h="350px" />
    </ChartSkeleton>

    {/* Trend monitor */}
    <ChartSkeleton>
      <SkeletonBlock $h="16px" $w="180px" />
      <div style={{ height: 12 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ marginTop: 8 }}>
          <SkeletonBlock $h="44px" />
        </div>
      ))}
    </ChartSkeleton>
  </Container>
);
