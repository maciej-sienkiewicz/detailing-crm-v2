import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { PLACEHOLDERS } from '../constants';
import { smsMeta } from '../utils/sms';
import { useTestSend } from '../hooks/useCampaigns';
import type { CampaignChannel } from '../types';

// ─── Styles ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ChannelRow = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-radius: 9999px;
  align-self: flex-start;
`;

const ChannelChip = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  padding: 7px 16px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.colors.text : p.theme.colors.textMuted)};
  box-shadow: ${(p) => (p.$active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none')};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textMuted};
`;

const TokenLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textMuted};
  margin-bottom: 2px;
`;

const TextArea = styled.textarea`
  min-height: 120px;
  padding: 12px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const Input = styled.input`
  padding: 10px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const CounterRow = styled.div<{ $warn: boolean }>`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${(p) => (p.$warn ? '#d97706' : p.theme.colors.textMuted)};
  font-variant-numeric: tabular-nums;
`;

const TokenSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.colors.border};
`;

const ChannelCard = styled.div<{ $accent: string }>`
  position: relative;
  background: #ffffff;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-left: 4px solid ${(p) => p.$accent};
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChannelCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};

  svg { width: 16px; height: 16px; stroke-width: 1.75; }
  h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${(p) => p.theme.colors.text};
  }
`;

const TokenRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Token = styled.button`
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  cursor: pointer;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
  color: #0ea5e9;
  transition: all 150ms ease;
  white-space: nowrap;

  &:hover {
    background: rgba(14, 165, 233, 0.08);
    border-color: rgba(14, 165, 233, 0.4);
  }
`;

const TestRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const TestBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: #ffffff;
  cursor: pointer;
  padding: 9px 16px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  color: ${(p) => p.theme.colors.text};
  transition: all 180ms ease;

  &:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08); }
  &:disabled { opacity: 0.5; cursor: default; transform: none; }

  svg { width: 14px; height: 14px; stroke-width: 1.75; }
`;

const TestStatus = styled.span<{ $ok: boolean }>`
  font-size: 13px;
  color: ${(p) => (p.$ok ? '#16a34a' : '#dc2626')};
`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface MessageContent {
  channel: CampaignChannel;
  smsTemplate: string;
  emailSubject: string;
  emailBody: string;
}

interface Props {
  value: MessageContent;
  onChange: (next: MessageContent) => void;
}

export function MessageEditor({ value, onChange }: Props) {
  const smsRef = useRef<HTMLTextAreaElement>(null);
  const [testAddress, setTestAddress] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const testSend = useTestSend();

  const set = (patch: Partial<MessageContent>) => onChange({ ...value, ...patch });
  const showSms = value.channel === 'SMS' || value.channel === 'BOTH';
  const showEmail = value.channel === 'EMAIL' || value.channel === 'BOTH';
  const meta = smsMeta(value.smsTemplate);

  const insertToken = (token: string) => {
    const el = smsRef.current;
    if (el && showSms) {
      const start = el.selectionStart ?? value.smsTemplate.length;
      const next =
        value.smsTemplate.slice(0, start) + token + value.smsTemplate.slice(el.selectionEnd ?? start);
      set({ smsTemplate: next });
    } else {
      set({ emailBody: value.emailBody + token });
    }
  };

  const runTest = async () => {
    setTestResult(null);
    try {
      const res = await testSend.mutateAsync(
        showSms
          ? { channel: 'SMS', address: testAddress, smsTemplate: value.smsTemplate }
          : { channel: 'EMAIL', address: testAddress, emailSubject: value.emailSubject, emailBody: value.emailBody }
      );
      setTestResult(
        res.success
          ? { ok: true, msg: 'Wysłano wiadomość testową.' }
          : { ok: false, msg: res.errorMessage ?? 'Nie udało się wysłać testu.' }
      );
    } catch {
      setTestResult({ ok: false, msg: 'Nie udało się wysłać testu.' });
    }
  };

  return (
    <Wrap>
      <ChannelRow>
        {(['SMS', 'EMAIL', 'BOTH'] as CampaignChannel[]).map((ch) => (
          <ChannelChip key={ch} $active={value.channel === ch} onClick={() => set({ channel: ch })}>
            {ch === 'SMS' ? 'SMS' : ch === 'EMAIL' ? 'E-mail' : 'SMS i e-mail'}
          </ChannelChip>
        ))}
      </ChannelRow>

      <TokenSection>
        <TokenLabel>Zmienne — kliknij, żeby wstawić w miejsce kursora</TokenLabel>
        <TokenRow>
          {PLACEHOLDERS.map((p) => (
            <Token key={p.token} type="button" title={p.label} onClick={() => insertToken(p.token)}>
              {p.token}
            </Token>
          ))}
        </TokenRow>
      </TokenSection>

      {showSms && (
        <ChannelCard $accent="#0ea5e9">
          <ChannelCardHead>
            <MessageSquare color="#0ea5e9" />
            <h4>Wiadomość SMS</h4>
          </ChannelCardHead>
          <Field>
            <Label>Treść</Label>
            <TextArea
              ref={smsRef}
              value={value.smsTemplate}
              onChange={(e) => set({ smsTemplate: e.target.value })}
              placeholder="Cześć {{imie}}! …"
            />
            <CounterRow $warn={meta.segments > 1}>
              <span>
                {meta.length} znaków · {meta.encoding}
                {meta.encoding === 'UCS-2' && ' (polskie znaki skracają SMS)'}
              </span>
              <span>{meta.segments} {meta.segments === 1 ? 'segment' : 'segmenty'} = {meta.segments} kredyt(y) / odbiorcę</span>
            </CounterRow>
          </Field>
        </ChannelCard>
      )}

      {showEmail && (
        <ChannelCard $accent="#8b5cf6">
          <ChannelCardHead>
            <Mail color="#8b5cf6" />
            <h4>Wiadomość e-mail</h4>
          </ChannelCardHead>
          <Field>
            <Label>Temat</Label>
            <Input
              value={value.emailSubject}
              onChange={(e) => set({ emailSubject: e.target.value })}
              placeholder="np. Zaproszenie od {{studio}}"
            />
          </Field>
          <Field>
            <Label>Treść</Label>
            <TextArea
              value={value.emailBody}
              onChange={(e) => set({ emailBody: e.target.value })}
              style={{ minHeight: 180 }}
              placeholder="Dzień dobry {{imie}}, …"
            />
          </Field>
        </ChannelCard>
      )}

      <TestRow>
        <Input
          style={{ width: 240 }}
          value={testAddress}
          onChange={(e) => setTestAddress(e.target.value)}
          placeholder={showSms ? '+48 XXX XXX XXX' : 'twoj@email.pl'}
        />
        <TestBtn type="button" disabled={!testAddress || testSend.isPending} onClick={runTest}>
          <Send /> Wyślij test do siebie
        </TestBtn>
        {testResult && <TestStatus $ok={testResult.ok}>{testResult.msg}</TestStatus>}
      </TestRow>
    </Wrap>
  );
}
