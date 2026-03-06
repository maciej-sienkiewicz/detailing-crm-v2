import React from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { SmsCampaign, CampaignStatus } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusConfig: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Szkic', color: st.textSecondary, bg: st.bgCardAlt },
  SCHEDULED: { label: 'Zaplanowana', color: st.accentAmber, bg: st.accentAmberDim },
  SENT: { label: 'Wysłana', color: st.accentGreen, bg: st.accentGreenDim },
};

const StatusBadge = styled.span<{ $status: CampaignStatus }>`
  padding: 3px 10px;
  background: ${(p) => statusConfig[p.$status].bg};
  color: ${(p) => statusConfig[p.$status].color};
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

// ─── Cards ────────────────────────────────────────────────────────────────────

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Card = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 20px 24px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  box-shadow: ${st.shadowXs};
  transition: box-shadow ${st.transition}, transform ${st.transition};
  animation: ${fadeIn} 0.2s ease;

  &:hover {
    box-shadow: ${st.shadowMd};
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 14px;
  }
`;

const CardIconWrap = styled.div`
  width: 44px;
  height: 44px;
  background: ${st.accentBlueDim};
  border-radius: ${st.radiusSm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const CardContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${st.fontMd};
  font-weight: 700;
  color: ${st.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardMessage = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
`;

const MetaValue = styled.strong`
  color: ${st.text};
  font-weight: 600;
`;

const CardActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    width: 100%;
    justify-content: space-between;
  }
`;

const SendButton = styled.button`
  padding: 7px 16px;
  font-size: ${st.fontXs};
  font-weight: 700;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  box-shadow: ${st.shadowXs};
  white-space: nowrap;

  &:hover {
    background: #2563EB;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

const DeleteButton = styled.button`
  padding: 6px 12px;
  font-size: ${st.fontXs};
  font-weight: 500;
  background: transparent;
  color: ${st.textMuted};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  white-space: nowrap;

  &:hover {
    background: ${st.accentRedDim};
    color: ${st.accentRed};
    border-color: ${st.accentRed}44;
  }
`;

const FiltersChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const FilterChip = styled.span`
  padding: 2px 8px;
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  font-size: 10px;
  color: ${st.textSecondary};
  font-weight: 500;
`;

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyCard = styled.div`
  background: ${st.bgCard};
  border: 2px dashed ${st.border};
  border-radius: ${st.radius};
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 40px;
  opacity: 0.4;
`;

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: ${st.fontMd};
  font-weight: 700;
  color: ${st.textSecondary};
`;

const EmptySubtitle = styled.p`
  margin: 0;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonCard = styled(Card)`
  animation: none;
`;

const SkeletonBox = styled.div<{ $w?: string; $h?: string }>`
  width: ${(p) => p.$w ?? '100%'};
  height: ${(p) => p.$h ?? '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  campaigns: SmsCampaign[];
  isLoading: boolean;
  onSend: (campaign: SmsCampaign) => void;
  onDelete: (campaign: SmsCampaign) => void;
  sendingId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function buildFilterChips(c: SmsCampaign): string[] {
  const chips: string[] = [];
  c.filters.vehicles.forEach((v) =>
    chips.push(v.model ? `${v.brand} ${v.model}` : `${v.brand} (wszystkie)`)
  );
  c.filters.services.forEach((s) => chips.push(s.serviceName));
  if (c.filters.lastVisit?.olderThanDays) chips.push(`Nieaktywni >${c.filters.lastVisit.olderThanDays}d`);
  if (c.filters.lastVisit?.newerThanDays) chips.push(`Aktywni <${c.filters.lastVisit.newerThanDays}d`);
  return chips;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CampaignList: React.FC<Props> = ({
  campaigns,
  isLoading,
  onSend,
  onDelete,
  sendingId,
}) => {
  if (isLoading) {
    return (
      <List>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i}>
            <CardIconWrap>
              <SkeletonBox $w="24px" $h="24px" style={{ borderRadius: '4px' }} />
            </CardIconWrap>
            <CardContent>
              <SkeletonBox $w="40%" $h="16px" />
              <SkeletonBox $w="75%" $h="12px" />
              <SkeletonBox $w="55%" $h="11px" />
            </CardContent>
          </SkeletonCard>
        ))}
      </List>
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyCard>
        <EmptyIcon>📨</EmptyIcon>
        <EmptyTitle>Brak kampanii SMS</EmptyTitle>
        <EmptySubtitle>Utwórz pierwszą kampanię, klikając „Nowa kampania"</EmptySubtitle>
      </EmptyCard>
    );
  }

  return (
    <List>
      {campaigns.map((c) => {
        const chips = buildFilterChips(c);
        const isSending = sendingId === c.id;

        return (
          <Card key={c.id}>
            <CardIconWrap>📨</CardIconWrap>

            <CardContent>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <CardTitle>{c.name}</CardTitle>
                <StatusBadge $status={c.status}>{statusConfig[c.status].label}</StatusBadge>
              </div>

              <CardMessage>"{c.message.slice(0, 100)}{c.message.length > 100 ? '…' : ''}"</CardMessage>

              {chips.length > 0 && (
                <FiltersChips>
                  {chips.map((chip, i) => <FilterChip key={i}>{chip}</FilterChip>)}
                </FiltersChips>
              )}

              <CardMeta>
                <MetaItem>
                  👥 <MetaValue>{c.audienceCount}</MetaValue> odbiorców
                </MetaItem>
                {c.sentCount != null && (
                  <MetaItem>
                    ✉ wysłano do <MetaValue>{c.sentCount}</MetaValue> osób
                  </MetaItem>
                )}
                {c.sentAt && (
                  <MetaItem>Wysłano: <MetaValue>{formatDate(c.sentAt)}</MetaValue></MetaItem>
                )}
                {c.scheduledAt && c.status === 'SCHEDULED' && (
                  <MetaItem>Zaplanowano: <MetaValue>{formatDate(c.scheduledAt)}</MetaValue></MetaItem>
                )}
                <MetaItem>Utworzono: {formatDate(c.createdAt)}</MetaItem>
              </CardMeta>
            </CardContent>

            <CardActions>
              {c.status !== 'SENT' && (
                <SendButton
                  onClick={() => onSend(c)}
                  disabled={isSending}
                >
                  {isSending ? 'Wysyłanie…' : '▶ Wyślij teraz'}
                </SendButton>
              )}
              <DeleteButton onClick={() => onDelete(c)}>
                Usuń
              </DeleteButton>
            </CardActions>
          </Card>
        );
      })}
    </List>
  );
};
