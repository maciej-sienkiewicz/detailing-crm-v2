import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { ge } from './GrowthEngineTheme';
import { CHART_COLORS } from '../types';
import type { TrackedKeyword } from '../types';

interface TrendChartProps {
  allKeywords: TrackedKeyword[];
  effectiveSelected: string[];
  keywordColors: Record<string, string>;
  chartData: Record<string, string | number>[];
  onToggle: (keyword: string) => void;
  isSelected: (keyword: string) => boolean;
}

// ─── Styled Components ───────────────────────────────────────────

const Container = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusLg};
  padding: 24px;
  box-shadow: ${ge.shadowSm};
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
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

const DropdownWrapper = styled.div`
  position: relative;
`;

const DropdownToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.textSecondary};
  font-size: ${ge.fontSm};
  cursor: pointer;
  transition: border-color ${ge.transition};
  white-space: nowrap;
  box-shadow: ${ge.shadowSm};

  &:hover {
    border-color: ${ge.borderHover};
    color: ${ge.text};
  }
`;

const DropdownPanel = styled.div<{ $open: boolean }>`
  display: ${(p) => (p.$open ? 'block' : 'none')};
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  width: 280px;
  max-height: 360px;
  overflow-y: auto;
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radius};
  box-shadow: ${ge.shadowLg};
  z-index: 50;
  padding: 6px 0;
`;

const DropdownItem = styled.button<{ $active: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 14px;
  background: ${(p) => (p.$active ? `${p.$color}14` : 'transparent')};
  border: none;
  color: ${ge.text};
  font-size: ${ge.fontSm};
  cursor: pointer;
  transition: background ${ge.transition};
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? `${p.$color}20` : ge.bgCardAlt)};
  }
`;

const ColorDot = styled.span<{ $color: string; $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(p) => (p.$active ? p.$color : ge.border)};
  transition: background ${ge.transition};
`;

const KeywordLabel = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const LegendChip = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${ge.bgCardAlt};
  border: 1px solid ${ge.border};
  border-radius: 20px;
  color: ${ge.textSecondary};
  font-size: ${ge.fontXs};
  cursor: pointer;
  transition: all ${ge.transition};

  &:hover {
    border-color: ${(p) => p.$color};
    background: ${(p) => `${p.$color}10`};
    color: ${ge.text};
  }
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 350px;

  @media (min-width: 768px) {
    height: 400px;
  }
`;

const TooltipContainer = styled.div`
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  padding: 12px;
  box-shadow: ${ge.shadowLg};
`;

const TooltipLabel = styled.div`
  font-size: ${ge.fontSm};
  font-weight: 600;
  color: ${ge.text};
  margin-bottom: 8px;
  border-bottom: 1px solid ${ge.border};
  padding-bottom: 6px;
`;

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
`;

const TooltipDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const TooltipName = styled.span`
  font-size: ${ge.fontXs};
  color: ${ge.textSecondary};
  flex: 1;
`;

const TooltipValue = styled.span`
  font-size: ${ge.fontXs};
  font-weight: 600;
  color: ${ge.text};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: ${ge.textMuted};
  font-size: ${ge.fontSm};
  gap: 8px;
`;

// ─── Custom Tooltip ─────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  return (
    <TooltipContainer>
      <TooltipLabel>{label}</TooltipLabel>
      {payload.map((entry) => (
        <TooltipRow key={entry.dataKey}>
          <TooltipDot $color={entry.color ?? ge.textMuted} />
          <TooltipName>{entry.name}</TooltipName>
          <TooltipValue>{entry.value ?? 0}</TooltipValue>
        </TooltipRow>
      ))}
    </TooltipContainer>
  );
};

// ─── Component ──────────────────────────────────────────────────

export const SeasonalityPulse = ({
  allKeywords,
  effectiveSelected,
  keywordColors,
  chartData,
  onToggle,
  isSelected,
}: TrendChartProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <Container>
      <Header>
        <TitleGroup>
          <SectionTitle>Trendy Wyszukiwań</SectionTitle>
          <SectionSubtitle>
            Indeks popularności zapytań Google (0–100 = relatywny szczyt w wybranym zakresie)
          </SectionSubtitle>
        </TitleGroup>

        <DropdownWrapper ref={dropdownRef}>
          <DropdownToggle onClick={() => setDropdownOpen(!dropdownOpen)}>
            Porównaj słowa kluczowe ({effectiveSelected.length})
          </DropdownToggle>

          <DropdownPanel $open={dropdownOpen}>
            {allKeywords.map((kw, i) => {
              const color = CHART_COLORS[i % CHART_COLORS.length];
              const active = isSelected(kw.keyword);
              return (
                <DropdownItem
                  key={kw.keyword}
                  $active={active}
                  $color={color}
                  onClick={() => onToggle(kw.keyword)}
                >
                  <ColorDot $color={color} $active={active} />
                  <KeywordLabel>{kw.keyword}</KeywordLabel>
                </DropdownItem>
              );
            })}
          </DropdownPanel>
        </DropdownWrapper>
      </Header>

      <Legend>
        {effectiveSelected.map((keyword) => (
          <LegendChip
            key={keyword}
            $color={keywordColors[keyword] ?? ge.accentBlue}
            onClick={() => onToggle(keyword)}
            title="Kliknij aby usunąć"
          >
            <LegendDot $color={keywordColors[keyword] ?? ge.accentBlue} />
            {keyword}
          </LegendChip>
        ))}
      </Legend>

      <ChartWrapper>
        {chartData.length === 0 ? (
          <EmptyState>
            <span>Brak danych trendów</span>
            <span>Wybierz słowa kluczowe z listy powyżej</span>
          </EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid stroke={ge.border} strokeDasharray="4 4" />
              <XAxis
                dataKey="name"
                tick={{ fill: ge.textMuted, fontSize: 11 }}
                axisLine={{ stroke: ge.border }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: ge.textMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => String(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              {effectiveSelected.map((keyword) => (
                <Line
                  key={keyword}
                  type="monotone"
                  dataKey={keyword}
                  name={keyword}
                  stroke={keywordColors[keyword] ?? ge.accentBlue}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: keywordColors[keyword] ?? ge.accentBlue,
                    stroke: ge.bgCard,
                    strokeWidth: 2,
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>
    </Container>
  );
};
