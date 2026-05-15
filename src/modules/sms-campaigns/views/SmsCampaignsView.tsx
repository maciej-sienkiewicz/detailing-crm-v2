import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Plus, X } from 'lucide-react';
import { CampaignList } from '../components/CampaignList';
import { AiCampaignCreator } from '../components/AiCampaignCreator';
import { useCampaigns, useDeleteCampaign, useSendCampaign } from '../hooks';
import type { SmsCampaign } from '../types';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Page layout ──────────────────────────────────────────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 32px 32px 48px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeUp} 250ms ease both;

  @media (max-width: 768px) {
    padding: 20px 16px 40px;
  }
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.3px;
`;

const PageSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: #94A3B8;
`;

const NewCampaignBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  background: #0F172A;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms, transform 150ms;
  white-space: nowrap;

  &:hover { background: #1E293B; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

// ─── Creator panel (inline, above the list) ───────────────────────────────────

const CreatorPanel = styled.div`
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
  animation: ${slideDown} 220ms ease both;
`;

const CreatorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #F1F5F9;
`;

const CreatorTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #0F172A;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  cursor: pointer;
  color: #94A3B8;
  transition: all 150ms;
  &:hover { background: #F8FAFC; color: #475569; }
`;

const CreatorBody = styled.div`
  padding: 20px;
`;

// ─── Confirm dialog ───────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.35);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Dialog = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 16px 48px rgba(15,23,42,0.14);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
`;

const DialogText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
`;

const CancelBtn = styled.button`
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: #64748B;
  border: 1px solid #E2E8F0;
  border-radius: 7px;
  cursor: pointer;
  transition: all 150ms;
  &:hover { background: #F8FAFC; }
`;

const ConfirmBtn = styled.button<{ $danger?: boolean }>`
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 700;
  background: ${p => p.$danger ? '#EF4444' : '#3B82F6'};
  color: #fff;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  transition: all 150ms;
  &:hover { background: ${p => p.$danger ? '#DC2626' : '#2563EB'}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Error bar ────────────────────────────────────────────────────────────────

const ErrorBar = styled.div`
  padding: 14px 18px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  font-size: 13px;
  color: #DC2626;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const RetryBtn = styled.button`
  font-size: 13px;
  font-weight: 600;
  background: none;
  border: none;
  color: #DC2626;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmState {
  type: 'send' | 'delete';
  campaign: SmsCampaign;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SmsCampaignsMock: React.FC = () => (
  <Page>
    <Header>
      <TitleBlock>
        <PageTitle>Kampanie SMS</PageTitle>
        <PageSubtitle>Zarządzaj wiadomościami do klientów</PageSubtitle>
      </TitleBlock>
    </Header>
    {([
      ['Kampania wiosenna 2024', '1 243 odbiorców', '98,2%'],
      ['Promocja — zmiana oleju',  '876 odbiorców',  '96,7%'],
      ['Przypomnienie — sezon',    '2 105 odbiorców', '99,1%'],
    ] as const).map(([name, audience, rate]) => (
      <div key={name} style={{ padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{audience}</div>
        </div>
        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{rate} dostarczonych</div>
      </div>
    ))}
  </Page>
);

const SmsCampaignsViewInner: React.FC = () => {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [sendingId, setSendingId] = useState<string | undefined>();

  const { campaigns, isLoading, isError, refetch } = useCampaigns();
  const deleteMutation = useDeleteCampaign();
  const sendMutation = useSendCampaign();

  const handleSend = useCallback((c: SmsCampaign) => setConfirm({ type: 'send', campaign: c }), []);
  const handleDelete = useCallback((c: SmsCampaign) => setConfirm({ type: 'delete', campaign: c }), []);

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === 'send') {
      setSendingId(confirm.campaign.id);
      try { await sendMutation.mutateAsync(confirm.campaign.id); }
      finally { setSendingId(undefined); }
    } else {
      await deleteMutation.mutateAsync(confirm.campaign.id);
    }
    setConfirm(null);
  };

  const handleCreatorSuccess = useCallback(() => {
    refetch();
    // Keep creator open to show success state; user can close manually
  }, [refetch]);

  return (
    <Page>
      {/* ── Header ── */}
      <Header>
        <TitleBlock>
          <PageTitle>Kampanie SMS</PageTitle>
          <PageSubtitle>Zarządzaj wiadomościami do klientów</PageSubtitle>
        </TitleBlock>
        <NewCampaignBtn onClick={() => { setIsCreatorOpen(true); }}>
          <Plus size={14} strokeWidth={2.5} />
          Nowa kampania
        </NewCampaignBtn>
      </Header>

      {/* ── Inline creator panel ── */}
      {isCreatorOpen && (
        <CreatorPanel>
          <CreatorHeader>
            <CreatorTitle>Nowa kampania</CreatorTitle>
            <CloseBtn onClick={() => setIsCreatorOpen(false)} aria-label="Zamknij">
              <X size={14} strokeWidth={2} />
            </CloseBtn>
          </CreatorHeader>
          <CreatorBody>
            <AiCampaignCreator
              onClose={() => setIsCreatorOpen(false)}
              onSuccess={handleCreatorSuccess}
            />
          </CreatorBody>
        </CreatorPanel>
      )}

      {/* ── Campaign list ── */}
      {isError ? (
        <ErrorBar>
          Nie udało się załadować kampanii.
          <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
        </ErrorBar>
      ) : (
        <CampaignList
          campaigns={campaigns}
          isLoading={isLoading}
          onSend={handleSend}
          onDelete={handleDelete}
          sendingId={sendingId}
        />
      )}

      {/* ── Confirm dialog ── */}
      {confirm && (
        <Overlay onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <Dialog>
            {confirm.type === 'send' ? (
              <>
                <DialogTitle>Wyślij kampanię</DialogTitle>
                <DialogText>
                  Czy na pewno chcesz wysłać kampanię <strong>„{confirm.campaign.name}"</strong>?{' '}
                  SMS zostanie wysłany do <strong>{confirm.campaign.audienceCount}</strong> odbiorców.
                  Tej akcji nie można cofnąć.
                </DialogText>
                <DialogActions>
                  <CancelBtn onClick={() => setConfirm(null)}>Anuluj</CancelBtn>
                  <ConfirmBtn onClick={handleConfirm} disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? 'Wysyłanie…' : 'Wyślij'}
                  </ConfirmBtn>
                </DialogActions>
              </>
            ) : (
              <>
                <DialogTitle>Usuń kampanię</DialogTitle>
                <DialogText>
                  Czy na pewno chcesz usunąć kampanię <strong>„{confirm.campaign.name}"</strong>?
                  Tej akcji nie można cofnąć.
                </DialogText>
                <DialogActions>
                  <CancelBtn onClick={() => setConfirm(null)}>Anuluj</CancelBtn>
                  <ConfirmBtn $danger onClick={handleConfirm} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Usuwanie…' : 'Usuń'}
                  </ConfirmBtn>
                </DialogActions>
              </>
            )}
          </Dialog>
        </Overlay>
      )}
    </Page>
  );
};

export const SmsCampaignsView: React.FC = () => {
  const smsFeature = useFeature('SMS_EMAIL');
  if (!smsFeature.enabled) {
    return (
      <LockedSection locked message="Twój abonament nie obsługuje kampanii SMS.">
        <SmsCampaignsMock />
      </LockedSection>
    );
  }
  return <SmsCampaignsViewInner />;
};
