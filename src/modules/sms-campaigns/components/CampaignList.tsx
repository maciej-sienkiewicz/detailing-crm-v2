import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Send, Trash2, Clock, Users, CheckCircle, FileText } from 'lucide-react';
import type { SmsCampaign, CampaignStatus } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<CampaignStatus, { label: string; dot: string; text: string }> = {
  DRAFT:     { label: 'Szkic',       dot: '#94A3B8', text: '#64748B' },
  SCHEDULED: { label: 'Zaplanowana', dot: '#D97706', text: '#B45309' },
  SENT:      { label: 'Wysłana',     dot: '#16A34A', text: '#15803D' },
};

// ─── Table wrapper ─────────────────────────────────────────────────────────────

const TableWrap = styled.div`
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
  animation: ${fadeIn} 200ms ease both;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
`;

const Th = styled.th`
  padding: 11px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
`;

const ThRight = styled(Th)`
  text-align: right;
`;

const Tr = styled.tr`
  border-bottom: 1px solid #F1F5F9;
  transition: background 150ms ease;

  &:last-child { border-bottom: none; }
  &:hover { background: #F8FAFC; }
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 13px;
  color: #0F172A;
  vertical-align: middle;
`;

const TdRight = styled(Td)`
  text-align: right;
`;

// ─── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge = styled.span<{ $status: CampaignStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => STATUS[p.$status].text};
  background: ${p => STATUS[p.$status].dot}18;
  white-space: nowrap;
`;

const Dot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

// ─── Campaign name cell ────────────────────────────────────────────────────────

const NameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const CampaignName = styled.span`
  font-weight: 600;
  color: #0F172A;
  font-size: 13px;
`;

const MessagePreview = styled.span`
  font-size: 11px;
  color: #94A3B8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
  display: block;
`;

// ─── Meta ──────────────────────────────────────────────────────────────────────

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  white-space: nowrap;
`;

const DateText = styled.span`
  font-size: 12px;
  color: #94A3B8;
`;

// ─── Action buttons ────────────────────────────────────────────────────────────

const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
`;

const btnBase = css`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
  border: 1px solid transparent;
`;

const SendBtn = styled.button`
  ${btnBase}
  background: #EFF6FF;
  color: #2563EB;
  border-color: #BFDBFE;

  &:hover:not(:disabled) {
    background: #DBEAFE;
    border-color: #93C5FD;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteBtn = styled.button`
  ${btnBase}
  background: transparent;
  color: #94A3B8;
  border-color: #E2E8F0;

  &:hover {
    background: #FEF2F2;
    color: #DC2626;
    border-color: #FECACA;
  }
`;

// ─── Empty state ───────────────────────────────────────────────────────────────

const EmptyWrap = styled.div`
  padding: 56px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  margin-bottom: 4px;
`;

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`;

const EmptySubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: #94A3B8;
`;

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonCell = styled.div<{ $w?: string }>`
  height: 13px;
  width: ${p => p.$w ?? '100%'};
  border-radius: 4px;
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 600px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  campaigns: SmsCampaign[];
  isLoading: boolean;
  onSend: (campaign: SmsCampaign) => void;
  onDelete: (campaign: SmsCampaign) => void;
  sendingId?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const CampaignList: React.FC<Props> = ({
  campaigns,
  isLoading,
  onSend,
  onDelete,
  sendingId,
}) => {
  if (isLoading) {
    return (
      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <Th>Kampania</Th>
              <Th>Status</Th>
              <Th>Odbiorcy</Th>
              <Th>Data</Th>
              <ThRight>Akcje</ThRight>
            </tr>
          </Thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => (
              <Tr key={i}>
                <Td><SkeletonCell $w="55%" /></Td>
                <Td><SkeletonCell $w="80px" /></Td>
                <Td><SkeletonCell $w="60px" /></Td>
                <Td><SkeletonCell $w="70px" /></Td>
                <TdRight><SkeletonCell $w="80px" /></TdRight>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    );
  }

  if (campaigns.length === 0) {
    return (
      <TableWrap>
        <EmptyWrap>
          <EmptyIcon><FileText size={22} /></EmptyIcon>
          <EmptyTitle>Brak kampanii</EmptyTitle>
          <EmptySubtitle>Utwórz pierwszą kampanię klikając „Nowa kampania"</EmptySubtitle>
        </EmptyWrap>
      </TableWrap>
    );
  }

  return (
    <TableWrap>
      <Table>
        <Thead>
          <tr>
            <Th style={{ paddingLeft: 20 }}>Kampania</Th>
            <Th>Status</Th>
            <Th>Odbiorcy</Th>
            <Th>Data</Th>
            <ThRight style={{ paddingRight: 20 }}>Akcje</ThRight>
          </tr>
        </Thead>
        <tbody>
          {campaigns.map((c) => {
            const cfg = STATUS[c.status];
            const isSending = sendingId === c.id;

            const dateLabel =
              c.status === 'SENT' && c.sentAt
                ? `Wysłano ${fmtDate(c.sentAt)}`
                : c.status === 'SCHEDULED' && c.scheduledAt
                ? `Zaplanowano ${fmtDate(c.scheduledAt)}`
                : fmtDate(c.createdAt);

            return (
              <Tr key={c.id}>
                <Td style={{ paddingLeft: 20, maxWidth: 340 }}>
                  <NameCell>
                    <CampaignName>{c.name}</CampaignName>
                    {c.message && (
                      <MessagePreview>{c.message}</MessagePreview>
                    )}
                  </NameCell>
                </Td>

                <Td>
                  <StatusBadge $status={c.status}>
                    <Dot $color={cfg.dot} />
                    {cfg.label}
                  </StatusBadge>
                </Td>

                <Td>
                  <MetaChip>
                    <Users size={13} strokeWidth={2} />
                    {c.audienceCount}
                  </MetaChip>
                </Td>

                <Td>
                  <DateText>{dateLabel ?? '—'}</DateText>
                </Td>

                <TdRight style={{ paddingRight: 20 }}>
                  <Actions>
                    {c.status !== 'SENT' && (
                      <SendBtn
                        onClick={() => onSend(c)}
                        disabled={isSending}
                      >
                        <Send size={12} strokeWidth={2.5} />
                        {isSending ? 'Wysyłanie…' : 'Wyślij'}
                      </SendBtn>
                    )}
                    {c.status === 'SENT' && (
                      <MetaChip style={{ marginRight: 6 }}>
                        <CheckCircle size={13} strokeWidth={2} color="#16A34A" />
                        {c.sentCount ?? c.audienceCount} wysłanych
                      </MetaChip>
                    )}
                    <DeleteBtn onClick={() => onDelete(c)}>
                      <Trash2 size={12} strokeWidth={2} />
                      Usuń
                    </DeleteBtn>
                  </Actions>
                </TdRight>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
};
