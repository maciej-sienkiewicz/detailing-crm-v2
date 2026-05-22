import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { st as stBase } from '@/modules/statistics/components/StatisticsTheme';
import { UnsavedChangesBanner } from '@/modules/settings/components/shared/SettingsLayout';
import { useCompanySettings } from '@/modules/settings/hooks/useCompany';

const st = {
  ...stBase,
  accentBlue:    '#0ea5e9',
  accentBlueDim: 'rgba(14,165,233,0.12)',
  gradientBlue:  'linear-gradient(135deg, #0ea5e9, #0369a1)',
  radius:        '12px',
  radiusSm:      '9px',
  shadowBlue:    '0 0 0 3px rgba(14,165,233,0.14)',
} as const;

import type { SmsAutomationConfig, SmsAutomationRule } from '../types';
import { useAutomationConfig, useUpdateAutomationConfig } from '../hooks';
import { SmsSelect } from './SmsSelect';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

// ─── Spring animations (identical to OfferComposer) ───────────────────────────

const springOpen = keyframes`
  0%   { transform: translate(-50%, -50%) scale(0.04); opacity: 0; }
  38%  { transform: translate(-50%, -50%) scale(1.07); opacity: 1; }
  58%  { transform: translate(-50%, -50%) scale(0.96); opacity: 1; }
  74%  { transform: translate(-50%, -50%) scale(1.03); opacity: 1; }
  88%  { transform: translate(-50%, -50%) scale(0.99); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
`;

const springClose = keyframes`
  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
  25%  { transform: translate(-50%, -50%) scale(1.04); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.04); opacity: 0; }
`;

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
`;

const expandDown = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Preview modal ────────────────────────────────────────────────────────────

const ModalOverlay = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 3000;
  pointer-events: all;
  background: rgba(0, 0, 0, ${p => p.$closing ? 0 : 0.18});
  transition: background 0.3s ease;
`;

const ModalWindow = styled.div<{ $closing: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  width: 460px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  background: white;
  border-radius: 14px;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.14),
    0 24px 64px rgba(0, 0, 0, 0.22),
    0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transform-origin: center center;
  pointer-events: all;
  animation: ${p => p.$closing ? springClose : springOpen}
    ${p => p.$closing ? '200ms' : '500ms'}
    cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
`;

const ModalTitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  background: #f1f5f9;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.12);
  user-select: none;
  flex-shrink: 0;
  cursor: default;
`;

const TrafficLights = styled.div`
  display: flex;
  gap: 7px;
  flex-shrink: 0;
`;

const TrafficLight = styled.button<{ $color: 'red' | 'yellow' | 'green' }>`
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 0.5px solid ${p =>
    p.$color === 'red'    ? 'rgba(200,40,30,0.3)'  :
    p.$color === 'yellow' ? 'rgba(180,120,0,0.3)'  :
                            'rgba(20,150,40,0.3)'};
  padding: 0;
  cursor: ${p => p.$color === 'red' ? 'pointer' : 'default'};
  background: ${p =>
    p.$color === 'red'    ? '#ff5f57' :
    p.$color === 'yellow' ? '#febc2e' :
                            '#28c840'};
  box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.3);
  transition: filter 0.1s;
  &:hover { filter: ${p => p.$color === 'red' ? 'brightness(0.88)' : 'none'}; }
`;

const ModalWindowTitle = styled.span`
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.72);
  letter-spacing: -0.1px;
`;

const ModalScrollBody = styled.div`
  overflow-y: auto;
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// ─── Preview content (SMS bubble) ─────────────────────────────────────────────

const SmsPreviewBox = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: white;
`;

const SmsPreviewBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
`;

const SmsPreviewBubble = styled.div`
  padding: 12px 14px 10px;
  font-size: 13px;
  color: #0f172a;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`;

const SmsPreviewEmpty = styled.div`
  padding: 24px 14px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  font-style: italic;
`;

const SmsPreviewFooter = styled.div`
  padding: 0 14px 10px;
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  justify-content: space-between;
`;

const ModalMetaRow = styled.div`
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ModalMetaLine = styled.div`
  display: flex;
  gap: 8px;
`;

const ModalMetaKey = styled.span`
  font-weight: 600;
  color: #94a3b8;
  width: 56px;
  flex-shrink: 0;
`;

const ModalMetaValue = styled.span`
  color: #334155;
