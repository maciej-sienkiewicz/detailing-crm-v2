/**
 * Global Context Header
 * Location selector and time range display for the Growth Engine view
 */

import styled from 'styled-components';
import { ge } from './GrowthEngineTheme';
import type { LocationFilter, Voivodeship } from '../types';

interface ContextHeaderProps {
  location: LocationFilter;
  onLocationChange: (location: LocationFilter) => void;
  locations: Voivodeship[];
  locationName: string;
  lastUpdated?: string;
}

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: ${ge.gradientHeader};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: ${ge.fontXxl};
  font-weight: 700;
  color: ${ge.text};
  margin: 0;
  letter-spacing: -0.5px;

  span {
    background: ${ge.gradientGreen};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: ${ge.fontSm};
  color: ${ge.textMuted};
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SelectWrapper = styled.div`
  position: relative;

  &::after {
    content: '▾';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${ge.textMuted};
    pointer-events: none;
    font-size: 12px;
  }
`;

const Select = styled.select`
  appearance: none;
  background: ${ge.bgInput};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.text};
  font-size: ${ge.fontSm};
  padding: 10px 36px 10px 14px;
  cursor: pointer;
  transition: border-color ${ge.transition};
  min-width: 200px;

  &:hover {
    border-color: ${ge.borderHover};
  }

  &:focus {
    outline: none;
    border-color: ${ge.neonGreen};
    box-shadow: ${ge.neonGreenGlow};
  }

  option {
    background: ${ge.bgCard};
    color: ${ge.text};
  }
`;

const TimeRangeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: ${ge.bgInput};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  font-size: ${ge.fontSm};
  color: ${ge.textSecondary};

  span {
    color: ${ge.neonCyan};
    font-weight: 600;
  }
`;

const UpdateInfo = styled.div`
  font-size: ${ge.fontXs};
  color: ${ge.textMuted};
`;

export const ContextHeader = ({
  location,
  onLocationChange,
  locations,
  locationName,
  lastUpdated,
}: ContextHeaderProps) => {
  return (
    <HeaderContainer>
      <TitleSection>
        <Title>
          <span>Growth Engine</span>
        </Title>
        <Subtitle>
          Analiza popytu rynkowego &bull; {locationName}
        </Subtitle>
      </TitleSection>

      <Controls>
        <SelectWrapper>
          <Select
            value={location}
            onChange={(e) => onLocationChange(e.target.value as LocationFilter)}
          >
            <option value="PL">Cała Polska</option>
            {locations.map((v) => (
              <option key={v.code} value={v.code}>
                woj. {v.name}
              </option>
            ))}
          </Select>
        </SelectWrapper>

        <TimeRangeBadge>
          Okres: <span>12 miesięcy</span>
        </TimeRangeBadge>

        {lastUpdated && (
          <UpdateInfo>
            Dane z: {new Date(lastUpdated).toLocaleDateString('pl-PL')}
          </UpdateInfo>
        )}
      </Controls>
    </HeaderContainer>
  );
};
