import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { CalendarClock, Coins, MailCheck, Play, Plus, Send, Trash2 } from 'lucide-react';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';
import { StatTile } from '@/common/components/StatTile';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
  useActivateCampaign,
  useCampaignStats,
  useCampaignsList,
  useDeleteCampaign,
  useScheduleCampaign,
} from '../hooks/useCampaigns';
import { CHANNEL_LABELS, TILE_STYLES } from '../constants';
import { CampaignKindBadge, CampaignStatusBadge, MutedText, Page, TileGrid } from '../components/shared';
import type { Campaign, CampaignStatus } from '../types';

// ─── Filtr segmentowy ─────────────────────────────────────────────────────────

type ListFilter = 'ALL' | 'RUNNING' | 'SCHEDULED' | 'DONE' | 'DRAFT';

const FILTERS: { id: ListFilter; label: string; statuses: CampaignStatus[] | null }[] = [
  { id: 'ALL', label: 'Wszystkie', statuses: null },
  { id: 'RUNNING', label: 'Aktywne', statuses: ['ACTIVE', 'SENDING'] },
  { id: 'SCHEDULED', label: 'Zaplanowane', statuses: ['SCHEDULED'] },
  { id: 'DONE', label: 'Zakończone', statuses: ['COMPLETED', 'CANCELLED', 'FAILED', 'ARCHIVED'] },
  { id: 'DRAFT', label: 'Szkice', statuses: ['DRAFT', 'PAUSED'] },
];

