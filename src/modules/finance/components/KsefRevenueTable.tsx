import React from 'react';
import styled, { keyframes } from 'styled-components';
import type { RevenueInvoice, KsefRevenueStatus } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';

// ─── Animations / layout (spójne z KsefExpensesTable) ────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
  padding: 14px 16px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.55px;
  white-space: nowrap;
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const Tr = styled.tr<{ $muted?: boolean }>`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background 0.12s ease;
  animation: ${fadeIn} 0.18s ease-out;
  cursor: pointer;
  opacity: ${(p) => (p.$muted ? 0.55 : 1)};
  &:last-child { border-bottom: none; }
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
  padding: 13px 16px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};
  white-space: nowrap;
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const InvoiceNumber = styled.div`
  font-weight: 600;
`;

const KsefNumber = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BuyerName = styled.div`
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BuyerNip = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
`;

const Amount = styled.span<{ $negative?: boolean }>`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${(p) => (p.$negative ? '#dc2626' : p.theme.colors.text)};
`;

// ─── Badges ───────────────────────────────────────────────────────────────────

const Badge = styled.span<{ $bg: string; $fg: string; $border?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg};
  border: 1px solid ${(p) => p.$border ?? 'transparent'};
  white-space: nowrap;
`;

const STATUS_BADGE: Record<KsefRevenueStatus, { label: string; bg: string; fg: string; title?: string }> = {
  PENDING:      { label: 'Oczekuje',        bg: '#f1f5f9', fg: '#475569' },
  SENDING:      { label: 'Wysyłanie…',      bg: '#eff6ff', fg: '#1d4ed8' },
  SUBMITTED:    { label: 'Przetwarzanie',   bg: '#eff6ff', fg: '#1d4ed8', title: 'Przyjęta do sesji KSeF — oczekuje na numer' },
  ACCEPTED:     { label: 'W KSeF',          bg: '#f0fdf4', fg: '#15803d' },
  REJECTED:     { label: 'Odrzucona',       bg: '#fef2f2', fg: '#dc2626' },
  QUEUED_RETRY: { label: 'Offline24',       bg: '#fffbeb', fg: '#b45309', title: 'KSeF niedostępny — faktura zostanie dosłana automatycznie' },
};

export const RevenueStatusBadge: React.FC<{ status: KsefRevenueStatus }> = ({ status }) => {
  const cfg = STATUS_BADGE[status];
  return <Badge $bg={cfg.bg} $fg={cfg.fg} title={cfg.title}>{cfg.label}</Badge>;
};

const DuplicateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  white-space: nowrap;
`;

// ─── Skeleton / empty ─────────────────────────────────────────────────────────

const SkeletonRow = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  td {
    padding: 13px 16px;
    div {
      height: 14px;
      border-radius: 6px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: ${shimmer} 1.4s infinite;
    }
  }
`;

const EmptyState = styled.div`
  padding: 56px 24px;
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;

  strong {
    display: block;
    font-size: 15px;
    color: ${(p) => p.theme.colors.textSecondary};
    margin-bottom: 4px;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface KsefRevenueTableProps {
  invoices:  RevenueInvoice[];
  isLoading: boolean;
  onSelect:  (invoice: RevenueInvoice) => void;
}

export const KsefRevenueTable: React.FC<KsefRevenueTableProps> = ({ invoices, isLoading, onSelect }) => {
  if (!isLoading && invoices.length === 0) {
    return (
      <EmptyState>
        <strong>Brak faktur przychodowych</strong>
        Wystaw pierwszą fakturę — trafi bezpośrednio do KSeF. Faktury wystawione
        poza CRM pojawią się tu automatycznie po synchronizacji.
      </EmptyState>
    );
  }

  return (
    <Wrapper>
      <Table>
        <Thead>
          <tr>
            <Th>Data</Th>
            <Th>Numer</Th>
            <Th>Nabywca</Th>
            <Th>Typ</Th>
            <Th $align="right">Brutto</Th>
            <Th>Status KSeF</Th>
            <Th>Źródło</Th>
            <Th>Płatność</Th>
          </tr>
        </Thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div /></td>
                  ))}
                </SkeletonRow>
              ))
            : invoices.map((invoice) => (
                <Tr
                  key={invoice.id}
                  $muted={invoice.duplicateStatus === 'CONFIRMED_DUPLICATE' || invoice.ksefStatus === 'REJECTED'}
                  onClick={() => onSelect(invoice)}
                >
                  <Td>{formatDate(invoice.issueDate)}</Td>
                  <Td>
                    <InvoiceNumber>{invoice.invoiceNumber}</InvoiceNumber>
                    {invoice.ksefNumber && <KsefNumber title={invoice.ksefNumber}>{invoice.ksefNumber}</KsefNumber>}
                  </Td>
                  <Td>
                    <BuyerName>{invoice.buyer.name ?? '—'}</BuyerName>
                    <BuyerNip>{invoice.buyer.nip ? `NIP ${invoice.buyer.nip}` : 'Konsument'}</BuyerNip>
                  </Td>
                  <Td>
                    {invoice.invoiceType === 'KOR'
                      ? <Badge $bg="#fdf4ff" $fg="#a21caf">Korekta</Badge>
                      : <Badge $bg="#f8fafc" $fg="#475569">VAT</Badge>}
                  </Td>
                  <Td $align="right">
                    <Amount $negative={invoice.totalGross < 0}>{formatMoney(invoice.totalGross)}</Amount>
                  </Td>
                  <Td>
                    <RevenueStatusBadge status={invoice.ksefStatus} />
                    {invoice.duplicateStatus === 'SUSPECTED' && (
                      <>
                        {' '}
                        <DuplicateBadge title="Możliwe podwójne fakturowanie — kliknij, aby rozstrzygnąć">
                          ⚠ Duplikat?
                        </DuplicateBadge>
                      </>
                    )}
                  </Td>
                  <Td>
                    {invoice.source === 'CRM'
                      ? <Badge $bg="#eff6ff" $fg="#1d4ed8">CRM</Badge>
                      : <Badge $bg="#f5f3ff" $fg="#6d28d9" title="Wystawiona poza CRM, pobrana z KSeF">Zewnętrzna</Badge>}
                  </Td>
                  <Td>
                    {invoice.paymentStatus === 'PAID'
                      ? <Badge $bg="#f0fdf4" $fg="#15803d">Opłacona</Badge>
                      : <Badge $bg="#fffbeb" $fg="#b45309">Oczekuje</Badge>}
                  </Td>
                </Tr>
              ))}
        </tbody>
      </Table>
    </Wrapper>
  );
};
