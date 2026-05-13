import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  useKsefSyncStatus,
  useKsefInvoices,
  useKsefStatistics,
  useExcludeKsefInvoice,
  useFetchKsefInvoices,
} from '../hooks/useKsef';
import type { KsefInvoice, KsefInvoiceStatus, KsefSyncStatus } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Section wrapper ──────────────────────────────────────────────────────────

const SectionDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  margin: 4px 0 0;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};
  min-height: 42px;
`;

const SectionTitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${st.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

const SectionLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${(p) => p.theme.colors.border};
`;

// ─── Sync status bar ──────────────────────────────────────────────────────────

const SyncBar = styled.div<{ $variant: 'idle' | 'running' | 'error' | 'never' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  font-size: 12px;
  font-weight: 500;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};

  ${(p) =>
    p.$variant === 'error'
      ? `background: ${st.accentRedDim}; color: ${st.accentRed};`
      : p.$variant === 'running'
      ? `background: rgba(14,165,233,0.06); color: #0284c7;`
      : p.$variant === 'never'
      ? `background: rgba(234,179,8,0.07); color: #92400e;`
      : `background: ${(p as any).theme.colors.surfaceAlt}; color: ${st.textMuted};`}
`;

const SpinnerIcon = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
`;

const SyncDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

// ─── Controls bar ─────────────────────────────────────────────────────────────

const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-wrap: wrap;
`;

const YearSelect = styled.select`
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  background: ${(p) => p.theme.colors.surface};
  color: ${st.text};
  outline: none;
  cursor: pointer;

  &:focus { border-color: ${st.accentBlue}; }
`;

const SmallBtn = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  transition: background 0.15s, transform 0.1s;

  &:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(0); }
`;

const BtnSpinner = styled.span`
  width: 10px;
  height: 10px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
`;

const Spacer = styled.div`flex: 1;`;

const StatsChips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const StatChip = styled.div`
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(14,165,233,0.07);
  border: 1px solid rgba(14,165,233,0.2);
  color: #0369a1;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  white-space: nowrap;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};
  flex-wrap: wrap;
  gap: 8px;
`;

const PaginationInfo = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 1px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  overflow: hidden;
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$disabled ? st.textMuted : st.text)};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};

  &:last-child { border-right: none; }
  &:hover:not(:disabled) { background: ${(p) => p.theme.colors.surfaceAlt}; }
`;

// ─── Table ────────────────────────────────────────────────────────────────────

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center'; $w?: string }>`
  padding: 11px 14px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  width: ${(p) => p.$w || 'auto'};

  &:first-child { padding-left: 18px; }
  &:last-child  { padding-right: 18px; }
`;

const Tr = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background 0.1s;
  animation: ${fadeIn} 0.15s ease-out;

  &:last-child { border-bottom: none; }
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
  padding: 11px 14px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};

  &:first-child { padding-left: 18px; }
  &:last-child  { padding-right: 18px; }
`;

const CellPrimary = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.text};
  white-space: nowrap;
`;

const CellSecondary = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  white-space: nowrap;
`;

const MonoAmount = styled.span`
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
`;

const MonoAmountSub = styled.span`
  display: block;
  margin-top: 2px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  white-space: nowrap;
`;

const EmDash = styled.span`
  color: ${(p) => p.theme.colors.textMuted};
`;

// ─── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'green' | 'amber' | 'red' | 'slate' | 'purple' | 'blue';

