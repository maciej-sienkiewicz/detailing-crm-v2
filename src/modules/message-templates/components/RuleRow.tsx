import React from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ChannelChip } from './ChannelChip';
import { CHANNEL_LABEL, TIMING_LABEL, type MessageSpec } from '../catalog';
import { channelStatus, formatOffset, resolveTemplate } from '../utils/template';
import type { Channel, ChannelDraft } from '../types';

const Row = styled.tr<{ $accent?: string }>`
  border-bottom: 1px solid ${st.border};
  cursor: pointer;
  transition: background ${st.transition};

  /* Keeps a row tied to the journey stage above it once the header scrolls away. */
  td:first-child { box-shadow: inset 3px 0 0 ${p => p.$accent ?? 'transparent'}; }

  &:last-child { border-bottom: 0; }
  &:hover td { background: ${st.bg}; }
  &:focus-visible { outline: 2px solid ${st.borderFocus}; outline-offset: -2px; }
`;

const Cell = styled.td`
  padding: 10px 14px;
  vertical-align: middle;
`;

const Name = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${st.text};
`;

const Snippet = styled.div<{ $empty: boolean }>`
  margin-top: 2px;
  font-size: 12px;
  color: ${p => (p.$empty ? st.accentAmber : st.textMuted)};
  font-style: ${p => (p.$empty ? 'italic' : 'normal')};
  max-width: 52ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Chips = styled.div`
  display: flex;
  gap: 5px;
`;

const When = styled.div`
  font-size: 12.5px;
  color: ${st.textSecondary};

  b {
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
  }
`;

const Chevron = styled.td`
  padding: 10px 14px;
  color: ${st.textMuted};
  text-align: right;
`;

export interface RuleRowProps {
  spec: MessageSpec;
  drafts: Partial<Record<Channel, ChannelDraft>>;
  /** Colour of the journey stage this message belongs to. */
  accent?: string;
  onOpen: () => void;
  onToggle: (channel: Channel) => void;
}

/**
 * One situation in which we contact the customer.
 *
 * The secondary line shows the message itself with sample data substituted, not a
 * description of it: "Dziękujemy za wizytę, Jan!" tells an operator more than a sentence
 * explaining what a post-visit rule is. The explanation moves to the drawer.
 */
export const RuleRow: React.FC<RuleRowProps> = ({ spec, drafts, accent, onOpen, onToggle }) => {
  const primaryChannel: Channel = spec.sms ? 'sms' : 'email';
  const primary = drafts[primaryChannel];
  const snippetSource = primaryChannel === 'email'
    ? (primary?.subject || primary?.body || '')
    : (primary?.body || '');
  const empty = !snippetSource.trim();

  const timingDraft = spec.timing ? drafts.sms : undefined;

  return (
    <Row
      $accent={accent}
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <Cell>
        <Name>{spec.name}</Name>
        <Snippet $empty={empty}>
          {empty ? 'Brak treści: nic nie zostanie wysłane' : resolveTemplate(snippetSource)}
        </Snippet>
      </Cell>

      <Cell>
        <Chips>
          {(['sms', 'email'] as Channel[]).map(channel => (
            <ChannelChip
              key={channel}
              label={CHANNEL_LABEL[channel]}
              status={channelStatus(drafts[channel], channel === 'email')}
              onToggle={() => onToggle(channel)}
            />
          ))}
        </Chips>
      </Cell>

      <Cell>
        <When>
          {spec.timing && timingDraft?.offsetMinutes !== undefined ? (
            <>
              <b>{formatOffset(timingDraft.offsetMinutes)}</b> {TIMING_LABEL[spec.timing]}
            </>
          ) : (
            spec.trigger
          )}
        </When>
      </Cell>

      <Chevron aria-hidden="true">›</Chevron>
    </Row>
  );
};
