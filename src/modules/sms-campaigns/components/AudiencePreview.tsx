import React from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { AudienceCustomer } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ─────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SummaryBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  box-shadow: ${st.shadowXs};
  flex-wrap: wrap;
  gap: 8px;
`;

const SummaryCount = styled.span`
  font-size: ${st.fontSm};
  font-weight: 700;
  color: ${st.text};
`;

const SummaryExcluded = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

const EffectiveBadge = styled.span`
  padding: 3px 10px;
  background: ${st.accentGreenDim};
  color: ${st.accentGreen};
  border: 1px solid ${st.accentGreen}33;
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 700;
`;

const Table = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${st.shadowXs};
  animation: ${fadeIn} 0.25s ease;
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr 140px 140px 130px 100px;
  gap: 0;
  padding: 10px 16px;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};

  @media (max-width: 768px) {
    grid-template-columns: 32px 1fr 130px 80px;
  }
`;

const TableRow = styled.div<{ $excluded: boolean }>`
  display: grid;
  grid-template-columns: 32px 1fr 140px 140px 130px 100px;
  gap: 0;
  padding: 11px 16px;
  border-bottom: 1px solid ${st.border};
  background: ${(p) => (p.$excluded ? `${st.accentRedDim}` : st.bgCard)};
  opacity: ${(p) => (p.$excluded ? 0.6 : 1)};
  transition: background ${st.transition};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(p) => (p.$excluded ? `${st.accentRedDim}` : st.bg)};
  }

  @media (max-width: 768px) {
    grid-template-columns: 32px 1fr 130px 80px;
  }
`;

const ColHead = styled.span`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
`;

const ColCell = styled.span<{ $muted?: boolean; $hideOnMobile?: boolean }>`
  font-size: ${st.fontSm};
  color: ${(p) => (p.$muted ? st.textMuted : st.text)};
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 768px) {
    display: ${(p) => (p.$hideOnMobile ? 'none' : 'flex')};
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${st.accentRed};
  cursor: pointer;
  flex-shrink: 0;
`;

const ExcludedBadge = styled.span`
  padding: 2px 7px;
  background: ${st.accentRedDim};
  color: ${st.accentRed};
  border: 1px solid ${st.accentRed}33;
  border-radius: ${st.radiusFull};
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr 140px 140px 130px 100px;
  gap: 0;
  padding: 14px 16px;
  border-bottom: 1px solid ${st.border};
  &:last-child { border-bottom: none; }

  @media (max-width: 768px) {
    grid-template-columns: 32px 1fr 130px 80px;
  }
`;

const SkeletonBox = styled.div<{ $w?: string }>`
  height: 13px;
  width: ${(p) => p.$w ?? '80%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
  align-self: center;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${st.textMuted};
  font-size: ${st.fontSm};
`;

const HintBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: ${st.accentAmberDim};
  border: 1px solid ${st.accentAmber}44;
  border-radius: ${st.radiusSm};
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
  line-height: 1.5;
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  customers: AudienceCustomer[];
  isLoading: boolean;
  excludedIds: string[];
  onToggleExclude: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AudiencePreview: React.FC<Props> = ({
  customers,
  isLoading,
  excludedIds,
  onToggleExclude,
}) => {
  const excludedCount = excludedIds.filter((id) => customers.some((c) => c.id === id)).length;
  const effectiveCount = customers.length - excludedCount;

  if (isLoading) {
    return (
      <Wrapper>
        <Table>
          <TableHead>
            <ColHead />
            <ColHead>Klient</ColHead>
            <ColHead>Telefon</ColHead>
            <ColHead>Pojazd</ColHead>
            <ColHead>Ostatnia wizyta</ColHead>
            <ColHead />
          </TableHead>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i}>
              <SkeletonBox $w="16px" />
              <SkeletonBox $w="60%" />
              <SkeletonBox $w="80%" />
              <SkeletonBox $w="70%" />
              <SkeletonBox $w="60%" />
              <div />
            </SkeletonRow>
          ))}
        </Table>
      </Wrapper>
    );
  }

  if (customers.length === 0) {
    return (
      <Wrapper>
        <EmptyState>
          Brak klientów spełniających wybrane kryteria.<br />
          Zmień filtry, aby zobaczyć odbiorców kampanii.
        </EmptyState>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <SummaryBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SummaryCount>{customers.length} odbiorców</SummaryCount>
          {excludedCount > 0 && (
            <SummaryExcluded>({excludedCount} wykluczono)</SummaryExcluded>
          )}
        </div>
        <EffectiveBadge>✓ {effectiveCount} otrzyma SMS</EffectiveBadge>
      </SummaryBar>

      <HintBox>
        ⚠ Zaznacz checkbox obok osoby, którą chcesz wykluczyć z kampanii.
        Wykluczenia są zapamiętywane i można je zmienić przed wysyłką.
      </HintBox>

      <Table>
        <TableHead>
          <ColHead />
          <ColHead>Klient</ColHead>
          <ColHead>Telefon</ColHead>
          <ColHead>Pojazd</ColHead>
          <ColHead>Ostatnia wizyta</ColHead>
          <ColHead>Status</ColHead>
        </TableHead>

        {customers.map((c) => {
          const excluded = excludedIds.includes(c.id);
          return (
            <TableRow key={c.id} $excluded={excluded}>
              <ColCell>
                <Checkbox
                  checked={excluded}
                  onChange={() => onToggleExclude(c.id)}
                  title={excluded ? 'Przywróć do kampanii' : 'Wyklucz z kampanii'}
                />
              </ColCell>
              <ColCell>
                {c.firstName} {c.lastName}
              </ColCell>
              <ColCell $muted>{c.phone}</ColCell>
              <ColCell $muted $hideOnMobile={false}>
                {c.vehicleBrand
                  ? `${c.vehicleBrand}${c.vehicleModel ? ' ' + c.vehicleModel : ''}`
                  : '—'}
              </ColCell>
              <ColCell $muted $hideOnMobile>{formatDate(c.lastVisitDate)}</ColCell>
              <ColCell>
                {excluded ? <ExcludedBadge>Wykluczony</ExcludedBadge> : null}
              </ColCell>
            </TableRow>
          );
        })}
      </Table>
    </Wrapper>
  );
};