const BADGE: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  green:  { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  amber:  { bg: '#fef9c3', color: '#92400e', border: '#fde68a' },
  red:    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  slate:  { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  purple: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  blue:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
};

const Badge = styled.span<{ $v: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04px;
  white-space: nowrap;
  background: ${(p) => BADGE[p.$v].bg};
  color: ${(p) => BADGE[p.$v].color};
  border: 1px solid ${(p) => BADGE[p.$v].border};
`;

const statusBadgeVariant = (s: KsefInvoiceStatus): BadgeVariant => {
  if (s === 'ACTIVE')    return 'green';
  if (s === 'CORRECTED') return 'amber';
  if (s === 'CANCELLED') return 'red';
  return 'slate';
};

const STATUS_LABEL: Record<KsefInvoiceStatus, string> = {
  ACTIVE:    'Aktywna',
  CORRECTED: 'Wystawiono korektę',
  CANCELLED: 'Anulowana',
  EXCLUDED:  'Wykluczona',
};

// ─── Action button ─────────────────────────────────────────────────────────────

const ExcludeBtn = styled.button<{ $pending?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  color: ${st.textMuted};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 5px;
  cursor: ${(p) => (p.$pending ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$pending ? 0.6 : 1)};
  white-space: nowrap;
  transition: all 0.12s;

  &:hover:not(:disabled) {
    background: rgba(239,68,68,0.06);
    color: #ef4444;
    border-color: #fca5a5;
  }
`;

// ─── Empty / Skeleton ─────────────────────────────────────────────────────────

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;
`;

const Skel = styled.div<{ $w?: string }>`
  height: 13px;
  width: ${(p) => p.$w || '100%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 3px;
`;

// ─── Error banner ─────────────────────────────────────────────────────────────

const ErrorBanner = styled.div`
  padding: 10px 16px;
  background: ${st.accentRedDim};
  color: ${st.accentRed};
  font-size: 12px;
  font-weight: 500;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMoney = (v: number | null, currency = 'PLN') => {
  if (v == null) return '—';
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(v);
};

const formatDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SYNC_STATUS_LABEL: Record<KsefSyncStatus, string> = {
  IDLE:         'Dane aktualne',
  RUNNING:      'Synchronizacja w toku…',
  ERROR:        'Błąd ostatniej synchronizacji',
  NEVER_SYNCED: 'Synchronizacja nie była jeszcze uruchomiona',
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const PAGE_SIZE = 20;

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDownload = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconChevLeft = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconChevRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ─── Invoice row ──────────────────────────────────────────────────────────────

const InvoiceRow: React.FC<{ invoice: KsefInvoice }> = ({ invoice }) => {
  const excludeMutation = useExcludeKsefInvoice();

  const handleExclude = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Oznaczyć fakturę ${invoice.invoiceNumber ?? invoice.ksefNumber} jako prywatną? Zniknie z widoku kosztów.`)) return;
    excludeMutation.mutate(invoice.ksefNumber);
  };

  const canExclude = invoice.status !== 'CANCELLED' && invoice.status !== 'EXCLUDED';

  return (
    <Tr>
      {/* Data */}
      <Td>
        <CellPrimary>{formatDate(invoice.issueDate ?? invoice.invoicingDate)}</CellPrimary>
      </Td>

      {/* Sprzedawca */}
      <Td>
        {invoice.sellerName ? (
          <>
            <CellPrimary
              as="span"
              title={invoice.sellerName}
              style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
            >
              {invoice.sellerName}
            </CellPrimary>
            {invoice.sellerNip && <CellSecondary>NIP: {invoice.sellerNip}</CellSecondary>}
          </>
        ) : (
          <EmDash>—</EmDash>
        )}
      </Td>

      {/* Numer faktury */}
      <Td>
        <CellPrimary style={{ fontFamily: "'JetBrains Mono','SF Mono',monospace", fontSize: 12 }}>
          {invoice.invoiceNumber ?? invoice.ksefNumber}
        </CellPrimary>
        {invoice.invoiceNumber && (
          <CellSecondary title={invoice.ksefNumber} style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            KSeF: {invoice.ksefNumber}
          </CellSecondary>
        )}
      </Td>

      {/* Typ / Status */}
      <Td>
        <Badge $v={invoice.isCorrection ? 'purple' : 'blue'}>
          {invoice.isCorrection ? 'FA_KOR' : 'FA'}
        </Badge>
        {' '}
        <Badge $v={statusBadgeVariant(invoice.status)}>
          {STATUS_LABEL[invoice.status]}
        </Badge>
      </Td>

      {/* Kwota */}
      <Td $align="right">
        <MonoAmount>{formatMoney(invoice.grossAmount, invoice.currency ?? 'PLN')}</MonoAmount>
        <MonoAmountSub>{formatMoney(invoice.netAmount, invoice.currency ?? 'PLN')} netto</MonoAmountSub>
      </Td>

      {/* Forma płatności */}
      <Td>
        {invoice.paymentFormLabel ?? <EmDash>—</EmDash>}
      </Td>

      {/* Akcja */}
      <Td onClick={(e) => e.stopPropagation()}>
        {canExclude && (
          <ExcludeBtn
            onClick={handleExclude}
            $pending={excludeMutation.isPending}
            disabled={excludeMutation.isPending}
            title="Oznacz jako prywatną – faktura zniknie z kosztów"
          >
            {excludeMutation.isPending ? <BtnSpinner /> : <IconEyeOff />}
            Wyklucz
          </ExcludeBtn>
        )}
      </Td>
    </Tr>
  );
};

// ─── Fetch modal (date range picker) ─────────────────────────────────────────

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalCard = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border-radius: 12px;
  padding: 24px;
  width: 360px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
`;

const ModalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const ModalLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${st.textSecondary};
`;

const ModalInput = styled.input`
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 7px;
  background: ${(p) => p.theme.colors.surface};
  color: ${st.text};
  outline: none;

  &:focus { border-color: ${st.accentBlue}; }
`;

const ModalBtns = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ModalPrimary = styled.button<{ $loading?: boolean }>`
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: 7px;
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  display: inline-flex;
  align-items: center;
  gap: 5px;

  &:hover:not(:disabled) { background: #2563eb; }
`;

const ModalSecondary = styled.button`
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 7px;
  cursor: pointer;

  &:hover { background: ${(p) => p.theme.colors.surfaceAlt}; color: ${st.text}; }
`;

const FetchResultMsg = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.25);
  border-radius: 6px;
  color: #065f46;
`;

interface FetchModalProps {
  onClose: () => void;
}

const FetchModal: React.FC<FetchModalProps> = ({ onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo]     = useState(today);
  const [result, setResult]     = useState<string | null>(null);

  const fetchMutation = useFetchKsefInvoices();

  const handleFetch = async () => {
    try {
      const res = await fetchMutation.mutateAsync({
        dateFrom: `${dateFrom}T00:00:00Z`,
        dateTo:   `${dateTo}T23:59:59Z`,
        subjectType: 'SUBJECT2',
      });
      setResult(`Pobrano ${res.fetched} nowych faktur (pominięto ${res.skipped} duplikatów, łącznie w KSeF: ${res.total}).`);
    } catch (err: any) {
      setResult(null);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalTitle>Pobierz faktury z KSeF</ModalTitle>

        <ModalRow>
          <ModalLabel>Data od</ModalLabel>
          <ModalInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </ModalRow>
        <ModalRow>
          <ModalLabel>Data do</ModalLabel>
          <ModalInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </ModalRow>

        {result && <FetchResultMsg>{result}</FetchResultMsg>}

        {fetchMutation.isError && (
          <ErrorBanner style={{ borderRadius: 6 }}>
            Błąd pobierania faktur.{' '}
            {(fetchMutation.error as any)?.response?.data?.message ?? ''}
          </ErrorBanner>
        )}

        <ModalBtns>
          <ModalSecondary onClick={onClose}>Anuluj</ModalSecondary>
          <ModalPrimary
            onClick={handleFetch}
            disabled={fetchMutation.isPending || !!result}
            $loading={fetchMutation.isPending}
          >
            {fetchMutation.isPending && <BtnSpinner />}
            {result ? 'Pobrano' : 'Pobierz'}
          </ModalPrimary>
        </ModalBtns>
      </ModalCard>
    </ModalBackdrop>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const KsefInvoicesSection: React.FC = () => {
  const [year, setYear]           = useState(currentYear);
  const [page, setPage]           = useState(1);
  const [showFetchModal, setShowFetchModal] = useState(false);

  const isRunning = (status: KsefSyncStatus | undefined) => status === 'RUNNING';

  const { syncStatus, refetch: refetchSync } = useKsefSyncStatus(
    true,
    isRunning(undefined) ? 5_000 : undefined,
  );

  // poll when sync is running
  const { syncStatus: syncData } = useKsefSyncStatus(
    true,
    syncStatus?.syncStatus === 'RUNNING' ? 5_000 : undefined,
  );

  const { invoices, total, isLoading, isError, refetch } = useKsefInvoices(page, PAGE_SIZE);
  const { statistics } = useKsefStatistics(year);

  // refresh invoices when sync goes from RUNNING → IDLE
  useEffect(() => {
    if (syncData?.syncStatus === 'IDLE') {
      refetch();
    }
  }, [syncData?.syncStatus]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const ss = syncData?.syncStatus ?? syncStatus?.syncStatus;

  const syncVariant = (): 'idle' | 'running' | 'error' | 'never' => {
    if (ss === 'RUNNING')      return 'running';
    if (ss === 'ERROR')        return 'error';
    if (ss === 'NEVER_SYNCED') return 'never';
    return 'idle';
  };

  const syncDotColor = () => {
    const v = syncVariant();
    if (v === 'running') return '#0ea5e9';
    if (v === 'error')   return '#ef4444';
    if (v === 'never')   return '#eab308';
    return '#10b981';
  };

  const lastSyncLabel =
    syncStatus?.lastExpenseSync
      ? `Ostatnia synchronizacja: ${formatDate(syncStatus.lastExpenseSync)}`
      : '';

  return (
    <>
      {/* Section divider */}
      <SectionDivider>
        <SectionTitle>Faktury z KSeF</SectionTitle>
        <SectionLine />
      </SectionDivider>

      {/* Sync status bar */}
      <SyncBar $variant={syncVariant()}>
        {ss === 'RUNNING' ? (
          <SpinnerIcon />
        ) : (
          <SyncDot $color={syncDotColor()} />
        )}
        <span>
          {ss ? SYNC_STATUS_LABEL[ss] : 'Ładowanie statusu…'}
          {ss === 'IDLE' && lastSyncLabel && ` — ${lastSyncLabel}`}
        </span>
        {ss === 'ERROR' && syncStatus?.lastError && (
          <span style={{ marginLeft: 6, opacity: 0.8 }}>
            ({syncStatus.lastError.slice(0, 120)})
          </span>
        )}
      </SyncBar>

      {/* Controls: year + stats + fetch button */}
      <ControlsBar>
        <YearSelect value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </YearSelect>

        {statistics && (
          <StatsChips>
            <StatChip title="Koszty brutto za rok">
              {formatMoney(statistics.totals.costsGross)} brutto
            </StatChip>
            <StatChip title="Koszty netto za rok">
              {formatMoney(statistics.totals.costsNet)} netto
            </StatChip>
            <StatChip title="Liczba faktur kosztowych">
              {statistics.totals.expenseCount} faktur
              {statistics.totals.correctionCount > 0 && ` + ${statistics.totals.correctionCount} korekt`}
            </StatChip>
          </StatsChips>
        )}

        <Spacer />

        <SmallBtn onClick={() => setShowFetchModal(true)}>
          <IconDownload />
          Pobierz faktury
        </SmallBtn>
      </ControlsBar>

      {/* Error */}
      {isError && (
        <ErrorBanner>
          Nie udało się załadować faktur KSeF.{' '}
          <button
            onClick={() => refetch()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'inherit', font: 'inherit' }}
          >
            Spróbuj ponownie
          </button>
        </ErrorBanner>
      )}

      {/* Table */}
      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <Th $w="90px">Data</Th>
              <Th>Sprzedawca</Th>
              <Th>Numer faktury</Th>
              <Th>Typ / Status</Th>
              <Th $align="right">Kwota</Th>
              <Th>Forma płatności</Th>
              <Th $w="100px" />
            </tr>
          </Thead>
          <tbody>
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <Tr key={i}>
                    {[70, 140, 130, 110, 80, 90, 60].map((w, j) => (
                      <Td key={j}><Skel $w={`${w}px`} /></Td>
                    ))}
                  </Tr>
                ))
              : invoices.length === 0
              ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState>
                        {ss === 'NEVER_SYNCED'
                          ? 'Brak danych – uruchom synchronizację lub pobierz faktury ręcznie.'
                          : 'Brak faktur kosztowych z KSeF za wybrany okres.'}
                      </EmptyState>
                    </td>
                  </tr>
                )
              : invoices.map((inv) => <InvoiceRow key={inv.id} invoice={inv} />)
            }
          </tbody>
        </Table>
      </TableWrap>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationRow>
          <PaginationInfo>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} z {total}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn $disabled={page === 1} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <IconChevLeft /> Poprzednia
            </PageBtn>
            <PageBtn $disabled={page >= totalPages} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Następna <IconChevRight />
            </PageBtn>
          </PaginationBtns>
        </PaginationRow>
      )}

      {/* Fetch modal */}
      {showFetchModal && <FetchModal onClose={() => setShowFetchModal(false)} />}
    </>
  );
};
