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
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
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

const StatPill = styled.span<{ $active?: boolean; $purple?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background: ${p =>
    p.$active && p.$purple ? 'rgba(139,92,246,0.12)' :
    p.$active ? st.accentBlueDim :
    st.bgCardAlt};
  color: ${p =>
    p.$active && p.$purple ? '#7c3aed' :
    p.$active ? st.accentBlue :
    st.textMuted};
  border: 1px solid ${p =>
    p.$active && p.$purple ? 'rgba(139,92,246,0.22)' :
    p.$active ? 'rgba(14,165,233,0.22)' :
    st.border};
`;

// ─── Card ─────────────────────────────────────────────────────────────────────

const Card = styled.div<{ $enabled: boolean }>`
  background: ${st.bgCard};
  border: 1px solid ${p => p.$enabled ? 'rgba(139,92,246,0.22)' : st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${p => p.$enabled
    ? '0 0 0 1px rgba(139,92,246,0.08), 0 4px 12px rgba(109,40,217,0.06), 0 2px 4px rgba(109,40,217,0.04)'
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
  background: ${p => p.$enabled ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : st.bgCardAlt};
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

const ImmediateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
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
  background: ${p => p.$on ? '#8b5cf6' : st.bgCardAlt};
  border: 1px solid ${p => p.$on ? '#8b5cf6' : st.border};
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
  gap: 8px;
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
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }
  &::placeholder { color: ${st.textMuted}; }
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
    background: rgba(139, 92, 246, 0.1);
    color: #7c3aed;
    border-color: rgba(139, 92, 246, 0.28);
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
  min-height: 130px;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }
  &::placeholder { color: ${st.textMuted}; }
`;

// ─── Email preview ────────────────────────────────────────────────────────────

const PreviewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PreviewLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #334155;
`;

const PreviewBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(139, 92, 246, 0.08);
  color: #7c3aed;
  border: 1px solid rgba(139, 92, 246, 0.18);
`;

const EmailClient = styled.div`
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  box-shadow: ${st.shadowSm};
`;

const EmailClientBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  background: #f8fafc;
  border-bottom: 1px solid ${st.border};
`;

const EmailClientDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

const EmailClientTitle = styled.span`
  font-size: 11px;
  color: ${st.textMuted};
  font-weight: 500;
  flex: 1;
  text-align: center;
`;

const EmailMeta = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const EmailMetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
`;

const EmailMetaKey = styled.span`
  font-weight: 600;
  color: ${st.textMuted};
  width: 44px;
  flex-shrink: 0;
`;

const EmailMetaValue = styled.span`
  color: ${st.text};
  font-weight: 500;
`;

const EmailSubjectRow = styled.div`
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
`;

const EmailBody = styled.div`
  padding: 14px 16px 18px;
  font-size: 13px;
  color: ${st.textSecondary};
  line-height: 1.75;
  white-space: pre-wrap;
  min-height: 60px;
`;

const EmailBodyPlaceholder = styled.div`
  padding: 20px 16px;
  text-align: center;
  font-size: 12px;
  color: ${st.textMuted};
  font-style: italic;
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

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
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

// ─── Variables ────────────────────────────────────────────────────────────────

const VARS: { key: string; label: string }[] = [
  { key: '{{imie}}',     label: 'imię'     },
  { key: '{{nazwisko}}', label: 'nazwisko' },
  { key: '{{data}}',     label: 'data'     },
  { key: '{{godzina}}',  label: 'godzina'  },
  { key: '{{studio}}',   label: 'studio'   },
];

const PREVIEW_VALUES: Record<string, string> = {
  '{{imie}}':     'Jan',
  '{{nazwisko}}': 'Kowalski',
  '{{data}}':     '15.06.2026',
  '{{godzina}}':  '14:30',
  '{{studio}}':   'Auto Detailing Pro',
};

function resolveTemplate(tpl: string): string {
  return Object.entries(PREVIEW_VALUES).reduce(
    (acc, [key, val]) => acc.replaceAll(key, val),
    tpl
  );
}

// ─── RuleEditor ───────────────────────────────────────────────────────────────

interface RuleEditorProps {
  rule:     EmailNotificationRule;
  onChange: (rule: EmailNotificationRule) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onChange }) => {
  const insertIntoSubject = (key: string) =>
    onChange({ ...rule, subjectTemplate: rule.subjectTemplate + key });

  const insertIntoBody = (key: string) =>
    onChange({ ...rule, bodyTemplate: rule.bodyTemplate + key });

  const resolvedSubject = resolveTemplate(rule.subjectTemplate);
  const resolvedBody    = resolveTemplate(rule.bodyTemplate);

  return (
    <>
      {/* ── Subject ── */}
      <FieldGroup>
        <SectionLabel>Temat wiadomości</SectionLabel>
        <ChipsRow>
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
          onChange={e => onChange({ ...rule, subjectTemplate: e.target.value })}
          placeholder="Wpisz temat wiadomości email…"
        />
      </FieldGroup>

      {/* ── Body ── */}
      <FieldGroup>
        <SectionLabel>Treść wiadomości</SectionLabel>
        <ChipsRow>
          <ChipsLead>Wstaw:</ChipsLead>
          {VARS.map(({ key, label }) => (
            <VarChip key={key} type="button" title={key} onClick={() => insertIntoBody(key)}>
              {label}
            </VarChip>
          ))}
        </ChipsRow>
        <BodyTextarea
          value={rule.bodyTemplate}
          onChange={e => onChange({ ...rule, bodyTemplate: e.target.value })}
          placeholder="Wpisz treść wiadomości email…"
        />
      </FieldGroup>

      {/* ── Email preview ── */}
      <PreviewSection>
        <PreviewHeader>
          <PreviewLabel>Podgląd wiadomości</PreviewLabel>
          <PreviewBadge>przykładowe dane</PreviewBadge>
        </PreviewHeader>
        <EmailClient>
          <EmailClientBar>
            <EmailClientDot $color="#ff5f57" />
            <EmailClientDot $color="#ffbd2e" />
            <EmailClientDot $color="#28ca41" />
            <EmailClientTitle>Podgląd wiadomości</EmailClientTitle>
          </EmailClientBar>
          <EmailMeta>
            <EmailMetaRow>
              <EmailMetaKey>Od:</EmailMetaKey>
              <EmailMetaValue>studio@autodetailing.pl</EmailMetaValue>
            </EmailMetaRow>
            <EmailMetaRow>
              <EmailMetaKey>Do:</EmailMetaKey>
              <EmailMetaValue>jan.kowalski@example.com</EmailMetaValue>
            </EmailMetaRow>
          </EmailMeta>
          <EmailSubjectRow>
            {resolvedSubject || <span style={{ color: '#94a3b8', fontWeight: 400 }}>Brak tematu</span>}
          </EmailSubjectRow>
          {resolvedBody
            ? <EmailBody>{resolvedBody}</EmailBody>
            : <EmailBodyPlaceholder>Treść wiadomości pojawi się tutaj…</EmailBodyPlaceholder>
          }
        </EmailClient>
      </PreviewSection>
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

// ─── Card subcomponent ────────────────────────────────────────────────────────

interface EmailRuleCardProps {
  rule:            EmailNotificationRule;
  open:            boolean;
  title:           string;
  description:     string;
  icon:            React.ReactNode;
  meta:            React.ReactNode;
  onToggleOpen:    () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
  onChange:        (rule: EmailNotificationRule) => void;
}

const EmailRuleCard: React.FC<EmailRuleCardProps> = ({
  rule, open, title, description, icon, meta,
  onToggleOpen, onToggleEnabled, onChange,
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
              Reguła jest wyłączona — możesz edytować szablon, ale emaile nie będą wysyłane.
            </DisabledHint>
          )}
          <RuleEditor rule={rule} onChange={onChange} />
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
          <SkeletonBox $w="50%" $h="13px" style={{ marginBottom: 6 }} />
          <SkeletonBox $w="75%" $h="11px" />
        </CardTitleGroup2>
      </CardHeaderRow>
    </Card>
    {[48, 44].map((w, i) => (
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

export const EmailAutomationSettings: React.FC = () => {
  const { config, isLoading } = useEmailAutomationConfig();
  const updateMutation = useUpdateEmailAutomationConfig();

  const [localConfig, setLocalConfig] = useState<EmailAutomationConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<EmailAutomationConfig | null>(null);
  const [dirty, setDirty]             = useState(false);
  const [openCards, setOpenCards]     = useState<Set<keyof EmailAutomationConfig>>(new Set());

  useEffect(() => {
    if (config && !localConfig) {
      const merged = mergeWithDefaults(config);
      setLocalConfig(merged);
      setSavedConfig(merged);
      // Auto-open enabled rules on first load
      const initialOpen = new Set<keyof EmailAutomationConfig>(
        (Object.keys(merged) as (keyof EmailAutomationConfig)[]).filter(k => merged[k].enabled)
      );
      setOpenCards(initialOpen);
    }
  }, [config, localConfig]);

  const toggleCardOpen = (key: keyof EmailAutomationConfig) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const makeRuleUpdater = (key: keyof EmailAutomationConfig) => (rule: EmailNotificationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: rule });
    setDirty(true);
  };

  const makeToggleEnabled = (key: keyof EmailAutomationConfig) => (e: React.MouseEvent) => {
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

  const activeCount = (Object.values(localConfig) as EmailNotificationRule[]).filter(r => r.enabled).length;

  return (
    <>
      <Container>
        {/* ── Intro ── */}
        <IntroPanel>
          <IntroPanelIcon>
            <EmailIcon />
          </IntroPanelIcon>
          <IntroPanelContent>
            <IntroPanelTitle>Automatyzacja Email</IntroPanelTitle>
            <IntroPanelDesc>
              Konfiguruj emaile wysyłane automatycznie do klientów na kluczowych etapach obsługi.
              Podgląd na żywo pozwala zobaczyć dokładnie jak wiadomość wygląda dla klienta.
            </IntroPanelDesc>
            <IntroPanelMeta>
              <StatPill $active={activeCount > 0} $purple>
                {activeCount}/2 aktywnych
              </StatPill>
              <StatPill>Kanał: Email</StatPill>
            </IntroPanelMeta>
          </IntroPanelContent>
        </IntroPanel>

        {/* ── Visit welcome ── */}
        <EmailRuleCard
          rule={localConfig.visitWelcome}
          open={openCards.has('visitWelcome')}
          title="Powitanie przy przyjęciu pojazdu"
          description="Email wysyłany do klienta w momencie gdy pojazd zostaje przyjęty i wizyta zostaje rozpoczęta."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
          meta={
            localConfig.visitWelcome.enabled
              ? <ImmediateBadge>Przy rozpoczęciu wizyty</ImmediateBadge>
              : <InactiveLabel>Nieaktywne</InactiveLabel>
          }
          onToggleOpen={() => toggleCardOpen('visitWelcome')}
          onToggleEnabled={makeToggleEnabled('visitWelcome')}
          onChange={makeRuleUpdater('visitWelcome')}
        />

        {/* ── Ready for pickup ── */}
        <EmailRuleCard
          rule={localConfig.visitReadyForPickup}
          open={openCards.has('visitReadyForPickup')}
          title="Pojazd gotowy do odbioru"
          description="Poinformuj klienta natychmiast gdy jego pojazd jest gotowy — jeden klik z widoku wizyty."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 8 12 12 14 14"/>
            </svg>
          }
          meta={
            localConfig.visitReadyForPickup.enabled
              ? <ImmediateBadge>Po oznaczeniu jako gotowy</ImmediateBadge>
              : <InactiveLabel>Nieaktywne</InactiveLabel>
          }
          onToggleOpen={() => toggleCardOpen('visitReadyForPickup')}
          onToggleEnabled={makeToggleEnabled('visitReadyForPickup')}
          onChange={makeRuleUpdater('visitReadyForPickup')}
        />
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
