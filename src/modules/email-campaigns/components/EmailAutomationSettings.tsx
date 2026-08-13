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

import type { EmailAutomationConfig, EmailNotificationRule, EmailRuleKey } from '../types';
import { useEmailAutomationConfig, useUpdateEmailAutomationConfig } from '../hooks/useEmailCampaigns';

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
  background: rgba(0, 0, 0, ${p => p.$closing ? 0 : 0.25});
  transition: background 0.3s ease;
`;

const ModalWindow = styled.div<{ $closing: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 3001;
  width: 560px;
  display: flex;
  flex-direction: column;
  max-height: 82vh;
  background: #ffffff;
  border-radius: 14px;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.18),
    0 24px 64px rgba(0, 0, 0, 0.36),
    0 4px 12px rgba(0, 0, 0, 0.14);
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
  background: rgba(215, 218, 224, 0.85);
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

// ─── Email preview content ────────────────────────────────────────────────────

const EmailClient = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: white;
`;

const EmailMeta = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const EmailMetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
`;

const EmailMetaKey = styled.span`
  font-weight: 600;
  color: #94a3b8;
  width: 44px;
  flex-shrink: 0;
`;

const EmailMetaValue = styled.span`
  color: #334155;
  font-weight: 500;
`;

const EmailSubjectRow = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
`;

const EmailBody = styled.div`
  padding: 12px 14px 16px;
  font-size: 13px;
  color: #334155;
  line-height: 1.75;
  white-space: pre-wrap;
  min-height: 56px;
`;

