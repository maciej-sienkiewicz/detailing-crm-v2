import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import type { FinancialDocument } from '../types';
import { DocumentStatus } from '../types';
import { useUpdateDocumentStatus, useDeleteDocument } from '../hooks/useFinance';
import { formatMoney, formatDate } from '../utils/formatters';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Table ────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
  background: ${(p) => p.theme.colors.surface};
  border-radius: ${(p) => p.theme.radii.lg};
  overflow: hidden;
`;

const Thead = styled.thead`
  background: ${(p) => p.theme.colors.surfaceAlt};
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center'; $width?: string }>`
  padding: ${(p) => p.theme.spacing.md};
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
  cursor: pointer;
  animation: ${fadeIn} 0.2s ease-out;
  transition: background 0.12s ease;

  &:last-child { border-bottom: none; }

  &:hover {
    background: ${(p) => p.theme.colors.surfaceHover};
    .row-actions { opacity: 1; }
  }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center'; $mono?: boolean }>`
  padding: ${(p) => p.theme.spacing.md};
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};
  ${(p) =>
    p.$mono &&
    css`
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-feature-settings: 'tnum';
    `}
`;

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  PAID:    { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  PENDING: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  OVERDUE: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const StatusBadge = styled.button<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: ${(p) => p.theme.radii.full};
  border: 1px solid ${(p) => statusColors[p.$status]?.border || p.theme.colors.border};
  background: ${(p) => statusColors[p.$status]?.bg || 'transparent'};
  color: ${(p) => statusColors[p.$status]?.color || p.theme.colors.text};
  cursor: pointer;
  transition: filter 0.12s ease;
  white-space: nowrap;

  &:hover { filter: brightness(0.93); }
`;

const StatusDropdownBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1190;
`;

const Dropdown = styled.div`
  position: fixed;
  z-index: 1200;
  min-width: 200px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
`;

const DropdownHead = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%);
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
`;

const DropdownBody = styled.div`
  padding: 8px;
`;

const DropdownItem = styled.button<{ $active?: boolean; $danger?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) =>
    p.$danger ? 'transparent' : p.$active ? 'rgba(99, 102, 241, 0.06)' : 'transparent'};
  color: ${(p) => (p.$danger ? '#ef4444' : p.$active ? '#0f172a' : '#64748b')};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${(p) =>
      p.$danger
        ? 'rgba(239, 68, 68, 0.06)'
        : p.$active
        ? 'rgba(99, 102, 241, 0.08)'
        : 'rgba(0, 0, 0, 0.02)'};
    color: ${(p) => (p.$danger ? '#ef4444' : '#0f172a')};
  }
`;

// ─── Misc ─────────────────────────────────────────────────────────────────────

const DocNumber = styled.span`
  font-weight: ${(p) => p.theme.fontWeights.medium};
  color: var(--brand-primary);
`;

const ClientText = styled.span`
  max-width: 160px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Nip = styled.span`
  display: block;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
`;

const VehicleInfo = styled.span`
  display: block;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
`;

const SourceLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: ${(p) => p.theme.radii.full};
  border: 1px solid ${(p) => p.theme.colors.border};
  background: transparent;
  color: var(--brand-primary);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    background: var(--brand-primary);
    color: white;
    border-color: var(--brand-primary);
  }
`;

const SourceText = styled.span`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.textMuted};
`;

const PriceNet = styled.span`
  display: block;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-feature-settings: 'tnum';
`;

const ActionsCell = styled(Td)`
  width: 48px;
  opacity: 0;
  transition: opacity 0.12s ease;
  &.row-actions { opacity: 0; }
