// src/modules/message-templates/components/MessageTimeline.tsx
//
// „Co klient dostaje w trakcie wizyty": wiadomości na osi wizyty, od rezerwacji po
// rozliczenie, każda jako karta z podglądem tego, co klient przeczyta.
//
// Wcześniej była tu tabela: nazwa wiadomości, pod nią jedna obcięta linijka treści
// szarym pismem 12 px, kanały i „kiedy wychodzi" w osobnych kolumnach. Żeby zobaczyć,
// co naprawdę dostaje klient, trzeba było otworzyć każdą wiadomość z osobna. Teraz
// treść jest PRZEDMIOTEM karty: SMS w dymku jak na telefonie, e-mail z tematem
// i pierwszą linijką, a wartości, które system wstawia sam (imię, data, link), są
// podświetlone - widać od razu, co pisze studio, a co uzupełni się przy wysyłce.
//
// Wiadomość wyłączona nie udaje pustej karty: mówi wprost, że klient nic nie dostaje,
// i ma jedną akcję, która ją włącza i otwiera edytor treści.

import React from 'react';
import styled from 'styled-components';
import { Clock, Mail } from 'lucide-react';
import { Button, ui } from '@/common/components/ui';
import { ChannelChip } from './ChannelChip';
import { CHANNEL_LABEL, MESSAGES, STAGES, TIMING_LABEL, type MessageSpec } from '../catalog';
import { channelStatus, formatOffset, previewSegments, resolveTemplate } from '../utils/template';
import type { Channel, ChannelDraft, ChannelStatus, MessageKey, TemplatesDraft } from '../types';

// ─── Oś ──────────────────────────────────────────────────────────────────────

const Timeline = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Stage = styled.li`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  column-gap: 14px;

  @media (max-width: 640px) { column-gap: 10px; grid-template-columns: 16px minmax(0, 1fr); }
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  &::before {
    content: '';
    width: 12px;
    height: 12px;
    margin-top: 5px;
    border-radius: 50%;
    background: ${ui.brand};
    box-shadow: 0 0 0 4px #e0f2fe;
  }

  /* Kreska do następnego etapu; ostatni etap kończy oś kropką. */
  &::after {
    content: '';
    flex: 1;
    width: 2px;
    margin-top: 8px;
    background: ${ui.line};
  }

  ${Stage}:last-child &::after { background: transparent; }
`;

const StageBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding-bottom: 24px;
`;

/* Nazwa etapu i jego opis to dwa elementy obok siebie, nie „Etap · opis" (CLAUDE.md §4). */
const StageHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 2px 10px;
  flex-wrap: wrap;

  h4 { margin: 0; font-size: 15px; font-weight: 700; color: ${ui.ink}; }
  span { font-size: 13px; color: ${ui.textMuted}; }
`;

// ─── Karta wiadomości ────────────────────────────────────────────────────────

