import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';
import type { IncomeDocument, IncomeDocumentType, KsefRevenueStatus } from '../types';
import { useExcludeIncomeDocument, useRestoreIncomeDocument } from '../hooks/useIncomeDocuments';
import { formatMoney, formatDate } from '../utils/formatters';

// ─── Layout (spójny z pozostałymi tabelami modułu finansowego) ───────────────

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
  min-width: 1140px;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const Th = styled.th<{ $align?: 'left' | 'right' }>`
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

const Td = styled.td<{ $align?: 'left' | 'right' }>`
  padding: 13px 16px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};
  white-space: nowrap;
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const DocumentNumber = styled.div`
  font-weight: 600;
`;

const KsefNumber = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PartyName = styled.div`
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PartyNip = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
`;

const Amount = styled.span<{ $negative?: boolean }>`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${(p) => (p.$negative ? '#dc2626' : p.theme.colors.text)};
`;

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

const Muted = styled.span`
  color: ${(p) => p.theme.colors.textMuted};
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
`;

const ActionBtn = styled.button<{ $variant: 'exclude' | 'restore' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$variant === 'restore' ? '#15803d' : p.theme.colors.textMuted)};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$variant === 'restore' ? '#f0fdf4' : '#f8fafc')};
    border-color: ${(p) => (p.$variant === 'restore' ? '#86efac' : '#cbd5e1')};
    color: ${(p) => (p.$variant === 'restore' ? '#166534' : p.theme.colors.text)};
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Słowniki prezentacji ─────────────────────────────────────────────────────

const DOCUMENT_TYPE: Record<IncomeDocumentType, { label: string; bg: string; fg: string }> = {
  INVOICE:    { label: 'Faktura',  bg: '#eff6ff', fg: '#1d4ed8' },
  CORRECTION: { label: 'Korekta',  bg: '#fdf4ff', fg: '#a21caf' },
  RECEIPT:    { label: 'Paragon',  bg: '#f0fdf4', fg: '#15803d' },
  OTHER:      { label: 'Inny',     bg: '#f8fafc', fg: '#475569' },
};

const KSEF_STATUS: Record<KsefRevenueStatus, { label: string; bg: string; fg: string; title?: string }> = {
  PENDING:      { label: 'Oczekuje',      bg: '#f1f5f9', fg: '#475569' },
  SENDING:      { label: 'Wysyłanie...',  bg: '#eff6ff', fg: '#1d4ed8' },
  SUBMITTED:    { label: 'Przetwarzanie', bg: '#eff6ff', fg: '#1d4ed8', title: 'Przyjęta do sesji KSeF, oczekuje na numer' },
  ACCEPTED:     { label: 'W KSeF',        bg: '#f0fdf4', fg: '#15803d' },
  REJECTED:     { label: 'Odrzucona',     bg: '#fef2f2', fg: '#dc2626' },
  QUEUED_RETRY: { label: 'Offline24',     bg: '#fffbeb', fg: '#b45309', title: 'KSeF niedostępny: faktura zostanie dosłana automatycznie' },
  NOT_SENT:     { label: 'Poza KSeF',     bg: '#f8fafc', fg: '#475569', title: 'Faktura wystawiona bez wysyłki do KSeF' },
};

const ORIGIN_LABEL: Record<string, string> = {
  CRM:      'CRM',
  EXTERNAL: 'Zewnętrzny',
  VISIT:    'Wizyta',
  MANUAL:   'Ręcznie',
};

const PAYMENT_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  PAID:    { label: 'Opłacony',        bg: '#f0fdf4', fg: '#15803d' },
  PENDING: { label: 'Oczekuje',        bg: '#fffbeb', fg: '#b45309' },
  OVERDUE: { label: 'Przeterminowany', bg: '#fef2f2', fg: '#dc2626' },
};

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

interface IncomeDocumentsTableProps {
  documents: IncomeDocument[];
  isLoading: boolean;
  onSelect: (document: IncomeDocument) => void;
}

