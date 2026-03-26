import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { CampaignList } from '../components/CampaignList';
import { CreateCampaignModal } from '../components/CreateCampaignModal';
import { AutomationSettings } from '../components/AutomationSettings';
import { AiCampaignCreator } from '../components/AiCampaignCreator';
import { useCampaigns, useDeleteCampaign, useSendCampaign } from '../hooks';
import type { SmsCampaign } from '../types';

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: ${(p) => p.theme.spacing.lg};
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    padding: ${(p) => p.theme.spacing.xl};
  }

  @media (min-width: ${(p) => p.theme.breakpoints.xl}) {
    padding: ${(p) => p.theme.spacing.xxl};
  }
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: ${st.text};
  margin: 0;
  letter-spacing: -0.5px;
`;

const PageSubtitle = styled.p`
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: ${st.fontSm};
  font-weight: 600;
  background: ${st.accentBlue};
  color: white;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};

  &:hover {
    background: #2563EB;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }
`;

// ─── Stat cards ───────────────────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div<{ $accent: string; $bg: string }>`
  background: ${(p) => p.$bg};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: ${st.shadowXs};
  transition: box-shadow ${st.transition}, transform ${st.transition};

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${(p) => p.$accent};
    border-radius: 0 2px 2px 0;
  }

  &:hover {
    box-shadow: ${st.shadowMd};
    transform: translateY(-1px);
  }
`;

const StatLabel = styled.span`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const StatValue = styled.span<{ $color: string }>`
  font-size: 28px;
  font-weight: 800;
  color: ${(p) => p.$color};
  font-feature-settings: 'tnum';
  line-height: 1;
  letter-spacing: -0.5px;
`;

const StatSub = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  margin-top: 2px;
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabsRow = styled.div`
  display: flex;
  gap: 0;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 4px;
  overflow-x: auto;
  box-shadow: ${st.shadowXs};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 20px;
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  background: ${(p) => (p.$active ? st.accentBlueDim : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}33` : 'transparent')};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${st.transition};
  display: flex;
  align-items: center;
  gap: 7px;

  &:hover {
    color: ${(p) => (p.$active ? st.accentBlue : st.text)};
    background: ${(p) => (p.$active ? st.accentBlueDim : st.bg)};
  }
`;

const TabBadge = styled.span<{ $active: boolean }>`
  padding: 1px 7px;
  background: ${(p) => (p.$active ? `${st.accentBlue}22` : st.bgCardAlt)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textMuted)};
  border-radius: ${st.radiusFull};
  font-size: 11px;
  font-weight: 700;
`;

// ─── Confirm dialog (simple) ──────────────────────────────────────────────────

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${st.bgOverlay};
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ConfirmBox = styled.div`
  background: ${st.bgCard};
  border-radius: ${st.radius};
  padding: 28px 32px;
  max-width: 400px;
  width: 100%;
  box-shadow: ${st.shadowLg};
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ConfirmTitle = styled.h3`
  margin: 0;
  font-size: ${st.fontMd};
  font-weight: 700;
  color: ${st.text};
`;

const ConfirmText = styled.p`
  margin: 0;
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
  line-height: 1.6;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const CancelBtn = styled.button`
  padding: 8px 20px;
  font-size: ${st.fontSm};
  font-weight: 500;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: ${st.bg}; color: ${st.text}; }
