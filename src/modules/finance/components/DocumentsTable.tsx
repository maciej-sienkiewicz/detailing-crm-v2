import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import type { FinancialDocument } from '../types';
import { DocumentStatus } from '../types';
import {
  useUpdateDocumentStatus,
  useDeleteDocument,
  useUpdateDocumentNumber,
} from '../hooks/useFinance';
import { formatMoney, formatDate } from '../utils/formatters';

// ─── Animations ──────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ──────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: ${(p) => p.theme.radii.lg};
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center'; $width?: string }>`
  padding: 14px 16px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  width: ${(p) => p.$width || 'auto'};

  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background 0.12s ease;
  animation: ${fadeIn} 0.18s ease-out;
  cursor: pointer;

  &:last-child { border-bottom: none; }

  &:hover {
    background: ${(p) => p.theme.colors.surfaceHover};
    .doc-edit-btn { opacity: 1; }
  }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center'; $mono?: boolean }>`
  padding: 12px 16px;
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};

  ${(p) =>
    p.$mono &&
    css`
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
      font-feature-settings: 'tnum';
    `}

  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

// ─── Date ────────────────────────────────────────────────────────────────────

const DatePrimary = styled.span`
  display: block;
  font-weight: 500;
  white-space: nowrap;
`;

const DueDateText = styled.span<{ $overdue?: boolean }>`
  display: block;
  margin-top: 3px;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => (p.$overdue ? '#ef4444' : p.theme.colors.textMuted)};
  white-space: nowrap;
`;

// ─── Document type ────────────────────────────────────────────────────────────

const DocTypeBadge = styled.span<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${(p) => p.theme.radii.full};
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  background: ${(p) =>
    p.$type === 'INVOICE' ? '#eff6ff' : p.$type === 'RECEIPT' ? '#f0fdf4' : '#f5f3ff'};
  color: ${(p) =>
    p.$type === 'INVOICE' ? '#1d4ed8' : p.$type === 'RECEIPT' ? '#15803d' : '#7c3aed'};
  border: 1px solid ${(p) =>
    p.$type === 'INVOICE' ? '#bfdbfe' : p.$type === 'RECEIPT' ? '#bbf7d0' : '#ddd6fe'};
`;

const DocDescription = styled.span`
  display: block;
  margin-top: 4px;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// ─── Document number (inline edit) ───────────────────────────────────────────

const DocNumberWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const DocNumberValue = styled.span`
  font-weight: 600;
  color: var(--brand-primary);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 13px;
  letter-spacing: -0.2px;
  white-space: nowrap;
`;

const DocEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textMuted};
  opacity: 0;
  transition: all 0.12s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    color: var(--brand-primary);
    opacity: 1 !important;
  }

  svg { width: 12px; height: 12px; }
`;

const NumberEditWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const NumberInput = styled.input`
  padding: 5px 8px;
  border: 2px solid var(--brand-primary);
  border-radius: 6px;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-weight: 600;
  color: #0f172a;
  background: #fff;
  outline: none;
  min-width: 100px;
  max-width: 160px;

  &:focus {
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
  }
`;

const IconBtn = styled.button<{ $variant?: 'save' | 'cancel' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;

  ${(p) =>
    p.$variant === 'save'
      ? css`
          border: none;
          background: #0ea5e9;
          color: white;
          &:hover { background: #0284c7; }
        `
      : css`
          border: 1px solid ${p.theme.colors.border};
          background: transparent;
          color: ${p.theme.colors.textMuted};
          &:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }
        `}

  svg { width: 12px; height: 12px; }
`;

// ─── Client ──────────────────────────────────────────────────────────────────

const ClientName = styled.span`
  display: block;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClientNip = styled.span`
  display: block;
  margin-top: 2px;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
`;

// ─── Amount ──────────────────────────────────────────────────────────────────

const AmountGross = styled.span`
  display: block;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  font-feature-settings: 'tnum';
  white-space: nowrap;
`;

const AmountNet = styled.span`
  display: block;
  margin-top: 2px;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  font-family: 'JetBrains Mono', monospace;
  font-feature-settings: 'tnum';
  white-space: nowrap;
