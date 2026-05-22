import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st as stBase } from '@/modules/statistics/components/StatisticsTheme';

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

// ─── Page layout ──────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// ─── Intro banner ─────────────────────────────────────────────────────────────

const IntroBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowSm};
`;

const IntroIconWrap = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${st.gradientBlue};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`;

const IntroContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const IntroTitle = styled.h2`
  margin: 0 0 4px;
  font-size: ${st.fontSm};
  font-weight: 700;
  color: ${st.text};
`;

const IntroDesc = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
  line-height: 1.65;
`;

// ─── Rule card ────────────────────────────────────────────────────────────────

const Card = styled.div<{ $enabled: boolean }>`
  background: ${st.bgCard};
  border: 1px solid ${(p) => p.$enabled ? `${st.accentBlue}28` : st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${(p) => p.$enabled
    ? `0 0 0 1px ${st.accentBlue}14, ${st.shadowMd}`
    : st.shadowSm};
  transition:
    border-color ${st.transitionSlow},
    box-shadow   ${st.transitionSlow};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: ${st.bgCard};
  cursor: pointer;
  user-select: none;
  transition: background ${st.transition};

  &:hover { background: ${st.bg}; }
`;

const CardIconWrap = styled.div<{ $enabled: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${(p) => p.$enabled ? st.gradientBlue : st.bgCardAlt};
  color: ${(p) => p.$enabled ? '#fff' : st.textMuted};
  transition:
    background ${st.transitionSlow},
    color      ${st.transitionSlow};
`;

const CardTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0 0 4px;
  font-size: ${st.fontSm};
  font-weight: 700;
  color: ${st.text};
  line-height: 1.25;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
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

const InactiveLabel = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

// ─── Toggle ───────────────────────────────────────────────────────────────────

const ToggleTrack = styled.div<{ $on: boolean }>`
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  background: ${(p) => p.$on ? st.accentBlue : st.bgCardAlt};
  border: 1px solid ${(p) => p.$on ? st.accentBlue : st.border};
  border-radius: ${st.radiusFull};
  position: relative;
  transition: background ${st.transition}, border-color ${st.transition};
`;

const ToggleThumb = styled.div<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  background: ${(p) => p.$on ? '#fff' : st.textMuted};
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: ${(p) => p.$on ? '22px' : '2px'};
  transition: left ${st.transition}, background ${st.transition};
  box-shadow: ${st.shadowXs};
`;

// ─── Card body ────────────────────────────────────────────────────────────────

const BodyDivider = styled.div`
  height: 1px;
  background: ${st.border};
  margin: 0 20px;
`;

const CardBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: ${expandDown} 220ms ease both;
`;

// ─── Timing sentence ──────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
    border-color: rgba(14,165,233,0.3);
  }
`;

const Textarea = styled.textarea<{ $over: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: ${st.fontSm};
  line-height: 1.65;
  font-family: inherit;
  border: 1px solid ${(p) => p.$over ? st.accentRed : st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  resize: vertical;
  min-height: 108px;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${(p) => p.$over ? st.accentRed : st.accentBlue};
    box-shadow: ${(p) => p.$over
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
  color: ${(p) => p.$multi ? st.accentAmber : st.textMuted};
  font-weight: ${(p) => p.$multi ? 600 : 400};
`;

const CharCountLabel = styled.span<{ $warn: boolean }>`
  font-size: ${st.fontXs};
  font-variant-numeric: tabular-nums;
  color: ${(p) => p.$warn ? st.accentRed : st.textMuted};
  font-weight: ${(p) => p.$warn ? 700 : 400};
`;

// ─── Save bar ─────────────────────────────────────────────────────────────────

const SaveBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowSm};
`;

const SaveBarInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const SaveBarTitle = styled.span`
  font-size: ${st.fontSm};
  font-weight: 600;
  color: ${st.text};
`;

const SaveBarHint = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

const SaveBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const SaveButton = styled.button`
  padding: 9px 24px;
  font-size: ${st.fontSm};
  font-weight: 700;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};
  letter-spacing: 0.1px;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: #0284c7;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

const SavedPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: ${st.accentGreenDim};
  color: ${st.accentGreen};
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 700;
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBox = styled.div<{ $w?: string; $h?: string }>`
  width: ${(p) => p.$w ?? '100%'};
  height: ${(p) => p.$h ?? '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

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
    unit === 'days'    ? (value === 1 ? 'dzień'    : 'dni')    :
    unit === 'hours'   ? (value === 1 ? 'godzinę'  : 'godzin') :
    /* minutes */        (value === 1 ? 'minutę'   : 'minut');
  return `${value} ${unitStr} ${direction === 'before' ? 'przed wizytą' : 'po wizycie'}`;
}

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

const VARS: { key: string; label: string }[] = [
  { key: '{{imie}}',     label: 'imię'     },
  { key: '{{nazwisko}}', label: 'nazwisko' },
  { key: '{{data}}',     label: 'data'     },
  { key: '{{godzina}}',  label: 'godzina'  },
  { key: '{{studio}}',   label: 'studio'   },
];

// ─── RuleEditor ───────────────────────────────────────────────────────────────

interface RuleEditorProps {
  rule:        SmsAutomationRule;
  direction?:  'before' | 'after';
  directionLabel?: string;
  showTiming?: boolean;
  onChange:    (rule: SmsAutomationRule) => void;
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
      {/* ── Timing ── */}
      {showTiming && (
        <div>
          <SectionLabel>Czas wysyłki</SectionLabel>
          <TimingSentence>
            <TimingWord>Wyślij</TimingWord>
            <TimingNumber
              type="number"
              min={1}
              value={value}
              onChange={(e) => setOffset(Math.max(1, Number(e.target.value)), unit)}
            />
            <UnitSelectWrap>
              <SmsSelect
                value={unit}
                onChange={(val) => setOffset(value, val as Unit)}
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

      {/* ── Message ── */}
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
          onChange={(e) => onChange({ ...rule, messageTemplate: e.target.value })}
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

// ─── Defaults for fields that may be absent from older API responses ──────────

const CONFIG_DEFAULTS: SmsAutomationConfig = {
  preVisit:              { enabled: false, offsetMinutes: 60, messageTemplate: '' },
  postVisit:             { enabled: false, offsetMinutes: 30, messageTemplate: '' },
  bookingConfirmation:   { enabled: false,                    messageTemplate: 'Drogi/a {{imie}}, potwierdzamy rezerwację w {{studio}} na {{data}} o godz. {{godzina}}. Czekamy na Ciebie!' },
  rescheduleConfirmation:{ enabled: false,                    messageTemplate: 'Drogi/a {{imie}}, termin Twojej wizyty w {{studio}} został zmieniony na {{data}} o godz. {{godzina}}. Do zobaczenia!' },
};

function mergeWithDefaults(config: Partial<SmsAutomationConfig>): SmsAutomationConfig {
  return {
    preVisit:               config.preVisit               ?? CONFIG_DEFAULTS.preVisit,
    postVisit:              config.postVisit              ?? CONFIG_DEFAULTS.postVisit,
    bookingConfirmation:    config.bookingConfirmation    ?? CONFIG_DEFAULTS.bookingConfirmation,
    rescheduleConfirmation: config.rescheduleConfirmation ?? CONFIG_DEFAULTS.rescheduleConfirmation,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export const AutomationSettings: React.FC = () => {
  const smsFeature = useFeature('SMS_EMAIL');
  const { config, isLoading } = useAutomationConfig();
  const updateMutation = useUpdateAutomationConfig();

  const [localConfig, setLocalConfig] = useState<SmsAutomationConfig | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (config && !localConfig) setLocalConfig(mergeWithDefaults(config));
  }, [config, localConfig]);

  const makeUpdater = (key: keyof SmsAutomationConfig) => (rule: SmsAutomationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: rule });
    setSavedAt(null);
  };

  const updatePreVisit       = makeUpdater('preVisit');
  const updatePostVisit      = makeUpdater('postVisit');
  const updateBookingConf    = makeUpdater('bookingConfirmation');
  const updateRescheduleConf = makeUpdater('rescheduleConfirmation');

  const handleSave = async () => {
    if (!localConfig) return;
    await updateMutation.mutateAsync(localConfig);
    setSavedAt(Date.now());
  };

  // ── Loading skeleton ──
  if (isLoading || !localConfig) {
    return (
      <Container>
        {[48, 42, 44, 50].map((w, i) => (
          <Card key={i} $enabled={false}>
            <CardHeader style={{ cursor: 'default' }}>
              <SkeletonBox $w="36px" $h="36px" style={{ borderRadius: '10px', flexShrink: 0 }} />
              <CardTitleGroup>
                <SkeletonBox $w={`${w}%`} $h="14px" style={{ marginBottom: 8 }} />
                <SkeletonBox $w={`${w - 18}%`} $h="11px" />
              </CardTitleGroup>
              <SkeletonBox $w="44px" $h="24px" style={{ borderRadius: '9999px', flexShrink: 0 }} />
            </CardHeader>
          </Card>
        ))}
      </Container>
    );
  }

  return (
    <LockedSection
      locked={!smsFeature.enabled}
      message="Twój abonament nie obsługuje automatycznych wiadomości SMS."
    >
    <Container>
      {/* ── Intro ── */}
      <IntroBanner>
        <IntroIconWrap>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </IntroIconWrap>
        <IntroContent>
          <IntroTitle>Automatyczne wiadomości SMS</IntroTitle>
          <IntroDesc>
            Skonfiguruj wiadomości wysyłane automatycznie do klientów — przypomnienie przed wizytą i podziękowanie po jej zakończeniu. Każdą regułę możesz aktywować niezależnie i dostosować do swojego stylu komunikacji.
          </IntroDesc>
        </IntroContent>
      </IntroBanner>

      {/* ── Pre-visit ── */}
      <Card $enabled={localConfig.preVisit.enabled}>
        <CardHeader
          onClick={() =>
            updatePreVisit({ ...localConfig.preVisit, enabled: !localConfig.preVisit.enabled })
          }
        >
          <CardIconWrap $enabled={localConfig.preVisit.enabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </CardIconWrap>

          <CardTitleGroup>
            <CardTitle>Przypomnienie przed wizytą</CardTitle>
            <CardMeta>
              {localConfig.preVisit.enabled ? (
                <TimingBadge>
                  {formatTimingBadge(localConfig.preVisit.offsetMinutes ?? 60, 'before')}
                </TimingBadge>
              ) : (
                <InactiveLabel>Nieaktywne</InactiveLabel>
              )}
            </CardMeta>
          </CardTitleGroup>

          <ToggleTrack
            $on={localConfig.preVisit.enabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleThumb $on={localConfig.preVisit.enabled} />
          </ToggleTrack>
        </CardHeader>

        {localConfig.preVisit.enabled && (
          <>
            <BodyDivider />
            <CardBody>
              <RuleEditor
                rule={localConfig.preVisit}
                direction="before"
                onChange={updatePreVisit}
              />
            </CardBody>
          </>
        )}
      </Card>

      {/* ── Post-visit ── */}
      <Card $enabled={localConfig.postVisit.enabled}>
        <CardHeader
          onClick={() =>
            updatePostVisit({ ...localConfig.postVisit, enabled: !localConfig.postVisit.enabled })
          }
        >
          <CardIconWrap $enabled={localConfig.postVisit.enabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </CardIconWrap>

          <CardTitleGroup>
            <CardTitle>Wiadomość po wizycie</CardTitle>
            <CardMeta>
              {localConfig.postVisit.enabled ? (
                <TimingBadge>
                  {formatTimingBadge(localConfig.postVisit.offsetMinutes ?? 30, 'after')}
                </TimingBadge>
              ) : (
                <InactiveLabel>Nieaktywne</InactiveLabel>
              )}
            </CardMeta>
          </CardTitleGroup>

          <ToggleTrack
            $on={localConfig.postVisit.enabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleThumb $on={localConfig.postVisit.enabled} />
          </ToggleTrack>
        </CardHeader>

        {localConfig.postVisit.enabled && (
          <>
            <BodyDivider />
            <CardBody>
              <RuleEditor
                rule={localConfig.postVisit}
                direction="after"
                onChange={updatePostVisit}
              />
            </CardBody>
          </>
        )}
      </Card>

      {/* ── Booking confirmation ── */}
      <Card $enabled={localConfig.bookingConfirmation.enabled}>
        <CardHeader
          onClick={() =>
            updateBookingConf({ ...localConfig.bookingConfirmation, enabled: !localConfig.bookingConfirmation.enabled })
          }
        >
          <CardIconWrap $enabled={localConfig.bookingConfirmation.enabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <polyline points="9 16 11 18 15 14"/>
            </svg>
          </CardIconWrap>

          <CardTitleGroup>
            <CardTitle>Potwierdzenie rezerwacji</CardTitle>
            <CardMeta>
              {localConfig.bookingConfirmation.enabled ? (
                <ImmediateBadge>Natychmiast po rezerwacji</ImmediateBadge>
              ) : (
                <InactiveLabel>Nieaktywne</InactiveLabel>
              )}
            </CardMeta>
          </CardTitleGroup>

          <ToggleTrack
            $on={localConfig.bookingConfirmation.enabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleThumb $on={localConfig.bookingConfirmation.enabled} />
          </ToggleTrack>
        </CardHeader>

        {localConfig.bookingConfirmation.enabled && (
          <>
            <BodyDivider />
            <CardBody>
              <RuleEditor
                rule={localConfig.bookingConfirmation}
                showTiming={false}
                onChange={updateBookingConf}
              />
            </CardBody>
          </>
        )}
      </Card>

      {/* ── Reschedule confirmation ── */}
      <Card $enabled={localConfig.rescheduleConfirmation.enabled}>
        <CardHeader
          onClick={() =>
            updateRescheduleConf({ ...localConfig.rescheduleConfirmation, enabled: !localConfig.rescheduleConfirmation.enabled })
          }
        >
          <CardIconWrap $enabled={localConfig.rescheduleConfirmation.enabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </CardIconWrap>

          <CardTitleGroup>
            <CardTitle>Potwierdzenie zmiany terminu</CardTitle>
            <CardMeta>
              {localConfig.rescheduleConfirmation.enabled ? (
                <ImmediateBadge>Natychmiast po zmianie</ImmediateBadge>
              ) : (
                <InactiveLabel>Nieaktywne</InactiveLabel>
              )}
            </CardMeta>
          </CardTitleGroup>

          <ToggleTrack
            $on={localConfig.rescheduleConfirmation.enabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleThumb $on={localConfig.rescheduleConfirmation.enabled} />
          </ToggleTrack>
        </CardHeader>

        {localConfig.rescheduleConfirmation.enabled && (
          <>
            <BodyDivider />
            <CardBody>
              <RuleEditor
                rule={localConfig.rescheduleConfirmation}
                showTiming={false}
                onChange={updateRescheduleConf}
              />
            </CardBody>
          </>
        )}
      </Card>

      {/* ── Save bar ── */}
      <SaveBar>
        <SaveBarInfo>
          <SaveBarTitle>Ustawienia automatyzacji</SaveBarTitle>
          <SaveBarHint>Zmiany zostaną zastosowane do wszystkich nowych wizyt</SaveBarHint>
        </SaveBarInfo>
        <SaveBarActions>
          {savedAt && (
            <SavedPill>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Zapisano
            </SavedPill>
          )}
          <SaveButton onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}
          </SaveButton>
        </SaveBarActions>
      </SaveBar>
    </Container>
    </LockedSection>
  );
};