`;

const DangerBtn = styled.button`
  padding: 8px 20px;
  font-size: ${st.fontSm};
  font-weight: 700;
  background: ${st.accentRed};
  color: #fff;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: #dc2626; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SendConfirmBtn = styled(DangerBtn)`
  background: ${st.accentBlue};
  &:hover { background: #2563EB; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'campaigns' | 'ai-creator' | 'automation';

interface ConfirmState {
  type: 'send' | 'delete';
  campaign: SmsCampaign;
}

export const SmsCampaignsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [sendingId, setSendingId] = useState<string | undefined>();

  const { campaigns, isLoading, isError, refetch } = useCampaigns();
  const deleteMutation = useDeleteCampaign();
  const sendMutation = useSendCampaign();

  const handleSend = useCallback((c: SmsCampaign) => {
    setConfirm({ type: 'send', campaign: c });
  }, []);

  const handleDelete = useCallback((c: SmsCampaign) => {
    setConfirm({ type: 'delete', campaign: c });
  }, []);

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === 'send') {
      setSendingId(confirm.campaign.id);
      try {
        await sendMutation.mutateAsync(confirm.campaign.id);
      } finally {
        setSendingId(undefined);
      }
    } else {
      await deleteMutation.mutateAsync(confirm.campaign.id);
    }
    setConfirm(null);
  };

  // ── Stats ──
  const sentCount = campaigns.filter((c) => c.status === 'SENT').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'SCHEDULED').length;
  const draftCount = campaigns.filter((c) => c.status === 'DRAFT').length;
  const totalSent = campaigns.reduce((s, c) => s + (c.sentCount ?? 0), 0);

  return (
    <PageContainer>
      {/* ── Header ── */}
      <PageHeader>
        <TitleSection>
          <PageTitle>Kampanie SMS</PageTitle>
          <PageSubtitle>Zarządzaj kampaniami i automatyzacją powiadomień</PageSubtitle>
        </TitleSection>
        <HeaderActions>
          {activeTab === 'campaigns' && (
            <AddButton onClick={() => setIsCreateOpen(true)}>
              <PlusIcon />
              Nowa kampania
            </AddButton>
          )}
        </HeaderActions>
      </PageHeader>

      {/* ── Stats cards ── */}
      <StatsGrid>
        <StatCard $accent={st.accentBlue} $bg={st.gradientCardBlue}>
          <StatLabel>Wszystkich kampanii</StatLabel>
          <StatValue $color={st.accentBlue}>{campaigns.length}</StatValue>
          <StatSub>łącznie w systemie</StatSub>
        </StatCard>

        <StatCard $accent={st.accentGreen} $bg="linear-gradient(160deg, #FFFFFF 0%, rgba(16,185,129,0.04) 100%)">
          <StatLabel>Wysłanych</StatLabel>
          <StatValue $color={st.accentGreen}>{sentCount}</StatValue>
          <StatSub>{totalSent > 0 ? `${totalSent} SMS wysłanych` : 'brak wysłanych'}</StatSub>
        </StatCard>

        <StatCard $accent={st.accentAmber} $bg={st.accentAmberDim}>
          <StatLabel>Zaplanowanych</StatLabel>
          <StatValue $color={st.accentAmber}>{scheduledCount}</StatValue>
          <StatSub>oczekuje na wysyłkę</StatSub>
        </StatCard>

        <StatCard $accent={st.textMuted} $bg={st.bgCardAlt}>
          <StatLabel>Szkiców</StatLabel>
          <StatValue $color={st.textSecondary}>{draftCount}</StatValue>
          <StatSub>do wysyłki lub usunięcia</StatSub>
        </StatCard>
      </StatsGrid>

      {/* ── Tabs ── */}
      <TabsRow>
        <Tab $active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')}>
          Kampanie
          <TabBadge $active={activeTab === 'campaigns'}>{campaigns.length}</TabBadge>
        </Tab>
        <Tab $active={activeTab === 'ai-creator'} onClick={() => setActiveTab('ai-creator')}>
          ✨ Kreator AI
        </Tab>
        <Tab $active={activeTab === 'automation'} onClick={() => setActiveTab('automation')}>
          Automatyzacja
        </Tab>
      </TabsRow>

      {/* ── Tab content ── */}
      {activeTab === 'campaigns' && (
        <>
          {isError ? (
            <div style={{
              padding: 32,
              textAlign: 'center',
              background: st.accentRedDim,
              border: `1px solid ${st.accentRed}33`,
              borderRadius: st.radius,
              color: st.accentRed,
              fontSize: st.fontSm,
              fontWeight: 500,
            }}>
              Nie udało się załadować kampanii.{' '}
              <button
                onClick={() => refetch()}
                style={{ cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', font: 'inherit' }}
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : (
            <CampaignList
              campaigns={campaigns}
              isLoading={isLoading}
              onSend={handleSend}
              onDelete={handleDelete}
              sendingId={sendingId}
            />
          )}
        </>
      )}

      {activeTab === 'ai-creator' && <AiCampaignCreator />}

      {activeTab === 'automation' && <AutomationSettings />}

      {/* ── Create campaign drawer ── */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* ── Confirmation dialog ── */}
      {confirm && (
        <ConfirmOverlay onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <ConfirmBox>
            {confirm.type === 'send' ? (
              <>
                <ConfirmTitle>Wyślij kampanię</ConfirmTitle>
                <ConfirmText>
                  Czy na pewno chcesz teraz wysłać kampanię{' '}
                  <strong>„{confirm.campaign.name}"</strong>?{' '}
                  SMS zostanie wysłany do <strong>{confirm.campaign.audienceCount}</strong> odbiorców.
                  Tej akcji nie można cofnąć.
                </ConfirmText>
                <ConfirmActions>
                  <CancelBtn onClick={() => setConfirm(null)}>Anuluj</CancelBtn>
                  <SendConfirmBtn onClick={handleConfirm} disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? 'Wysyłanie…' : '▶ Wyślij'}
                  </SendConfirmBtn>
                </ConfirmActions>
              </>
            ) : (
              <>
                <ConfirmTitle>Usuń kampanię</ConfirmTitle>
                <ConfirmText>
                  Czy na pewno chcesz usunąć kampanię{' '}
                  <strong>„{confirm.campaign.name}"</strong>?{' '}
                  Tej akcji nie można cofnąć.
                </ConfirmText>
                <ConfirmActions>
                  <CancelBtn onClick={() => setConfirm(null)}>Anuluj</CancelBtn>
                  <DangerBtn onClick={handleConfirm} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Usuwanie…' : 'Usuń'}
                  </DangerBtn>
                </ConfirmActions>
              </>
            )}
          </ConfirmBox>
        </ConfirmOverlay>
      )}
    </PageContainer>
  );
};
