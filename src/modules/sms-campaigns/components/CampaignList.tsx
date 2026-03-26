import React, { useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Send, Trash2, Users, CheckCircle, FileText, MessageSquare, X, Phone, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

import type { SmsCampaign, CampaignStatus, CampaignRecipient } from '../types';
import { fetchCampaignRecipients } from '../api/smsCampaignsApi';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<CampaignStatus, { label: string; dot: string; text: string }> = {
  DRAFT:     { label: 'Szkic',       dot: '#94A3B8', text: '#64748B' },
  SCHEDULED: { label: 'Zaplanowana', dot: '#D97706', text: '#B45309' },
  SENT:      { label: 'Wysłana',     dot: '#16A34A', text: '#15803D' },
};

// ─── Table ─────────────────────────────────────────────────────────────────────

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

// ─── Name cell ─────────────────────────────────────────────────────────────────

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
  cursor: pointer;
  transition: color 120ms;
  &:hover { color: #3B82F6; text-decoration: underline; }
`;

// ─── Meta ──────────────────────────────────────────────────────────────────────

const MetaChip = styled.span<{ $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  white-space: nowrap;
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};
  border-radius: 6px;
  padding: ${p => p.$clickable ? '2px 6px' : '0'};
  margin: ${p => p.$clickable ? '-2px -6px' : '0'};
  transition: ${p => p.$clickable ? 'background 120ms, color 120ms' : 'none'};
  &:hover { background: ${p => p.$clickable ? '#EFF6FF' : 'transparent'}; color: ${p => p.$clickable ? '#2563EB' : '#475569'}; }
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
  gap: 4px;
`;

const btnBase = css`
  display: inline-flex;
  align-items: center;
  gap: 5px;
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
  padding: 6px 12px;
  background: #EFF6FF;
  color: #2563EB;
  border-color: #BFDBFE;
  &:hover:not(:disabled) { background: #DBEAFE; border-color: #93C5FD; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteBtn = styled.button`
  ${btnBase}
  padding: 6px 12px;
  background: transparent;
  color: #94A3B8;
  border-color: #E2E8F0;
  &:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
`;


// ─── Empty ─────────────────────────────────────────────────────────────────────

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

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonCell = styled.div<{ $w?: string }>`
  height: 13px;
  width: ${p => p.$w ?? '100%'};
  border-radius: 4px;
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 600px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

// ─── Modal shared ──────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Modal = styled.div<{ $wide?: boolean }>`
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: ${p => p.$wide ? '640px' : '480px'};
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08);
  animation: ${slideUp} 200ms ease both;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #F1F5F9;
  flex-shrink: 0;
`;

const ModalTitleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
`;

const ModalSubtitle = styled.p`
  margin: 0;
  font-size: 11px;
  color: #94A3B8;
`;

const CloseBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #E2E8F0;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  transition: all 150ms;
  flex-shrink: 0;
  &:hover { background: #F8FAFC; color: #475569; }
`;

const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

// ─── SMS preview modal content ─────────────────────────────────────────────────

const SmsPhone = styled.div`
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SmsPhoneBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #E2E8F0;
`;

const SmsPhoneIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #0F172A;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SmsPhoneLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const SmsPhoneName = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #0F172A;
`;

const SmsPhoneNum = styled.span`
  font-size: 10px;
  color: #94A3B8;
`;

const SmsBubble = styled.div`
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px 12px 12px 2px;
  padding: 12px 14px;
  font-size: 13px;
  color: #0F172A;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`;

const SmsCharCount = styled.div`
  font-size: 11px;
  color: #94A3B8;
  text-align: right;
`;

// ─── Recipients modal content ──────────────────────────────────────────────────

const RecipTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const RecipTh = styled.th`
  padding: 8px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #F1F5F9;
  background: #F8FAFC;
  white-space: nowrap;
`;

const RecipTr = styled.tr`
  border-bottom: 1px solid #F8FAFC;
  &:last-child { border-bottom: none; }
  &:hover { background: #FAFBFC; }
`;

const RecipTd = styled.td`
  padding: 10px 12px;
  font-size: 13px;
  color: #0F172A;
  vertical-align: middle;
`;

const RecipName = styled.span`
  font-weight: 600;
`;

const RecipPhone = styled.span`
  font-size: 12px;
  color: #64748B;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatusPill = styled.span<{ $status: CampaignRecipient['status'] }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${p =>
    p.$status === 'sent'    ? '#DCFCE7' :
    p.$status === 'failed'  ? '#FEE2E2' : '#F1F5F9'};
  color: ${p =>
    p.$status === 'sent'    ? '#15803D' :
    p.$status === 'failed'  ? '#DC2626' : '#64748B'};
`;

const LoadingRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
`;

const SkimRow = styled.div`
  height: 14px;
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

const RECIP_STATUS_LABEL: Record<CampaignRecipient['status'], string> = {
  sent: 'Wysłano',
  pending: 'Oczekuje',
  failed: 'Błąd',
};

const RECIP_STATUS_ICON: Record<CampaignRecipient['status'], React.ReactNode> = {
  sent:    <CheckCircle2 size={11} strokeWidth={2.5} />,
  pending: <Clock size={11} strokeWidth={2.5} />,
  failed:  <AlertCircle size={11} strokeWidth={2.5} />,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  campaigns: SmsCampaign[];
  isLoading: boolean;
  onSend: (campaign: SmsCampaign) => void;
  onDelete: (campaign: SmsCampaign) => void;
  sendingId?: string;
}

// ─── SMS Modal ─────────────────────────────────────────────────────────────────

const SmsModal: React.FC<{ campaign: SmsCampaign; onClose: () => void }> = ({ campaign, onClose }) => (
  <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
    <Modal>
      <ModalHeader>
        <ModalTitleRow>
          <ModalTitle>Treść SMS</ModalTitle>
          <ModalSubtitle>{campaign.name}</ModalSubtitle>
        </ModalTitleRow>
        <CloseBtn onClick={onClose}><X size={14} strokeWidth={2} /></CloseBtn>
      </ModalHeader>
      <ModalBody>
        <SmsPhone>
          <SmsPhoneBar>
            <SmsPhoneIcon>
              <MessageSquare size={15} color="#fff" strokeWidth={2} />
            </SmsPhoneIcon>
            <SmsPhoneLabel>
              <SmsPhoneName>AutoCRM Studio</SmsPhoneName>
              <SmsPhoneNum>Wiadomość SMS</SmsPhoneNum>
            </SmsPhoneLabel>
          </SmsPhoneBar>
          <SmsBubble>{campaign.message || '(brak treści)'}</SmsBubble>
          <SmsCharCount>{campaign.message?.length ?? 0} znaków</SmsCharCount>
        </SmsPhone>
      </ModalBody>
    </Modal>
  </Overlay>
);

// ─── Recipients Modal ──────────────────────────────────────────────────────────

const RecipientsModal: React.FC<{ campaign: SmsCampaign; onClose: () => void }> = ({ campaign, onClose }) => {
  const [recipients, setRecipients] = React.useState<CampaignRecipient[] | null>(null);

  React.useEffect(() => {
    fetchCampaignRecipients(campaign.id).then(setRecipients);
  }, [campaign.id]);

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <Modal $wide>
        <ModalHeader>
          <ModalTitleRow>
            <ModalTitle>
              {campaign.status === 'SENT' ? 'Odbiorcy — wysłano' : 'Lista odbiorców'}
            </ModalTitle>
            <ModalSubtitle>
              {campaign.name} · {campaign.audienceCount} {campaign.status === 'SENT' ? 'dostarczono' : 'planowanych'}
            </ModalSubtitle>
          </ModalTitleRow>
          <CloseBtn onClick={onClose}><X size={14} strokeWidth={2} /></CloseBtn>
        </ModalHeader>
        <ModalBody style={{ padding: 0 }}>
          {recipients === null ? (
            <LoadingRows style={{ padding: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkimRow key={i} style={{ width: `${85 - i * 8}%` }} />
              ))}
            </LoadingRows>
          ) : recipients.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              Brak odbiorców
            </div>
          ) : (
            <RecipTable>
              <thead>
                <tr>
                  <RecipTh style={{ paddingLeft: 20 }}>Klient</RecipTh>
                  <RecipTh>Telefon</RecipTh>
                  <RecipTh style={{ paddingRight: 20 }}>Status</RecipTh>
                </tr>
              </thead>
              <tbody>
                {recipients.map(r => (
                  <RecipTr key={r.id}>
                    <RecipTd style={{ paddingLeft: 20 }}>
                      <RecipName>{r.firstName} {r.lastName}</RecipName>
                    </RecipTd>
                    <RecipTd>
                      <RecipPhone>
                        <Phone size={11} strokeWidth={2} color="#94A3B8" />
                        {r.phone}
                      </RecipPhone>
                    </RecipTd>
                    <RecipTd style={{ paddingRight: 20 }}>
                      <StatusPill $status={r.status}>
                        {RECIP_STATUS_ICON[r.status]}
                        {RECIP_STATUS_LABEL[r.status]}
                      </StatusPill>
                    </RecipTd>
                  </RecipTr>
                ))}
              </tbody>
            </RecipTable>
          )}
        </ModalBody>
      </Modal>
    </Overlay>
  );
};