`;

// ─── PreviewModal component ───────────────────────────────────────────────────

interface PreviewModalProps {
  title:    string;
  onClose:  () => void;
  children: React.ReactNode;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ title, onClose, children }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    <>
      <ModalOverlay $closing={closing} onClick={handleClose} />
      <ModalWindow $closing={closing}>
        <ModalTitleBar>
          <TrafficLights>
            <TrafficLight $color="red"    onClick={handleClose} />
            <TrafficLight $color="yellow" onClick={() => {}} />
            <TrafficLight $color="green"  onClick={() => {}} />
          </TrafficLights>
          <ModalWindowTitle>{title}</ModalWindowTitle>
        </ModalTitleBar>
        <ModalScrollBody>{children}</ModalScrollBody>
      </ModalWindow>
    </>,
    document.body,
  );
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

// ─── Card ─────────────────────────────────────────────────────────────────────

const Card = styled.div<{ $enabled: boolean }>`
  background: white;
  border: 1px solid ${p => p.$enabled ? `${st.accentBlue}30` : '#e2e8f0'};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: ${p => p.$enabled
    ? `0 0 0 1px ${st.accentBlue}12, 0 4px 12px rgba(14,165,233,0.06), 0 2px 4px rgba(14,165,233,0.04)`
    : '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)'};
  transition: border-color 300ms, box-shadow 300ms;
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background: white;
`;

const CardHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  user-select: none;
  padding-right: 12px;
`;

const CardHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const CardIconWrap = styled.div<{ $enabled: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => p.$enabled ? st.gradientBlue : '#f1f5f9'};
  color: ${p => p.$enabled ? '#fff' : '#94a3b8'};
  transition: background 300ms, color 300ms;
`;

const CardTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
`;

const CardDescription = styled.p`
  margin: 0 0 5px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
`;

const ChevronWrap = styled.div<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: transform 220ms ease;
  transform: rotate(${p => p.$open ? '180deg' : '0deg'});
  flex-shrink: 0;
  cursor: pointer;
`;

const TimingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(14,165,233,0.10);
  color: #0284c7;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
`;

const ImmediateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(16,185,129,0.10);
  color: #059669;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
`;

const InactiveLabel = styled.span`
  font-size: 11px;
  color: #94a3b8;
`;

// ─── Toggle ───────────────────────────────────────────────────────────────────

const ToggleTrack = styled.div<{ $on: boolean }>`
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  background: ${p => p.$on ? st.accentBlue : '#f1f5f9'};
  border: 1px solid ${p => p.$on ? st.accentBlue : '#e2e8f0'};
  border-radius: 9999px;
  position: relative;
  cursor: pointer;
  transition: background 180ms, border-color 180ms;
  &:hover { opacity: 0.88; }
`;

const ToggleThumb = styled.div<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  background: ${p => p.$on ? '#fff' : '#94a3b8'};
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: ${p => p.$on ? '22px' : '2px'};
  transition: left 180ms, background 180ms;
  box-shadow: 0 1px 2px rgba(15,23,42,0.12);
  pointer-events: none;
`;

// ─── Card body ────────────────────────────────────────────────────────────────

const BodyDivider = styled.div`
  height: 1px;
  background: #f1f5f9;
  margin: 0 18px;
`;

const CardBody = styled.div<{ $muted?: boolean }>`
  padding: 18px 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${expandDown} 220ms ease both;
  background: ${p => p.$muted ? '#fafbfc' : 'white'};
`;

const DisabledHint = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
`;

// ─── Form fields ──────────────────────────────────────────────────────────────

const SectionLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
`;

const TimingSentence = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const TimingWord = styled.span`
  font-size: 13px;
  color: #475569;
  white-space: nowrap;
`;

const TimingNumber = styled.input`
  width: 72px;
  height: 38px;
  padding: 0 10px;
  box-sizing: border-box;
  font-size: 13px;
  font-weight: 700;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  text-align: center;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  -moz-appearance: textfield;
`;

const UnitSelectWrap = styled.div`
  width: 110px;
  flex-shrink: 0;

  button {
    height: 38px;
    box-sizing: border-box;
    border-width: 1.5px;
    border-color: #e2e8f0;
    border-radius: 9px;
    background: white;
    font-size: 13px;
  }
`;

const DirectionTag = styled.span`
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  white-space: nowrap;
`;

const MessageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChipsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 2px;
`;

const ChipsLead = styled.span`
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
`;

const VarChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  cursor: pointer;
  font-family: 'SF Mono', 'Fira Code', monospace;
  letter-spacing: -0.2px;
  transition: all 150ms;

  &:hover {
    background: rgba(14,165,233,0.08);
    color: #0284c7;
    border-color: rgba(14,165,233,0.28);
  }
`;

const Textarea = styled.textarea<{ $over: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.65;
  font-family: inherit;
  border: 1.5px solid ${p => p.$over ? '#ef4444' : '#e2e8f0'};
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  resize: vertical;
  min-height: 108px;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: ${p => p.$over ? '#ef4444' : st.accentBlue};
    box-shadow: ${p => p.$over ? '0 0 0 3px rgba(239,68,68,0.12)' : st.shadowBlue};
  }
  &::placeholder { color: #94a3b8; }
`;

const TextareaFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SmsCountLabel = styled.span<{ $multi: boolean }>`
  font-size: 11px;
  color: ${p => p.$multi ? '#f59e0b' : '#94a3b8'};
  font-weight: ${p => p.$multi ? 600 : 400};
`;

const CharCountLabel = styled.span<{ $warn: boolean }>`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${p => p.$warn ? '#ef4444' : '#94a3b8'};
  font-weight: ${p => p.$warn ? 700 : 400};
`;

const PreviewBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
  transition: background 150ms, border-color 150ms;
  white-space: nowrap;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBox = styled.div<{ $w?: string; $h?: string }>`
  width: ${p => p.$w ?? '100%'};
  height: ${p => p.$h ?? '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

const FlexFill = styled.div`flex: 1;`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const SmsPhoneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Unit = 'minutes' | 'hours' | 'days';

function minutesToValue(minutes: number): { value: number; unit: Unit } {
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: 'days' };
  if (minutes % 60 === 0)   return { value: minutes / 60,   unit: 'hours' };
  return { value: minutes, unit: 'minutes' };
}

function valueToMinutes(value: number, unit: Unit): number {
  if (unit === 'days')  return value * 1440;
  if (unit === 'hours') return value * 60;
  return value;
}

function formatTimingBadge(minutes: number, direction: 'before' | 'after'): string {
  const { value, unit } = minutesToValue(minutes);
  const unitStr =
    unit === 'days'  ? (value === 1 ? 'dzień'   : 'dni')    :
    unit === 'hours' ? (value === 1 ? 'godzinę' : 'godzin') :
    /* minutes */      (value === 1 ? 'minutę'  : 'minut');
  return `${value} ${unitStr} ${direction === 'before' ? 'przed wizytą' : 'po wizycie'}`;
}

function resolveTemplate(tpl: string, studioName: string): string {
  return tpl
    .replace(/\{\{imie\}\}/g, 'Jan')
    .replace(/\{\{nazwisko\}\}/g, 'Kowalski')
    .replace(/\{\{data\}\}/g, '15.06.2026')
    .replace(/\{\{godzina\}\}/g, '14:30')
    .replace(/\{\{studio\}\}/g, studioName);
}

const VARS: { key: string; label: string }[] = [
  { key: '{{imie}}',     label: 'imię'     },
  { key: '{{nazwisko}}', label: 'nazwisko' },
  { key: '{{data}}',     label: 'data'     },
  { key: '{{godzina}}',  label: 'godzina'  },
  { key: '{{studio}}',   label: 'studio'   },
];

// ─── RuleEditor ───────────────────────────────────────────────────────────────

interface RuleEditorProps {
  rule:            SmsAutomationRule;
  direction?:      'before' | 'after';
  directionLabel?: string;
  showTiming?:     boolean;
  studioName:      string;
  onChange:        (rule: SmsAutomationRule) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  rule, direction, directionLabel, showTiming = true, studioName, onChange,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const offsetMinutes = rule.offsetMinutes ?? 60;
  const { value, unit } = minutesToValue(offsetMinutes);
  const len     = rule.messageTemplate.length;
  const isOver  = len > 280;
  const isMulti = len > 160;

  const setOffset = (v: number, u: Unit) =>
    onChange({ ...rule, offsetMinutes: valueToMinutes(v, u) });

  const insertVar = (key: string) =>
    onChange({ ...rule, messageTemplate: rule.messageTemplate + key });

  const resolvedText = resolveTemplate(rule.messageTemplate, studioName);
  const resolvedLen  = resolvedText.length;

  return (
    <>
      {showTiming && (
        <div>
          <SectionLabel>Czas wysyłki</SectionLabel>
          <TimingSentence>
            <TimingWord>Wyślij</TimingWord>
            <TimingNumber
              type="number"
              min={1}
              value={value}
              onChange={e => setOffset(Math.max(1, Number(e.target.value)), unit)}
            />
            <UnitSelectWrap>
              <SmsSelect
                value={unit}
                onChange={val => setOffset(value, val as Unit)}
                options={[
                  { value: 'minutes', label: 'minut'  },
                  { value: 'hours',   label: 'godzin' },
                  { value: 'days',    label: 'dni'    },
                ]}
              />
            </UnitSelectWrap>
            <DirectionTag>
              {directionLabel ?? (direction === 'before' ? 'przed wizytą' : 'po wizycie')}
            </DirectionTag>
          </TimingSentence>
        </div>
      )}

      <MessageSection>
        <div>
          <SectionLabel>Treść wiadomości</SectionLabel>
          <ChipsRow>
            <ChipsLead>Wstaw:</ChipsLead>
            {VARS.map(({ key, label }) => (
              <VarChip key={key} type="button" title={key} onClick={() => insertVar(key)}>
                {label}
              </VarChip>
            ))}
          </ChipsRow>
        </div>
        <Textarea
          $over={isOver}
          value={rule.messageTemplate}
          onChange={e => onChange({ ...rule, messageTemplate: e.target.value })}
          maxLength={320}
          placeholder="Wpisz treść wiadomości SMS…"
        />
        <TextareaFooter>
          <SmsCountLabel $multi={isMulti}>
            {isMulti ? `2 SMS (${len} znaków)` : '1 SMS'}
          </SmsCountLabel>
          <CharCountLabel $warn={isOver}>
            {len}&thinsp;/&thinsp;160{isOver && ' — przekroczono limit'}
          </CharCountLabel>
        </TextareaFooter>
      </MessageSection>

      <PreviewBtn type="button" onClick={() => setShowPreview(true)}>
        <EyeIcon />
        Podgląd wiadomości
      </PreviewBtn>

      {showPreview && (
        <PreviewModal title="Podgląd SMS" onClose={() => setShowPreview(false)}>
          <ModalMetaRow>
            <ModalMetaLine>
              <ModalMetaKey>Nadawca:</ModalMetaKey>
              <ModalMetaValue>{studioName}</ModalMetaValue>
            </ModalMetaLine>
            <ModalMetaLine>
              <ModalMetaKey>Odbiorca:</ModalMetaKey>
              <ModalMetaValue>Jan Kowalski · +48 600 000 000</ModalMetaValue>
            </ModalMetaLine>
          </ModalMetaRow>
          <SmsPreviewBox>
            <SmsPreviewBar>
              <SmsPhoneIcon />
              SMS · {isMulti ? '2 wiadomości' : '1 wiadomość'}
            </SmsPreviewBar>
            {rule.messageTemplate
              ? <>
                  <SmsPreviewBubble>{resolvedText}</SmsPreviewBubble>
                  <SmsPreviewFooter>
                    <span>{isMulti ? '2 SMS' : '1 SMS'}</span>
                    <span>{resolvedLen} znaków</span>
                  </SmsPreviewFooter>
                </>
              : <SmsPreviewEmpty>Wpisz treść wiadomości, żeby zobaczyć podgląd.</SmsPreviewEmpty>
            }
          </SmsPreviewBox>
        </PreviewModal>
      )}
    </>
  );
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const CONFIG_DEFAULTS: SmsAutomationConfig = {
  preVisit:               { enabled: false, offsetMinutes: 60,  messageTemplate: '' },
  postVisit:              { enabled: false, offsetMinutes: 30,  messageTemplate: '' },
  bookingConfirmation:    { enabled: false, messageTemplate: 'Drogi/a {{imie}}, potwierdzamy rezerwację w {{studio}} na {{data}} o godz. {{godzina}}. Czekamy na Ciebie!' },
  rescheduleConfirmation: { enabled: false, messageTemplate: 'Drogi/a {{imie}}, termin Twojej wizyty w {{studio}} został zmieniony na {{data}} o godz. {{godzina}}. Do zobaczenia!' },
};

function mergeWithDefaults(config: Partial<SmsAutomationConfig>): SmsAutomationConfig {
  return {
    preVisit:               config.preVisit               ?? CONFIG_DEFAULTS.preVisit,
    postVisit:              config.postVisit              ?? CONFIG_DEFAULTS.postVisit,
    bookingConfirmation:    config.bookingConfirmation    ?? CONFIG_DEFAULTS.bookingConfirmation,
    rescheduleConfirmation: config.rescheduleConfirmation ?? CONFIG_DEFAULTS.rescheduleConfirmation,
  };
}

// ─── Card subcomponent ────────────────────────────────────────────────────────

interface RuleCardProps {
  rule:            SmsAutomationRule;
  open:            boolean;
  title:           string;
  description:     string;
  icon:            React.ReactNode;
  meta:            React.ReactNode;
  studioName:      string;
  onToggleOpen:    () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
  onChange:        (rule: SmsAutomationRule) => void;
  showTiming?:     boolean;
  direction?:      'before' | 'after';
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule, open, title, description, icon, meta, studioName,
  onToggleOpen, onToggleEnabled, onChange,
  showTiming = false, direction,
}) => (
  <Card $enabled={rule.enabled}>
    <CardHeaderRow>
      <CardHeaderLeft onClick={onToggleOpen}>
        <CardIconWrap $enabled={rule.enabled}>{icon}</CardIconWrap>
        <CardTitleGroup>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <CardMeta>{meta}</CardMeta>
        </CardTitleGroup>
      </CardHeaderLeft>
      <CardHeaderRight>
        <ToggleTrack $on={rule.enabled} onClick={onToggleEnabled}>
          <ToggleThumb $on={rule.enabled} />
        </ToggleTrack>
        <ChevronWrap $open={open} onClick={onToggleOpen}>
          <ChevronIcon />
        </ChevronWrap>
      </CardHeaderRight>
    </CardHeaderRow>

    {open && (
      <>
        <BodyDivider />
        <CardBody $muted={!rule.enabled}>
          {!rule.enabled && (
            <DisabledHint>
              <InfoIcon />
              Reguła jest wyłączona — możesz edytować szablon, ale wiadomości nie będą wysyłane.
            </DisabledHint>
          )}
          <RuleEditor
            rule={rule}
            direction={direction}
            showTiming={showTiming}
            studioName={studioName}
            onChange={onChange}
          />
        </CardBody>
      </>
    )}
  </Card>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonList: React.FC = () => (
  <Container>
    {[52, 46, 44, 50].map((w, i) => (
      <Card key={i} $enabled={false}>
        <CardHeaderRow style={{ cursor: 'default' }}>
          <SkeletonBox $w="36px" $h="36px" style={{ borderRadius: '10px', flexShrink: 0 }} />
          <FlexFill style={{ marginLeft: 12 }}>
            <SkeletonBox $w={`${w}%`} $h="13px" style={{ marginBottom: 6 }} />
            <SkeletonBox $w="65%" $h="11px" style={{ marginBottom: 6 }} />
            <SkeletonBox $w={`${w - 20}%`} $h="11px" />
          </FlexFill>
          <SkeletonBox $w="44px" $h="24px" style={{ borderRadius: '9999px', flexShrink: 0, marginLeft: 12 }} />
        </CardHeaderRow>
      </Card>
    ))}
  </Container>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AutomationSettings: React.FC = () => {
  const smsFeature = useFeature('SMS_EMAIL');
  const { config, isLoading } = useAutomationConfig();
  const updateMutation = useUpdateAutomationConfig();
  const { company } = useCompanySettings();

  const studioName = company?.name ?? 'Twoje Studio';

  const [localConfig, setLocalConfig] = useState<SmsAutomationConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<SmsAutomationConfig | null>(null);
  const [dirty, setDirty]             = useState(false);
  const [openCards, setOpenCards]     = useState<Set<keyof SmsAutomationConfig>>(new Set());

  useEffect(() => {
    if (config && !localConfig) {
      const merged = mergeWithDefaults(config);
      setLocalConfig(merged);
      setSavedConfig(merged);
      const initialOpen = new Set<keyof SmsAutomationConfig>(
        (Object.keys(merged) as (keyof SmsAutomationConfig)[]).filter(k => merged[k].enabled)
      );
      setOpenCards(initialOpen);
    }
  }, [config, localConfig]);

  const toggleCardOpen = (key: keyof SmsAutomationConfig) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const makeRuleUpdater = (key: keyof SmsAutomationConfig) => (rule: SmsAutomationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: rule });
    setDirty(true);
  };

  const makeToggleEnabled = (key: keyof SmsAutomationConfig) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localConfig) return;
    const rule = localConfig[key];
    const newEnabled = !rule.enabled;
    setLocalConfig({ ...localConfig, [key]: { ...rule, enabled: newEnabled } });
    setDirty(true);
    if (newEnabled) setOpenCards(prev => new Set([...prev, key]));
  };

  const handleSave = async () => {
    if (!localConfig) return;
    await updateMutation.mutateAsync(localConfig);
    setSavedConfig({ ...localConfig });
    setDirty(false);
  };

  const handleDiscard = () => {
    if (savedConfig) {
      setLocalConfig({ ...savedConfig });
      setDirty(false);
    }
  };

  if (isLoading || !localConfig) return <SkeletonList />;

  return (
    <LockedSection
      locked={!smsFeature.enabled}
      message="Twój abonament nie obsługuje automatycznych wiadomości SMS."
    >
      <Container>
        <RuleCard
          rule={localConfig.preVisit}
          open={openCards.has('preVisit')}
          title="Przypomnienie przed wizytą"
          description="Wyślij klientowi SMS z przypomnieniem na kilka godzin lub dni przed zaplanowaną wizytą."
          studioName={studioName}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          }
          meta={
            localConfig.preVisit.enabled
              ? <TimingBadge>{formatTimingBadge(localConfig.preVisit.offsetMinutes ?? 60, 'before')}</TimingBadge>
              : <InactiveLabel>Nieaktywne</InactiveLabel>
          }
          onToggleOpen={() => toggleCardOpen('preVisit')}
          onToggleEnabled={makeToggleEnabled('preVisit')}
          onChange={makeRuleUpdater('preVisit')}
          showTiming
          direction="before"
        />

        <RuleCard
          rule={localConfig.postVisit}
          open={openCards.has('postVisit')}
          title="Wiadomość po wizycie"
          description="Podziękuj klientowi za wizytę i zachęć do ponownego skorzystania z usług lub wystawienia opinii."
          studioName={studioName}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          }
          meta={
            localConfig.postVisit.enabled
              ? <TimingBadge>{formatTimingBadge(localConfig.postVisit.offsetMinutes ?? 30, 'after')}</TimingBadge>
              : <InactiveLabel>Nieaktywne</InactiveLabel>
          }
          onToggleOpen={() => toggleCardOpen('postVisit')}
          onToggleEnabled={makeToggleEnabled('postVisit')}
          onChange={makeRuleUpdater('postVisit')}
          showTiming
          direction="after"
        />

        <RuleCard
          rule={localConfig.bookingConfirmation}
          open={openCards.has('bookingConfirmation')}
          title="Potwierdzenie rezerwacji"
          description="Klient otrzyma SMS z potwierdzeniem natychmiast po dokonaniu rezerwacji."
          studioName={studioName}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <polyline points="9 16 11 18 15 14"/>
            </svg>
          }
          meta={
            localConfig.bookingConfirmation.enabled
              ? <ImmediateBadge>Natychmiast po rezerwacji</ImmediateBadge>
              : <InactiveLabel>Nieaktywne</InactiveLabel>
          }
          onToggleOpen={() => toggleCardOpen('bookingConfirmation')}
          onToggleEnabled={makeToggleEnabled('bookingConfirmation')}
          onChange={makeRuleUpdater('bookingConfirmation')}
          showTiming={false}
        />

        <RuleCard
          rule={localConfig.rescheduleConfirmation}
          open={openCards.has('rescheduleConfirmation')}
          title="Potwierdzenie zmiany terminu"
          description="Poinformuj klienta o nowym terminie natychmiast po zmianie lub przełożeniu wizyty."
          studioName={studioName}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          }
          meta={
            localConfig.rescheduleConfirmation.enabled
              ? <ImmediateBadge>Natychmiast po zmianie</ImmediateBadge>
              : <InactiveLabel>Nieaktywne</InactiveLabel>
          }
          onToggleOpen={() => toggleCardOpen('rescheduleConfirmation')}
          onToggleEnabled={makeToggleEnabled('rescheduleConfirmation')}
          onChange={makeRuleUpdater('rescheduleConfirmation')}
          showTiming={false}
        />
      </Container>

      <UnsavedChangesBanner
        visible={dirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        isSaving={updateMutation.isPending}
        sectionName="Szablony SMS"
      />
    </LockedSection>
  );
};
