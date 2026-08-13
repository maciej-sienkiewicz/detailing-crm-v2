import React from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { TIMING_LABEL, type MessageSpec } from '../catalog';
import {
  minutesToValue,
  resolveTemplate,
  smsSegments,
  unknownPlaceholders,
  valueToMinutes,
  VAR_LABELS,
  type Unit,
} from '../utils/template';
import type { Channel, ChannelDraft } from '../types';

const Body = styled.div`
  padding: 20px 22px 28px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const Label = styled.span`
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${st.textMuted};
`;

const Switch = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

const SwitchText = styled.div`
  div:first-child { font-size: 13px; font-weight: 600; color: ${st.text}; }
  div:last-child  { font-size: 12px; color: ${st.textSecondary}; }
`;

const Track = styled.button<{ $on: boolean }>`
  margin-left: auto;
  position: relative;
  width: 40px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: ${p => (p.$on ? st.accentGreen : st.borderHover)};
  cursor: pointer;
  flex-shrink: 0;
  transition: ${st.transition};

  span {
    position: absolute;
    top: 2px;
    left: ${p => (p.$on ? '20px' : '2px')};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: ${st.shadowXs};
    transition: ${st.transition};
  }
`;

const TimingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${st.textSecondary};
`;

const NumberInput = styled.input`
  width: 78px;
  padding: 8px 10px;
  border: 1px solid ${st.border};
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  color: ${st.text};
  background: ${st.bgInput};
  font-variant-numeric: tabular-nums;

  &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const UnitSelect = styled.select`
  padding: 8px 10px;
  border: 1px solid ${st.border};
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  color: ${st.text};
  background: ${st.bgInput};

  &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const TextInput = styled.input`
  padding: 8px 11px;
  border: 1px solid ${st.border};
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  color: ${st.text};
  background: ${st.bgInput};

  &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const TextArea = styled.textarea<{ $over: boolean }>`
  min-height: 132px;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid ${p => (p.$over ? st.accentAmber : st.border)};
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: ${st.text};
  background: ${st.bgInput};

  &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const Vars = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
`;

const VarsLead = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

const VarChip = styled.button`
  font: inherit;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid ${st.border};
  background: ${st.bgCardAlt};
  color: ${st.textSecondary};
  cursor: pointer;

  &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }
`;

const Meter = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: ${st.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Warn = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 9px 12px;
  border-radius: 9px;
  background: ${st.bgAccentAmber};
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #92400E;
  font-size: 12.5px;
`;

const Preview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const PreviewSurface = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  background: ${st.bg};
  font-size: 13px;
  line-height: 1.65;
  color: ${st.text};
  white-space: pre-wrap;
`;

const PreviewSubject = styled.div`
  font-weight: 650;
  margin-bottom: 6px;
`;

const Placeholder = styled.span`
  color: ${st.textMuted};
