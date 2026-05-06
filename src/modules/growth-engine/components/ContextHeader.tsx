import styled from 'styled-components';
import { ge } from './GrowthEngineTheme';
import type { Location, Granularity } from '../types';

interface ContextHeaderProps {
  locationCode: number;
  onLocationChange: (code: number) => void;
  locations: Location[];
  locationName: string;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
}

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: ${ge.text};
  margin: 0;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  font-size: ${ge.fontSm};
  color: ${ge.textMuted};
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SelectWrapper = styled.div`
  position: relative;

  &::after {
    content: '▾';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: ${ge.textMuted};
    pointer-events: none;
    font-size: 11px;
  }
`;

const Select = styled.select`
  appearance: none;
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.text};
  font-size: ${ge.fontSm};
  padding: 8px 32px 8px 12px;
  cursor: pointer;
  transition: border-color ${ge.transition};
  min-width: 180px;
  box-shadow: ${ge.shadowSm};

  &:hover {
    border-color: ${ge.borderHover};
  }

  &:focus {
    outline: none;
    border-color: ${ge.borderFocus};
    box-shadow: ${ge.shadowBlue};
  }
`;

const GranularityToggle = styled.div`
  display: flex;
  background: ${ge.bgCardAlt};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  overflow: hidden;
`;

const GranularityButton = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  font-size: ${ge.fontSm};
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  color: ${(p) => (p.$active ? ge.accentBlue : ge.textSecondary)};
  background: ${(p) => (p.$active ? ge.bgCard : 'transparent')};
  border: none;
  cursor: pointer;
  transition: all ${ge.transition};
  white-space: nowrap;

  &:hover {
    color: ${ge.text};
    background: ${ge.bgCard};
  }
`;

export const ContextHeader = ({
  locationCode,
  onLocationChange,
  locations,
  locationName,
  granularity,
  onGranularityChange,
}: ContextHeaderProps) => {
  return (
    <HeaderContainer>
      <TitleGroup>
        <Title>Raporty</Title>
        <Subtitle>Trendy wyszukiwań · {locationName}</Subtitle>
      </TitleGroup>

      <Controls>
        <SelectWrapper>
          <Select
            value={locationCode}
            onChange={(e) => onLocationChange(Number(e.target.value))}
          >
            <option value={2616}>Cała Polska</option>
            {locations
              .filter((l) => l.geoLevel === 'voivodeship')
              .map((l) => (
                <option key={l.locationCode} value={l.locationCode}>
                  woj. {l.polishName ?? l.locationName}
                </option>
              ))}
          </Select>
        </SelectWrapper>

        <GranularityToggle>
          <GranularityButton
            $active={granularity === 'monthly'}
            onClick={() => onGranularityChange('monthly')}
          >
            Miesięcznie
          </GranularityButton>
          <GranularityButton
            $active={granularity === 'daily'}
            onClick={() => onGranularityChange('daily')}
          >
            Dziennie
          </GranularityButton>
        </GranularityToggle>
      </Controls>
    </HeaderContainer>
  );
};
