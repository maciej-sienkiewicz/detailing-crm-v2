/**
 * Seasonality Pulse - Interactive Line Chart
 * Shows search demand trends over 12 months for selected service intents.
 * Green lines = in offer, Red lines = not in offer (opportunity gap).
 * Includes dropdown with sparkline previews for adding/removing comparisons.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
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
import type { ServiceIntent } from '../types';

interface SeasonalityPulseProps {
  allIntents: ServiceIntent[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  isSelected: (id: string) => boolean;
}

const MONTH_LABELS = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru',
];

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
  background: ${ge.bgInput};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radiusSm};
  color: ${ge.textSecondary};
  font-size: ${ge.fontSm};
  cursor: pointer;
  transition: border-color ${ge.transition};
  white-space: nowrap;

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
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: ${ge.bgCard};
  border: 1px solid ${ge.border};
  border-radius: ${ge.radius};
  box-shadow: ${ge.shadowLg};
  z-index: 50;
  padding: 8px 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${ge.border};
    border-radius: 3px;
  }
`;

const DropdownItem = styled.button<{ $active: boolean; $inOffer: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 14px;
  background: ${(p) => (p.$active ? ge.neonGreenDim : 'transparent')};
  border: none;
  color: ${ge.text};
  font-size: ${ge.fontSm};
  cursor: pointer;
  transition: background ${ge.transition};
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? ge.neonGreenDim : ge.bgCardHover)};
  }
`;

const Checkbox = styled.div<{ $active: boolean }>`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid ${(p) => (p.$active ? ge.neonGreen : ge.textMuted)};
  border-radius: 4px;
  background: ${(p) => (p.$active ? ge.neonGreen : 'transparent')};
  position: relative;

  &::after {
    content: '${(p) => (p.$active ? '✓' : '')}';
    position: absolute;
    top: -2px;
    left: 1px;
    font-size: 11px;
    color: ${ge.bg};
    font-weight: 700;
  }
`;

const IntentLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;

const IntentName = styled.span`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const IntentMeta = styled.span<{ $inOffer: boolean }>`
  font-size: ${ge.fontXs};
  color: ${(p) => (p.$inOffer ? ge.neonGreen : ge.neonRed)};
`;

const SparklineContainer = styled.div`
  width: 60px;
  height: 24px;
  flex-shrink: 0;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
`;

const LegendItem = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${ge.border};
  border-radius: 20px;
  color: ${ge.text};
  font-size: ${ge.fontXs};
  cursor: pointer;
  transition: all ${ge.transition};

  &:hover {
    border-color: ${(p) => p.$color};
    background: ${(p) => `${p.$color}15`};
  }
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
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
`;

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
`;

const TooltipValue = styled.span`
  font-size: ${ge.fontXs};
  font-weight: 600;
  color: ${ge.text};
`;

// ─── Mini Sparkline (SVG) ───────────────────────────────────────

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <SparklineContainer>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </SparklineContainer>
  );
};

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
          <TooltipName>
            <TooltipDot $color={entry.color ?? ge.textMuted} />
            {entry.name}
          </TooltipName>
          <TooltipValue>
            {(entry.value ?? 0).toLocaleString('pl-PL')} zapytań
          </TooltipValue>
        </TooltipRow>
      ))}
    </TooltipContainer>
  );
};

// ─── Main Component ─────────────────────────────────────────────

export const SeasonalityPulse = ({
  allIntents,
  selectedIds,
  onToggle,
  isSelected,
}: SeasonalityPulseProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build chart data: array of { name: 'Sty', [intentId]: volume, ... }
  const selectedIntents = useMemo(
    () => allIntents.filter((i) => selectedIds.has(i.id)),
    [allIntents, selectedIds],
  );

  const chartData = useMemo(() => {
    if (selectedIntents.length === 0) return [];

    return selectedIntents[0].monthlySearches.map((_, idx) => {
      const entry: Record<string, string | number> = {
        name: MONTH_LABELS[selectedIntents[0].monthlySearches[idx].month - 1],
      };
      selectedIntents.forEach((intent) => {
        entry[intent.id] = intent.monthlySearches[idx]?.searchVolume ?? 0;
      });
      return entry;
    });
  }, [selectedIntents]);

  return (
    <Container>
      <Header>
        <TitleGroup>
          <SectionTitle>Puls Sezonowości</SectionTitle>
          <SectionSubtitle>
            Popularność usług w wyszukiwarce Google — ostatnie 12 miesięcy
          </SectionSubtitle>
        </TitleGroup>

        <DropdownWrapper ref={dropdownRef}>
          <DropdownToggle onClick={() => setDropdownOpen(!dropdownOpen)}>
            + Dodaj do porównania ({selectedIds.size})
          </DropdownToggle>

          <DropdownPanel $open={dropdownOpen}>
            {allIntents.map((intent) => (
              <DropdownItem
                key={intent.id}
                $active={isSelected(intent.id)}
                $inOffer={intent.inOffer}
                onClick={() => onToggle(intent.id)}
              >
                <Checkbox $active={isSelected(intent.id)} />
                <IntentLabel>
                  <IntentName>{intent.name}</IntentName>
                  <IntentMeta $inOffer={intent.inOffer}>
                    {intent.inOffer ? 'W ofercie' : 'Brak w ofercie'} &bull;{' '}
                    {intent.avgMonthlySearches.toLocaleString('pl-PL')} / mies.
                  </IntentMeta>
                </IntentLabel>
                <MiniSparkline
                  data={intent.monthlySearches.map((m) => m.searchVolume)}
                  color={intent.inOffer ? ge.neonGreen : ge.neonRed}
                />
              </DropdownItem>
            ))}
          </DropdownPanel>
        </DropdownWrapper>
      </Header>

      {/* Legend */}
      <Legend>
        {selectedIntents.map((intent) => (
          <LegendItem
            key={intent.id}
            $color={intent.inOffer ? ge.neonGreen : ge.neonRed}
            onClick={() => onToggle(intent.id)}
            title="Kliknij aby usunąć"
          >
            <LegendDot $color={intent.inOffer ? ge.neonGreen : ge.neonRed} />
            {intent.name}
          </LegendItem>
        ))}
      </Legend>

      {/* Chart */}
      <ChartWrapper>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid stroke={ge.border} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: ge.textMuted, fontSize: 12 }}
              axisLine={{ stroke: ge.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: ge.textMuted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            {selectedIntents.map((intent) => (
              <Line
                key={intent.id}
                type="monotone"
                dataKey={intent.id}
                name={intent.name}
                stroke={intent.inOffer ? ge.neonGreen : ge.neonRed}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: intent.inOffer ? ge.neonGreen : ge.neonRed,
                  stroke: ge.bgCard,
                  strokeWidth: 2,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </Container>
  );
};
