import styled, { keyframes } from 'styled-components';
import { ArrowRight, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/common/utils/formatters';
import { useUpcomingVisits } from '../hooks/useUpcomingVisits';
import type { UpcomingVisit, VisitStatusKind } from '../types';

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<VisitStatusKind, { bg: string; color: string }> = {
  info:    { bg: 'rgba(59,130,246,0.12)',  color: '#1d4ed8' },
  warn:    { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  neutral: { bg: '#f1f5f9',               color: '#475569' },
  success: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  err:     { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const Panel = styled.div`
  background: #fff;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  overflow: hidden;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f1f5f9;
`;

const PanelTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.1px;
  color: ${p => p.theme.colors.text};
`;

const PanelLink = styled.button`
  font-size: 12px;
  font-weight: 500;
  color: #0284c7;
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-family: inherit;
  transition: opacity 150ms ease;
  &:hover { opacity: 0.75; }
  svg { width: 14px; height: 14px; stroke-width: 2; }
`;

const VisitRow = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr auto auto;
  gap: 14px;
  padding: 13px 22px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 180ms ease;
  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }
`;

const VisitTime = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  line-height: 1.2;
`;

const VisitDateLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.colors.textMuted};
  display: block;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const VisitTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  margin: 0 0 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VisitMeta = styled.div`
  font-size: 11px;
  color: #64748b;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  svg { width: 12px; height: 12px; stroke-width: 2; flex-shrink: 0; }
`;

const StatusBadge = styled.span<{ $kind: VisitStatusKind }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 9999px;
  background: ${p => BADGE_CONFIG[p.$kind].bg};
  color: ${p => BADGE_CONFIG[p.$kind].color};
  white-space: nowrap;
  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
`;

const VisitPrice = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  white-space: nowrap;
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const Bone = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '13px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const SkeletonRow = () => (
  <VisitRow as="div" style={{ cursor: 'default' }}>
    <div><Bone $h="14px" $w="40px" /><Bone $h="10px" $w="28px" style={{ marginTop: 6 }} /></div>
    <div><Bone $h="13px" $w="70%" style={{ marginBottom: 6 }} /><Bone $h="11px" $w="50%" /></div>
    <Bone $h="22px" $w="72px" style={{ borderRadius: 99 }} />
    <Bone $h="14px" $w="64px" />
  </VisitRow>
);

// ─── Empty / Error ────────────────────────────────────────────────────────────

const Placeholder = styled.div`
  padding: 40px 22px;
  text-align: center;
  font-size: 14px;
  color: ${p => p.theme.colors.textMuted};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  svg { width: 20px; height: 20px; color: ${p => p.theme.colors.error}; }
`;

// ─── Row ──────────────────────────────────────────────────────────────────────

const VisitRowItem = ({ visit, onNavigate }: { visit: UpcomingVisit; onNavigate: (id: string) => void }) => (
  <VisitRow onClick={() => onNavigate(visit.id)}>
    <VisitTime>
      {visit.time}
      <VisitDateLabel>{visit.dateLabel}</VisitDateLabel>
    </VisitTime>
    <div style={{ minWidth: 0 }}>
      <VisitTitle>{visit.serviceName}</VisitTitle>
      <VisitMeta>
        <User />
        {visit.customerName} · {visit.vehicleName}
      </VisitMeta>
    </div>
    <StatusBadge $kind={visit.statusKind}>{visit.statusLabel}</StatusBadge>
    <VisitPrice>{formatCurrency(visit.price)}</VisitPrice>
  </VisitRow>
);

// ─── Component ────────────────────────────────────────────────────────────────

const VISIBLE_LIMIT = 10;

export const UpcomingVisitsPanel = () => {
  const navigate = useNavigate();
  const { data: visits = [], isLoading, isError } = useUpcomingVisits();

  const visible = visits.slice(0, VISIBLE_LIMIT);
  const hasMore = visits.length > VISIBLE_LIMIT;

  return (
    <Panel>
      <PanelHead>
        <PanelTitle>Najbliższe wizyty</PanelTitle>
        <PanelLink onClick={() => navigate('/calendar')}>
          Pokaż w kalendarzu <ArrowRight />
        </PanelLink>
      </PanelHead>

      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {isError && (
        <Placeholder>
          <AlertCircle />
          Nie udało się załadować wizyt
        </Placeholder>
      )}

      {!isLoading && !isError && visits.length === 0 && (
        <Placeholder>Brak zaplanowanych wizyt w najbliższym czasie</Placeholder>
      )}

      {!isLoading && !isError && visible.map(v => (
        <VisitRowItem key={v.id} visit={v} onNavigate={id => navigate(`/visits/${id}`)} />
      ))}

      {!isLoading && !isError && hasMore && (
        <PanelLink
          onClick={() => navigate('/calendar')}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 22px' }}
        >
          Pokaż wszystkie ({visits.length}) <ArrowRight />
        </PanelLink>
      )}
    </Panel>
  );
};
