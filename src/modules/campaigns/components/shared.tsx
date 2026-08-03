import styled, { keyframes } from 'styled-components';
import { Repeat, Send } from 'lucide-react';
import { Badge } from '@/common/components/Badge';
import { KIND_DESCRIPTIONS, KIND_LABELS, STATUS_LABELS, STATUS_VARIANTS } from '../constants';
import type { CampaignKind, CampaignStatus } from '../types';

// ─── Layout ───────────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const Page = styled.div`
  display: flex;
  flex-direction: column;
  padding: 32px 32px 48px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeUp} 250ms ease both;

  @media (max-width: 768px) {
    padding: 20px 16px 40px;
  }
`;

export const SectionCard = styled.div`
  background: #ffffff;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.04);
`;

export const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textMuted};
  margin-bottom: 12px;
`;

export const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 20px 0 24px;

  @media (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

// ─── Badge rodzaju kampanii ───────────────────────────────────────────────────

const KindWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  border: 1px solid ${(p) => p.theme.colors.border};
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
    stroke-width: 1.75;
  }
`;

export function CampaignKindBadge({ kind }: { kind: CampaignKind }) {
  const Icon = kind === 'AUTOMATIC' ? Repeat : Send;
  return (
    <KindWrap title={KIND_DESCRIPTIONS[kind]}>
      <Icon />
      {KIND_LABELS[kind]}
    </KindWrap>
  );
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge $variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

// ─── Drobnica ─────────────────────────────────────────────────────────────────

export const MutedText = styled.span`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textMuted};
`;

export const InfoBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  margin-bottom: 16px;
`;