// ─── CampaignList ──────────────────────────────────────────────────────────────

export const CampaignList: React.FC<Props> = ({
  campaigns,
  isLoading,
  onSend,
  onDelete,
  sendingId,
}) => {
  const [smsModal, setSmsModal] = useState<SmsCampaign | null>(null);
  const [recipModal, setRecipModal] = useState<SmsCampaign | null>(null);

  const openSms = useCallback((c: SmsCampaign) => setSmsModal(c), []);
  const openRecip = useCallback((c: SmsCampaign) => setRecipModal(c), []);

  if (isLoading) {
    return (
      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <Th>Kampania</Th><Th>Status</Th><Th>Odbiorcy</Th><Th>Data</Th><ThRight>Akcje</ThRight>
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
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#475569' }}>Brak kampanii</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Utwórz pierwszą kampanię klikając „Nowa kampania"</p>
        </EmptyWrap>
      </TableWrap>
    );
  }

  return (
    <>
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
                c.status === 'SENT' && c.sentAt       ? `Wysłano ${fmtDate(c.sentAt)}` :
                c.status === 'SCHEDULED' && c.scheduledAt ? `Zaplanowano ${fmtDate(c.scheduledAt)}` :
                fmtDate(c.createdAt);

              return (
                <Tr key={c.id}>
                  <Td style={{ paddingLeft: 20, maxWidth: 340 }}>
                    <NameCell>
                      <CampaignName>{c.name}</CampaignName>
                      {c.message && (
                        <MessagePreview
                          onClick={() => openSms(c)}
                          title="Kliknij, aby zobaczyć pełną treść"
                        >
                          {c.message}
                        </MessagePreview>
                      )}
                    </NameCell>
                  </Td>

                  <Td>
                    <StatusBadge $status={c.status}>
                      <Dot $color={cfg.dot} />{cfg.label}
                    </StatusBadge>
                  </Td>

                  <Td>
                    <MetaChip $clickable onClick={() => openRecip(c)} title="Kliknij, aby zobaczyć listę odbiorców">
                      <Users size={13} strokeWidth={2} />
                      {c.audienceCount}
                    </MetaChip>
                  </Td>

                  <Td><DateText>{dateLabel ?? '—'}</DateText></Td>

                  <TdRight style={{ paddingRight: 20 }}>
                    <Actions>
                      {c.status !== 'SENT' && (
                        <SendBtn onClick={() => onSend(c)} disabled={isSending}>
                          <Send size={12} strokeWidth={2.5} />
                          {isSending ? 'Wysyłanie…' : 'Wyślij'}
                        </SendBtn>
                      )}
                      {c.status === 'SENT' && (
                        <MetaChip
                          $clickable
                          style={{ marginRight: 4 }}
                          onClick={() => openRecip(c)}
                          title="Kliknij, aby zobaczyć listę odbiorców"
                        >
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

      {smsModal   && <SmsModal        campaign={smsModal}   onClose={() => setSmsModal(null)} />}
      {recipModal && <RecipientsModal campaign={recipModal} onClose={() => setRecipModal(null)} />}
    </>
  );
};
