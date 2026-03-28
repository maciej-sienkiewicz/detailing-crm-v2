import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useCashRegister, useCashHistory, useAdjustCash } from '../hooks/useFinance';
import { formatMoney, formatDate, inputValueToGrosze } from '../utils/formatters';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Content = styled.div`
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: 320px 1fr;
  }
`;

// ─── Left column ──────────────────────────────────────────────────────────────

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const BalanceCard = styled.div`
  background: linear-gradient(140deg, #f0fdf4 0%, #ffffff 55%);
  border: 1px solid ${(p) => p.theme.colors.border};
  border-top: 3px solid #16a34a;
  border-radius: ${(p) => p.theme.radii.xl};
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BalanceLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const BalanceAmount = styled.div`
  font-size: 36px;
  font-weight: 800;
  color: ${(p) => p.theme.colors.text};
  font-feature-settings: 'tnum';
  line-height: 1.1;
  letter-spacing: -1.5px;
  margin-top: 4px;
`;

const BalanceSub = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  margin-top: 4px;
`;

// ─── Form ─────────────────────────────────────────────────────────────────────

const FormCard = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  overflow: hidden;
`;

const FormHeader = styled.div`
  padding: 12px 18px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const FormBody = styled.form`
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: ${st.fontSm};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: ${(p) => p.theme.colors.surface};
  color: ${st.text};
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &::placeholder { color: ${(p) => p.theme.colors.textMuted}; }

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 2px;
`;

const ActionBtn = styled.button<{ $variant: 'positive' | 'negative' }>`
  padding: 9px 12px;
  font-size: ${st.fontSm};
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all ${st.transition};
  white-space: nowrap;
  border: 1px solid ${(p) =>
    p.$variant === 'positive' ? `${st.accentGreen}44` : `${st.accentRed}44`};
  background: ${(p) =>
    p.$variant === 'positive' ? st.accentGreenDim : st.accentRedDim};
  color: ${(p) =>
    p.$variant === 'positive' ? st.accentGreen : st.accentRed};

  &:hover:not(:disabled) {
    background: ${(p) =>
      p.$variant === 'positive' ? '#dcfce7' : '#fee2e2'};
    transform: translateY(-1px);
    box-shadow: ${st.shadowXs};
  }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
  font-size: ${st.fontXs};
  color: ${st.accentRed};
  margin: 0;
  padding: 6px 10px;
  background: ${st.accentRedDim};
  border-radius: 6px;
  border: 1px solid ${st.accentRed}22;
`;

// ─── Right column — History ───────────────────────────────────────────────────

const HistoryCard = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  overflow: hidden;
`;

const HistoryHeader = styled.div`
  padding: 12px 18px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HistoryTitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const HistoryCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textMuted};
  background: ${(p) => p.theme.colors.border};
  padding: 1px 7px;
  border-radius: 20px;
`;

const HistoryScroll = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const HistoryTable = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
`;

const HTh = styled.th<{ $align?: string }>`
  padding: 10px 16px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};
`;

const HTr = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background ${st.transition};

  &:last-child { border-bottom: none; }
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const HTd = styled.td<{ $align?: string; $mono?: boolean }>`
  padding: 11px 16px;
  font-size: ${st.fontSm};
  color: ${(p) => p.theme.colors.text};
  text-align: ${(p) => p.$align || 'left'};
  vertical-align: middle;
  ${(p) => p.$mono && `font-feature-settings: 'tnum';`}
`;

const AmountChip = styled.span<{ $positive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  font-feature-settings: 'tnum';
  background: ${(p) => (p.$positive ? '#dcfce7' : '#fee2e2')};
  color: ${(p) => (p.$positive ? '#166534' : '#991b1b')};
  border: 1px solid ${(p) => (p.$positive ? '#86efac' : '#fca5a5')};
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: ${(p) => p.theme.colors.surfaceAlt};
  color: ${(p) => p.theme.colors.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
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
  padding: 48px 24px;
  text-align: center;
  font-size: ${st.fontSm};
  color: ${(p) => p.theme.colors.textMuted};
`;

// ─── Component ────────────────────────────────────────────────────────────────

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
    <Content>
      {/* Left: balance + form */}
      <LeftColumn>
        {cashLoading ? (
          <BalanceCard>
            <BalanceLabel>Saldo</BalanceLabel>
            <Skeleton $h="40px" $w="70%" />
            <Skeleton $h="12px" $w="50%" />
          </BalanceCard>
        ) : (
          <BalanceCard>
            <BalanceLabel>Saldo kasy</BalanceLabel>
            <BalanceAmount>{formatMoney(cashRegister?.balance ?? 0)}</BalanceAmount>
            <BalanceSub>
              Ostatnia aktualizacja: {cashRegister ? formatDate(cashRegister.updatedAt) : '—'}
            </BalanceSub>
          </BalanceCard>
        )}

        <FormCard>
          <FormHeader>Korekta ręczna</FormHeader>
          <FormBody onSubmit={(e) => e.preventDefault()}>
            <FieldGroup>
              <FieldLabel>Kwota (PLN)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Komentarz</FieldLabel>
              <Input
                type="text"
                placeholder="Opis operacji (wymagany)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </FieldGroup>

            {adjustError && <ErrorMsg>{adjustError}</ErrorMsg>}

            <ButtonRow>
              <ActionBtn
                $variant="positive"
                onClick={() => handleAdjust(1)}
                disabled={adjustCash.isPending}
              >
                + Wpłata
              </ActionBtn>
              <ActionBtn
                $variant="negative"
                onClick={() => handleAdjust(-1)}
                disabled={adjustCash.isPending}
              >
                − Wypłata
              </ActionBtn>
            </ButtonRow>
          </FormBody>
        </FormCard>
      </LeftColumn>

      {/* Right: history */}
      <HistoryCard>
        <HistoryHeader>
          <HistoryTitle>Historia operacji</HistoryTitle>
          {historyTotal > 0 && <HistoryCount>{historyTotal}</HistoryCount>}
        </HistoryHeader>

        {histLoading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} $h="40px" />)}
          </div>
        ) : operations.length === 0 ? (
          <EmptyHistory>Brak operacji kasowych</EmptyHistory>
        ) : (
          <HistoryScroll>
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
                    <HTd style={{ whiteSpace: 'nowrap' }}>{formatDate(op.createdAt)}</HTd>
                    <HTd><TypeBadge>{op.operationTypeLabel}</TypeBadge></HTd>
                    <HTd $align="right" $mono>
                      <AmountChip $positive={op.amount >= 0}>
                        {op.amount >= 0 ? '+' : ''}{formatMoney(op.amount)}
                      </AmountChip>
                    </HTd>
                    <HTd $align="right" $mono style={{ color: st.textSecondary }}>
                      {formatMoney(op.balanceAfter)}
                    </HTd>
                    <HTd style={{ color: st.textSecondary, maxWidth: 240 }}>
                      {op.comment || <span style={{ color: st.textMuted }}>—</span>}
                    </HTd>
                  </HTr>
                ))}
              </tbody>
            </HistoryTable>
          </HistoryScroll>
        )}
      </HistoryCard>
    </Content>
  );
};
