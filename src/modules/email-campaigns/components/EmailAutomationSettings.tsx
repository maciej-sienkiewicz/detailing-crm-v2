import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
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
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
    border-color: rgba(59, 130, 246, 0.3);
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
  border-radius: ${st.radiusFull};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};
  letter-spacing: 0.1px;

  &:hover:not(:disabled) {
    background: #2563EB;
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
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (config && !localConfig) setLocalConfig(mergeWithDefaults(config));
  }, [config, localConfig]);

  const makeUpdater = (key: keyof EmailAutomationConfig) => (rule: EmailNotificationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: rule });
    setSavedAt(null);
  };

  const updateVisitWelcome        = makeUpdater('visitWelcome');
  const updateVisitReadyForPickup = makeUpdater('visitReadyForPickup');

  const handleSave = async () => {
    if (!localConfig) return;
    await updateMutation.mutateAsync(localConfig);
    setSavedAt(Date.now());
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
    <Container>
      {/* ── Intro ── */}
      <IntroBanner>
        <IntroIconWrap>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </IntroIconWrap>
        <IntroContent>
          <IntroTitle>Automatyczne wiadomości email</IntroTitle>
          <IntroDesc>
            Skonfiguruj wiadomości email wysyłane automatycznie do klientów — powiadomienie o rozpoczęciu obsługi oraz informacja o gotowości pojazdu do odbioru. Każdą regułę możesz aktywować niezależnie i dostosować do swojego stylu komunikacji.
          </IntroDesc>
        </IntroContent>
      </IntroBanner>

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

      {/* ── Save bar ── */}
      <SaveBar>
        <SaveBarInfo>
          <SaveBarTitle>Ustawienia automatyzacji email</SaveBarTitle>
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
  );
};
