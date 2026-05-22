import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st as stBase } from '@/modules/statistics/components/StatisticsTheme';
import { UnsavedChangesBanner } from '@/modules/settings/components/shared/SettingsLayout';

const st = {
  ...stBase,
  accentBlue:    '#0ea5e9',
  accentBlueDim: 'rgba(14,165,233,0.12)',
  gradientBlue:  'linear-gradient(135deg, #0ea5e9, #0369a1)',
  radius:        '12px',
  radiusSm:      '9px',
  shadowBlue:    '0 0 0 3px rgba(14,165,233,0.15)',
  borderFocus:   '#0ea5e9',
} as const;

import type { SmsAutomationConfig, SmsAutomationRule } from '../types';
import { useAutomationConfig, useUpdateAutomationConfig } from '../hooks';
import { SmsSelect } from './SmsSelect';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
`;

const expandDown = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// ─── Intro panel ──────────────────────────────────────────────────────────────

const IntroPanel = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 20px 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  box-shadow: ${st.shadowSm};
`;

const IntroPanelIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: ${st.gradientBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
`;

const IntroPanelContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const IntroPanelTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: ${st.text};
  letter-spacing: -0.2px;
`;

const IntroPanelDesc = styled.p`
  margin: 0 0 14px;
  font-size: 13px;
  color: ${st.textSecondary};
  line-height: 1.6;
`;

const IntroPanelMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const StatPill = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background: ${p => p.$active ? st.accentBlueDim : st.bgCardAlt};
  color: ${p => p.$active ? st.accentBlue : st.textMuted};
  border: 1px solid ${p => p.$active ? 'rgba(14,165,233,0.22)' : st.border};
`;

// ─── Group section ────────────────────────────────────────────────────────────

const GroupSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const GroupRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px;
`;

const GroupLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${st.textMuted};
  white-space: nowrap;
`;

const GroupRule = styled.div`
  flex: 1;
  height: 1px;
  background: ${st.border};
`;

// ─── Card ─────────────────────────────────────────────────────────────────────

const Card = styled.div<{ $enabled: boolean }>`
  background: ${st.bgCard};
  border: 1px solid ${p => p.$enabled ? `${st.accentBlue}28` : st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${p => p.$enabled
    ? `0 0 0 1px ${st.accentBlue}14, ${st.shadowMd}`
    : st.shadowSm};
  transition:
    border-color ${st.transitionSlow},
    box-shadow   ${st.transitionSlow};
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 18px;
  gap: 0;
  background: ${st.bgCard};
`;

const CardHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  user-select: none;
  padding: 3px 12px 3px 3px;
  margin: -3px -12px -3px -3px;
  border-radius: 9px;
  transition: background ${st.transition};

  &:hover { background: rgba(0, 0, 0, 0.03); }
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
  background: ${p => p.$enabled ? st.gradientBlue : st.bgCardAlt};
  color: ${p => p.$enabled ? '#fff' : st.textMuted};
  transition: background ${st.transitionSlow}, color ${st.transitionSlow};
`;

const CardTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0 0 2px;
  font-size: ${st.fontSm};
  font-weight: 700;
  color: ${st.text};
  line-height: 1.25;
`;

const CardDescription = styled.p`
  margin: 0 0 5px;
  font-size: 12px;
  color: ${st.textMuted};
  line-height: 1.45;
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
  color: ${st.textMuted};
  transition: transform 220ms ease;
  transform: rotate(${p => p.$open ? '180deg' : '0deg'});
  flex-shrink: 0;
  margin-left: 2px;
`;

const TimingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: ${st.accentBlueDim};
  color: ${st.accentBlue};
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 600;
`;

const ImmediateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: ${st.accentGreenDim};
  color: ${st.accentGreen};
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 600;
`;

const InactiveLabel = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

// ─── Toggle ───────────────────────────────────────────────────────────────────

const ToggleTrack = styled.div<{ $on: boolean }>`
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  background: ${p => p.$on ? st.accentBlue : st.bgCardAlt};
  border: 1px solid ${p => p.$on ? st.accentBlue : st.border};
  border-radius: ${st.radiusFull};
  position: relative;
  cursor: pointer;
  transition: background ${st.transition}, border-color ${st.transition};

  &:hover { opacity: 0.88; }
`;

const ToggleThumb = styled.div<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  background: ${p => p.$on ? '#fff' : st.textMuted};
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: ${p => p.$on ? '22px' : '2px'};
  transition: left ${st.transition}, background ${st.transition};
  box-shadow: ${st.shadowXs};
  pointer-events: none;
`;

// ─── Card body ────────────────────────────────────────────────────────────────

const BodyDivider = styled.div`
  height: 1px;
  background: ${st.border};
  margin: 0 18px;
`;

const CardBody = styled.div<{ $muted?: boolean }>`
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${expandDown} 220ms ease both;
  background: ${p => p.$muted ? '#fafbfc' : st.bgCard};
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
  color: ${st.textMuted};
  font-weight: 500;
`;

// ─── Timing section ───────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

const TimingSentence = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const TimingWord = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
  white-space: nowrap;
`;

const TimingNumber = styled.input`
  width: 68px;
  padding: 8px 10px;
  font-size: ${st.fontSm};
  font-weight: 700;
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  text-align: center;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

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
`;

const DirectionTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  font-size: ${st.fontSm};
  font-weight: 600;
  color: ${st.text};
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  white-space: nowrap;
  letter-spacing: 0.1px;
`;

// ─── Message section ──────────────────────────────────────────────────────────

const MessageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ChipsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const ChipsLead = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  white-space: nowrap;
`;

const VarChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  font-size: ${st.fontXs};
  font-weight: 600;
  background: ${st.bgCardAlt};
  color: ${st.textSecondary};
  border: 1px solid ${st.border};
  border-radius: 5px;
  cursor: pointer;
  font-family: 'SF Mono', 'Fira Code', monospace;
  letter-spacing: -0.2px;
  transition: all ${st.transition};

  &:hover {
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-color: rgba(14, 165, 233, 0.3);
  }
`;

const Textarea = styled.textarea<{ $over: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: ${st.fontSm};
  line-height: 1.65;
  font-family: inherit;
  border: 1px solid ${p => p.$over ? st.accentRed : st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  resize: vertical;
  min-height: 108px;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${p => p.$over ? st.accentRed : st.accentBlue};
    box-shadow: ${p => p.$over
      ? '0 0 0 3px rgba(239,68,68,0.12)'
      : st.shadowBlue};
  }
  &::placeholder { color: ${st.textMuted}; }
`;

const TextareaFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SmsCountLabel = styled.span<{ $multi: boolean }>`
  font-size: ${st.fontXs};
  color: ${p => p.$multi ? st.accentAmber : st.textMuted};
  font-weight: ${p => p.$multi ? 600 : 400};
`;

const CharCountLabel = styled.span<{ $warn: boolean }>`
  font-size: ${st.fontXs};
  font-variant-numeric: tabular-nums;
  color: ${p => p.$warn ? st.accentRed : st.textMuted};
  font-weight: ${p => p.$warn ? 700 : 400};
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

// ─── Icons ────────────────────────────────────────────────────────────────────

const SmsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <line x1="9" y1="10" x2="15" y2="10"/>
    <line x1="9" y1="14" x2="13" y2="14"/>
  </svg>
);

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
  onChange:        (rule: SmsAutomationRule) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  rule,
  direction,
  directionLabel,
  showTiming = true,
  onChange,
}) => {
  const offsetMinutes = rule.offsetMinutes ?? 60;
  const { value, unit } = minutesToValue(offsetMinutes);
  const len    = rule.messageTemplate.length;
  const isOver = len > 280;
  const isMulti = len > 160;

  const setOffset = (v: number, u: Unit) =>
    onChange({ ...rule, offsetMinutes: valueToMinutes(v, u) });

  const insertVar = (key: string) =>
    onChange({ ...rule, messageTemplate: rule.messageTemplate + key });

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
  ruleKey:         keyof SmsAutomationConfig;
  rule:            SmsAutomationRule;
  open:            boolean;
  title:           string;
  description:     string;
  icon:            React.ReactNode;
  meta:            React.ReactNode;
  onToggleOpen:    () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
  onChange:        (rule: SmsAutomationRule) => void;
  showTiming?:     boolean;
  direction?:      'before' | 'after';
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule, open, title, description, icon, meta,
  onToggleOpen, onToggleEnabled, onChange,
  showTiming = false, direction,
}) => (
  <Card $enabled={rule.enabled}>
    <CardHeaderRow>
      <CardHeaderLeft onClick={onToggleOpen}>
        <CardIconWrap $enabled={rule.enabled}>
          {icon}
        </CardIconWrap>
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
        <ChevronWrap $open={open} onClick={onToggleOpen} style={{ cursor: 'pointer' }}>
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
            onChange={onChange}
          />
        </CardBody>
      </>
    )}
  </Card>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const CardTitleGroup2 = styled.div`flex: 1;`;