`;

// ─── Payment status ───────────────────────────────────────────────────────────

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

const PaymentMethodLabel = styled.span`
  display: block;
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  margin-bottom: 5px;
  white-space: nowrap;
`;

// ─── Source ───────────────────────────────────────────────────────────────────

const SourceBadge = styled.span<{ $external: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: ${(p) => p.theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: ${(p) => (p.$external ? '#f5f3ff' : '#f0f9ff')};
  color: ${(p) => (p.$external ? '#7c3aed' : '#0369a1')};
  border: 1px solid ${(p) => (p.$external ? '#ddd6fe' : '#bae6fd')};

  svg { flex-shrink: 0; }
`;

// ─── Sync status ──────────────────────────────────────────────────────────────

const SyncBadge = styled.span<{ $s: 'synced' | 'failed' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: ${(p) => p.theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: ${(p) =>
    p.$s === 'synced' ? '#dcfce7' : p.$s === 'failed' ? '#fee2e2' : '#fef9c3'};
  color: ${(p) =>
    p.$s === 'synced' ? '#166534' : p.$s === 'failed' ? '#991b1b' : '#854d0e'};
  border: 1px solid ${(p) =>
    p.$s === 'synced' ? '#86efac' : p.$s === 'failed' ? '#fca5a5' : '#fde047'};

  svg { flex-shrink: 0; }
`;

const Muted = styled.span`
  color: #9ca3af;
  font-size: 16px;
`;

// ─── Status dropdown ──────────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1190;
`;

const Dropdown = styled.div`
  position: fixed;
  z-index: 1200;
  min-width: 200px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  animation: ${fadeIn} 0.15s ease-out;
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
  border: 1px solid ${(p) => (p.$active ? 'rgba(99,102,241,0.2)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) =>
    p.$danger ? 'transparent' : p.$active ? 'rgba(99,102,241,0.06)' : 'transparent'};
  color: ${(p) => (p.$danger ? '#ef4444' : p.$active ? '#0f172a' : '#64748b')};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${(p) =>
      p.$danger
        ? 'rgba(239,68,68,0.06)'
        : p.$active
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(0,0,0,0.02)'};
    color: ${(p) => (p.$danger ? '#ef4444' : '#0f172a')};
  }
`;

// ─── Misc ─────────────────────────────────────────────────────────────────────

const DeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textMuted};
  opacity: 0;
  transition: all 0.12s ease;

  tr:hover & { opacity: 1; }
  &:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }

  svg { width: 14px; height: 14px; }
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
  padding: 56px;
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: ${(p) => p.theme.fontSizes.sm};
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconPencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const IconApp = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconExternal = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: DocumentStatus[] = [DocumentStatus.PAID, DocumentStatus.PENDING, DocumentStatus.OVERDUE];

const STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.PAID]:    'Opłacona',
  [DocumentStatus.PENDING]: 'Oczekująca',
  [DocumentStatus.OVERDUE]: 'Przeterminowana',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SyncStatus = 'synced' | 'failed' | 'pending' | 'na';

const getSyncStatus = (doc: FinancialDocument): SyncStatus => {
  if (doc.documentType !== 'INVOICE' || !doc.providerSyncStatus) return 'na';
  if (doc.providerSyncStatus === 'SYNCED') return 'synced';
  if (doc.providerSyncStatus === 'SYNC_FAILED') return 'failed';
  return 'pending';
};