export const IncomeDocumentsTable: React.FC<IncomeDocumentsTableProps> = ({
  documents,
  isLoading,
  onSelect,
}) => {
  const excludeMutation = useExcludeIncomeDocument();
  const restoreMutation = useRestoreIncomeDocument();
  const busy = excludeMutation.isPending || restoreMutation.isPending;

  /** Ukrycie to akcja wiersza, nie wejście w szczegóły — klik nie może otwierać modala. */
  const toggleExcluded = (event: React.MouseEvent, doc: IncomeDocument) => {
    event.stopPropagation();
    const mutation = doc.excluded ? restoreMutation : excludeMutation;
    mutation.mutate({ sourceKind: doc.sourceKind, id: doc.id });
  };

  if (!isLoading && documents.length === 0) {
    return (
      <EmptyState>
        <strong>Brak dokumentów przychodowych</strong>
        Wystaw fakturę (trafi do KSeF) lub dodaj paragon. Faktury sprzedażowe wystawione
        poza CRM pojawią się tu automatycznie po synchronizacji z KSeF.
      </EmptyState>
    );
  }

  return (
    <Wrapper>
      <Table>
        <Thead>
          <tr>
            <Th>Data</Th>
            <Th>Typ</Th>
            <Th>Numer</Th>
            <Th>Nabywca</Th>
            <Th $align="right">Brutto</Th>
            <Th>Status KSeF</Th>
            <Th>Źródło</Th>
            <Th>Płatność</Th>
            <Th $align="right">Akcje</Th>
          </tr>
        </Thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div /></td>
                  ))}
                </SkeletonRow>
              ))
            : documents.map((doc) => {
                const type = DOCUMENT_TYPE[doc.documentType] ?? DOCUMENT_TYPE.OTHER;
                const ksef = doc.ksefStatus ? KSEF_STATUS[doc.ksefStatus] : null;
                const payment = PAYMENT_STATUS[doc.paymentStatus] ?? PAYMENT_STATUS.PENDING;

                return (
                  <Tr
                    key={`${doc.sourceKind}-${doc.id}`}
                    $muted={
                      doc.excluded ||
                      doc.duplicateStatus === 'CONFIRMED_DUPLICATE' ||
                      doc.ksefStatus === 'REJECTED'
                    }
                    onClick={() => onSelect(doc)}
                  >
                    <Td>{formatDate(doc.issueDate)}</Td>
                    <Td><Badge $bg={type.bg} $fg={type.fg}>{type.label}</Badge></Td>
                    <Td>
                      <DocumentNumber>{doc.documentNumber}</DocumentNumber>
                      {doc.ksefNumber && <KsefNumber title={doc.ksefNumber}>{doc.ksefNumber}</KsefNumber>}
                      {doc.excluded && (
                        <Badge
                          $bg="#f1f5f9" $fg="#475569" $border="#cbd5e1"
                          title="Dokument nie wchodzi do statystyk ani do kafli podsumowania"
                          style={{ marginTop: 4 }}
                        >
                          Ukryty ze statystyk
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <PartyName>{doc.counterpartyName ?? '-'}</PartyName>
                      <PartyNip>{doc.counterpartyNip ? `NIP ${doc.counterpartyNip}` : 'Konsument'}</PartyNip>
                    </Td>
                    <Td $align="right">
                      <Amount $negative={doc.totalGross < 0}>{formatMoney(doc.totalGross)}</Amount>
                    </Td>
                    <Td>
                      {ksef ? (
                        <>
                          <Badge $bg={ksef.bg} $fg={ksef.fg} title={ksef.title}>{ksef.label}</Badge>
                          {doc.duplicateStatus === 'SUSPECTED' && (
                            <>
                              {' '}
                              <Badge
                                $bg="#fef2f2" $fg="#b91c1c" $border="#fecaca"
                                title="Możliwe podwójne fakturowanie: kliknij, aby rozstrzygnąć"
                              >
                                ⚠ Duplikat?
                              </Badge>
                            </>
                          )}
                        </>
                      ) : (
                        <Muted title="Dokument nie podlega wysyłce do KSeF">-</Muted>
                      )}
                    </Td>
                    <Td>
                      <Badge $bg="#f8fafc" $fg="#475569">
                        {ORIGIN_LABEL[doc.origin ?? ''] ?? '-'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge $bg={payment.bg} $fg={payment.fg}>{payment.label}</Badge>
                      {doc.paymentLabel && <PartyNip>{doc.paymentLabel}</PartyNip>}
                    </Td>
                    <Td $align="right">
                      <ActionsCell>
                        <ActionBtn
                          type="button"
                          $variant={doc.excluded ? 'restore' : 'exclude'}
                          disabled={busy}
                          onClick={(e) => toggleExcluded(e, doc)}
                          title={doc.excluded ? 'Przywróć do statystyk' : 'Ukryj ze statystyk'}
                        >
                          {doc.excluded ? <Eye size={15} /> : <EyeOff size={15} />}
                        </ActionBtn>
                      </ActionsCell>
                    </Td>
                  </Tr>
                );
              })}
        </tbody>
      </Table>
    </Wrapper>
  );
};