`;

const Intro = styled.p`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${st.textSecondary};
`;

const UNITS: { value: Unit; label: string }[] = [
  { value: 'minutes', label: 'minut' },
  { value: 'hours', label: 'godzin' },
  { value: 'days', label: 'dni' },
];

export interface ChannelEditorProps {
  spec: MessageSpec;
  channel: Channel;
  draft: ChannelDraft;
  onPatch: (patch: Partial<ChannelDraft>) => void;
}

export const ChannelEditor: React.FC<ChannelEditorProps> = ({ spec, channel, draft, onPatch }) => {
  const isSms = channel === 'sms';
  const placeholders = (isSms ? spec.sms : spec.email)?.placeholders ?? [];
  const subject = draft.subject ?? '';

  const unknown = unknownPlaceholders(
    isSms ? draft.body : `${subject} ${draft.body}`,
    placeholders
  );

  const resolvedBody = resolveTemplate(draft.body);
  const segments = smsSegments(resolvedBody);
  const showTiming = Boolean(spec.timing) && isSms && draft.offsetMinutes !== undefined;
  const { value, unit } = minutesToValue(draft.offsetMinutes ?? 60);

  const appendVar = (name: string) => onPatch({ body: `${draft.body}{{${name}}}` });

  return (
    <Body>
      <Intro>{spec.description}</Intro>

      <Switch>
        <SwitchText>
          <div>{draft.enabled ? 'Wiadomość jest włączona' : 'Wiadomość jest wyłączona'}</div>
          <div>
            {draft.enabled
              ? 'Wychodzi do klienta automatycznie.'
              : 'Możesz edytować szablon — nic nie zostanie wysłane.'}
          </div>
        </SwitchText>
        <Track
          type="button"
          role="switch"
          aria-checked={draft.enabled}
          aria-label={draft.enabled ? 'Wyłącz wiadomość' : 'Włącz wiadomość'}
          $on={draft.enabled}
          onClick={() => onPatch({ enabled: !draft.enabled })}
        >
          <span />
        </Track>
      </Switch>

      {showTiming && (
        <Field>
          <Label>Czas wysyłki</Label>
          <TimingRow>
            <span>Wyślij</span>
            <NumberInput
              type="number"
              min={1}
              value={value}
              aria-label="Ile"
              onChange={e =>
                onPatch({ offsetMinutes: valueToMinutes(Math.max(1, Number(e.target.value)), unit) })
              }
            />
            <UnitSelect
              value={unit}
              aria-label="Jednostka"
              onChange={e => onPatch({ offsetMinutes: valueToMinutes(value, e.target.value as Unit) })}
            >
              {UNITS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </UnitSelect>
            <span>{TIMING_LABEL[spec.timing!]}</span>
          </TimingRow>
        </Field>
      )}

      {!isSms && (
        <Field>
          <Label>Temat wiadomości</Label>
          <Vars>
            <VarsLead>Wstaw:</VarsLead>
            {placeholders.map(name => (
              <VarChip
                key={`subject-${name}`}
                type="button"
                title={`{{${name}}}`}
                onClick={() => onPatch({ subject: `${subject}{{${name}}}` })}
              >
                {VAR_LABELS[name] ?? name}
              </VarChip>
            ))}
          </Vars>
          <TextInput
            type="text"
            value={subject}
            placeholder="Wpisz temat wiadomości…"
            onChange={e => onPatch({ subject: e.target.value })}
          />
        </Field>
      )}

      <Field>
        <Label>Treść wiadomości</Label>
        <Vars>
          <VarsLead>Wstaw:</VarsLead>
          {placeholders.map(name => (
            <VarChip key={name} type="button" title={`{{${name}}}`} onClick={() => appendVar(name)}>
              {VAR_LABELS[name] ?? name}
            </VarChip>
          ))}
        </Vars>
        <TextArea
          $over={isSms && segments > 2}
          value={draft.body}
          placeholder={isSms ? 'Wpisz treść wiadomości SMS…' : 'Wpisz treść wiadomości email…'}
          onChange={e => onPatch({ body: e.target.value })}
        />
        <Meter>
          <span>{resolvedBody.length} znaków po podstawieniu</span>
          {isSms && <span>{segments === 0 ? 'brak treści' : `${segments} SMS`}</span>}
        </Meter>
      </Field>

      {unknown.length > 0 && (
        <Warn>
          <span aria-hidden="true">△</span>
          <span>
            Ta wiadomość nie zna zmiennych {unknown.map(v => `{{${v}}}`).join(', ')} — usuń je lub
            wpisz wartość wprost. Zapis zostanie odrzucony.
          </span>
        </Warn>
      )}

      <Preview>
        <Label>Podgląd</Label>
        <PreviewSurface>
          {!isSms && (
            <PreviewSubject>
              {resolveTemplate(subject) || <Placeholder>Brak tematu</Placeholder>}
            </PreviewSubject>
          )}
          {resolvedBody || <Placeholder>Wpisz treść, żeby zobaczyć podgląd.</Placeholder>}
        </PreviewSurface>
      </Preview>
    </Body>
  );
};