`;

const ActionBtn = styled.button`
  padding: 4px 8px;
  background: transparent;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  color: ${(p) => p.theme.colors.textMuted};
  font-size: ${(p) => p.theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.12s ease;

  &:hover {
    background: var(--brand-primary);
    color: white;
    border-color: var(--brand-primary);
  }
`;

const EmptyState = styled.div`
  padding: ${(p) => p.theme.spacing.xxl};
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: ${(p) => p.theme.fontSizes.sm};
`;

const Skeleton = styled.div<{ $w?: string }>`
  height: 14px;
  width: ${(p) => p.$w || '100%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

const ChevronSvg = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const allStatuses: DocumentStatus[] = [DocumentStatus.PAID, DocumentStatus.PENDING, DocumentStatus.OVERDUE];
const statusLabels: Record<DocumentStatus, string> = {
  [DocumentStatus.PAID]: 'Opłacona',
  [DocumentStatus.PENDING]: 'Oczekująca',
  [DocumentStatus.OVERDUE]: 'Przeterminowana',
};

interface Props {
  documents: FinancialDocument[];
  isLoading?: boolean;
  onDocumentClick?: (doc: FinancialDocument) => void;
}

export const DocumentsTable: React.FC<Props> = ({ documents, isLoading, onDocumentClick }) => {
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const updateStatus = useUpdateDocumentStatus();
  const deleteDocument = useDeleteDocument();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const vw = window.innerWidth;
    let left = rect.left;
    if (left + 180 > vw - 8) left = vw - 188;
    setDropdownPos({ top: rect.bottom + 4, left });
    setOpenStatusId(openStatusId === id ? null : id);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
    setOpenStatusId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć ten dokument?')) {
      deleteDocument.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th><Th>Numer</Th><Th>Klient</Th>
              <Th $align="right">Kwota</Th><Th>Status</Th>
              <Th>Metoda</Th><Th>Źródło</Th><Th>Termin</Th><Th $width="48px"></Th>
            </tr>
          </Thead>
          <tbody>
            {[1,2,3,4,5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} style={{ padding: '12px 16px' }}>
                    <Skeleton $w={j === 0 ? '70px' : j === 1 ? '100px' : j === 3 ? '80px' : '90px'} />
                  </td>
                ))}
                <td style={{ padding: '12px 16px' }} />
              </tr>
            ))}
          </tbody>
        </Table>
      </Wrapper>
    );
  }

  if (documents.length === 0) {
    return <EmptyState>Brak dokumentów finansowych dla wybranych filtrów</EmptyState>;
  }

  return (
    <>
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Data sprzedaży</Th>
              <Th>Numer</Th>
              <Th>Klient</Th>
              <Th $align="right">Kwota</Th>
              <Th>Status</Th>
              <Th>Metoda</Th>
              <Th>Źródło</Th>
              <Th>Termin płatności</Th>
              <Th $width="48px"></Th>
            </tr>
          </Thead>
          <tbody>
            {documents.map((doc) => (
              <Tr key={doc.id} onClick={() => onDocumentClick?.(doc)}>
                <Td>{formatDate(doc.issueDate)}</Td>
                <Td>
                  <DocNumber>{doc.documentNumber}</DocNumber>
                </Td>
                <Td>
                  {(() => {
                    const clientName = doc.counterpartyName
                      ?? (doc.customerFirstName || doc.customerLastName
                          ? `${doc.customerFirstName ?? ''} ${doc.customerLastName ?? ''}`.trim()
                          : null);
                    return clientName ? (
                      <>
                        <ClientText title={clientName}>{clientName}</ClientText>
                        {doc.counterpartyNip && <Nip>NIP: {doc.counterpartyNip}</Nip>}
                        {doc.visitId && (doc.vehicleBrand || doc.vehicleModel) && (
                          <VehicleInfo>
                            {[doc.vehicleBrand, doc.vehicleModel].filter(Boolean).join(' ')}
                          </VehicleInfo>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    );
                  })()}
                </Td>
                <Td $align="right" $mono>
                  {formatMoney(doc.totalGross)}
                  <PriceNet>{formatMoney(doc.totalNet)} netto</PriceNet>
                </Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <StatusBadge
                    $status={doc.status}
                    onClick={(e) => handleStatusClick(doc.id, e)}
                  >
                    {doc.statusLabel}
                    <ChevronSvg />
                  </StatusBadge>
                </Td>
                <Td>{doc.paymentMethodLabel}</Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  {doc.source === 'VISIT' && doc.visitId ? (
                    <SourceLink
                      onClick={() => navigate(`/visits/${doc.visitId}`)}
                      title="Przejdź do wizyty"
                    >
                      {doc.sourceLabel}
                    </SourceLink>
                  ) : (
                    <SourceText>{doc.sourceLabel}</SourceText>
                  )}
                </Td>
                <Td>
                  {doc.dueDate ? (
                    <span
                      style={{
                        color:
                          doc.status === 'OVERDUE'
                            ? '#ef4444'
                            : doc.status === 'PENDING' && doc.dueDate <= new Date().toISOString().split('T')[0]
                            ? '#f59e0b'
                            : undefined,
                      }}
                    >
                      {formatDate(doc.dueDate)}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                  )}
                </Td>
                <ActionsCell className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <ActionBtn onClick={(e) => handleDelete(doc.id, e)} title="Usuń">
                    ✕
                  </ActionBtn>
                </ActionsCell>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Wrapper>

      {openStatusId &&
        dropdownPos &&
        createPortal(
          <>
            <StatusDropdownBackdrop onClick={() => setOpenStatusId(null)} />
            <Dropdown ref={dropdownRef} style={{ top: dropdownPos.top, left: dropdownPos.left }}>
              <DropdownHead>Status dokumentu</DropdownHead>
              <DropdownBody>
                {allStatuses.map((s) => (
                  <DropdownItem
                    key={s}
                    $active={documents.find((d) => d.id === openStatusId)?.status === s}
                    onClick={() => handleStatusChange(openStatusId, s)}
                  >
                    {statusLabels[s]}
                  </DropdownItem>
                ))}
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', margin: '4px 0' }} />
                <DropdownItem
                  $danger
                  onClick={(e) => {
                    handleDelete(openStatusId, e);
                    setOpenStatusId(null);
                  }}
                >
                  Usuń dokument
                </DropdownItem>
              </DropdownBody>
            </Dropdown>
          </>,
          document.body
        )}
    </>
  );
};