const EmailBodyPlaceholder = styled.div`
  padding: 20px 14px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  font-style: italic;
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
  border: 1px solid ${p => p.$enabled ? 'rgba(139,92,246,0.24)' : '#e2e8f0'};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: ${p => p.$enabled
    ? '0 0 0 1px rgba(139,92,246,0.08), 0 4px 12px rgba(109,40,217,0.06), 0 2px 4px rgba(109,40,217,0.04)'
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
  background: ${p => p.$enabled ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : '#f1f5f9'};
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

const ImmediateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(139,92,246,0.10);
  color: #7c3aed;
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
  background: ${p => p.$on ? '#8b5cf6' : '#f1f5f9'};
  border: 1px solid ${p => p.$on ? '#8b5cf6' : '#e2e8f0'};
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
  background: rgba(215, 218, 224, 0.85);
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

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SubjectInput = styled.input`
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
  }
  &::placeholder { color: #94a3b8; }
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
  background: rgba(215, 218, 224, 0.85);
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  cursor: pointer;
  font-family: 'SF Mono', 'Fira Code', monospace;
  letter-spacing: -0.2px;
  transition: all 150ms;

  &:hover {
    background: rgba(139,92,246,0.08);
    color: #7c3aed;
    border-color: rgba(139,92,246,0.28);
  }
`;

const BodyTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.65;
  font-family: inherit;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  resize: vertical;
  min-height: 130px;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
  }
  &::placeholder { color: #94a3b8; }
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

// ─── Variables & template resolution ─────────────────────────────────────────

/**
 * Sample values used only for the preview. Every key here is something we cannot know
 * when the template is written — the studio's own name, phone and address are not on the
 * list, because the studio types those straight into the text.
 */
const PREVIEW_VALUES: Record<string, string> = {
  imie:          'Jan',
  nazwisko:      'Kowalski',
  imie_nazwisko: 'Jan Kowalski',
  data:          '15.06.2026',
  godzina:       '14:30',
  pojazd:        'BMW X5',
  rejestracja:   'WA 12345',
  numer_wizyty:  'W/2026/0142',
  link:          'https://example.com/vc/token123',
  kontrahent:    'Auto Flota Sp. z o.o.',
  okres:         '01.06.2026 – 30.06.2026',
  kwota_brutto:  '12 480,00 zł',
  liczba_wpisow: '18',
};

const VAR_LABELS: Record<string, string> = {
  imie:          'imię',
  nazwisko:      'nazwisko',
  imie_nazwisko: 'imię i nazwisko',
  data:          'data',
  godzina:       'godzina',
  pojazd:        'pojazd',
  rejestracja:   'rejestracja',
  numer_wizyty:  'nr wizyty',
  link:          'link',
  kontrahent:    'kontrahent',
  okres:         'okres',
  kwota_brutto:  'kwota brutto',
  liczba_wpisow: 'liczba wpisów',
};

/** Mirrors MessageTemplateKind on the backend — anything else is rejected on save. */
const RULE_PLACEHOLDERS: Record<EmailRuleKey, string[]> = {
  visitWelcome:        ['imie', 'nazwisko', 'imie_nazwisko', 'pojazd', 'rejestracja', 'numer_wizyty', 'data', 'godzina'],
  visitReadyForPickup: ['imie', 'nazwisko', 'imie_nazwisko', 'pojazd', 'rejestracja', 'numer_wizyty', 'data', 'godzina'],
  visitCardLink:       ['imie', 'nazwisko', 'imie_nazwisko', 'pojazd', 'rejestracja', 'numer_wizyty', 'data', 'godzina', 'link'],
  reservationCardLink: ['imie', 'nazwisko', 'imie_nazwisko', 'data', 'godzina', 'link'],
  batchOrderClose:     ['kontrahent', 'okres', 'kwota_brutto', 'liczba_wpisow'],
};

function resolveTemplate(tpl: string): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in PREVIEW_VALUES ? PREVIEW_VALUES[key] : match
  );
}

/** Tokens the studio typed that this rule cannot fill — the save would be rejected. */
function unknownPlaceholders(tpl: string, allowed: string[]): string[] {
  const used = Array.from(tpl.matchAll(/\{\{\s*(\w+)\s*\}\}/g)).map(m => m[1]);
  return Array.from(new Set(used.filter(key => !allowed.includes(key))));
}

// ─── RuleEditor ───────────────────────────────────────────────────────────────

interface RuleEditorProps {
  rule:         EmailNotificationRule;
  placeholders: string[];
  /** Shown as the sender line in the preview — not a template variable. */
  studioName:   string;
  onChange:     (rule: EmailNotificationRule) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, placeholders, studioName, onChange }) => {
  const [showPreview, setShowPreview] = useState(false);

  const insertIntoSubject = (key: string) =>
    onChange({ ...rule, subjectTemplate: `${rule.subjectTemplate}{{${key}}}` });

  const insertIntoBody = (key: string) =>
    onChange({ ...rule, bodyTemplate: `${rule.bodyTemplate}{{${key}}}` });

  const resolvedSubject = resolveTemplate(rule.subjectTemplate);
  const resolvedBody    = resolveTemplate(rule.bodyTemplate);
  const unknownVars     = unknownPlaceholders(
    `${rule.subjectTemplate} ${rule.bodyTemplate}`,
    placeholders
  );

  return (
    <>
      <FieldGroup>
        <SectionLabel>Temat wiadomości</SectionLabel>
        <ChipsRow>
          <ChipsLead>Wstaw:</ChipsLead>
          {placeholders.map(key => (
            <VarChip key={key} type="button" title={`{{${key}}}`} onClick={() => insertIntoSubject(key)}>
              {VAR_LABELS[key] ?? key}
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

      <FieldGroup>
        <SectionLabel>Treść wiadomości</SectionLabel>
        <ChipsRow>
          <ChipsLead>Wstaw:</ChipsLead>
          {placeholders.map(key => (
            <VarChip key={key} type="button" title={`{{${key}}}`} onClick={() => insertIntoBody(key)}>
              {VAR_LABELS[key] ?? key}
            </VarChip>
          ))}
        </ChipsRow>
        <BodyTextarea
          value={rule.bodyTemplate}
          onChange={e => onChange({ ...rule, bodyTemplate: e.target.value })}
          placeholder="Wpisz treść wiadomości email…"
        />
      </FieldGroup>

      {unknownVars.length > 0 && (
        <DisabledHint>
          <InfoIcon />
          {`Ta wiadomość nie zna zmiennych ${unknownVars.map(v => `{{${v}}}`).join(', ')} — usuń je lub wpisz wartość wprost, inaczej zapis zostanie odrzucony.`}
        </DisabledHint>
      )}

      <PreviewBtn type="button" onClick={() => setShowPreview(true)}>
        <EyeIcon />
        Podgląd wiadomości
      </PreviewBtn>

      {showPreview && (
        <PreviewModal title="Podgląd email" onClose={() => setShowPreview(false)}>
          <EmailClient>
            <EmailMeta>
              <EmailMetaRow>
                <EmailMetaKey>Od:</EmailMetaKey>
                <EmailMetaValue>{studioName}</EmailMetaValue>
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
        </PreviewModal>
      )}
    </>
  );
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

/**
 * A rule the backend has not sent yet renders as empty and disabled. We never invent
 * message text here: what goes out to a customer is only ever what the studio saved.
 */
const BLANK_RULE: EmailNotificationRule = { enabled: false, subjectTemplate: '', bodyTemplate: '' };

function mergeWithDefaults(config: Partial<EmailAutomationConfig>): EmailAutomationConfig {
  return (Object.keys(RULE_PLACEHOLDERS) as EmailRuleKey[]).reduce((acc, key) => {
    acc[key] = config[key] ?? BLANK_RULE;
    return acc;
  }, {} as EmailAutomationConfig);
}

// ─── Rule catalogue ───────────────────────────────────────────────────────────

const svg = (children: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

interface EmailRuleCardDef {
  key:         EmailRuleKey;
  title:       string;
  description: string;
  trigger:     string;
  icon:        React.ReactNode;
}

const RULE_CARDS: EmailRuleCardDef[] = [
  {
    key: 'visitWelcome',
    title: 'Powitanie przy przyjęciu pojazdu',
    description: 'Email wysyłany do klienta w momencie gdy pojazd zostaje przyjęty i wizyta zostaje rozpoczęta.',
    trigger: 'Przy rozpoczęciu wizyty',
    icon: svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>),
  },
  {
    key: 'visitReadyForPickup',
    title: 'Pojazd gotowy do odbioru',
    description: 'Poinformuj klienta natychmiast gdy jego pojazd jest gotowy — jeden klik z widoku wizyty.',
    trigger: 'Po oznaczeniu jako gotowy',
    icon: svg(<><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></>),
  },
  {
    key: 'visitCardLink',
    title: 'Link do Karty Wizyty',
    description: 'Email z linkiem do Karty Wizyty. Wstaw zmienną link, żeby dodać adres karty.',
    trigger: 'Przy wysyłce Karty Wizyty',
    icon: svg(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>),
  },
  {
    key: 'reservationCardLink',
    title: 'Link do Karty Rezerwacji',
    description: 'Email z linkiem do strony rezerwacji, wysyłany zanim pojazd trafi do serwisu.',
    trigger: 'Przy wysyłce Karty Rezerwacji',
    icon: svg(<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M12 14h4"/></>),
  },
  {
    key: 'batchOrderClose',
    title: 'Zestawienie zbiorcze dla kontrahenta',
    description: 'Email z podsumowaniem zamkniętego miesiąca i raportem PDF w załączniku.',
    trigger: 'Przy zamknięciu miesiąca',
    icon: svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></>),
  },
];

// ─── Card subcomponent ────────────────────────────────────────────────────────

interface EmailRuleCardProps {
  rule:            EmailNotificationRule;
  placeholders:    string[];
  open:            boolean;
  title:           string;
  description:     string;
  icon:            React.ReactNode;
  meta:            React.ReactNode;
  studioName:      string;
  onToggleOpen:    () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
  onChange:        (rule: EmailNotificationRule) => void;
}

const EmailRuleCard: React.FC<EmailRuleCardProps> = ({
  rule, placeholders, open, title, description, icon, meta, studioName,
  onToggleOpen, onToggleEnabled, onChange,
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
              Reguła jest wyłączona — możesz edytować szablon, ale emaile nie będą wysyłane.
            </DisabledHint>
          )}
          <RuleEditor rule={rule} placeholders={placeholders} studioName={studioName} onChange={onChange} />
        </CardBody>
      </>
    )}
  </Card>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonList: React.FC = () => (
  <Container>
    {[48, 44].map((w, i) => (
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

export const EmailAutomationSettings: React.FC = () => {
  const { config, isLoading } = useEmailAutomationConfig();
  const updateMutation = useUpdateEmailAutomationConfig();
  const { company } = useCompanySettings();

  const studioName = company?.name ?? 'Twoje Studio';

  const [localConfig, setLocalConfig] = useState<EmailAutomationConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<EmailAutomationConfig | null>(null);
  const [dirty, setDirty]             = useState(false);
  const [openCards, setOpenCards]     = useState<Set<EmailRuleKey>>(new Set());

  useEffect(() => {
    if (config && !localConfig) {
      const merged = mergeWithDefaults(config);
      setLocalConfig(merged);
      setSavedConfig(merged);
      const initialOpen = new Set<EmailRuleKey>(
        (Object.keys(merged) as EmailRuleKey[]).filter(k => merged[k].enabled)
      );
      setOpenCards(initialOpen);
    }
  }, [config, localConfig]);

  const toggleCardOpen = (key: EmailRuleKey) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const makeRuleUpdater = (key: EmailRuleKey) => (rule: EmailNotificationRule) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: rule });
    setDirty(true);
  };

  const makeToggleEnabled = (key: EmailRuleKey) => (e: React.MouseEvent) => {
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
    <>
      <Container>
        {RULE_CARDS.map(card => (
          <EmailRuleCard
            key={card.key}
            rule={localConfig[card.key]}
            placeholders={RULE_PLACEHOLDERS[card.key]}
            open={openCards.has(card.key)}
            title={card.title}
            description={card.description}
            studioName={studioName}
            icon={card.icon}
            meta={
              localConfig[card.key].enabled
                ? <ImmediateBadge>{card.trigger}</ImmediateBadge>
                : <InactiveLabel>Nieaktywne</InactiveLabel>
            }
            onToggleOpen={() => toggleCardOpen(card.key)}
            onToggleEnabled={makeToggleEnabled(card.key)}
            onChange={makeRuleUpdater(card.key)}
          />
        ))}
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
