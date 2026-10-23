import React from 'react';
import styled, { css } from 'styled-components';
import { ui } from '@/common/components/ui';
import type { ChannelStatus } from '../types';

/*
 * Wygląd z osi wizyty: włączony kanał w odcieniu marki (obwódka i tło, bez wypełnienia -
 * CLAUDE.md §2), wyłączony przerywaną kreską. Zieleń zniknęła: na osi „włączone" mówi już
 * sama karta wiadomości z podglądem treści, a zielony chip przy każdej z kilkunastu
 * wiadomości robił z listy rząd świateł. Bursztyn zostaje, bo niesie ZNACZENIE: kanał
 * włączony, ale bez treści, czyli nic nie wyjdzie.
 */
const TONE: Record<ChannelStatus, ReturnType<typeof css>> = {
  on: css`
    border: 1px solid ${ui.brandLine};
    background: ${ui.brandTint};
    color: ${ui.brandDeep};
    span { background: ${ui.brand}; }
  `,
  blank: css`
    border: 1px solid ${ui.warnLine};
    background: ${ui.warnTint};
    color: ${ui.warnInk};
    span { background: #f59e0b; }
  `,
  off: css`
    border: 1px dashed #cbd5e1;
    background: ${ui.surface};
    color: ${ui.textMuted};
    span { background: #cbd5e1; }
  `,
  absent: css`
    border: 1px dashed ${ui.line};
    background: transparent;
    color: ${ui.textFaint};
    opacity: 0.6;
    cursor: default;
    span { background: ${ui.line}; }
  `,
};

const Chip = styled.button<{ $status: ChannelStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: ${ui.radiusPill};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 150ms ease, background 150ms ease;

  span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  &:hover:not(:disabled) { border-color: ${ui.brand}; }
  &:disabled { cursor: default; }
  &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

  ${p => TONE[p.$status]}

  @media (hover: none) and (pointer: coarse) { height: 36px; padding: 0 12px; }
`;

const TITLE: Record<ChannelStatus, string> = {
  on: 'Włączona: wychodzi do klienta. Kliknij, żeby wyłączyć.',
  blank: 'Włączona, ale bez treści: nic nie zostanie wysłane. Kliknij, żeby wyłączyć.',
  off: 'Wyłączona. Kliknij, żeby włączyć.',
  absent: 'Ta wiadomość nie jest wysyłana tym kanałem.',
};

export interface ChannelChipProps {
  label: string;
  status: ChannelStatus;
  onToggle: () => void;
  /** Wiadomość bez przełącznika (zawsze włączona) - tekst w dymku zamiast „kliknij, żeby wyłączyć". */
  locked?: string;
}

/**
 * The one action people take most often on this screen, kept on the message card so
 * turning a channel on never requires opening anything.
 */
export const ChannelChip: React.FC<ChannelChipProps> = ({ label, status, onToggle, locked }) => (
  <Chip
    type="button"
    $status={status}
    disabled={status === 'absent' || !!locked}
    title={locked ?? TITLE[status]}
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
