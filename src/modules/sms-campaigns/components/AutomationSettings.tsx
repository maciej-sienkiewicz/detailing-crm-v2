import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { SmsAutomationConfig, SmsAutomationRule } from '../types';
import { useAutomationConfig, useUpdateAutomationConfig } from '../hooks';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const slideIn = keyframes`
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 800px; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Card = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${st.shadowSm};
  transition: box-shadow ${st.transition};

  &:hover { box-shadow: ${st.shadowMd}; }
`;

const CardHeader = styled.div<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px;
  background: ${(p) => (p.$enabled ? st.gradientCardBlue : st.bgCard)};
  border-bottom: 1px solid ${(p) => (p.$enabled ? `${st.accentBlue}22` : st.border)};
  transition: background ${st.transition};
`;

const CardIcon = styled.div<{ $enabled: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: ${st.radiusSm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: ${(p) => (p.$enabled ? st.accentBlueDim : st.bgCardAlt)};
  transition: background ${st.transition};
  flex-shrink: 0;
`;

const CardTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0 0 2px;
  font-size: ${st.fontMd};
  font-weight: 700;
  color: ${st.text};
`;

const CardSubtitle = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

// ─── Toggle switch ────────────────────────────────────────────────────────────

const ToggleWrap = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
`;

const ToggleTrack = styled.div<{ $on: boolean }>`
  width: 44px;
  height: 24px;
  background: ${(p) => (p.$on ? st.accentBlue : st.bgCardAlt)};
  border: 1px solid ${(p) => (p.$on ? st.accentBlue : st.border)};
  border-radius: ${st.radiusFull};
  position: relative;
  transition: background ${st.transition}, border-color ${st.transition};
  cursor: pointer;
`;

const ToggleThumb = styled.div<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  background: ${(p) => (p.$on ? '#fff' : st.textMuted)};
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: ${(p) => (p.$on ? '22px' : '2px')};
  transition: left ${st.transition}, background ${st.transition};
  box-shadow: ${st.shadowXs};
`;

const ToggleLabel = styled.span<{ $on: boolean }>`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${(p) => (p.$on ? st.accentBlue : st.textMuted)};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// ─── Card body ────────────────────────────────────────────────────────────────

const CardBody = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: ${slideIn} 0.2s ease;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OffsetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NumberInput = styled.input`
  width: 80px;
  padding: 9px 10px;
  font-size: ${st.fontSm};
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
`;

const UnitSelect = styled.select`
  padding: 9px 10px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  cursor: pointer;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const InlineHint = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

const Textarea = styled.textarea`
  padding: 10px 14px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  resize: vertical;
  min-height: 90px;
  line-height: 1.6;
  font-family: inherit;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const CharCounter = styled.span<{ $warning: boolean }>`
  align-self: flex-end;
  font-size: ${st.fontXs};
  color: ${(p) => (p.$warning ? st.accentRed : st.textMuted)};
  font-weight: ${(p) => (p.$warning ? 700 : 400)};
`;

const VariableChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const VarChip = styled.button`
  padding: 3px 9px;
  font-size: ${st.fontXs};
  font-weight: 600;
  background: ${st.bgCardAlt};
  color: ${st.accentBlue};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  font-family: monospace;
  transition: all ${st.transition};

  &:hover {
    background: ${st.accentBlueDim};
    border-color: ${st.accentBlue}44;
  }
`;

const HintBox = styled.div`
  padding: 10px 14px;
  background: ${st.accentBlueDim};
  border: 1px solid ${st.accentBlue}33;
  border-radius: ${st.radiusSm};
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
  line-height: 1.6;
`;

