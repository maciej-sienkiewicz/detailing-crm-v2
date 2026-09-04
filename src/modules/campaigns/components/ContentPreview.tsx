// src/modules/campaigns/components/ContentPreview.tsx
// Podgląd treści: tak zobaczy ją klient.
//
// Metafora nośnika zostaje - dymek w oknie telefonu i nagłówek klienta poczty
// mówią „SMS" i „e-mail" szybciej niż jakakolwiek etykieta. Zniknęły natomiast
// barwy przypisane kanałom: błękitna kreska nad SMS-em i fioletowa nad e-mailem
// nie niosły żadnej informacji poza „to są dwie różne rzeczy", co widać i bez
// koloru. Kolor w tym module znaczy etap, pilność albo akcję główną - kanał
// rozpoznaje się po ikonie i po kształcie podglądu.
import { useMemo } from 'react';
import styled from 'styled-components';
import { Mail, MessageSquare } from 'lucide-react';
import { smsMeta } from '../utils/sms';
import type { CampaignChannel } from '../types';

// Podstawiane wartości w podglądzie, dają klientowi realistyczny obraz
// tego, co dostanie odbiorca. Nie idą nigdzie na backend.
const SAMPLE_VALUES: Record<string, string> = {
  '{{imie}}': 'Anna',
  '{{nazwisko}}': 'Nowak',
  '{{marka}}': 'BMW',
  '{{model}}': 'X3',
  '{{ostatnia_usluga}}': 'powłoka ceramiczna',
  '{{data_ostatniej_wizyty}}': '12 mar 2025',
  '{{dni_od_wizyty}}': '180',
};

function renderPlaceholders(text: string | null | undefined): string {
  if (!text) return '';
  let out = text;
  for (const [k, v] of Object.entries(SAMPLE_VALUES)) out = out.split(k).join(v);
  return out;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Head = styled.h4`
  /* Styl dziedziczy z Panelu: wersaliki, mały stopień, kolor przygaszony. */
  .hint {
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;
    font-weight: ${(p) => p.theme.fontWeights.normal};
    font-size: 11.5px;
    color: ${(p) => p.theme.colors.textMuted};
  }
`;

const Grid = styled.div<{ $cols: 1 | 2 }>`
  display: grid;
  grid-template-columns: ${(p) => (p.$cols === 2 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)')};
  gap: 12px;
  align-items: start;

  @media (max-width: 899px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

// ─── Karta kanału ─────────────────────────────────────────────────────────────

const ChannelCard = styled.article`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const ChannelHead = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};

  svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: ${(p) => p.theme.colors.textMuted};
  }

  h5 {
    margin: 0;
    font-size: 12.5px;
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
  }
`;

/** Liczby segmentów i kodowania - fakt techniczny, więc stoi cicho pod treścią. */
const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceHover};
  font-size: 11.5px;
  color: ${(p) => p.theme.colors.textMuted};
  font-variant-numeric: tabular-nums;

  strong {
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.textSecondary};
  }
`;

const MetaDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${(p) => p.theme.colors.border};
`;

// ─── Podgląd SMS (metafora telefonu) ──────────────────────────────────────────

const PhoneBackdrop = styled.div`
  padding: 18px 14px 14px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SenderCap = styled.div`
  align-self: center;
  padding: 3px 10px;
  border-radius: ${(p) => p.theme.radii.full};
  background: ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 10px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
`;

const SmsBubble = styled.div`
  align-self: flex-start;
  max-width: 92%;
  padding: 11px 14px;
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  border-radius: 18px 18px 18px 4px;
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
`;

const BubbleTime = styled.div`
  align-self: flex-start;
  padding-left: 8px;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
`;

const Placeholder = styled.div`
  padding: 20px;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;
  text-align: center;
`;

// ─── Podgląd e-maila (metafora klienta pocztowego) ────────────────────────────

const EmailHead = styled.div`
  padding: 12px 14px;
  background: ${(p) => p.theme.colors.surfaceHover};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const EmailFromRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`;

/**
 * Awatar nadawcy w tonie interfejsu, nie w kolorze przypisanym kanałowi:
 * to jest szara koperta z inicjałami studia, a nie znak stanu.
 */
const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 12px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const FromMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  .name {
    font-size: 12.5px;
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
    line-height: 1.2;
  }

  .to {
    font-size: 11.5px;
    color: ${(p) => p.theme.colors.textMuted};
    line-height: 1.2;
    margin-top: 2px;
  }
