import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { FinancialDocument } from '../types';
import { useSyncSingleInvoice } from '../hooks/useInvoicing';

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

// ─── Table skeleton ───────────────────────────────────────────────────────────

const Wrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  background: ${(p) => p.theme.colors.surface};
  border-radius: ${(p) => p.theme.radii.lg};
  overflow: hidden;
`;

const Thead = styled.thead`
  background: ${(p) => p.theme.colors.surfaceAlt};
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center'; $width?: string }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  text-align: ${(p) => p.$align || 'left'};
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: 600;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  width: ${(p) => p.$width || 'auto'};
`;

const Tr = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  animation: ${fadeIn} 0.2s ease-out;
  transition: background 0.12s ease;

  &:last-child { border-bottom: none; }
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center'; $mono?: boolean }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};
  ${(p) =>
    p.$mono &&
    css`
      font-family: 'JetBrains Mono', 'SF Mono', monospace;
      font-feature-settings: 'tnum';
    `}
`;

const Skeleton = styled.div<{ $w?: string }>`
  height: 14px;
  width: ${(p) => p.$w || '100%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

const EmptyState = styled.div`
  padding: ${(p) => p.theme.spacing.xxl};
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: ${(p) => p.theme.fontSizes.sm};
`;

// ─── Badges ───────────────────────────────────────────────────────────────────

const paymentStatusColors: Record<string, { bg: string; color: string; border: string }> = {
  ISSUED:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  PAID:      { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  PENDING:   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  OVERDUE:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  CANCELLED: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
};

const syncStatusColors: Record<string, { bg: string; color: string; border: string }> = {
  SYNCED:      { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  SYNC_FAILED: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  PENDING:     { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
};

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${(p) => paymentStatusColors[p.$status]?.border ?? '#e2e8f0'};
  background: ${(p) => paymentStatusColors[p.$status]?.bg ?? '#f8fafc'};
  color: ${(p) => paymentStatusColors[p.$status]?.color ?? '#475569'};
  white-space: nowrap;
`;

const SyncBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${(p) => syncStatusColors[p.$status]?.border ?? '#e2e8f0'};
  background: ${(p) => syncStatusColors[p.$status]?.bg ?? '#f8fafc'};
  color: ${(p) => syncStatusColors[p.$status]?.color ?? '#475569'};
  white-space: nowrap;
`;

// ─── Spinner ──────────────────────────────────────────────────────────────────

const SpinnerIcon = styled.span`
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top-color: ${st.accentBlue};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

// ─── Action buttons ───────────────────────────────────────────────────────────

const ActionsCell = styled(Td)`
  width: 1px;
  white-space: nowrap;
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${st.border};
  border-radius: 7px;
  background: ${st.bgCard};
  color: ${st.textSecondary};
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;

  &:hover {
    background: ${st.accentBlueDim};
    border-color: ${st.accentBlue}55;
    color: ${st.accentBlue};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ─── Money / date formatting ───────────────────────────────────────────────────

const formatMoney = (cents: number, currency = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(cents / 100);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const SubText = styled.span`
  display: block;
  font-size: 11px;
  color: ${st.textMuted};
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const RefreshSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ExternalLinkSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ─── Toast-like notification ──────────────────────────────────────────────────

const ToastWrap = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  padding: 12px 20px;
  background: #1e293b;
  color: #f8fafc;
  font-size: 13px;
  font-weight: 500;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 0.3s ease;
  pointer-events: none;
`;

// ─── Single-row sync button ───────────────────────────────────────────────────

const SyncingRow: React.FC<{ doc: FinancialDocument; providerLabel: string }> = ({
  doc,
  providerLabel,
}) => {
  const syncSingle = useSyncSingleInvoice();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleSync = async () => {
    try {
      await syncSingle.mutateAsync(doc.id);
      showToast('Status faktury zaktualizowany');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Błąd synchronizacji';
      showToast(`${providerLabel}: ${msg}`);
    }
  };

  const handlePortal = () => {
    if (doc.externalUrl) {
      window.open(doc.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <ActionGroup>
        <IconBtn onClick={handleSync} disabled={syncSingle.isPending} title="Odśwież status">
          {syncSingle.isPending ? <SpinnerIcon /> : <RefreshSvg />}
          Odśwież
        </IconBtn>
        <IconBtn
          onClick={handlePortal}
          disabled={!doc.externalUrl}
          title={doc.externalUrl ? `Zarządzaj w ${providerLabel}` : 'Brak linku do dostawcy'}
        >
          <ExternalLinkSvg />
          {providerLabel}
        </IconBtn>
      </ActionGroup>
      {createPortal(
        <ToastWrap $visible={toastVisible}>{toastMsg}</ToastWrap>,
        document.body
      )}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  invoices: FinancialDocument[];
  isLoading?: boolean;
  providerLabel: string;
}

export const ExternalInvoicesTable: React.FC<Props> = ({ invoices, isLoading, providerLabel }) => {
  if (isLoading) {
    return (
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Nr faktury</Th>
              <Th>Klient</Th>
              <Th $align="right">Kwota</Th>
              <Th>Status płatności</Th>
              <Th>Synchronizacja</Th>
              <Th $width="1px"></Th>
            </tr>
          </Thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {[80, 120, 70, 90, 80].map((w, j) => (
                  <td key={j} style={{ padding: '10px 16px' }}>
                    <Skeleton $w={`${w}px`} />
                  </td>
                ))}
                <td style={{ padding: '10px 16px' }} />
              </tr>
            ))}
          </tbody>
        </Table>
      </Wrapper>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState>
        Brak faktur do wyświetlenia. Użyj przycisku "Synchronizuj statusy", aby pobrać dane z {providerLabel}.
      </EmptyState>
    );
  }

  return (
    <Wrapper>
      <Table>
        <Thead>
          <tr>
            <Th>Nr faktury</Th>
            <Th>Klient</Th>
            <Th $align="right">Kwota</Th>
            <Th>Status płatności</Th>
            <Th>Synchronizacja</Th>
            <Th $width="1px"></Th>
          </tr>
        </Thead>
        <tbody>
          {invoices.map((doc) => (
            <Tr key={doc.id}>
              <Td>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                  {doc.externalNumber ?? doc.documentNumber}
                </span>
                <SubText>{formatDate(doc.issueDate)}</SubText>
              </Td>
              <Td>
                {doc.counterpartyName ?? <span style={{ color: st.textMuted }}>—</span>}
                {doc.counterpartyNip && <SubText>NIP: {doc.counterpartyNip}</SubText>}
              </Td>
              <Td $align="right" $mono>
                {formatMoney(doc.totalGross, doc.currency)}
                <SubText>{formatMoney(doc.totalNet, doc.currency)} netto</SubText>
              </Td>
              <Td>
                <StatusBadge $status={doc.externalStatus ?? doc.status}>
                  {doc.externalStatusLabel ?? doc.statusLabel}
                </StatusBadge>
              </Td>
              <Td>
                {doc.providerSyncStatus ? (
                  <>
                    <SyncBadge $status={doc.providerSyncStatus}>
                      {doc.providerSyncStatusLabel}
                    </SyncBadge>
                    {doc.providerSyncError && (
                      <SubText title={doc.providerSyncError}>Błąd</SubText>
                    )}
                  </>
                ) : (
                  <span style={{ color: st.textMuted }}>—</span>
                )}
              </Td>
              <ActionsCell>
                <SyncingRow doc={doc} providerLabel={providerLabel} />
              </ActionsCell>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
};