const FilterRow = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-radius: 9999px;
  margin-bottom: 16px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.colors.text : p.theme.colors.textMuted)};
  box-shadow: ${(p) => (p.$active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none')};
`;

// ─── Tabela ───────────────────────────────────────────────────────────────────

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  overflow: hidden;

  th {
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${(p) => p.theme.colors.textMuted};
    padding: 12px 16px;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
    background: ${(p) => p.theme.colors.surfaceAlt};
  }

  td {
    padding: 13px 16px;
    font-size: 14px;
    color: ${(p) => p.theme.colors.text};
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
    font-variant-numeric: tabular-nums;
  }

  tbody tr {
    cursor: pointer;
    transition: background 150ms ease;
    &:hover { background: ${(p) => p.theme.colors.surfaceAlt}; }
    &:last-child td { border-bottom: none; }
  }
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
`;

const ActionsCell = styled.td`
  text-align: right;
  white-space: nowrap;
`;

const RowActions = styled.div`
  display: inline-flex;
  gap: 4px;
  justify-content: flex-end;
`;

const IconBtn = styled.button<{ $variant?: 'send' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: #ffffff;
  color: ${(p) => {
    if (p.$variant === 'send') return '#0ea5e9';
    if (p.$variant === 'danger') return '#dc2626';
    return p.theme.colors.textSecondary;
  }};
  cursor: pointer;
  transition: all 150ms ease;
  padding: 0;

  &:hover {
    background: ${(p) => {
      if (p.$variant === 'send') return '#e0f2fe';
      if (p.$variant === 'danger') return '#fee2e2';
      return p.theme.colors.surfaceAlt;
    }};
    border-color: ${(p) => {
      if (p.$variant === 'send') return '#7dd3fc';
      if (p.$variant === 'danger') return '#fca5a5';
      return p.theme.colors.border;
    }};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg { width: 15px; height: 15px; stroke-width: 1.75; }
`;

// ─── Stan pusty ───────────────────────────────────────────────────────────────

const EmptyHero = styled.div`
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
  border-radius: 14px;
  padding: 40px;
  overflow: hidden;
  color: #f1f5f9;

  &::before {
    content: '';
    position: absolute;
    top: -80px;
    right: -60px;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, transparent 65%);
    pointer-events: none;
  }

  h2 { margin: 0 0 8px; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
  p  { margin: 0 0 20px; font-size: 14px; color: #94a3b8; max-width: 480px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function scheduleLabel(c: Campaign): string {
  if (c.status === 'SCHEDULED') return c.scheduledAt ? formatDate(c.scheduledAt) : 'natychmiast';
  if (c.status === 'ACTIVE') return 'codziennie sprawdzana';
  if (c.status === 'COMPLETED') return formatDate(c.completedAt);
  return formatDate(c.createdAt);
}

function recipientsLabel(c: Campaign): string {
  if (c.status === 'SENDING') return `${c.recipientsSent} / ${c.recipientsTotal}`;
  if (c.recipientsTotal > 0) return `${c.recipientsSent} / ${c.recipientsTotal}`;
  return '—';
}

// „Wyślij teraz" ma sens tylko dla jednorazówek w statusie DRAFT/SCHEDULED.
// Dla automatów odpowiednikiem jest „Aktywuj" (DRAFT/PAUSED).
function canSendNow(c: Campaign): boolean {
  if (c.kind === 'ONE_TIME') return c.status === 'DRAFT' || c.status === 'SCHEDULED';
  return c.status === 'DRAFT' || c.status === 'PAUSED';
}

function sendNowLabel(c: Campaign): string {
  if (c.kind === 'AUTOMATIC') return 'Aktywuj kampanię';
  return c.status === 'SCHEDULED' ? 'Wyślij teraz (nadpisz termin)' : 'Wyślij teraz';
}

function canDelete(c: Campaign): boolean {
  return c.status === 'DRAFT';
}

// ─── Widok ────────────────────────────────────────────────────────────────────

type PendingAction = { type: 'send' | 'delete'; campaign: Campaign };

export function CampaignsListView() {
  const navigate = useNavigate();
  const { campaigns, isLoading } = useCampaignsList();
  const { stats } = useCampaignStats();
  const [filter, setFilter] = useState<ListFilter>('ALL');
  const [pending, setPending] = useState<PendingAction | null>(null);

  const scheduleCampaign = useScheduleCampaign();
  const activateCampaign = useActivateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const filtered = useMemo(() => {
    const def = FILTERS.find((f) => f.id === filter);
    if (!def?.statuses) return campaigns;
    return campaigns.filter((c) => def.statuses!.includes(c.status));
  }, [campaigns, filter]);

  const creditsLow = (stats?.smsCreditsAvailable ?? 0) < 200;

  const confirmPending = async () => {
    if (!pending) return;
    const c = pending.campaign;
    if (pending.type === 'send') {
      if (c.kind === 'AUTOMATIC') await activateCampaign.mutateAsync(c.id);
      else await scheduleCampaign.mutateAsync({ id: c.id, scheduledAt: null });
    } else {
      await deleteCampaign.mutateAsync(c.id);
    }
    setPending(null);
  };

  return (
    <Page>
      <PageHeader
        title="Kampanie"
        subtitle="Wysyłki SMS i e-mail do Twoich klientów"
        actions={
          <PageHeaderPrimaryButton onClick={() => navigate('/campaigns/new')}>
            <Plus /> Nowa kampania
          </PageHeaderPrimaryButton>
        }
      />

      <TileGrid>
        <StatTile
          {...TILE_STYLES.active}
          icon={Play}
          value={stats?.active ?? '—'}
          label="Aktywne"
          tooltip="Kampanie automatyczne, które działają, oraz jednorazowe w trakcie wysyłki."
        />
        <StatTile
          {...TILE_STYLES.scheduled}
          icon={CalendarClock}
          value={stats?.scheduled ?? '—'}
          label="Zaplanowane"
        />
        <StatTile
          {...TILE_STYLES.sent}
          icon={MailCheck}
          value={stats?.completedTotal ?? '—'}
          label="Wysłane"
          subContent={
            stats ? <MutedText>{stats.messagesSentLast30Days} wiadomości w 30 dni</MutedText> : undefined
          }
        />
        <StatTile
          {...(creditsLow ? TILE_STYLES.creditsLow : TILE_STYLES.credits)}
          icon={Coins}
          value={stats?.smsCreditsAvailable ?? '—'}
          label="Kredyty SMS"
          onClick={() => navigate('/settings?tab=sms-credits')}
          subContent={creditsLow ? <MutedText>Doładuj przed wysyłką</MutedText> : undefined}
        />
      </TileGrid>

      {!isLoading && campaigns.length === 0 ? (
        <EmptyHero>
          <h2>Wyślij pierwszą kampanię</h2>
          <p>
            Przypomnij klientom o sobie — świątecznie, po wykonanej usłudze albo wtedy,
            gdy dawno ich nie było.
          </p>
          <PageHeaderPrimaryButton onClick={() => navigate('/campaigns/new')}>
            <Plus /> Utwórz kampanię
          </PageHeaderPrimaryButton>
        </EmptyHero>
      ) : (
        <>
          <FilterRow>
            {FILTERS.map((f) => (
              <FilterChip key={f.id} $active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </FilterChip>
            ))}
          </FilterRow>

          <Table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Status</th>
                <th>Kanał</th>
                <th>Odbiorcy</th>
                <th>Koszt</th>
                <th>Termin</th>
                <th style={{ textAlign: 'right' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const sendAvailable = canSendNow(c);
                const deleteAvailable = canDelete(c);
                return (
                  <tr key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <td>
                      <NameCell>
                        {c.name}
                        <CampaignKindBadge kind={c.kind} />
                      </NameCell>
                    </td>
                    <td><CampaignStatusBadge status={c.status} /></td>
                    <td>{CHANNEL_LABELS[c.channel]}</td>
                    <td>{recipientsLabel(c)}</td>
                    <td>{c.creditsSpent > 0 ? `${c.creditsSpent} kredytów` : '—'}</td>
                    <td><MutedText>{scheduleLabel(c)}</MutedText></td>
                    <ActionsCell onClick={(e) => e.stopPropagation()}>
                      <RowActions>
                        {sendAvailable && (
                          <IconBtn
                            $variant="send"
                            title={sendNowLabel(c)}
                            aria-label={sendNowLabel(c)}
                            onClick={() => setPending({ type: 'send', campaign: c })}
                          >
                            {c.kind === 'AUTOMATIC' ? <Play /> : <Send />}
                          </IconBtn>
                        )}
                        {deleteAvailable && (
                          <IconBtn
                            $variant="danger"
                            title="Usuń kampanię"
                            aria-label="Usuń kampanię"
                            onClick={() => setPending({ type: 'delete', campaign: c })}
                          >
                            <Trash2 />
                          </IconBtn>
                        )}
                        {!sendAvailable && !deleteAvailable && <MutedText>—</MutedText>}
                      </RowActions>
                    </ActionsCell>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <MutedText>Brak kampanii w tym widoku.</MutedText>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </>
      )}

      {pending && (
        <ConfirmationModal
          isOpen
          variant={pending.type === 'delete' ? 'danger' : 'warning'}
          title={
            pending.type === 'delete'
              ? 'Usunąć szkic?'
              : pending.campaign.kind === 'AUTOMATIC'
                ? 'Aktywować kampanię?'
                : pending.campaign.status === 'SCHEDULED'
                  ? 'Wysłać teraz — z pominięciem terminu?'
                  : 'Wysłać kampanię teraz?'
          }
          message={
            pending.type === 'delete'
              ? `Szkic „${pending.campaign.name}" zostanie trwale usunięty.`
              : pending.campaign.kind === 'AUTOMATIC'
                ? `Kampania „${pending.campaign.name}" zacznie działać automatycznie i wysyłać wiadomości, gdy klienci spełnią warunek.`
                : `Wyślemy „${pending.campaign.name}" natychmiast. Listę odbiorców wyliczymy teraz — ta operacja pobierze kredyty.`
          }
          confirmText={
            pending.type === 'delete'
              ? 'Usuń'
              : pending.campaign.kind === 'AUTOMATIC'
                ? 'Aktywuj'
                : 'Wyślij teraz'
          }
          cancelText="Wróć"
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </Page>
  );
}
