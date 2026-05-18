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
  footerContent?: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  isActive?: boolean;
  compact?: boolean;
}

// ─── Styled components ────────────────────────────────────────────────────────

const TileCard = styled.div<{
  $accentColor: string;
  $bgGradient: string;
  $clickable: boolean;
  $isActive: boolean;
  $compact: boolean;
}>`
  position: relative;
  background: #ffffff;
  border: 1px solid ${p => p.theme.colors.border};
  border-top: 3px solid ${p => p.$accentColor};
  border-radius: ${p => p.theme.radii.xl};
  overflow: hidden;
  padding: ${p => p.$compact ? '14px 16px' : '20px 20px 18px'};
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 150ms ease;

  ${p => p.$clickable && css`
    cursor: pointer;
    user-select: none;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      border-color: #cbd5e1;
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

const TileTop = styled.div<{ $compact: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${p => p.$compact ? '10px' : '16px'};
`;

const TileIconWrap = styled.div<{ $iconBg: string; $accentColor: string; $compact: boolean }>`
  width: ${p => p.$compact ? '32px' : '40px'};
  height: ${p => p.$compact ? '32px' : '40px'};
  border-radius: ${p => p.$compact ? '8px' : '11px'};
  background: ${p => p.$iconBg};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: ${p => p.$compact ? '16px' : '20px'};
    height: ${p => p.$compact ? '16px' : '20px'};
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

const TileValue = styled.div<{ $compact: boolean }>`
  font-size: ${p => p.$compact ? '26px' : '28px'};
  font-weight: 800;
  color: ${p => p.theme.colors.text};
  line-height: 1;
  margin-bottom: ${p => p.$compact ? '5px' : '4px'};
  font-variant-numeric: tabular-nums;
  letter-spacing: ${p => p.$compact ? '-0.5px' : '-1px'};
`;

const TileLabel = styled.div<{ $compact: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 ${p => p.$compact ? '6px' : '6px'} 0;
`;

const TileSubRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
`;

const TileFooter = styled.div<{ $compact: boolean }>`
  display: flex;
  align-items: center;
  margin: ${p => p.$compact ? '10px -16px -14px' : '14px -20px -18px'};
  padding: ${p => p.$compact ? '7px 16px' : '9px 20px'};
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(0, 0, 0, 0.018);
`;

const InfoBtnWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover .st-tooltip {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
`;

const InfoIcon = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 800;
  font-style: italic;
  font-family: Georgia, serif;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  flex-shrink: 0;
  transition: background 150ms ease, color 150ms ease;
  line-height: 1;
  user-select: none;

  &:hover {
    background: #e2e8f0;
    color: #475569;
  }
`;

const TooltipBubble = styled.div`
  position: absolute;
  top: calc(100% + 9px);
  right: 0;
  width: 260px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.55;
  padding: 11px 14px;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.22);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
  transition: opacity 180ms ease, transform 180ms ease;
  z-index: 200;
  text-transform: none;
  letter-spacing: normal;
  white-space: normal;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    right: 6px;
    border: 5px solid transparent;
    border-bottom-color: #1e293b;
  }
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
  footerContent,
  tooltip,
  onClick,
  isActive = false,
  compact = false,
}) => (
  <TileCard
    $accentColor={accentColor}
    $bgGradient={bgGradient}
    $clickable={!!onClick}
    $isActive={isActive}
    $compact={compact}
    onClick={onClick}
  >
    <TileTop $compact={compact}>
      <TileIconWrap $iconBg={iconBg} $accentColor={accentColor} $compact={compact}>
        <Icon />
      </TileIconWrap>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {tooltip && (
          <InfoBtnWrapper onClick={e => e.stopPropagation()}>
            <InfoIcon>i</InfoIcon>
            <TooltipBubble className="st-tooltip">{tooltip}</TooltipBubble>
          </InfoBtnWrapper>
        )}
        {onClick && (
          <TileArrow $active={isActive}>
            <ChevronRight />
          </TileArrow>
        )}
      </div>
    </TileTop>

    <TileValue $compact={compact}>{value}</TileValue>
    <TileLabel $compact={compact}>{label}</TileLabel>
    {subContent !== undefined && <TileSubRow>{subContent}</TileSubRow>}
    {footerContent !== undefined && (
      <TileFooter $compact={compact}>{footerContent}</TileFooter>
    )}
  </TileCard>
);

export interface StatTileSkeletonProps extends StatTileConfig {
  icon?: React.ElementType;
  compact?: boolean;
}

export const StatTileSkeleton: React.FC<StatTileSkeletonProps> = ({
  accentColor,
  bgGradient,
  iconBg,
  compact = false,
}) => (
  <TileCard
    $accentColor={accentColor}
    $bgGradient={bgGradient}
    $clickable={false}
    $isActive={false}
    $compact={compact}
  >
    <TileTop $compact={compact}>
      <div style={{
        width: compact ? 32 : 40,
        height: compact ? 32 : 40,
        borderRadius: compact ? 8 : 11,
        background: iconBg,
      }} />
    </TileTop>
    <SkeletonPulse $h={compact ? '26px' : '48px'} $w="60%" style={{ marginBottom: compact ? 5 : 8 }} />
    <SkeletonPulse $h="11px" $w="50%" style={{ marginBottom: compact ? 6 : 10 }} />
    <TileSubRow />
  </TileCard>
);
