import React, { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useCashRegister, useCashHistory, useAdjustCash } from '../hooks/useFinance';
import { formatMoney, formatDate, inputValueToGrosze } from '../utils/formatters';
import type { CashDirection } from '../types';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
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

// ─── Right column: History ───────────────────────────────────────────────────

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

/*
 * Pasek filtrów i podsumowanie okresu.
 *
 * Zakresu dat NIE wybiera się tutaj, tylko tym samym przełącznikiem w nagłówku
 * „Finansów", który steruje pozostałymi zakładkami. Drugi, własny wybór okresu
 * na tym samym ekranie znaczyłby, że dwa widoczne naraz zakresy mogą pokazywać
 * co innego - a pytanie „za jaki okres to jest?" ma mieć jedną odpowiedź.
 */
const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 18px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const SegGroup = styled.div`
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
`;

const SegBtn = styled.button<{ $active: boolean; $tone: 'neutral' | 'in' | 'out' }>`
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background ${st.transition}, color ${st.transition};
  background: ${(p) => (p.$active ? p.theme.colors.surface : 'transparent')};
  box-shadow: ${(p) => (p.$active ? st.shadowXs : 'none')};
  color: ${(p) =>
    !p.$active ? p.theme.colors.textSecondary
    : p.$tone === 'in' ? '#166534'
    : p.$tone === 'out' ? '#991b1b'
    : p.theme.colors.text};

  &:hover:not(:disabled) { color: ${(p) => p.theme.colors.text}; }
`;

const RangeNote = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
`;

/*
 * Sumy liczy backend po całym okresie, nie po wczytanej stronie - inaczej
 * „łącznie wpłat" znaczyłoby „łącznie wpłat wśród trzydziestu wierszy, które
 * akurat widzisz", a to liczba bez zastosowania.
 */
const SummaryStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  padding: 12px 18px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const SummaryLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const SummaryValue = styled.span<{ $tone: 'in' | 'out' | 'neutral' }>`
  font-size: 16px;
  font-weight: 700;
  font-feature-settings: 'tnum';
  letter-spacing: -0.3px;
  color: ${(p) =>
    p.$tone === 'in' ? '#166534' : p.$tone === 'out' ? '#991b1b' : p.theme.colors.text};
`;

const MoreRow = styled.div`
  padding: 10px 18px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MoreBtn = styled.button`
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: ${st.accentBlue};
  background: transparent;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all ${st.transition};

  &:hover:not(:disabled) { background: ${st.accentBlueDim}; border-color: ${st.accentBlue}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const HistoryScroll = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const HistoryTable = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;

  @media (max-width: 639px) {
    display: block;
    min-width: 0;
    thead { display: none; }
    tbody { display: block; }
  }
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

  @media (max-width: 639px) {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0 8px;
    padding: 12px 14px;

    /* Row 1: Typ badge (col 2) | Kwota chip (col 3) */
    > :nth-child(2) { grid-column: 1; grid-row: 1; }
    > :nth-child(3) { grid-column: 2; grid-row: 1; align-self: center; text-align: right; }

    /* Row 2: Data (col 1) | Saldo po (col 4) */
    > :nth-child(1) { grid-column: 1; grid-row: 2; padding-top: 6px; }
    > :nth-child(4) { grid-column: 2; grid-row: 2; padding-top: 6px; text-align: right; }

    /* Row 3: Komentarz (col 5) full width */
    > :nth-child(5) { grid-column: 1 / 3; grid-row: 3; padding-top: 4px; }
  }
`;

