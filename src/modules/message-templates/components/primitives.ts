import styled, { css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Shared visual vocabulary for the templates screen. Kept in one place so the table, the
 * drawer and the toolbar cannot drift apart.
 */

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

export const SearchWrap = styled.div`
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;

  svg {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: ${st.textMuted};
    pointer-events: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 34px;
  border: 1px solid ${st.border};
  border-radius: 9px;
  background: ${st.bgCard};
  font: inherit;
  font-size: 13px;
  color: ${st.text};

  &::placeholder { color: ${st.textMuted}; }
  &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

export const Segmented = styled.div`
  display: inline-flex;
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  border-radius: 9px;
  padding: 2px;
`;

export const SegmentedButton = styled.button<{ $active: boolean }>`
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  color: ${st.textSecondary};
  padding: 5px 11px;
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;

  ${p => p.$active && css`
    background: ${st.bgCard};
    color: ${st.text};
    box-shadow: ${st.shadowXs};
  `}
`;

export const CountLabel = styled.span`
  font-size: 12.5px;
  color: ${st.textMuted};
  font-variant-numeric: tabular-nums;
  margin-left: auto;
`;

export const TableScroll = styled.div`
  overflow-x: auto;
  border: 1px solid ${st.border};
  border-radius: 12px;
  background: ${st.bgCard};
  box-shadow: ${st.shadowSm};
`;

export const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  min-width: 840px;
`;

/**
 * One colour per stage of the customer journey.
 *
 * The stage bands, not the row backgrounds, are what carry structure here: the
 * table is read as "what does the customer get, and when", so the eye needs to
 * land on the journey step first. Warm amber on `inWork` is deliberate: that is
 * the only stage where the message asks the customer to decide something.
 */
export const STAGE_ACCENT: Record<string, { base: string; deep: string; tint: string }> = {
  booking: { base: '#0EA5E9', deep: '#0369A1', tint: 'rgba(14, 165, 233, 0.09)' },
  intake:  { base: '#6366F1', deep: '#4338CA', tint: 'rgba(99, 102, 241, 0.09)' },
  inWork:  { base: '#F59E0B', deep: '#B45309', tint: 'rgba(245, 158, 11, 0.11)' },
  pickup:  { base: '#10B981', deep: '#047857', tint: 'rgba(16, 185, 129, 0.10)' },
  after:   { base: '#8B5CF6', deep: '#6D28D9', tint: 'rgba(139, 92, 246, 0.09)' },
  billing: { base: '#0D9488', deep: '#0F766E', tint: 'rgba(13, 148, 136, 0.09)' },
};

export const stageAccent = (stageId: string) => STAGE_ACCENT[stageId] ?? STAGE_ACCENT.booking;

export const Th = styled.th<{ $w?: string }>`
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #CBD5E1;
  padding: 11px 14px;
  background: #1E293B;
  white-space: nowrap;

  &:first-child { border-top-left-radius: 11px; }
  &:last-child { border-top-right-radius: 11px; }
  ${p => p.$w && css`width: ${p.$w};`}
`;

export const StageRow = styled.tr<{ $accent?: string; $tint?: string; $deep?: string }>`
  td {
    background: ${p => p.$tint ?? st.bg};
    padding: 8px 14px 8px 11px;
    border-top: 1px solid ${st.border};
    border-bottom: 1px solid ${st.border};
    box-shadow: inset 3px 0 0 ${p => p.$accent ?? st.borderHover};
  }
  &:first-child td { border-top: 0; }
`;

export const StageLabel = styled.div<{ $deep?: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${p => p.$deep ?? st.textSecondary};
`;

export const StageIndex = styled.span<{ $accent?: string }>`
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: ${p => p.$accent ?? st.bgCard};
  border: none;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0;
`;

export const StageCaption = styled.span`
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.75;
`;

export const Empty = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${st.textMuted};
  font-size: 13px;
`;

export const InlineError = styled.div`
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 10px 13px;
  border-radius: 10px;
  background: ${st.bgAccentRed};
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #991B1B;
  font-size: 12.5px;
`;
