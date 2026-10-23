import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Shared visual vocabulary for the templates screen: section frame and the search toolbar.
 * Tabela wiadomości z etapami w wierszach zniknęła - zastąpiła ją oś wizyty
 * (MessageTimeline), która ma własne style.
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

  /* Poniżej 16 px iOS przybliża stronę przy każdym dotknięciu pola. */
  @media (max-width: 767px) { font-size: 16px; min-height: 44px; }
`;
