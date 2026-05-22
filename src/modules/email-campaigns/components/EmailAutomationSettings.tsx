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
import type { EmailAutomationConfig, EmailNotificationRule } from '../types';
import { useEmailAutomationConfig, useUpdateEmailAutomationConfig } from '../hooks/useEmailCampaigns';

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
  gap: 16px;
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

const ImmediateBadge = styled.span`
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

// ─── Form fields ──────────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SubjectInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: ${st.fontSm};
  font-family: inherit;
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
  &::placeholder { color: ${st.textMuted}; }
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

const BodyTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: ${st.fontSm};
  line-height: 1.65;
  font-family: inherit;
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  resize: vertical;
  min-height: 140px;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
  &::placeholder { color: ${st.textMuted}; }
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

// ─── Variables ────────────────────────────────────────────────────────────────

const VARS: { key: string; label: string }[] = [
  { key: '{{imie}}',     label: 'imię'     },
  { key: '{{nazwisko}}', label: 'nazwisko' },
  { key: '{{data}}',     label: 'data'     },
  { key: '{{godzina}}',  label: 'godzina'  },
  { key: '{{studio}}',   label: 'studio'   },
];

// ─── RuleEditor ───────────────────────────────────────────────────────────────

interface RuleEditorProps {
  rule: EmailNotificationRule;
  onChange: (rule: EmailNotificationRule) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onChange }) => {
  const insertIntoSubject = (key: string) =>
    onChange({ ...rule, subjectTemplate: rule.subjectTemplate + key });

  const insertIntoBody = (key: string) =>
    onChange({ ...rule, bodyTemplate: rule.bodyTemplate + key });

  return (
    <>
      {/* ── Subject ── */}
      <FieldGroup>
        <div>
          <SectionLabel>Temat wiadomości</SectionLabel>
          <ChipsRow style={{ marginBottom: 8 }}>
            <ChipsLead>Wstaw:</ChipsLead>
            {VARS.map(({ key, label }) => (
              <VarChip key={key} type="button" title={key} onClick={() => insertIntoSubject(key)}>
                {label}
              </VarChip>
            ))}
          </ChipsRow>
          <SubjectInput
            type="text"
            value={rule.subjectTemplate}
            onChange={(e) => onChange({ ...rule, subjectTemplate: e.target.value })}
            placeholder="Wpisz temat wiadomości email…"
          />
        </div>
      </FieldGroup>

      {/* ── Body ── */}
      <FieldGroup>
        <div>
          <SectionLabel>Treść wiadomości</SectionLabel>
          <ChipsRow style={{ marginBottom: 8 }}>
            <ChipsLead>Wstaw:</ChipsLead>
            {VARS.map(({ key, label }) => (
              <VarChip key={key} type="button" title={key} onClick={() => insertIntoBody(key)}>
                {label}
              </VarChip>
            ))}
          </ChipsRow>
          <BodyTextarea
            value={rule.bodyTemplate}
            onChange={(e) => onChange({ ...rule, bodyTemplate: e.target.value })}
            placeholder="Wpisz treść wiadomości email…"
          />
        </div>
      </FieldGroup>
    </>
  );
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const CONFIG_DEFAULTS: EmailAutomationConfig = {
  visitWelcome: {
    enabled: false,
    subjectTemplate: 'Witaj {{imie}} w {{studio}}!',
    bodyTemplate:
      'Drogi/a {{imie}},\n\nDziękujemy za umówienie wizyty w {{studio}} na {{data}} o godz. {{godzina}}.\n\nCzekamy na Ciebie!\n\nZespół {{studio}}',
  },
  visitReadyForPickup: {
    enabled: false,
    subjectTemplate: 'Twój pojazd jest gotowy do odbioru – {{studio}}',
    bodyTemplate:
      'Drogi/a {{imie}},\n\nInformujemy, że Twój pojazd jest już gotowy do odbioru w {{studio}}.\n\nDo zobaczenia!\n\nZespół {{studio}}',
  },
};

function mergeWithDefaults(config: Partial<EmailAutomationConfig>): EmailAutomationConfig {
  return {
    visitWelcome:        config.visitWelcome        ?? CONFIG_DEFAULTS.visitWelcome,
    visitReadyForPickup: config.visitReadyForPickup ?? CONFIG_DEFAULTS.visitReadyForPickup,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export const EmailAutomationSettings: React.FC = () => {
  const { config, isLoading } = useEmailAutomationConfig();
  const updateMutation = useUpdateEmailAutomationConfig();

  const [localConfig, setLocalConfig] = useState<EmailAutomationConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<EmailAutomationConfig | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config && !localConfig) {
      const merged = mergeWithDefaults(config);
      setLocalConfig(merged);
      setSavedConfig(merged);
    }
  }, [config, localConfig]);

  const makeUpdater = (key: keyof EmailAutomationConfig) => (rule: EmailNotificationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: rule });
    setDirty(true);
  };

  const updateVisitWelcome        = makeUpdater('visitWelcome');
  const updateVisitReadyForPickup = makeUpdater('visitReadyForPickup');

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

  // ── Loading skeleton ──
  if (isLoading || !localConfig) {
    return (
      <Container>
        {[48, 44].map((w, i) => (
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
    <>
    <Container>
      {/* ── Visit welcome ── */}
      <Card $enabled={localConfig.visitWelcome.enabled}>
        <CardHeader
          onClick={() =>
            updateVisitWelcome({
              ...localConfig.visitWelcome,
              enabled: !localConfig.visitWelcome.enabled,
            })
          }
        >
          <CardIconWrap $enabled={localConfig.visitWelcome.enabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </CardIconWrap>

          <CardTitleGroup>
            <CardTitle>Powitanie przy przyjęciu pojazdu</CardTitle>
            <CardMeta>
              {localConfig.visitWelcome.enabled ? (
                <ImmediateBadge>Przy rozpoczęciu wizyty</ImmediateBadge>
              ) : (
                <InactiveLabel>Nieaktywne</InactiveLabel>
              )}
            </CardMeta>
          </CardTitleGroup>

          <ToggleTrack
            $on={localConfig.visitWelcome.enabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleThumb $on={localConfig.visitWelcome.enabled} />
          </ToggleTrack>
        </CardHeader>

        {localConfig.visitWelcome.enabled && (
          <>
            <BodyDivider />
            <CardBody>
              <RuleEditor
                rule={localConfig.visitWelcome}
                onChange={updateVisitWelcome}
              />
            </CardBody>
          </>
        )}
      </Card>

      {/* ── Ready for pickup ── */}
      <Card $enabled={localConfig.visitReadyForPickup.enabled}>
        <CardHeader
          onClick={() =>
            updateVisitReadyForPickup({
              ...localConfig.visitReadyForPickup,
              enabled: !localConfig.visitReadyForPickup.enabled,
            })
          }
        >
          <CardIconWrap $enabled={localConfig.visitReadyForPickup.enabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 8 12 12 14 14"/>
            </svg>
          </CardIconWrap>

          <CardTitleGroup>
            <CardTitle>Pojazd gotowy do odbioru</CardTitle>
            <CardMeta>
              {localConfig.visitReadyForPickup.enabled ? (
                <ImmediateBadge>Po oznaczeniu jako gotowy</ImmediateBadge>
              ) : (
                <InactiveLabel>Nieaktywne</InactiveLabel>
              )}
            </CardMeta>
          </CardTitleGroup>

          <ToggleTrack
            $on={localConfig.visitReadyForPickup.enabled}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleThumb $on={localConfig.visitReadyForPickup.enabled} />
          </ToggleTrack>
        </CardHeader>

        {localConfig.visitReadyForPickup.enabled && (
          <>
            <BodyDivider />
            <CardBody>
              <RuleEditor
                rule={localConfig.visitReadyForPickup}
                onChange={updateVisitReadyForPickup}
              />
            </CardBody>
          </>
        )}
      </Card>

    </Container>
    <UnsavedChangesBanner
      visible={dirty}
      onSave={handleSave}
      onDiscard={handleDiscard}
      isSaving={updateMutation.isPending}
      sectionName="Szablony email"
    />
    </>
  );
};
