import React, { useState } from 'react';
import styled from 'styled-components';
import { useFinanceSummary } from '../hooks/useFinance';
import { formatMoney } from '../utils/formatters';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.lg};
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
  padding: ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
`;

const FilterLabel = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  color: ${(p) => p.theme.colors.text};
`;

const DateInput = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  outline: none;

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const ClearBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary};
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;

  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${(p) => p.theme.spacing.md};

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.div<{ $accent?: string }>`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-left: 4px solid ${(p) => p.$accent || 'var(--brand-primary)'};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.lg};
`;

const CardLabel = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: 600;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${(p) => p.theme.spacing.xs};
`;

const CardValue = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xl};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  font-feature-settings: 'tnum';
`;

const CardSub = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  margin-top: 4px;
`;

const Skeleton = styled.div`
  height: 24px;
  width: 70%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

export const FinanceSummaryReport: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { summary, isLoading } = useFinanceSummary(dateFrom || undefined, dateTo || undefined);

  return (
    <Container>
      <FilterBar>
        <FilterLabel>Zakres dat:</FilterLabel>
        <DateInput
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="Od"
        />
        <span style={{ color: '#9ca3af' }}>—</span>
        <DateInput
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="Do"
        />
        {(dateFrom || dateTo) && (
          <ClearBtn onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Wyczyść
          </ClearBtn>
        )}
        {!dateFrom && !dateTo && (
          <span style={{ color: '#9ca3af', fontSize: 13 }}>Pokazuje wszystkie okresy</span>
        )}
      </FilterBar>

      <CardsGrid>
        {[
          { label: 'Przychody (PAID)', accent: '#22c55e', value: summary?.totalRevenue, sub: 'opłacone faktury / paragony przychodowe' },
          { label: 'Koszty (PAID)',    accent: '#ef4444', value: summary?.totalCosts,   sub: 'opłacone faktury kosztowe' },
          { label: 'Zysk netto',       accent: '#6366f1', value: summary?.profit,       sub: 'przychody − koszty' },
          { label: 'Należności (PENDING)',  accent: '#f59e0b', value: summary?.pendingReceivables, sub: 'oczekujące wpłaty od klientów' },
          { label: 'Zobowiązania (PENDING)', accent: '#f97316', value: summary?.pendingPayables,   sub: 'oczekujące płatności do dostawców' },
        ].map(({ label, accent, value, sub }) => (
          <Card key={label} $accent={accent}>
            <CardLabel>{label}</CardLabel>
            {isLoading ? <Skeleton /> : (
              <CardValue>{formatMoney(value ?? 0)}</CardValue>
            )}
            <CardSub>{sub}</CardSub>
          </Card>
        ))}

        <Card $accent="#dc2626">
          <CardLabel>Przeterminowane</CardLabel>
          {isLoading ? <Skeleton /> : (
            <CardValue>
              {summary?.overdueReceivables ?? 0} należności / {summary?.overduePayables ?? 0} zobowiązań
            </CardValue>
          )}
          <CardSub>dokumenty z przekroczonym terminem</CardSub>
        </Card>
      </CardsGrid>
    </Container>
  );
};
