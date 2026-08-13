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

export const Th = styled.th<{ $w?: string }>`
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${st.textMuted};
  padding: 9px 14px;
  background: ${st.bgCardAlt};
  border-bottom: 1px solid ${st.border};
  white-space: nowrap;
  ${p => p.$w && css`width: ${p.$w};`}
`;

export const StageRow = styled.tr`
  td {
    background: ${st.bg};
    padding: 7px 14px;
    border-top: 1px solid ${st.border};
    border-bottom: 1px solid ${st.border};
  }
  &:first-child td { border-top: 0; }
`;

export const StageLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${st.textSecondary};
`;

export const StageIndex = styled.span`
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 5px;
  background: ${st.bgCard};
  border: 1px solid ${st.borderHover};
  font-size: 10px;
  color: ${st.textMuted};
  letter-spacing: 0;
`;

export const StageCaption = styled.span`
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: ${st.textMuted};
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
