import React from 'react';
import styled, { css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ChannelStatus } from '../types';

const TONE: Record<ChannelStatus, ReturnType<typeof css>> = {
  on: css`
    background: ${st.accentGreenDim};
    border-color: rgba(16, 185, 129, 0.35);
    color: #047857;
    span { background: ${st.accentGreen}; }
  `,
  blank: css`
    background: ${st.accentAmberDim};
    border-color: rgba(245, 158, 11, 0.4);
    color: #92400E;
    span { background: ${st.accentAmber}; }
  `,
  off: css``,
  absent: css`
    opacity: 0.35;
    cursor: default;
  `,
};

const Chip = styled.button<{ $status: ChannelStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${st.border};
  background: ${st.bgCardAlt};
  color: ${st.textMuted};
  cursor: pointer;
  white-space: nowrap;
  transition: ${st.transition};

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${st.textMuted};
  }

  &:hover:not(:disabled) { border-color: ${st.borderHover}; }
  &:disabled { cursor: default; }

  ${p => TONE[p.$status]}
`;

const TITLE: Record<ChannelStatus, string> = {
  on: 'Włączona — wychodzi do klienta. Kliknij, żeby wyłączyć.',
  blank: 'Włączona, ale bez treści — nic nie zostanie wysłane. Kliknij, żeby wyłączyć.',
  off: 'Wyłączona. Kliknij, żeby włączyć.',
  absent: 'Ta wiadomość nie jest wysyłana tym kanałem.',
};

export interface ChannelChipProps {
  label: string;
  status: ChannelStatus;
  onToggle: () => void;
}

/**
 * The one action people take most often on this screen, kept in the row so turning a
 * message on never requires opening anything.
 */
export const ChannelChip: React.FC<ChannelChipProps> = ({ label, status, onToggle }) => (
  <Chip
    type="button"
    $status={status}
    disabled={status === 'absent'}
    title={TITLE[status]}
    aria-pressed={status === 'on' || status === 'blank'}
    onClick={e => {
      e.stopPropagation();
      onToggle();
    }}
  >
    <span aria-hidden="true" />
    {label}
  </Chip>
);
