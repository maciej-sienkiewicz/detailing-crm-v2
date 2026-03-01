import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useCashRegister, useCashHistory, useAdjustCash } from '../hooks/useFinance';
import { formatMoney, formatDate, inputValueToGrosze } from '../utils/formatters';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: 360px 1fr;
  }
`;

const Panel = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: ${st.shadowSm};
`;

const PanelTitle = styled.h3`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0;
`;

const BalanceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 24px;
  background: ${st.gradientCardGreen};
  border: 1px solid ${st.accentGreen}22;
  border-radius: ${st.radiusSm};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${st.accentGreen};
    border-radius: 0 2px 2px 0;
  }
`;

const BalanceLabel = styled.span`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const BalanceAmount = styled.div`
  font-size: ${st.fontHero};
  font-weight: 800;
  color: ${st.accentGreen};
  font-feature-settings: 'tnum';
  line-height: 1;
  letter-spacing: -1px;
`;

const BalanceSub = styled.div`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  margin-top: 2px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${st.border};
  margin: 0;
`;

const AdjustForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AdjustTitle = styled.div`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
`;

const AmountInput = styled.input`
  flex: 1;
  padding: 9px 12px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  font-feature-settings: 'tnum';
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const CommentInput = styled.input`
  width: 100%;
  padding: 9px 12px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  box-sizing: border-box;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const AdjustBtn = styled.button<{ $variant?: 'positive' | 'negative' }>`
  padding: 9px 16px;
  font-size: ${st.fontSm};
  font-weight: 600;
  border: 1px solid ${(p) => (p.$variant === 'negative' ? `${st.accentRed}44` : `${st.accentGreen}44`)};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  transition: all ${st.transition};
  white-space: nowrap;

  background: ${(p) => (p.$variant === 'negative' ? st.accentRedDim : st.accentGreenDim)};
  color: ${(p) => (p.$variant === 'negative' ? st.accentRed : st.accentGreen)};

  &:hover:not(:disabled) {
    background: ${(p) => (p.$variant === 'negative' ? '#fee2e2' : '#dcfce7')};
    box-shadow: ${st.shadowXs};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
  font-size: ${st.fontXs};
  color: ${st.accentRed};
  margin: 0;
`;

// ─── History ─────────────────────────────────────────────────────────────────

const HistoryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const HTh = styled.th<{ $align?: string }>`
  padding: 10px 14px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid ${st.border};
  background: ${st.bg};
`;

const HTr = styled.tr`
  border-bottom: 1px solid ${st.border};
  transition: background ${st.transition};

  &:last-child { border-bottom: none; }
  &:hover { background: ${st.bg}; }
`;

const HTd = styled.td<{ $align?: string; $mono?: boolean }>`
  padding: 10px 14px;
  font-size: ${st.fontSm};
  color: ${st.text};
  text-align: ${(p) => p.$align || 'left'};
  ${(p) => p.$mono && `font-feature-settings: 'tnum';`}
`;

const AmountBadge = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  color: ${(p) => (p.$positive ? st.accentGreen : st.accentRed)};
  font-feature-settings: 'tnum';
`;

const Skeleton = styled.div<{ $w?: string; $h?: string }>`
  width: ${(p) => p.$w || '100%'};
  height: ${(p) => p.$h || '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 6px;
`;

const EmptyHistory = styled.div`
  padding: 32px;
  text-align: center;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
`;

export const CashRegisterPanel: React.FC = () => {
  const { cashRegister, isLoading: cashLoading, refetch } = useCashRegister();
  const { operations, total: historyTotal, isLoading: histLoading } = useCashHistory(1, 30);
  const adjustCash = useAdjustCash();

  const [amountDisplay, setAmountDisplay] = useState('');
  const [comment, setComment] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const handleAdjust = async (sign: 1 | -1) => {
    setAdjustError(null);
    const grosz = inputValueToGrosze(amountDisplay) * sign;
    if (grosz === 0) { setAdjustError('Podaj kwotę różną od zera.'); return; }
    if (!comment.trim()) { setAdjustError('Komentarz jest wymagany.'); return; }
    try {
      await adjustCash.mutateAsync({ amount: grosz, comment: comment.trim() });
      setAmountDisplay('');
      setComment('');
      refetch();
    } catch {
      setAdjustError('Nie udało się zaktualizować kasy.');
    }
  };

  return (
    <Grid>
      {/* Left: balance + adjust form */}
      <Panel>
        <PanelTitle>Stan kasy</PanelTitle>

        {cashLoading ? (
          <BalanceBlock>
            <BalanceLabel>Saldo</BalanceLabel>
            <Skeleton $h="44px" $w="70%" />
            <Skeleton $h="11px" $w="50%" />
          </BalanceBlock>
        ) : (
          <BalanceBlock>
            <BalanceLabel>Saldo</BalanceLabel>
            <BalanceAmount>{formatMoney(cashRegister?.balance ?? 0)}</BalanceAmount>
            <BalanceSub>
              Aktualizacja: {cashRegister ? formatDate(cashRegister.updatedAt) : '—'}
            </BalanceSub>
          </BalanceBlock>
        )}

        <Divider />

        <AdjustForm onSubmit={(e) => e.preventDefault()}>
          <AdjustTitle>Korekta ręczna</AdjustTitle>

          <InputRow>
            <AmountInput
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 PLN"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
            />
          </InputRow>

          <CommentInput
            type="text"
            placeholder="Komentarz (wymagany)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {adjustError && <ErrorMsg>{adjustError}</ErrorMsg>}

          <InputRow>
            <AdjustBtn $variant="positive" onClick={() => handleAdjust(1)} disabled={adjustCash.isPending}>
              + Wpłata
            </AdjustBtn>
            <AdjustBtn $variant="negative" onClick={() => handleAdjust(-1)} disabled={adjustCash.isPending}>
              − Wypłata
            </AdjustBtn>
          </InputRow>
        </AdjustForm>
      </Panel>

      {/* Right: history */}
      <Panel>
        <PanelTitle>Historia operacji ({historyTotal})</PanelTitle>

        {histLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map((i) => <Skeleton key={i} $h="36px" />)}
          </div>
        ) : operations.length === 0 ? (
          <EmptyHistory>Brak operacji kasowych</EmptyHistory>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <HistoryTable>
              <thead>
                <tr>
                  <HTh>Data</HTh>
                  <HTh>Typ operacji</HTh>
                  <HTh $align="right">Kwota</HTh>
                  <HTh $align="right">Saldo po</HTh>
                  <HTh>Komentarz</HTh>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <HTr key={op.id}>
                    <HTd>{formatDate(op.createdAt)}</HTd>
                    <HTd>{op.operationTypeLabel}</HTd>
                    <HTd $align="right" $mono>
                      <AmountBadge $positive={op.amount >= 0}>
                        {op.amount >= 0 ? '+' : ''}{formatMoney(op.amount)}
                      </AmountBadge>
                    </HTd>
                    <HTd $align="right" $mono>{formatMoney(op.balanceAfter)}</HTd>
                    <HTd>
                      <span style={{ color: st.textMuted, fontSize: st.fontSm }}>
                        {op.comment || '—'}
                      </span>
                    </HTd>
                  </HTr>
                ))}
              </tbody>
            </HistoryTable>
          </div>
        )}
      </Panel>
    </Grid>
  );
};
