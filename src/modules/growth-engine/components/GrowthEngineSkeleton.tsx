import styled, { keyframes } from 'styled-components';
import { ge } from './GrowthEngineTheme';

const shimmer = keyframes`
  0% { background-position: -800px 0; }
  100% { background-position: 800px 0; }
`;

const SkeletonBlock = styled.div<{ $h?: string; $w?: string }>`
  height: ${(p) => p.$h ?? '16px'};
  width: ${(p) => p.$w ?? '100%'};
  background: linear-gradient(
    90deg,
    ${ge.bgCardAlt} 25%,
    ${ge.border} 37%,
    ${ge.bgCardAlt} 63%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.6s ease-in-out infinite;
  border-radius: ${ge.radiusSm};
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Card = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};
  padding: 24px;
  box-shadow: ${ge.shadowSm};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const GrowthEngineSkeleton = () => (
  <Container>
    <Card>
      <SkeletonBlock $h="28px" $w="120px" />
      <SkeletonBlock $h="14px" $w="60%" />
    </Card>
    <Card>
      <SkeletonBlock $h="20px" $w="200px" />
      <SkeletonBlock $h="12px" $w="50%" />
      <div style={{ height: 8 }} />
      <SkeletonBlock $h="380px" />
    </Card>
  </Container>
);