const SkeletonList: React.FC = () => (
  <Container>
    <Card $enabled={false}>
      <CardHeaderRow style={{ cursor: 'default' }}>
        <SkeletonBox $w="42px" $h="42px" style={{ borderRadius: '11px', flexShrink: 0 }} />
        <CardTitleGroup2>
          <SkeletonBox $w="55%" $h="13px" style={{ marginBottom: 6 }} />
          <SkeletonBox $w="75%" $h="11px" />
        </CardTitleGroup2>
      </CardHeaderRow>
    </Card>
    {[52, 46, 44, 50].map((w, i) => (
      <Card key={i} $enabled={false}>
        <CardHeaderRow style={{ cursor: 'default' }}>
          <SkeletonBox $w="36px" $h="36px" style={{ borderRadius: '10px', flexShrink: 0 }} />
          <CardTitleGroup2>
            <SkeletonBox $w={`${w}%`} $h="13px" style={{ marginBottom: 6 }} />
            <SkeletonBox $w="65%" $h="11px" style={{ marginBottom: 6 }} />
            <SkeletonBox $w={`${w - 20}%`} $h="11px" />
          </CardTitleGroup2>
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

  const [localConfig, setLocalConfig]   = useState<SmsAutomationConfig | null>(null);
  const [savedConfig, setSavedConfig]   = useState<SmsAutomationConfig | null>(null);
  const [dirty, setDirty]               = useState(false);
  const [openCards, setOpenCards]       = useState<Set<keyof SmsAutomationConfig>>(new Set());

  useEffect(() => {
    if (config && !localConfig) {
      const merged = mergeWithDefaults(config);
      setLocalConfig(merged);
      setSavedConfig(merged);
      // Auto-open enabled rules on first load
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
    if (newEnabled) {
      setOpenCards(prev => new Set([...prev, key]));
    }
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

  const activeCount = (Object.values(localConfig) as SmsAutomationRule[]).filter(r => r.enabled).length;

  return (
    <LockedSection
      locked={!smsFeature.enabled}
      message="Twój abonament nie obsługuje automatycznych wiadomości SMS."
    >
      <Container>
        {/* ── Intro ── */}
        <IntroPanel>
          <IntroPanelIcon>
            <SmsIcon />
          </IntroPanelIcon>
          <IntroPanelContent>
            <IntroPanelTitle>Automatyzacja SMS</IntroPanelTitle>
            <IntroPanelDesc>
              Konfiguruj wiadomości SMS wysyłane automatycznie do klientów na różnych etapach wizyty.
              Każdą regułę możesz edytować niezależnie — nawet bez jej włączania.
            </IntroPanelDesc>
            <IntroPanelMeta>
              <StatPill $active={activeCount > 0}>
                {activeCount}/4 aktywnych
              </StatPill>
              <StatPill>Kanał: SMS</StatPill>
            </IntroPanelMeta>
          </IntroPanelContent>
        </IntroPanel>

        {/* ── Group: timing-based ── */}
        <GroupSection>
          <GroupRow>
            <GroupLabel>Z opóźnieniem</GroupLabel>
            <GroupRule />
          </GroupRow>

          <RuleCard
            ruleKey="preVisit"
            rule={localConfig.preVisit}
            open={openCards.has('preVisit')}
            title="Przypomnienie przed wizytą"
            description="Wyślij klientowi SMS z przypomnieniem na kilka godzin lub dni przed zaplanowaną wizytą."
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
            ruleKey="postVisit"
            rule={localConfig.postVisit}
            open={openCards.has('postVisit')}
            title="Wiadomość po wizycie"
            description="Podziękuj klientowi za wizytę i zachęć do ponownego skorzystania z usług lub wystawienia opinii."
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
        </GroupSection>

        {/* ── Group: immediate ── */}
        <GroupSection>
          <GroupRow>
            <GroupLabel>Natychmiastowe</GroupLabel>
            <GroupRule />
          </GroupRow>

          <RuleCard
            ruleKey="bookingConfirmation"
            rule={localConfig.bookingConfirmation}
            open={openCards.has('bookingConfirmation')}
            title="Potwierdzenie rezerwacji"
            description="Klient otrzyma SMS z potwierdzeniem natychmiast po dokonaniu rezerwacji."
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
            ruleKey="rescheduleConfirmation"
            rule={localConfig.rescheduleConfirmation}
            open={openCards.has('rescheduleConfirmation')}
            title="Potwierdzenie zmiany terminu"
            description="Poinformuj klienta o nowym terminie natychmiast po zmianie lub przełożeniu wizyty."
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
        </GroupSection>
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
