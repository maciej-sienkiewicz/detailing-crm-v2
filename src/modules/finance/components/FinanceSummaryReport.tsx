import React, { useState } from 'react';
import styled from 'styled-components';
import { useFinanceSummary } from '../hooks/useFinance';
import { formatMoney } from '../utils/formatters';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding: 12px 16px;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowXs};
`;

const FilterLabel = styled.span`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
`;

const DateSep = styled.span`
  color: ${st.textMuted};
  font-size: ${st.fontSm};
  user-select: none;
`;

const DateInput = styled.input`
  padding: 7px 10px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const ClearBtn = styled.button`
  padding: 6px 12px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: 1px solid ${st.border};
  background: transparent;
  color: ${st.textSecondary};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${st.bg};
    color: ${st.text};
    border-color: ${st.borderHover};
  }
`;

const PeriodNote = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  font-style: italic;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.div<{ $accent: string; $bg?: string }>`
  background: ${(p) => p.$bg || st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
  box-shadow: ${st.shadowSm};
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

const CardLabel = styled.div`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const CardValue = styled.div<{ $color?: string }>`
  font-size: ${st.fontXl};
  font-weight: 800;
  color: ${(p) => p.$color || st.text};
  font-feature-settings: 'tnum';
  line-height: 1;
  letter-spacing: -0.5px;
`;

const CardSub = styled.div`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  margin-top: 2px;
`;

const Skeleton = styled.div`
  height: 28px;
  width: 70%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const CARDS = [
  { label: 'Przychody', accent: st.accentGreen,  bg: st.gradientCardGreen, key: 'totalRevenue'        as const, sub: 'opłacone faktury / paragony przychodowe', color: st.accentGreen },
  { label: 'Koszty',    accent: st.accentRed,    bg: st.accentRedDim,      key: 'totalCosts'          as const, sub: 'opłacone faktury kosztowe',               color: st.accentRed   },
  { label: 'Zysk netto',accent: st.accentBlue,   bg: st.gradientCardBlue,  key: 'profit'              as const, sub: 'przychody − koszty',                      color: st.accentBlue  },
  { label: 'Należności',accent: st.accentAmber,  bg: st.accentAmberDim,    key: 'pendingReceivables'  as const, sub: 'oczekujące wpłaty od klientów',           color: st.accentAmber },
  { label: 'Zobowiązania', accent: '#f97316',    bg: 'rgba(249,115,22,0.05)', key: 'pendingPayables'  as const, sub: 'oczekujące płatności do dostawców',       color: '#f97316'      },
];

export const FinanceSummaryReport: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { summary, isLoading } = useFinanceSummary(dateFrom || undefined, dateTo || undefined);

  return (
    <Container>
      <FilterBar>
        <FilterLabel>Zakres dat</FilterLabel>
        <DateInput
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <DateSep>→</DateSep>
        <DateInput
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        {(dateFrom || dateTo) ? (
          <ClearBtn onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Wyczyść
          </ClearBtn>
        ) : (
          <PeriodNote>Pokazuje wszystkie okresy</PeriodNote>
        )}
      </FilterBar>

      <CardsGrid>
        {CARDS.map(({ label, accent, bg, key, sub, color }) => (
          <Card key={label} $accent={accent} $bg={bg}>
            <CardLabel>{label}</CardLabel>
            {isLoading ? <Skeleton /> : (
              <CardValue $color={color}>{formatMoney(summary?.[key] ?? 0)}</CardValue>
            )}
            <CardSub>{sub}</CardSub>
          </Card>
        ))}

        <Card $accent={st.accentRed} $bg={st.accentRedDim}>
          <CardLabel>Przeterminowane</CardLabel>
          {isLoading ? <Skeleton /> : (
            <CardValue $color={st.accentRed}>
              {summary?.overdueReceivables ?? 0} / {summary?.overduePayables ?? 0}
            </CardValue>
          )}
          <CardSub>należności / zobowiązania po terminie</CardSub>
        </Card>
      </CardsGrid>
    </Container>
  );
};
