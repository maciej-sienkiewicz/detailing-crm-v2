import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { PLACEHOLDERS } from '../constants';
import { smsMeta } from '../utils/sms';
import { useTestSend } from '../hooks/useCampaigns';
import { FilterChip, IconButton, TextAreaField, TextField } from './shared';
import type { CampaignChannel } from '../types';

// ─── Styles ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/*
 * Wybór kanału to ten sam gest, co filtr na liście — więc ten sam chip. Osobna
 * „kapsuła" z białym prostokątem w środku była trzecim wzorem przełącznika
 * w aplikacji, która ma jeden.
 */
const ChannelRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-self: flex-start;
`;

const ChannelChip = FilterChip;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textMuted};
`;

const TokenLabel = styled.div`
  font-size: 11px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textMuted};
  margin-bottom: 2px;
`;

const TextArea = styled(TextAreaField)`
  min-height: 120px;
`;

const Input = TextField;

/*
 * Licznik znaków. Bursztyn zapala się dopiero wtedy, gdy wiadomość przekroczyła
 * jeden segment — czyli wtedy, gdy kosztuje podwójnie. Do tego momentu to zwykła
 * informacja i wygląda jak zwykła informacja.
 */
const CounterRow = styled.div<{ $warn: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: ${(p) => (p.$warn ? p.theme.colors.warning : p.theme.colors.textMuted)};
  font-variant-numeric: tabular-nums;
`;

/** Materiał pomocniczy — na tle strony, bez ramki, cofnięty o plan. */
const TokenSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-radius: ${(p) => p.theme.radii.md};
`;

/*
 * Karta kanału bez barwnej kreski: błękit przy SMS-ie i fiolet przy e-mailu
 * niczego nie mówiły poza „to dwie różne rzeczy", a to widać po nagłówku.
 */
const ChannelCard = styled.div`
  position: relative;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
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

  svg { width: 16px; height: 16px; color: ${(p) => p.theme.colors.textMuted}; }
  h4 {
    margin: 0;
    font-size: 11px;
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(p) => p.theme.colors.textMuted};
  }
`;

const TokenRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

/*
 * Zmienna do wstawienia. Monospace wystarcza, żeby odróżnić ją od tekstu —
 * kilkanaście błękitnych żetonów w rzędzie zabierało barwę akcji głównej.
 */
const Token = styled.button`
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  cursor: pointer;
  padding: 3px 9px;
  border-radius: ${(p) => p.theme.radii.sm};
  font-size: 12px;
  font-weight: ${(p) => p.theme.fontWeights.medium};
  font-family: monospace;
  color: ${(p) => p.theme.colors.textSecondary};
  transition: all ${(p) => p.theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    color: ${(p) => p.theme.colors.primary};
  }
`;

const TestRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const TestBtn = IconButton;

const TestStatus = styled.span<{ $ok: boolean }>`
  font-size: 13px;
  color: ${(p) => (p.$ok ? p.theme.colors.success : p.theme.colors.error)};
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
        <TokenLabel>Zmienne: kliknij, żeby wstawić w miejsce kursora</TokenLabel>
        <TokenRow>
          {PLACEHOLDERS.map((p) => (
            <Token key={p.token} type="button" title={p.label} onClick={() => insertToken(p.token)}>
              {p.token}
            </Token>
          ))}
        </TokenRow>
      </TokenSection>

      {showSms && (
        <ChannelCard>
          <ChannelCardHead>
            <MessageSquare />
            <h4>Wiadomość SMS</h4>
          </ChannelCardHead>
          <Field>
            <Label>Treść</Label>
            <TextArea
              ref={smsRef}
              value={value.smsTemplate}
              onChange={(e) => set({ smsTemplate: e.target.value })}
              placeholder="Cześć {{imie}}! ..."
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
        <ChannelCard>
          <ChannelCardHead>
            <Mail />
            <h4>Wiadomość e-mail</h4>
          </ChannelCardHead>
          <Field>
            <Label>Temat</Label>
            <Input
              value={value.emailSubject}
              onChange={(e) => set({ emailSubject: e.target.value })}
              placeholder="np. Zaproszenie na sezonowy przegląd"
            />
          </Field>
          <Field>
            <Label>Treść</Label>
            <TextArea
              value={value.emailBody}
              onChange={(e) => set({ emailBody: e.target.value })}
              style={{ minHeight: 180 }}
              placeholder="Dzień dobry {{imie}}, ..."
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