const SaveButton = styled.button`
  align-self: flex-start;
  padding: 9px 24px;
  font-size: ${st.fontSm};
  font-weight: 700;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};

  &:hover:not(:disabled) {
    background: #2563EB;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

const SavedBadge = styled.span`
  padding: 4px 12px;
  background: ${st.accentGreenDim};
  color: ${st.accentGreen};
  border: 1px solid ${st.accentGreen}33;
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 700;
`;

const SkeletonBox = styled.div<{ $w?: string; $h?: string }>`
  width: ${(p) => p.$w ?? '100%'};
  height: ${(p) => p.$h ?? '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

// ─── Template variables ───────────────────────────────────────────────────────

const VARS = ['{{imie}}', '{{nazwisko}}', '{{data}}', '{{godzina}}', '{{studio}}'];

// ─── Offset helpers ───────────────────────────────────────────────────────────

type Unit = 'minutes' | 'hours' | 'days';

function minutesToValue(minutes: number): { value: number; unit: Unit } {
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: 'days' };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: 'hours' };
  return { value: minutes, unit: 'minutes' };
}

function valueToMinutes(value: number, unit: Unit): number {
  if (unit === 'days') return value * 1440;
  if (unit === 'hours') return value * 60;
  return value;
}

// ─── Rule editor sub-component ────────────────────────────────────────────────