const MessageCard = styled.article<{ $off: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 14px 16px;
  border: 1px ${p => (p.$off ? 'dashed #cbd5e1' : `solid ${ui.line}`)};
  border-radius: 14px;
  background: ${p => (p.$off ? ui.surfaceSoft : ui.surface)};
`;

const About = styled.div`
  flex: 1 1 220px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.h5<{ $off: boolean }>`
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  color: ${p => (p.$off ? ui.textMuted : ui.ink)};
`;

const When = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.4;
  color: ${ui.textMuted};

  svg { width: 13px; height: 13px; flex-shrink: 0; }
  b { font-weight: 600; color: ${ui.inkSoft}; font-variant-numeric: tabular-nums; }
`;

const Chips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const Preview = styled.div`
  flex: 2 1 320px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/** SMS tak, jak wygląda w telefonie klienta: dymek z wyciętym rogiem. */
const SmsBubble = styled.p`
  align-self: flex-start;
  max-width: 100%;
  margin: 0;
  padding: 10px 14px;
  border-radius: 18px 18px 18px 6px;
  background: ${ui.surfaceAlt};
  font-size: 13.5px;
  line-height: 1.55;
  color: ${ui.ink};
  white-space: pre-line;
  overflow-wrap: anywhere;
`;

/** Wartość, którą system wstawi sam - podświetlona, żeby nie wyglądała na tekst studia. */
const Filled = styled.mark`
  padding: 0 2px;
  border-radius: 4px;
  background: #e0f2fe;
  color: ${ui.brandDeep};
  font-weight: 600;
`;

const EmailBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border: 1px solid ${ui.line};
  border-radius: 12px;
  background: ${ui.surface};

  .kind { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: ${ui.textMuted}; }
  .kind svg { width: 13px; height: 13px; }
  strong { font-size: 13.5px; color: ${ui.ink}; overflow-wrap: anywhere; }
  .line {
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

/** Kanał włączony bez treści: bursztyn, bo to pułapka - wygląda na aktywny, nic nie wyśle. */
const BlankNote = styled.p`
  margin: 0;
  padding: 8px 12px;
  border: 1px solid ${ui.warnLine};
  border-radius: 10px;
  background: ${ui.warnTint};
  font-size: 13px;
  line-height: 1.45;
  color: ${ui.warnInk};
`;

const Actions = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-left: -8px;
`;

const OffRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 44px;

  span { font-size: 13px; color: ${ui.textMuted}; }
`;

const Empty = styled.p`
  margin: 0;
  padding: 8px 0 24px;
  font-size: 13.5px;
  color: ${ui.textMuted};
`;

// ─── Logika ──────────────────────────────────────────────────────────────────

const statusOf = (spec: MessageSpec, drafts: Partial<Record<Channel, ChannelDraft>>, channel: Channel): ChannelStatus =>
  spec[channel] ? channelStatus(drafts[channel], channel === 'email') : 'absent';

const isLive = (status: ChannelStatus) => status === 'on' || status === 'blank';

/** Pierwsza niepusta linijka treści e-maila - tyle widać w skrzynce obok tematu. */
const firstLine = (body: string) =>
  resolveTemplate(body).split('\n').map(line => line.trim()).find(Boolean) ?? '';

export interface MessageTimelineProps {
  draft: TemplatesDraft;
  matches: (spec: MessageSpec) => boolean;
  onOpen: (key: MessageKey) => void;
  onToggle: (key: MessageKey, channel: Channel) => void;
  /** Włącza wiadomość wyłączoną i otwiera jej edytor - jedna akcja zamiast dwóch. */
  onEnable: (key: MessageKey) => void;
}

interface CardProps {
  spec: MessageSpec;
  drafts: Partial<Record<Channel, ChannelDraft>>;
  onOpen: () => void;
  onToggle: (channel: Channel) => void;
  onEnable: () => void;
}

const MessageItem: React.FC<CardProps> = ({ spec, drafts, onOpen, onToggle, onEnable }) => {
  const sms = statusOf(spec, drafts, 'sms');
  const email = statusOf(spec, drafts, 'email');
  const off = !isLive(sms) && !isLive(email);
  const offset = spec.timing ? drafts.sms?.offsetMinutes : undefined;
  const channels = (['sms', 'email'] as Channel[]).filter(channel => spec[channel]);
  const titleId = `message-${spec.key}`;

  return (
    <MessageCard $off={off} aria-labelledby={titleId}>
      <About>
        <Name id={titleId} $off={off}>{spec.name}</Name>
        <When>
          <Clock aria-hidden="true" />
          {spec.timing && offset !== undefined ? (
            <span><b>{formatOffset(offset)}</b> {TIMING_LABEL[spec.timing]}</span>
          ) : (
            <span>{spec.trigger}</span>
          )}
        </When>
        <Chips>
          {channels.map(channel => (
            <ChannelChip
              key={channel}
              label={CHANNEL_LABEL[channel]}
              status={channel === 'sms' ? sms : email}
              onToggle={() => onToggle(channel)}
              locked={channel === 'sms' && spec.sms?.alwaysOn ? `Zawsze włączona. ${spec.sms.alwaysOn}` : undefined}
            />
          ))}
        </Chips>
      </About>

      <Preview>
        {sms === 'on' && (
          <SmsBubble aria-label="Podgląd SMS-a">
            {previewSegments(drafts.sms?.body ?? '', !!spec.sms?.optionalFragments).map((segment, i) =>
              segment.filled ? <Filled key={i}>{segment.text}</Filled> : <React.Fragment key={i}>{segment.text}</React.Fragment>
            )}
          </SmsBubble>
        )}
        {sms === 'blank' && <BlankNote>SMS jest włączony, ale nie ma treści, więc nic nie wyjdzie.</BlankNote>}

        {email === 'on' && (
          <EmailBox aria-label="Podgląd e-maila">
            <span className="kind"><Mail aria-hidden="true" />E-mail</span>
            <strong>{resolveTemplate(drafts.email?.subject ?? '')}</strong>
            <span className="line">{firstLine(drafts.email?.body ?? '')}</span>
          </EmailBox>
        )}
        {email === 'blank' && <BlankNote>E-mail jest włączony, ale nie ma tematu albo treści, więc nic nie wyjdzie.</BlankNote>}

        {off ? (
          <OffRow>
            <span>Wyłączona. Klient nic nie dostaje.</span>
            <Button variant="tinted" size="sm" onClick={onEnable}>Włącz i wybierz treść</Button>
          </OffRow>
        ) : (
          <Actions>
            <Button variant="ghost" size="sm" onClick={onOpen} aria-describedby={titleId}>Zmień treść</Button>
          </Actions>
        )}
      </Preview>
    </MessageCard>
  );
};

export const MessageTimeline: React.FC<MessageTimelineProps> = ({ draft, matches, onOpen, onToggle, onEnable }) => {
  const visible = MESSAGES.filter(matches);
  if (visible.length === 0) return <Empty>Żadna wiadomość nie pasuje do wyszukiwania.</Empty>;

  return (
    <Timeline aria-label="Wiadomości według etapu wizyty">
      {STAGES.map(stage => {
        const specs = visible.filter(spec => spec.stage === stage.id);
        if (specs.length === 0) return null;
        return (
          <Stage key={stage.id}>
            <Rail aria-hidden="true" />
            <StageBody>
              <StageHead>
                <h4>{stage.title}</h4>
                <span>{stage.caption}</span>
              </StageHead>
              {specs.map(spec => (
                <MessageItem
                  key={spec.key}
                  spec={spec}
                  drafts={draft[spec.key] as Partial<Record<Channel, ChannelDraft>>}
                  onOpen={() => onOpen(spec.key)}
                  onToggle={channel => onToggle(spec.key, channel)}
                  onEnable={() => onEnable(spec.key)}
                />
              ))}
            </StageBody>
          </Stage>
        );
      })}
    </Timeline>
  );
};
