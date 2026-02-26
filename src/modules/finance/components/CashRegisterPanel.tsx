import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useCashRegister, useCashHistory, useAdjustCash } from '../hooks/useFinance';
import { formatMoney, formatDate, inputValueToGrosze } from '../utils/formatters';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(p) => p.theme.spacing.lg};

  @media (min-width: ${(p) => p.theme.breakpoints.lg}) {
    grid-template-columns: 360px 1fr;
  }
`;

const Panel = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.md};
`;

const PanelTitle = styled.h3`
  font-size: ${(p) => p.theme.fontSizes.md};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
  margin: 0;
`;

const BalanceAmount = styled.div`
  font-size: 2.5rem;
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  font-feature-settings: 'tnum';
  line-height: 1;
`;

const BalanceSub = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  margin: 0;
`;

const AdjustForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.sm};
`;

const AdjustTitle = styled.div`
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
`;

const InputRow = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.sm};
`;

const AmountInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  outline: none;
  font-family: 'JetBrains Mono', monospace;
  font-feature-settings: 'tnum';

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const CommentInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const AdjustBtn = styled.button<{ $variant?: 'positive' | 'negative' }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  transition: filter 0.12s ease;
  white-space: nowrap;

  background: ${(p) => (p.$variant === 'negative' ? '#fee2e2' : '#dcfce7')};
  color: ${(p) => (p.$variant === 'negative' ? '#991b1b' : '#166534')};

  &:hover { filter: brightness(0.93); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const SubmitBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
  color: white;
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  transition: filter 0.12s ease;

  &:hover { filter: brightness(1.08); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.error};
  margin: 0;
`;

// ─── History ─────────────────────────────────────────────────────────────────

const HistoryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const HTh = styled.th<{ $align?: string }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  text-align: ${(p) => p.$align || 'left'};
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: 600;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const HTr = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const HTd = styled.td<{ $align?: string; $mono?: boolean }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.text};
  text-align: ${(p) => p.$align || 'left'};
  ${(p) => p.$mono && `font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum';`}
`;

const AmountBadge = styled.span<{ $positive: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: ${(p) => (p.$positive ? '#166534' : '#991b1b')};
`;

const Skeleton = styled.div<{ $w?: string; $h?: string }>`
  width: ${(p) => p.$w || '100%'};
  height: ${(p) => p.$h || '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
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
          <>
            <Skeleton $h="40px" $w="70%" />
            <Skeleton $h="12px" $w="50%" />
          </>
        ) : (
          <>
            <BalanceAmount>{formatMoney(cashRegister?.balance ?? 0)}</BalanceAmount>
            <BalanceSub>
              Aktualizacja: {cashRegister ? formatDate(cashRegister.updatedAt) : '—'}
            </BalanceSub>
          </>
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
            <SubmitBtn
              type="button"
              onClick={() => handleAdjust(amountDisplay.startsWith('-') ? -1 : 1)}
              disabled={adjustCash.isPending}
              style={{ display: 'none' }}
            />
          </InputRow>
        </AdjustForm>
      </Panel>

      {/* Right: history */}
      <Panel>
        <PanelTitle>Historia operacji ({historyTotal})</PanelTitle>

        {histLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map((i) => <Skeleton key={i} $h="32px" />)}
          </div>
        ) : operations.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 14 }}>Brak operacji kasowych</div>
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
                      <span style={{ color: '#6b7280', fontSize: 13 }}>
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