interface RuleEditorProps {
  rule: SmsAutomationRule;
  onChange: (rule: SmsAutomationRule) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onChange }) => {
  const { value, unit } = minutesToValue(rule.offsetMinutes);

  const setOffset = (v: number, u: Unit) =>
    onChange({ ...rule, offsetMinutes: valueToMinutes(v, u) });

  const insertVar = (v: string) =>
    onChange({ ...rule, messageTemplate: rule.messageTemplate + v });

  return (
    <>
      <FormGroup>
        <Label>Czas wysyłki</Label>
        <OffsetRow>
          <NumberInput
            type="number"
            min={1}
            value={value}
            onChange={(e) => setOffset(Math.max(1, Number(e.target.value)), unit)}
          />
          <UnitSelect
            value={unit}
            onChange={(e) => setOffset(value, e.target.value as Unit)}
          >
            <option value="minutes">minut</option>
            <option value="hours">godzin</option>
            <option value="days">dni</option>
          </UnitSelect>
          <InlineHint>przed / po wizycie</InlineHint>
        </OffsetRow>
      </FormGroup>

      <FormGroup>
        <Label>Treść wiadomości</Label>
        <HintBox>
          Wstaw zmienne dynamiczne, które zostaną zastąpione danymi klienta.
        </HintBox>
        <VariableChips>
          {VARS.map((v) => (
            <VarChip key={v} onClick={() => insertVar(v)} type="button">{v}</VarChip>
          ))}
        </VariableChips>
        <Textarea
          value={rule.messageTemplate}
          onChange={(e) => onChange({ ...rule, messageTemplate: e.target.value })}
          maxLength={320}
          placeholder="Treść SMS…"
        />
        <CharCounter $warning={rule.messageTemplate.length > 280}>
          {rule.messageTemplate.length} / 160 znaków
          {rule.messageTemplate.length > 160 && rule.messageTemplate.length <= 320 && ' (2 SMS)'}
        </CharCounter>
      </FormGroup>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const AutomationSettings: React.FC = () => {
  const { config, isLoading } = useAutomationConfig();
  const updateMutation = useUpdateAutomationConfig();

  const [localConfig, setLocalConfig] = useState<SmsAutomationConfig | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (config && !localConfig) setLocalConfig(config);
  }, [config, localConfig]);

  const updatePreVisit = (rule: SmsAutomationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, preVisit: rule });
    setSavedAt(null);
  };

  const updatePostVisit = (rule: SmsAutomationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, postVisit: rule });
    setSavedAt(null);
  };

  const handleSave = async () => {
    if (!localConfig) return;
    await updateMutation.mutateAsync(localConfig);
    setSavedAt(Date.now());
  };

  if (isLoading || !localConfig) {
    return (
      <Container>
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader $enabled={false}>
              <SkeletonBox $w="44px" $h="44px" style={{ borderRadius: '8px', flexShrink: 0 }} />
              <CardTitleGroup>
                <SkeletonBox $w="45%" $h="16px" style={{ marginBottom: 6 }} />
                <SkeletonBox $w="65%" $h="11px" />
              </CardTitleGroup>
            </CardHeader>
          </Card>
        ))}
      </Container>
    );
  }

  return (
    <Container>
      {/* ── Pre-visit reminder ── */}
      <Card>
        <CardHeader $enabled={localConfig.preVisit.enabled}>
          <CardIcon $enabled={localConfig.preVisit.enabled}>⏰</CardIcon>
          <CardTitleGroup>
            <CardTitle>Przypomnienie przed wizytą</CardTitle>
            <CardSubtitle>
              Automatyczny SMS wysyłany klientowi przed zaplanowaną wizytą
            </CardSubtitle>
          </CardTitleGroup>
          <ToggleWrap>
            <ToggleTrack
              $on={localConfig.preVisit.enabled}
              onClick={() =>
                updatePreVisit({ ...localConfig.preVisit, enabled: !localConfig.preVisit.enabled })
              }
            >
              <ToggleThumb $on={localConfig.preVisit.enabled} />
            </ToggleTrack>
            <ToggleLabel $on={localConfig.preVisit.enabled}>
              {localConfig.preVisit.enabled ? 'Włączone' : 'Wyłączone'}
            </ToggleLabel>
          </ToggleWrap>
        </CardHeader>

        {localConfig.preVisit.enabled && (
          <CardBody>
            <RuleEditor rule={localConfig.preVisit} onChange={updatePreVisit} />
          </CardBody>
        )}
      </Card>

      {/* ── Post-visit follow-up ── */}
      <Card>
        <CardHeader $enabled={localConfig.postVisit.enabled}>
          <CardIcon $enabled={localConfig.postVisit.enabled}>✅</CardIcon>
          <CardTitleGroup>
            <CardTitle>Wiadomość po wizycie</CardTitle>
            <CardSubtitle>
              Automatyczny SMS wysyłany klientowi po zakończonej wizycie
            </CardSubtitle>
          </CardTitleGroup>
          <ToggleWrap>
            <ToggleTrack
              $on={localConfig.postVisit.enabled}
              onClick={() =>
                updatePostVisit({ ...localConfig.postVisit, enabled: !localConfig.postVisit.enabled })
              }
            >
              <ToggleThumb $on={localConfig.postVisit.enabled} />
            </ToggleTrack>
            <ToggleLabel $on={localConfig.postVisit.enabled}>
              {localConfig.postVisit.enabled ? 'Włączone' : 'Wyłączone'}
            </ToggleLabel>
          </ToggleWrap>
        </CardHeader>

        {localConfig.postVisit.enabled && (
          <CardBody>
            <RuleEditor rule={localConfig.postVisit} onChange={updatePostVisit} />
          </CardBody>
        )}
      </Card>

      {/* ── Info card ── */}
      <Card>
        <CardHeader $enabled={false}>
          <CardIcon $enabled={false}>ℹ️</CardIcon>
          <CardTitleGroup>
            <CardTitle>Informacje o automatyzacji</CardTitle>
            <CardSubtitle>Jak działa automatyczna wysyłka SMS</CardSubtitle>
          </CardTitleGroup>
        </CardHeader>
        <CardBody>
          <FormGrid>
            <HintBox>
              <strong>Przypomnienie przed wizytą</strong> jest wysyłane automatycznie
              na numer telefonu klienta przypisany w systemie. Klient musi mieć
              aktywną zgodę marketingową.
            </HintBox>
            <HintBox>
              <strong>Wiadomość po wizycie</strong> wysyłana jest po zmianie statusu
              wizyty na „Zakończona". Możesz zawrzeć prośbę o opinię lub link
              do rezerwacji.
            </HintBox>
          </FormGrid>
        </CardBody>
      </Card>

      {/* ── Save bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SaveButton onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Zapisywanie…' : '✓ Zapisz ustawienia'}
        </SaveButton>
        {savedAt && <SavedBadge>✓ Zapisano</SavedBadge>}
      </div>
    </Container>
  );
};
