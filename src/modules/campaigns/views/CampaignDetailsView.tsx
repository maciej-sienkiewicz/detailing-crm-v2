import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  AlertTriangle, CalendarClock, CheckCircle2, Coins, Copy, Mail, MessageSquare,
  Pause, Pencil, Play, Radio, RefreshCw, SkipForward, Square, Trash2, Users,
} from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { StatTile } from '@/common/components/StatTile';
import {
  useArchiveCampaign, useCampaign, useCampaignRecipients, useCancelCampaign,
  useDeleteCampaign, useDuplicateCampaign, usePauseCampaign, useRetryAllFailed,
  useRetryRecipient, useStopCampaign, useActivateCampaign, useAudienceEstimate,
} from '../hooks/useCampaigns';
import { emptyAudience } from '../types';
import type { AudienceCriteria, RecipientChannel } from '../types';
import { CHANNEL_LABELS, RECIPIENT_STATUS_LABELS, TILE_STYLES } from '../constants';
import { CampaignKindBadge, CampaignStatusBadge, Eyebrow, MutedText, Page, SectionCard } from '../components/shared';
import { audienceChips, Chip, ChipRow, useServiceCatalog } from '../components/AudienceBuilder';
import { ContentPreview } from '../components/ContentPreview';
import type { Campaign } from '../types';

// ─── Styles ───────────────────────────────────────────────────────────────────

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const TitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: ${(p) => p.theme.colors.text}; }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 9px 18px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;
  border: 1px solid ${(p) => (p.$primary ? 'transparent' : p.$danger ? '#fecaca' : p.theme.colors.border)};
  background: ${(p) => (p.$primary ? '#0ea5e9' : '#ffffff')};
  color: ${(p) => (p.$primary ? '#ffffff' : p.$danger ? '#dc2626' : p.theme.colors.text)};

  &:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1); }

  svg { width: 14px; height: 14px; stroke-width: 1.75; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 1023px) { grid-template-columns: repeat(2, 1fr); }
`;

const RecipientsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${(p) => p.theme.colors.textMuted};
    padding: 10px 12px;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
  }

  td {
    padding: 10px 12px;
    font-size: 13.5px;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
    color: ${(p) => p.theme.colors.text};
  }

  tr:last-child td { border-bottom: none; }
`;

const SearchInput = styled.input`
  padding: 8px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 13px;
  font-family: inherit;
  width: 260px;
  margin-bottom: 10px;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const RecipientsSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const RetryAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 7px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
  transition: all 180ms ease;

  &:hover { background: #fef3c7; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  svg { width: 13px; height: 13px; stroke-width: 2; }
`;

const RetryRowBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: #ffffff;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  transition: all 150ms ease;
  padding: 0;
  flex-shrink: 0;

  &:hover { background: #fffbeb; border-color: #fde68a; color: #92400e; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  svg { width: 13px; height: 13px; stroke-width: 2; }
`;

const Timeline = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    display: flex;
    gap: 10px;
    font-size: 13px;
    color: ${(p) => p.theme.colors.textSecondary};

    strong { color: ${(p) => p.theme.colors.text}; font-weight: 600; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('pl-PL', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

function metricTiles(c: Campaign) {
  switch (c.status) {
    case 'SCHEDULED':
      return [
        { style: TILE_STYLES.sent, icon: Users, value: c.recipientsTotal || '—', label: 'Prognozowani odbiorcy' },
        { style: TILE_STYLES.scheduled, icon: CalendarClock, value: c.scheduledAt ? fmt(c.scheduledAt)! : 'natychmiast', label: 'Termin wysyłki' },
        { style: TILE_STYLES.credits, icon: Radio, value: CHANNEL_LABELS[c.channel], label: 'Kanał' },
        { style: TILE_STYLES.credits, icon: Coins, value: c.creditsSpent || '—', label: 'Koszt (kredyty)' },
      ];
    case 'SENDING':
      return [
        { style: TILE_STYLES.sent, icon: MessageSquare, value: `${c.recipientsSent} / ${c.recipientsTotal}`, label: 'Wysłano' },
        { style: TILE_STYLES.creditsLow, icon: AlertTriangle, value: c.recipientsFailed, label: 'Błędy' },
        { style: TILE_STYLES.scheduled, icon: SkipForward, value: c.recipientsSkipped, label: 'Pominięci' },
        { style: TILE_STYLES.credits, icon: Coins, value: c.creditsSpent, label: 'Zużyte kredyty' },
      ];
    case 'ACTIVE':
    case 'PAUSED':
      return [
        { style: TILE_STYLES.active, icon: CheckCircle2, value: c.recipientsSent, label: 'Wysłano łącznie' },
        { style: TILE_STYLES.scheduled, icon: SkipForward, value: c.recipientsSkipped, label: 'Pominięci' },
        { style: TILE_STYLES.sent, icon: CalendarClock, value: c.status === 'ACTIVE' ? 'codziennie' : 'wstrzymano', label: 'Sprawdzanie warunku' },
        { style: TILE_STYLES.credits, icon: Coins, value: c.creditsSpent, label: 'Koszt łącznie' },
      ];
    default:
      return [
        { style: TILE_STYLES.active, icon: CheckCircle2, value: c.recipientsSent, label: 'Wysłano' },
        { style: TILE_STYLES.scheduled, icon: SkipForward, value: c.recipientsSkipped, label: 'Pominięci' },
        { style: TILE_STYLES.creditsLow, icon: AlertTriangle, value: c.recipientsFailed, label: 'Błędy' },
        { style: TILE_STYLES.credits, icon: Coins, value: c.creditsSpent, label: 'Koszt (kredyty)' },
      ];
  }
}

// ─── Widok ────────────────────────────────────────────────────────────────────

export function CampaignDetailsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign(id);
  const { recipients } = useCampaignRecipients(id);
  const { serviceNames } = useServiceCatalog();

  const cancel = useCancelCampaign();
  const stop = useStopCampaign();
  const pause = usePauseCampaign();
  const activate = useActivateCampaign();
  const archive = useArchiveCampaign();
  const duplicate = useDuplicateCampaign();
  const remove = useDeleteCampaign();

  const retryRecipient = useRetryRecipient(id ?? '');
  const retryAllFailed = useRetryAllFailed(id ?? '');

  // Estimate loaded only when campaign is in projection state (not yet sending).
  // We fall back to emptyAudience() before the campaign object arrives so the hook
  // can be called unconditionally (React rules of hooks).
  const projectionAudience: AudienceCriteria = campaign?.audience ?? emptyAudience();
  const projectionChannel: RecipientChannel =
    campaign?.channel === 'EMAIL' ? 'EMAIL' : 'SMS';
  const { estimate } = useAudienceEstimate(projectionAudience, projectionChannel);

  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'stop' | 'cancel' | 'delete'>(null);

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return recipients;
    const q = search.toLowerCase();
    return recipients.filter((r) => r.address.toLowerCase().includes(q));
  }, [recipients, search]);

  if (!campaign) return <Page><MutedText>Wczytywanie…</MutedText></Page>;
  const c = campaign;
  const chips = audienceChips(c.audience, serviceNames);
  const isProjection = c.status === 'DRAFT' || c.status === 'SCHEDULED';

  const NON_RETRYABLE = new Set(['SENT', 'PENDING', 'EXCLUDED_MANUALLY', 'SKIPPED_OPTED_OUT']);
  const isRetryable = (status: string) => !NON_RETRYABLE.has(status);
  const BULK_RETRYABLE = new Set(['FAILED', 'STOPPED', 'SKIPPED_NO_CREDITS', 'SKIPPED_FREQUENCY_CAP']);
  const hasRetryableRecipients = recipients.some((r) => BULK_RETRYABLE.has(r.status));

  const runDuplicate = async () => {
    const copy = await duplicate.mutateAsync(c.id);
    navigate(`/campaigns/${(copy as Campaign).id}`);
  };

  return (
    <Page>
      <HeaderRow>
        <TitleWrap>
          <h1>{c.name}</h1>
          <CampaignKindBadge kind={c.kind} />
          <CampaignStatusBadge status={c.status} />
        </TitleWrap>
        <Actions>
          {c.status === 'DRAFT' && (
            <>
              <ActionBtn $primary onClick={() => navigate(`/campaigns/${c.id}/edit`)}><Pencil /> Dokończ</ActionBtn>
              <ActionBtn $danger onClick={() => setConfirmAction('delete')}><Trash2 /> Usuń</ActionBtn>
            </>
          )}
          {c.status === 'SCHEDULED' && (
            <>
              <ActionBtn $primary onClick={() => navigate(`/campaigns/${c.id}/edit`)}><Pencil /> Edytuj</ActionBtn>
              <ActionBtn onClick={() => setConfirmAction('cancel')}><Square /> Anuluj wysyłkę</ActionBtn>
            </>
          )}
          {c.status === 'SENDING' && (
            <ActionBtn $danger onClick={() => setConfirmAction('stop')}><Square /> Zatrzymaj wysyłkę</ActionBtn>
          )}
          {c.status === 'ACTIVE' && (
            <>
              <ActionBtn $primary onClick={() => pause.mutate(c.id)}><Pause /> Wstrzymaj</ActionBtn>
              <ActionBtn onClick={() => navigate(`/campaigns/${c.id}/edit`)}><Pencil /> Edytuj</ActionBtn>
              <ActionBtn onClick={() => archive.mutate(c.id)}>Archiwizuj</ActionBtn>
            </>
          )}
          {c.status === 'PAUSED' && (
            <>
              <ActionBtn $primary onClick={() => activate.mutate(c.id)}><Play /> Wznów</ActionBtn>
              <ActionBtn onClick={() => navigate(`/campaigns/${c.id}/edit`)}><Pencil /> Edytuj</ActionBtn>
              <ActionBtn onClick={() => archive.mutate(c.id)}>Archiwizuj</ActionBtn>
            </>
          )}
          <ActionBtn onClick={runDuplicate}><Copy /> Duplikuj</ActionBtn>
        </Actions>
      </HeaderRow>

      <Grid>
        {metricTiles(c).map((t, i) => (
          <StatTile key={i} {...t.style} icon={t.icon} value={t.value} label={t.label} compact />
        ))}
      </Grid>

      <SectionCard style={{ marginBottom: 16 }}>
        <ContentPreview campaign={c} />
      </SectionCard>

      {c.kind === 'AUTOMATIC' && c.trigger && (
        <SectionCard style={{ marginBottom: 16 }}>
          <Eyebrow>Warunek</Eyebrow>
          <span style={{ fontSize: 14 }}>
            {c.trigger.afterDays} dni po usłudze:{' '}
            <strong>{c.trigger.serviceIds.map((sid) => serviceNames.get(sid) ?? 'usługa').join(', ')}</strong>
            {', o '}{c.trigger.sendTime}
            {c.trigger.onlyIfNoVisitSince && ', pomijając klientów, którzy byli w międzyczasie'}
          </span>
        </SectionCard>
      )}

      <SectionCard style={{ marginBottom: 16 }}>
        <RecipientsSectionHeader>
          <Eyebrow style={{ margin: 0 }}>{isProjection ? 'Prognozowani odbiorcy' : 'Odbiorcy'}</Eyebrow>
          {!isProjection && hasRetryableRecipients && (
            <RetryAllBtn
              onClick={() => retryAllFailed.mutate()}
              disabled={retryAllFailed.isPending}
              title="Ponów wszystkie nieudane i zatrzymane wiadomości"
            >
              <RefreshCw /> Ponów nieudane
            </RetryAllBtn>
          )}
        </RecipientsSectionHeader>
        {isProjection && (
          <MutedText style={{ display: 'block', marginBottom: 10 }}>
            Stan na dziś — ostateczna lista zostanie wyliczona w dniu wysyłki. Ręczne wykluczenia
            zostaną zachowane.
          </MutedText>
        )}
        {chips.length > 0 && (
          <ChipRow style={{ marginBottom: 12 }}>{chips.map((ch) => <Chip key={ch}>{ch}</Chip>)}</ChipRow>
        )}
        {recipients.length > 0 ? (
          <>
            <SearchInput
              placeholder="Szukaj po numerze lub adresie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <RecipientsTable>
              <thead>
                <tr><th>Kanał</th><th>Adres</th><th>Status</th><th>Wysłano</th><th /></tr>
              </thead>
              <tbody>
                {filteredRecipients.map((r) => (
                  <tr key={r.id}>
                    <td>{r.channel === 'SMS' ? <MessageSquare size={14} /> : <Mail size={14} />}</td>
                    <td>{r.address}</td>
                    <td>
                      {RECIPIENT_STATUS_LABELS[r.status]}
                      {r.errorMessage && <MutedText> — {r.errorMessage}</MutedText>}
                    </td>
                    <td><MutedText>{fmt(r.sentAt) ?? '—'}</MutedText></td>
                    <td style={{ width: 36, padding: '6px 8px' }}>
                      {isRetryable(r.status) && (
                        <RetryRowBtn
                          title="Ponów wysyłkę"
                          aria-label="Ponów wysyłkę"
                          disabled={retryRecipient.isPending}
                          onClick={() => retryRecipient.mutate(r.id)}
                        >
                          <RefreshCw />
                        </RetryRowBtn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecipientsTable>
          </>
        ) : isProjection && estimate ? (
          <>
            <RecipientsTable>
              <thead>
                <tr><th>Odbiorca</th><th>{projectionChannel === 'SMS' ? 'Telefon' : 'E-mail'}</th><th>Status</th></tr>
              </thead>
              <tbody>
                {estimate.sample.map((s) => (
                  <tr key={s.customerId}>
                    <td>{[s.firstName, s.lastName].filter(Boolean).join(' ') || 'Klient'}</td>
                    <td>{(projectionChannel === 'SMS' ? s.phone : s.email) ?? '—'}</td>
                    <td>
                      <MutedText>
                        {s.eligibility === 'ELIGIBLE' ? 'Otrzyma' :
                         s.eligibility === 'NO_CONSENT' ? 'Brak zgody' :
                         s.eligibility === 'NO_ADDRESS' ? 'Brak numeru' :
                         s.eligibility === 'OPTED_OUT' ? 'Zrezygnował' :
                         s.eligibility === 'FREQUENCY_CAP' ? 'Limit wysyłek' : s.eligibility}
                      </MutedText>
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecipientsTable>
            <MutedText style={{ marginTop: 10 }}>
              Podgląd na podstawie aktualnych danych. Ostateczna lista zostanie wyliczona w dniu wysyłki.
            </MutedText>
          </>
        ) : (
          <MutedText>Lista odbiorców powstanie w momencie wysyłki.</MutedText>
        )}
      </SectionCard>

      <SectionCard>
        <Eyebrow>Przebieg</Eyebrow>
        <Timeline>
          <li><strong>Utworzono</strong> {fmt(c.createdAt)}</li>
          {c.status === 'SCHEDULED' && c.scheduledAt && <li><strong>Zaplanowano na</strong> {fmt(c.scheduledAt)}</li>}
          {c.startedAt && <li><strong>Rozpoczęto wysyłkę</strong> {fmt(c.startedAt)}</li>}
          {c.completedAt && <li><strong>Zakończono</strong> {fmt(c.completedAt)}</li>}
        </Timeline>
      </SectionCard>

      {confirmAction && (
        <ConfirmationModal
          isOpen
          title={
            confirmAction === 'stop' ? 'Zatrzymać wysyłkę?' :
            confirmAction === 'cancel' ? 'Anulować kampanię?' : 'Usunąć szkic?'
          }
          message={
            confirmAction === 'stop'
              ? 'Wiadomości, które jeszcze nie wyszły, nie zostaną wysłane. Wysłanych nie da się cofnąć.'
              : confirmAction === 'cancel'
                ? 'Kampania nie zostanie wysłana. Możesz ją później zduplikować.'
                : 'Szkic zostanie trwale usunięty.'
          }
          variant="danger"
          confirmText={confirmAction === 'stop' ? 'Zatrzymaj' : confirmAction === 'cancel' ? 'Anuluj kampanię' : 'Usuń'}
          cancelText="Wróć"
          onConfirm={async () => {
            if (confirmAction === 'stop') await stop.mutateAsync(c.id);
            if (confirmAction === 'cancel') await cancel.mutateAsync(c.id);
            if (confirmAction === 'delete') {
              await remove.mutateAsync(c.id);
              navigate('/campaigns');
              return;
            }
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </Page>
  );
}
