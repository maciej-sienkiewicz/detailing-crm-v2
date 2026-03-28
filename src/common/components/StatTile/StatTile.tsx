/**
 * StatTile — shared KPI card component
 * Exact visual style from OperationalScorecard (Dashboard):
 * - 3px top border accent
 * - light gradient bg (tinted → white)
 * - icon top-left, large value, uppercase label
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatTileConfig {
  accentColor: string;
  bgGradient: string;
  iconBg: string;
}

export interface StatTileProps extends StatTileConfig {
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  subContent?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}

// ─── Styled components ────────────────────────────────────────────────────────

const TileCard = styled.div<{
  $accentColor: string;
  $bgGradient: string;
  $clickable: boolean;
  $isActive: boolean;
}>`
  position: relative;
  background: ${p => p.$bgGradient};
  border: 1px solid ${p => p.theme.colors.border};
  border-top: 3px solid ${p => p.$accentColor};
  border-radius: ${p => p.theme.radii.xl};
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 150ms ease;

  ${p => p.$clickable && css`
    cursor: pointer;
    user-select: none;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.09), 0 16px 40px rgba(0,0,0,0.06);
    }
  `}

  ${p => p.$isActive && css`
    border-color: ${p.$accentColor}50;
    box-shadow:
      0 4px 14px rgba(0,0,0,0.09),
      0 16px 40px rgba(0,0,0,0.06),
      0 0 0 3px ${p.$accentColor}18;
  `}
`;

const TileTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const TileIconWrap = styled.div<{ $iconBg: string; $accentColor: string }>`
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: ${p => p.$iconBg};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
    color: ${p => p.$accentColor};
    stroke-width: 1.75;
  }
`;

const TileArrow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  color: ${p => p.theme.colors.textMuted};
  transition: transform 200ms ease, color 150ms ease;
  transform: ${p => p.$active ? 'rotate(90deg)' : 'rotate(0deg)'};
  svg { width: 15px; height: 15px; }
`;

const TileValue = styled.div`
  font-size: 48px;
  font-weight: 800;
  color: ${p => p.theme.colors.text};
  line-height: 1;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -2px;
`;

const TileLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
`;

const TileSubRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
`;

// ─── Skeleton ────────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonPulse = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '14px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    #f1f5f9 0%,
    #f8fafc 50%,
    #f1f5f9 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Components ───────────────────────────────────────────────────────────────

export const StatTile: React.FC<StatTileProps> = ({
  accentColor,
  bgGradient,
  iconBg,
  icon: Icon,
  value,
  label,
  subContent,
  onClick,
  isActive = false,
}) => (
  <TileCard
    $accentColor={accentColor}
    $bgGradient={bgGradient}
    $clickable={!!onClick}
    $isActive={isActive}
    onClick={onClick}
  >
    <TileTop>
      <TileIconWrap $iconBg={iconBg} $accentColor={accentColor}>
        <Icon />
      </TileIconWrap>
      {onClick && (
        <TileArrow $active={isActive}>
          <ChevronRight />
        </TileArrow>
      )}
    </TileTop>

    <TileValue>{value}</TileValue>
    <TileLabel>{label}</TileLabel>
    {subContent !== undefined && <TileSubRow>{subContent}</TileSubRow>}
  </TileCard>
);

export interface StatTileSkeletonProps extends StatTileConfig {
  icon?: React.ElementType;
}

export const StatTileSkeleton: React.FC<StatTileSkeletonProps> = ({
  accentColor,
  bgGradient,
  iconBg,
}) => (
  <TileCard
    $accentColor={accentColor}
    $bgGradient={bgGradient}
    $clickable={false}
    $isActive={false}
  >
    <TileTop>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg }} />
    </TileTop>
    <SkeletonPulse $h="48px" $w="60%" style={{ marginBottom: 8 }} />
    <SkeletonPulse $h="11px" $w="50%" style={{ marginBottom: 10 }} />
    <TileSubRow />
  </TileCard>
);