`;

const EmailSubject = styled.div`
  font-size: 14px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
  letter-spacing: -0.1px;
  word-break: break-word;
  padding-left: 42px;
`;

const EmailBody = styled.div`
  padding: 16px 14px;
  min-height: 120px;
  max-height: 260px;
  overflow-y: auto;
  font-size: 13.5px;
  line-height: 1.65;
  color: ${(p) => p.theme.colors.text};
  white-space: pre-wrap;
  word-break: break-word;
`;

const EmptyState = styled.div`
  padding: 28px 20px;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;
  text-align: center;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  smsTemplate?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  /**
   * Kanał wymuszający ramkę podglądu, nawet gdy treści jeszcze nie ma.
   *
   * W kreatorze podgląd stoi obok edytora i wypełnia się w trakcie pisania - pusta
   * ramka pokazuje, gdzie wyląduje tekst. W oknie gotowej kampanii nie ma czego
   * wymuszać: pokazujemy to, co w niej naprawdę jest.
   */
  channel?: CampaignChannel;
  /**
   * `stacked` układa kanały jeden pod drugim niezależnie od szerokości okna -
   * dla wąskiej kolumny podglądu w kreatorze, której zapytanie o szerokość ekranu
   * i tak nie widzi.
   */
  layout?: 'auto' | 'stacked';
}

export function ContentPreview({
  smsTemplate,
  emailSubject: subject,
  emailBody: body,
  channel,
  layout = 'auto',
}: Props) {
  const hasSms = !!smsTemplate?.trim() || channel === 'SMS' || channel === 'BOTH';
  const hasEmail = !!(subject?.trim() || body?.trim()) || channel === 'EMAIL' || channel === 'BOTH';

  const smsBody = useMemo(() => renderPlaceholders(smsTemplate), [smsTemplate]);
  const emailSubject = useMemo(() => renderPlaceholders(subject), [subject]);
  const emailBody = useMemo(() => renderPlaceholders(body), [body]);
  const smsInfo = useMemo(() => (smsTemplate ? smsMeta(smsTemplate) : null), [smsTemplate]);

  const cols: 1 | 2 = hasSms && hasEmail && layout === 'auto' ? 2 : 1;

  if (!hasSms && !hasEmail) {
    return (
      <Wrap>
        <Head>Treść wiadomości</Head>
        <EmptyState>Ta kampania nie ma jeszcze treści.</EmptyState>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Head>
        Treść wiadomości
        <span className="hint">podgląd z przykładowymi danymi</span>
      </Head>

      <Grid $cols={cols}>
        {hasSms && (
          <ChannelCard>
            <ChannelHead>
              <MessageSquare />
              <h5>SMS</h5>
            </ChannelHead>
            <PhoneBackdrop>
              <SenderCap>Twoje studio</SenderCap>
              {smsBody ? <SmsBubble>{smsBody}</SmsBubble> : <Placeholder>Brak treści SMS.</Placeholder>}
              <BubbleTime>teraz</BubbleTime>
            </PhoneBackdrop>
            {smsInfo && (
              <MetaRow>
                <span><strong>{smsInfo.length}</strong> znaków</span>
                <MetaDot />
                <span>kodowanie <strong>{smsInfo.encoding}</strong></span>
                <MetaDot />
                <span>
                  <strong>{smsInfo.segments}</strong>{' '}
                  {smsInfo.segments === 1 ? 'segment' : 'segmenty'} na odbiorcę
                </span>
              </MetaRow>
            )}
          </ChannelCard>
        )}

        {hasEmail && (
          <ChannelCard>
            <ChannelHead>
              <Mail />
              <h5>E-mail</h5>
            </ChannelHead>
            <EmailHead>
              <EmailFromRow>
                <Avatar>TS</Avatar>
                <FromMeta>
                  <span className="name">Twoje studio</span>
                  <span className="to">
                    do: {SAMPLE_VALUES['{{imie}}']} {SAMPLE_VALUES['{{nazwisko}}']}
                  </span>
                </FromMeta>
              </EmailFromRow>
              <EmailSubject>{emailSubject || '(brak tematu)'}</EmailSubject>
            </EmailHead>
            {emailBody
              ? <EmailBody>{emailBody}</EmailBody>
              : <Placeholder>Treść e-maila nie została jeszcze przygotowana.</Placeholder>}
          </ChannelCard>
        )}
      </Grid>
    </Wrap>
  );
}