const SYNC_LABELS: Record<Exclude<SyncStatus, 'na'>, string> = {
  synced:  'Zsynchronizowano',
  failed:  'Błąd sync',
  pending: 'Oczekuje',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  documents: FinancialDocument[];
  isLoading?: boolean;
  onDocumentClick?: (doc: FinancialDocument) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DocumentsTable: React.FC<Props> = ({ documents, isLoading, onDocumentClick }) => {
  const [openStatusId, setOpenStatusId]       = useState<string | null>(null);
  const [dropdownPos, setDropdownPos]         = useState<{ top: number; left: number } | null>(null);
  const [editingNumberId, setEditingNumberId] = useState<string | null>(null);
  const [editingNumberVal, setEditingNumberVal] = useState('');

  const dropdownRef   = useRef<HTMLDivElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const navigate      = useNavigate();

  const updateStatus = useUpdateDocumentStatus();
  const deleteDoc    = useDeleteDocument();
  const updateNumber = useUpdateDocumentNumber();

  // Close status dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus & select when editing starts
  useEffect(() => {
    if (editingNumberId && numberInputRef.current) {
      numberInputRef.current.focus();
      numberInputRef.current.select();
    }
  }, [editingNumberId]);

  // ── Status dropdown ────────────────────────────────────────────────────────

  const handleStatusClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const vw = window.innerWidth;
    let left = rect.left;
    if (left + 210 > vw - 8) left = vw - 218;
    setDropdownPos({ top: rect.bottom + 4, left });
    setOpenStatusId(openStatusId === id ? null : id);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
    setOpenStatusId(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć ten dokument?')) {
      deleteDoc.mutate(id);
    }
  };

  // ── Inline number editing ──────────────────────────────────────────────────

  const startEdit = (doc: FinancialDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNumberId(doc.id);
    setEditingNumberVal(doc.documentNumber);
  };

  const saveNumber = () => {
    if (!editingNumberId) return;
    const trimmed = editingNumberVal.trim();
    const original = documents.find((d) => d.id === editingNumberId)?.documentNumber;
    if (trimmed && trimmed !== original) {
      updateNumber.mutate({ id: editingNumberId, documentNumber: trimmed });
    }
    setEditingNumberId(null);
  };

  const cancelEdit = () => {
    setEditingNumberId(null);
    setEditingNumberVal('');
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  saveNumber();
    if (e.key === 'Escape') cancelEdit();
  };

  const canEditNumber = (doc: FinancialDocument) =>
    doc.source === 'MANUAL' || !doc.externalId;

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Data sprzedaży</Th><Th>Nazwa dokumentu</Th><Th>Numer dokumentu</Th>
              <Th>Klient</Th><Th $align="right">Kwota</Th><Th>Płatność</Th>
              <Th>Źródło</Th><Th $align="center">Synchronizacja</Th><Th $width="44px" />
            </tr>
          </Thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {[70, 100, 110, 130, 80, 110, 90, 90].map((w, j) => (
                  <td key={j} style={{ padding: '14px 16px' }}>
                    <Skeleton $w={`${w}px`} />
                  </td>
                ))}
                <td style={{ padding: '14px 16px' }} />
              </tr>
            ))}
          </tbody>
        </Table>
      </Wrapper>
    );
  }

  if (documents.length === 0) {
    return (
      <Wrapper>
        <EmptyState>Brak dokumentów finansowych dla wybranych filtrów</EmptyState>
      </Wrapper>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Data sprzedaży</Th>
              <Th>Nazwa dokumentu</Th>
              <Th>Numer dokumentu</Th>
              <Th>Klient</Th>
              <Th $align="right">Kwota</Th>
              <Th>Płatność</Th>
              <Th>Źródło</Th>
              <Th $align="center">Synchronizacja</Th>
              <Th $width="44px" />
            </tr>
          </Thead>
          <Tbody>
            {documents.map((doc) => {
              const isEditingNum = editingNumberId === doc.id;
              const isOverdue =
                doc.status === 'OVERDUE' ||
                (doc.status === 'PENDING' &&
                  !!doc.dueDate &&
                  doc.dueDate <= new Date().toISOString().split('T')[0]);
              const syncStatus = getSyncStatus(doc);
              const isExternal = doc.source !== 'MANUAL';
              const clientName =
                doc.counterpartyName ??
                (doc.customerFirstName || doc.customerLastName
                  ? `${doc.customerFirstName ?? ''} ${doc.customerLastName ?? ''}`.trim()
                  : null);

              return (
                <Tr key={doc.id} onClick={() => onDocumentClick?.(doc)}>

                  {/* Data sprzedaży */}
                  <Td>
                    <DatePrimary>{formatDate(doc.issueDate)}</DatePrimary>
                    {doc.dueDate && (
                      <DueDateText $overdue={isOverdue}>
                        Termin: {formatDate(doc.dueDate)}
                      </DueDateText>
                    )}
                  </Td>

                  {/* Nazwa dokumentu */}
                  <Td>
                    <DocTypeBadge $type={doc.documentType}>{doc.documentTypeLabel}</DocTypeBadge>
                    {doc.description && (
                      <DocDescription title={doc.description}>{doc.description}</DocDescription>
                    )}
                  </Td>

                  {/* Numer dokumentu — inline edit */}
                  <Td onClick={(e) => e.stopPropagation()}>
                    {isEditingNum ? (
                      <NumberEditWrap>
                        <NumberInput
                          ref={numberInputRef}
                          value={editingNumberVal}
                          onChange={(e) => setEditingNumberVal(e.target.value)}
                          onKeyDown={handleNumberKeyDown}
                          onBlur={saveNumber}
                        />
                        <IconBtn
                          $variant="save"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={saveNumber}
                          title="Zapisz (Enter)"
                        >
                          <IconCheck />
                        </IconBtn>
                        <IconBtn
                          onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                          title="Anuluj (Esc)"
                        >
                          <IconX />
                        </IconBtn>
                      </NumberEditWrap>
                    ) : (
                      <DocNumberWrap>
                        <DocNumberValue>{doc.documentNumber}</DocNumberValue>
                        {canEditNumber(doc) && (
                          <DocEditBtn
                            type="button"
                            className="doc-edit-btn"
                            onClick={(e) => startEdit(doc, e)}
                            title="Edytuj numer dokumentu"
                          >
                            <IconPencil />
                          </DocEditBtn>
                        )}
                      </DocNumberWrap>
                    )}
                  </Td>

                  {/* Klient */}
                  <Td>
                    {clientName ? (
                      <>
                        <ClientName title={clientName}>{clientName}</ClientName>
                        {doc.counterpartyNip && (
                          <ClientNip>NIP: {doc.counterpartyNip}</ClientNip>
                        )}
                      </>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </Td>

                  {/* Kwota */}
                  <Td $align="right">
                    <AmountGross>{formatMoney(doc.totalGross)}</AmountGross>
                    <AmountNet>{formatMoney(doc.totalNet)} netto</AmountNet>
                  </Td>

                  {/* Płatność: metoda + status */}
                  <Td onClick={(e) => e.stopPropagation()}>
                    <PaymentMethodLabel>{doc.paymentMethodLabel}</PaymentMethodLabel>
                    <StatusBadge
                      $status={doc.status}
                      onClick={(e) => handleStatusClick(doc.id, e)}
                    >
                      {doc.statusLabel}
                      <IconChevron />
                    </StatusBadge>
                  </Td>

                  {/* Źródło */}
                  <Td>
                    <SourceBadge $external={isExternal}>
                      {isExternal ? <IconExternal /> : <IconApp />}
                      {isExternal ? (doc.providerLabel ?? doc.sourceLabel) : 'Aplikacja'}
                    </SourceBadge>
                  </Td>

                  {/* Synchronizacja */}
                  <Td $align="center">
                    {syncStatus === 'na' ? (
                      <Muted>—</Muted>
                    ) : (
                      <SyncBadge
                        $s={syncStatus}
                        title={doc.providerSyncError ?? doc.providerSyncStatusLabel ?? undefined}
                      >
                        {syncStatus === 'synced' && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {syncStatus === 'failed' && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                        {syncStatus === 'pending' && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                        {SYNC_LABELS[syncStatus]}
                      </SyncBadge>
                    )}
                  </Td>

                  {/* Akcje */}
                  <Td onClick={(e) => e.stopPropagation()}>
                    <DeleteBtn onClick={(e) => handleDelete(doc.id, e)} title="Usuń dokument">
                      <IconTrash />
                    </DeleteBtn>
                  </Td>

                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Wrapper>

      {/* Status dropdown portal */}
      {openStatusId && dropdownPos &&
        createPortal(
          <>
            <Backdrop onClick={() => setOpenStatusId(null)} />
            <Dropdown
              ref={dropdownRef}
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <DropdownBody>
                {ALL_STATUSES.map((s) => (
                  <DropdownItem
                    key={s}
                    $active={documents.find((d) => d.id === openStatusId)?.status === s}
                    onClick={() => handleStatusChange(openStatusId, s)}
                  >
                    {STATUS_LABELS[s]}
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
