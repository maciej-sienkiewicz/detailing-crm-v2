import { useMemo } from 'react';
import styled from 'styled-components';
import { Mail, MessageSquare } from 'lucide-react';
import { smsMeta } from '../utils/sms';
import type { Campaign } from '../types';

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
  gap: 14px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.1px;
  color: ${(p) => p.theme.colors.text};
`;

const PreviewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #e0f2fe;
  color: #075985;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0ea5e9;
  }
`;

const Grid = styled.div<{ $cols: 1 | 2 }>`
  display: grid;
  grid-template-columns: ${(p) => (p.$cols === 2 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)')};
  gap: 16px;
  align-items: start;

  @media (max-width: 899px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

// ─── Karta kanału ─────────────────────────────────────────────────────────────

const ChannelCard = styled.article<{ $accent: string }>`
  background: #ffffff;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-top: 3px solid ${(p) => p.$accent};
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ChannelHead = styled.header<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: ${(p) => p.$accent}1a;
    color: ${(p) => p.$accent};

    svg { width: 15px; height: 15px; stroke-width: 1.75; }
  }

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${(p) => p.theme.colors.text};
    letter-spacing: -0.1px;
  }

  .hint {
    margin-left: auto;
    font-size: 11.5px;
    color: ${(p) => p.theme.colors.textMuted};

    @media (max-width: 480px) { display: none; }
  }
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 18px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: #fafbfc;
  font-size: 12.5px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-variant-numeric: tabular-nums;

  strong {
    font-weight: 700;
    color: ${(p) => p.theme.colors.text};
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
  padding: 22px 18px 18px;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SenderCap = styled.div`
  align-self: center;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
`;

const SmsBubble = styled.div`
  align-self: flex-start;
  max-width: 92%;
  padding: 12px 16px;
  background: #ffffff;
  color: #0f172a;
  border-radius: 18px 18px 18px 4px;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
`;

const BubbleTime = styled.div`
  align-self: flex-start;
  padding-left: 8px;
  font-size: 11px;
  color: #94a3b8;
`;

const EmptyBubble = styled.div`
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  font-style: italic;
`;

// ─── Podgląd e-maila (metafora klienta pocztowego) ────────────────────────────

const EmailClient = styled.div`
  display: flex;
  flex-direction: column;
`;

const EmailHead = styled.div`
  padding: 14px 18px;
  background: #fafbfc;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const EmailFromRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
`;

const Avatar = styled.div<{ $bg: string }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${(p) => p.$bg};
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.02em;
`;

const FromMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  .name {
    font-size: 13px;
    font-weight: 700;
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
  font-size: 15px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text};
  letter-spacing: -0.15px;
  word-break: break-word;
  padding-left: 44px;
`;

const EmailBody = styled.div`
  padding: 20px 18px;
  min-height: 140px;
  font-size: 14px;
  line-height: 1.65;
  color: ${(p) => p.theme.colors.text};
  white-space: pre-wrap;
  word-break: break-word;
`;

const EmptyEmailBody = styled.div`
  padding: 30px 18px;
  min-height: 140px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyState = styled.div`
  padding: 32px 20px;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;
  text-align: center;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  campaign: Campaign;
}

export function ContentPreview({ campaign }: Props) {
  const hasSms = !!campaign.smsTemplate?.trim();
  const hasEmail = !!(campaign.emailSubject?.trim() || campaign.emailBody?.trim());

  const smsBody = useMemo(() => renderPlaceholders(campaign.smsTemplate), [campaign.smsTemplate]);
  const emailSubject = useMemo(() => renderPlaceholders(campaign.emailSubject), [campaign.emailSubject]);
  const emailBody = useMemo(() => renderPlaceholders(campaign.emailBody), [campaign.emailBody]);
  const smsInfo = useMemo(
    () => (campaign.smsTemplate ? smsMeta(campaign.smsTemplate) : null),
    [campaign.smsTemplate],
  );

  const cols: 1 | 2 = hasSms && hasEmail ? 2 : 1;

  if (!hasSms && !hasEmail) {
    return (
      <Wrap>
        <HeaderRow>
          <Title>Treść wiadomości</Title>
        </HeaderRow>
        <EmptyState>Ta kampania nie ma jeszcze treści.</EmptyState>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <HeaderRow>
        <Title>Treść wiadomości</Title>
        <PreviewBadge>Podgląd z przykładowymi danymi</PreviewBadge>
      </HeaderRow>

      <Grid $cols={cols}>
        {hasSms && (
          <ChannelCard $accent="#0ea5e9">
            <ChannelHead $accent="#0ea5e9">
              <span className="icon"><MessageSquare /></span>
              <h4>SMS</h4>
              <span className="hint">tak zobaczy ją klient</span>
            </ChannelHead>
            <PhoneBackdrop>
              <SenderCap>Twoje studio</SenderCap>
              {smsBody ? <SmsBubble>{smsBody}</SmsBubble> : <EmptyBubble>Brak treści SMS.</EmptyBubble>}
              <BubbleTime>teraz</BubbleTime>
            </PhoneBackdrop>
            {smsInfo && (
              <MetaRow>
                <span><strong>{smsInfo.length}</strong> znaków</span>
                <MetaDot />
                <span>Kodowanie <strong>{smsInfo.encoding}</strong></span>
                <MetaDot />
                <span>
                  <strong>{smsInfo.segments}</strong> {smsInfo.segments === 1 ? 'segment' : 'segmenty'} = {smsInfo.segments} kredyt(y) / odbiorcę
                </span>
              </MetaRow>
            )}
          </ChannelCard>
        )}

        {hasEmail && (
          <ChannelCard $accent="#8b5cf6">
            <ChannelHead $accent="#8b5cf6">
              <span className="icon"><Mail /></span>
              <h4>E-mail</h4>
              <span className="hint">tak zobaczy go klient</span>
            </ChannelHead>
            <EmailClient>
              <EmailHead>
                <EmailFromRow>
                  <Avatar $bg="#8b5cf6">TS</Avatar>
                  <FromMeta>
                    <span className="name">Twoje studio</span>
                    <span className="to">do: {SAMPLE_VALUES['{{imie}}']} {SAMPLE_VALUES['{{nazwisko}}']}</span>
                  </FromMeta>
                </EmailFromRow>
                <EmailSubject>{emailSubject || <em style={{ color: '#94a3b8', fontStyle: 'normal' }}>(brak tematu)</em>}</EmailSubject>
              </EmailHead>
              {emailBody
                ? <EmailBody>{emailBody}</EmailBody>
                : <EmptyEmailBody>Treść e-maila nie została jeszcze przygotowana.</EmptyEmailBody>}
            </EmailClient>
          </ChannelCard>
        )}
      </Grid>
    </Wrap>
  );
}