const HTd = styled.td<{ $align?: string; $mono?: boolean }>`
  padding: 11px 16px;
  font-size: ${st.fontSm};
  color: ${(p) => p.theme.colors.text};
  text-align: ${(p) => p.$align || 'left'};
  vertical-align: middle;
  ${(p) => p.$mono && `font-feature-settings: 'tnum';`}

  @media (max-width: 639px) {
    display: block;
    padding: 0;
    text-align: left;
  }
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

const PAGE_STEP = 30;
/** Twardy limit `size` po stronie API - wyżej i tak nie wejdzie. */
const MAX_PAGE_SIZE = 100;

interface CashRegisterPanelProps {
  /** Okres z przełącznika w nagłówku „Finansów"; brak = cały czas. */
  dateFrom?: string;
  dateTo?: string;
}

/** „1.08.2026 - 31.08.2026", „od 1.08.2026", „cały czas" - podpis pod sumami. */
const describeRange = (from?: string, to?: string): string => {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('pl-PL');
  if (from && to) return `${fmt(from)} - ${fmt(to)}`;
  if (from) return `od ${fmt(from)}`;
  if (to) return `do ${fmt(to)}`;
  return 'cały czas';
};

export const CashRegisterPanel: React.FC<CashRegisterPanelProps> = ({ dateFrom, dateTo }) => {
  const [direction, setDirection] = useState<CashDirection | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_STEP);

  const filters = useMemo(
    () => ({ dateFrom, dateTo, direction: direction ?? undefined }),
    [dateFrom, dateTo, direction],
  );

  const { cashRegister, isLoading: cashLoading, refetch } = useCashRegister();
  const {
    operations,
    total: historyTotal,
    totalIn,
    totalOut,
    isLoading: histLoading,
    isFetching: histFetching,
  } = useCashHistory(1, pageSize, filters);
  const adjustCash = useAdjustCash();

  const [amountDisplay, setAmountDisplay] = useState('');
  const [comment, setComment] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const selectDirection = (next: CashDirection | null) => {
    setDirection(next);
    // Zawężenie listy zaczyna ją czytać od początku; zostawienie doczytanych stu
    // wierszy z poprzedniego filtra tylko udawałoby, że tyle ich jest.
    setPageSize(PAGE_STEP);
  };

  const canLoadMore = operations.length < historyTotal && pageSize < MAX_PAGE_SIZE;

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
              Ostatnia aktualizacja: {cashRegister ? formatDate(cashRegister.updatedAt) : '-'}
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
                onKeyDown={handleZeroAwareKeyDown(amountDisplay, setAmountDisplay)}
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
          {historyTotal > 0 && (
            <HistoryCount>
              {operations.length < historyTotal
                ? `${operations.length} z ${historyTotal}`
                : historyTotal}
            </HistoryCount>
          )}
        </HistoryHeader>

        <SummaryStrip>
          <SummaryItem>
            <SummaryLabel>Łącznie wpłat</SummaryLabel>
            {/* Przy pierwszym wczytaniu sumy jeszcze nie ma. „0,00 zł" obok
                szkieletów tabeli czytałoby się jak wynik, a nie jak brak wyniku. */}
            {histLoading
              ? <Skeleton $h="19px" $w="110px" />
              : <SummaryValue $tone="in">{formatMoney(totalIn)}</SummaryValue>}
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Łącznie wypłat</SummaryLabel>
            {histLoading
              ? <Skeleton $h="19px" $w="110px" />
              : <SummaryValue $tone="out">{formatMoney(totalOut)}</SummaryValue>}
          </SummaryItem>
          <SummaryItem>
            {/* Różnica wpłat i wypłat - o ile kasa urosła albo stopniała w tym
                okresie. To nie jest saldo kasy: tamto widać w kaflu obok i liczy
                się od zawsze, niezależnie od wybranego zakresu. */}
            <SummaryLabel>Zmiana w okresie</SummaryLabel>
            {histLoading
              ? <Skeleton $h="19px" $w="110px" />
              : (
                <SummaryValue $tone={totalIn - totalOut >= 0 ? 'in' : 'out'}>
                  {totalIn - totalOut > 0 ? '+' : ''}{formatMoney(totalIn - totalOut)}
                </SummaryValue>
              )}
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Okres</SummaryLabel>
            <SummaryValue $tone="neutral" style={{ fontSize: 13, fontWeight: 600 }}>
              {describeRange(dateFrom, dateTo)}
            </SummaryValue>
          </SummaryItem>
        </SummaryStrip>

        <FilterBar>
          <SegGroup role="group" aria-label="Filtr operacji kasowych">
            <SegBtn
              type="button"
              $active={direction === null}
              $tone="neutral"
              aria-pressed={direction === null}
              onClick={() => selectDirection(null)}
            >
              Wszystkie
            </SegBtn>
            <SegBtn
              type="button"
              $active={direction === 'IN'}
              $tone="in"
              aria-pressed={direction === 'IN'}
              onClick={() => selectDirection('IN')}
            >
              Tylko wpłaty
            </SegBtn>
            <SegBtn
              type="button"
              $active={direction === 'OUT'}
              $tone="out"
              aria-pressed={direction === 'OUT'}
              onClick={() => selectDirection('OUT')}
            >
              Tylko wypłaty
            </SegBtn>
          </SegGroup>
          <RangeNote>Zakres dat zmienisz filtrem w nagłówku Finansów.</RangeNote>
        </FilterBar>

        {histLoading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} $h="40px" />)}
          </div>
        ) : operations.length === 0 ? (
          <EmptyHistory>
            {direction === null && !dateFrom && !dateTo
              ? 'Brak operacji kasowych'
              : 'Brak operacji spełniających wybrane filtry'}
          </EmptyHistory>
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
                      {op.comment || <span style={{ color: st.textMuted }}>-</span>}
                    </HTd>
                  </HTr>
                ))}
              </tbody>
            </HistoryTable>
          </HistoryScroll>
        )}

        {canLoadMore && (
          <MoreRow>
            <MoreBtn
              type="button"
              disabled={histFetching}
              onClick={() => setPageSize((size) => Math.min(size + PAGE_STEP, MAX_PAGE_SIZE))}
            >
              {histFetching ? 'Wczytywanie...' : 'Pokaż więcej'}
            </MoreBtn>
          </MoreRow>
        )}
      </HistoryCard>
    </Content>
  );
};
