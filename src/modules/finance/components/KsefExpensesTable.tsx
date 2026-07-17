import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { KsefExpense, ExpenseStatus } from '../types';
import {
  useExcludeExpense,
  useRestoreExpense,
  useUpdateExpensePaymentStatus,
  useDeleteExpense,
  useDeleteExpenseNote,
} from '../hooks/useKsef';
import { ExpenseNoteModal } from './ExpenseNoteModal';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { formatMoneyFloat, formatDate } from '../utils/formatters';

// ─── Animations ──────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Table layout ─────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 1080px;
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
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.55px;
  white-space: nowrap;
  width: ${(p) => p.$width || 'auto'};
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const Tr = styled.tr<{ $excluded?: boolean }>`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background 0.12s ease;
  animation: ${fadeIn} 0.18s ease-out;
  cursor: pointer;

  &:last-child { border-bottom: none; }

  ${(p) =>
    p.$excluded
      ? `
    background: rgba(100, 116, 139, 0.04);
    opacity: 0.55;
    &:hover { background: rgba(100, 116, 139, 0.07); }
  `
      : `
    &:hover { background: ${p.theme.colors.surfaceHover}; }
  `}
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
  padding: 13px 16px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
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
  margin-top: 3px;
  font-size: 12px;
  font-weight: 400;
  color: ${(p) => p.theme.colors.textMuted};
  white-space: nowrap;
`;

const AmountPrimary = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-feature-settings: 'tnum';
  white-space: nowrap;
  color: ${(p) => p.theme.colors.text};
`;

const AmountSecondary = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-feature-settings: 'tnum';
  white-space: nowrap;
  color: ${(p) => p.theme.colors.textMuted};
`;

const EmDash = styled.span`
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;
`;

// ─── Badges ──────────────────────────────────────────────────────────────────

type BadgeVariant = 'blue' | 'teal' | 'purple' | 'green' | 'amber' | 'red' | 'slate' | 'dashed-slate';

const BADGE_COLORS: Record<
  Exclude<BadgeVariant, 'dashed-slate'>,
  { bg: string; color: string; border: string }
> = {
  blue:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  teal:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  purple: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  green:  { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  amber:  { bg: '#fef9c3', color: '#92400e', border: '#fde68a' },
  red:    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  slate:  { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

const Badge = styled.span<{ $variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05px;
  white-space: nowrap;
  ${(p) =>
    p.$variant === 'dashed-slate'
      ? `
    background: #f8fafc;
    color: #94a3b8;
    border: 1px dashed #cbd5e1;
  `
      : `
    background: ${BADGE_COLORS[p.$variant as Exclude<BadgeVariant, 'dashed-slate'>].bg};
    color: ${BADGE_COLORS[p.$variant as Exclude<BadgeVariant, 'dashed-slate'>].color};
    border: 1px solid ${BADGE_COLORS[p.$variant as Exclude<BadgeVariant, 'dashed-slate'>].border};
  `}
`;

const PaymentStatusBadge = styled.button<{ $variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: filter 0.12s ease;
  ${(p) =>
    p.$variant === 'dashed-slate'
      ? `background: #f8fafc; color: #94a3b8; border: 1px dashed #cbd5e1;`
      : `
    background: ${BADGE_COLORS[p.$variant as Exclude<BadgeVariant, 'dashed-slate'>].bg};
    color: ${BADGE_COLORS[p.$variant as Exclude<BadgeVariant, 'dashed-slate'>].color};
    border: 1px solid ${BADGE_COLORS[p.$variant as Exclude<BadgeVariant, 'dashed-slate'>].border};
  `}
  &:hover { filter: brightness(0.93); }
`;

const expenseStatusVariant = (status: ExpenseStatus): BadgeVariant => {
  switch (status) {
    case 'ACTIVE':     return 'green';
    case 'CORRECTED':  return 'slate';
    case 'CANCELLED':  return 'red';
    case 'EXCLUDED':   return 'dashed-slate';
  }
};

const expenseStatusLabel = (status: ExpenseStatus): string => {
  switch (status) {
    case 'ACTIVE':    return 'Aktywna';
    case 'CORRECTED': return 'Skorygowana';
    case 'CANCELLED': return 'Anulowana';
    case 'EXCLUDED':  return 'Ukryta';
  }
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionBtn = styled.button<{ $variant: 'exclude' | 'restore' | 'delete' | 'pay' | 'edit' | 'preview' }>`
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
  transition: all 0.12s ease;

  ${(p) => {
    switch (p.$variant) {
      case 'exclude': return `&:hover { background: #fef9c3; color: #92400e; border-color: #fde68a; }`;
      case 'restore': return `&:hover { background: #dcfce7; color: #16a34a; border-color: #86efac; }`;
      case 'delete':  return `&:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }`;
      case 'pay':     return `&:hover { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }`;
      case 'edit':    return `&:hover { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }`;
      case 'preview': return `&:hover { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }`;
    }
  }}

  svg { width: 14px; height: 14px; }
`;

// ─── Note cell ────────────────────────────────────────────────────────────────

const NoteCell = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 4px;
`;

const NoteText = styled.span`
  display: block;
  max-width: 160px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AddNoteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;

  &:hover {
    color: #4f46e5;
    border-color: #c7d2fe;
    background: #eef2ff;
  }

  svg { width: 11px; height: 11px; }
`;

// ─── Dropdown ─────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1190;
`;

const Dropdown = styled.div`
  position: fixed;
  z-index: 1200;
  min-width: 190px;
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

const DropdownItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(99,102,241,0.2)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'rgba(99,102,241,0.06)' : 'transparent')};
  color: ${(p) => (p.$active ? '#0f172a' : '#64748b')};
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background: ${(p) => p.$active ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.02)'};
    color: #0f172a;
  }
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const IconPencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  expenses:  KsefExpense[];
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const KsefExpensesTable: React.FC<Props> = ({ expenses, isLoading }) => {
  const [openPaymentId, setOpenPaymentId]   = useState<string | null>(null);
  const [dropdownPos, setDropdownPos]       = useState<{ top: number; left: number } | null>(null);
  const [noteExpense, setNoteExpense]       = useState<KsefExpense | null>(null);
  const [previewId, setPreviewId]           = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const excludeExpense = useExcludeExpense();
  const restoreExpense = useRestoreExpense();
  const updatePayment  = useUpdateExpensePaymentStatus();
  const deleteExpense  = useDeleteExpense();
  const deleteNote     = useDeleteExpenseNote();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenPaymentId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePaymentClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const vw   = window.innerWidth;
    let left   = rect.left;
    if (left + 200 > vw - 8) left = vw - 208;
    setDropdownPos({ top: rect.bottom + 4, left });
    setOpenPaymentId(openPaymentId === id ? null : id);
  };

  const handlePaymentChange = (id: string, paymentStatus: 'PAID' | 'PENDING') => {
    updatePayment.mutate({ id, data: { paymentStatus } });
    setOpenPaymentId(null);
  };

  const handleExclude = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    excludeExpense.mutate(id);
  };

  const handleRestore = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    restoreExpense.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć tę fakturę? Tej operacji nie można cofnąć.')) {
      deleteExpense.mutate(id);
    }
  };

  const handleOpenNote = (exp: KsefExpense, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteExpense(exp);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
      deleteNote.mutate(id);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Data sprzedaży</Th><Th>Numer dokumentu</Th><Th>Sprzedawca</Th><Th>Notatka</Th>
              <Th $align="right">Kwota</Th><Th>Płatność</Th><Th>Źródło</Th>
              <Th $width="80px" />
            </tr>
          </Thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {[80, 110, 140, 100, 90, 90, 70].map((w, j) => (
                  <td key={j} style={{ padding: '13px 16px' }}>
                    <Skeleton $w={`${w}px`} />
                  </td>
                ))}
                <td style={{ padding: '13px 16px' }} />
              </tr>
            ))}
          </tbody>
        </Table>
      </Wrapper>
    );
  }

  if (expenses.length === 0) {
    return (
      <Wrapper>
        <EmptyState>Brak dokumentów kosztowych dla wybranych filtrów</EmptyState>
      </Wrapper>
    );
  }

  return (
    <>
      <Wrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Data sprzedaży</Th>
              <Th>Numer dokumentu</Th>
              <Th>Sprzedawca</Th>
              <Th>Notatka</Th>
              <Th $align="right">Kwota</Th>
              <Th>Płatność</Th>
              <Th>Źródło</Th>
              <Th $width="120px" />
            </tr>
          </Thead>
          <tbody>
            {expenses.map((exp) => {
              const isExcluded = exp.status === 'EXCLUDED';
              const currentPaymentStatus = exp.paymentStatus;

              return (
                <Tr key={exp.id} $excluded={isExcluded} onClick={() => setPreviewId(exp.id)}>

                  {/* Data sprzedaży */}
                  <Td>
                    <CellPrimary>{formatDate(exp.saleDate)}</CellPrimary>
                    {exp.ksefNumber && (
                      <CellSecondary title={exp.ksefNumber} style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        KSeF: {exp.ksefNumber.slice(-12)}
                      </CellSecondary>
                    )}
                  </Td>

                  {/* Numer dokumentu */}
                  <Td>
                    {exp.documentNumber
                      ? <CellPrimary>{exp.documentNumber}</CellPrimary>
                      : <EmDash>—</EmDash>
                    }
                    {exp.isCorrection && (
                      <Badge $variant="amber" style={{ marginTop: 4 }}>Korekta</Badge>
                    )}
                  </Td>

                  {/* Sprzedawca */}
                  <Td>
                    {exp.sellerName ? (
                      <>
                        <CellPrimary
                          as="span"
                          title={exp.sellerName}
                          style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                        >
                          {exp.sellerName}
                        </CellPrimary>
                        {exp.sellerNip && (
                          <CellSecondary>NIP: {exp.sellerNip}</CellSecondary>
                        )}
                      </>
                    ) : (
                      <EmDash>—</EmDash>
                    )}
                  </Td>

                  {/* Notatka */}
                  <Td onClick={(e) => e.stopPropagation()}>
                    {exp.note ? (
                      <NoteCell>
                        <NoteText title={exp.note}>{exp.note}</NoteText>
                        <ActionBtn $variant="edit" onClick={(e) => handleOpenNote(exp, e)} title="Edytuj notatkę">
                          <IconPencil />
                        </ActionBtn>
                        <ActionBtn $variant="delete" onClick={(e) => handleDeleteNote(exp.id, e)} title="Usuń notatkę">
                          <IconTrash />
                        </ActionBtn>
                      </NoteCell>
                    ) : (
                      <AddNoteBtn onClick={(e) => handleOpenNote(exp, e)}>
                        <IconPencil />
                        Dodaj notatkę
                      </AddNoteBtn>
                    )}
                  </Td>

                  {/* Kwota */}
                  <Td $align="right">
                    <AmountPrimary>{formatMoneyFloat(exp.grossAmount)}</AmountPrimary>
                    <AmountSecondary>{formatMoneyFloat(exp.netAmount)} netto</AmountSecondary>
                  </Td>

                  {/* Płatność: status + metoda */}
                  <Td onClick={(e) => e.stopPropagation()}>
                    <PaymentStatusBadge
                      $variant={currentPaymentStatus === 'PAID' ? 'green' : 'amber'}
                      onClick={(e) => handlePaymentClick(exp.id, e)}
                    >
                      {currentPaymentStatus === 'PAID' ? 'Opłacona' : 'Oczekuje'}
                      <IconChevron />
                    </PaymentStatusBadge>
                    {exp.paymentMethodLabel && (
                      <CellSecondary style={{ marginTop: 4 }}>{exp.paymentMethodLabel}</CellSecondary>
                    )}
                  </Td>

                  {/* Źródło */}
                  <Td>
                    <Badge $variant={exp.source === 'KSEF' ? 'purple' : 'blue'}>
                      {exp.source === 'KSEF' ? 'KSeF' : 'Ręczna'}
                    </Badge>
                  </Td>

                  {/* Akcje */}
                  <Td onClick={(e) => e.stopPropagation()}>
                    <ActionsCell>
                      <ActionBtn
                        $variant="preview"
                        onClick={() => setPreviewId(exp.id)}
                        title="Podgląd faktury"
                      >
                        <IconFileText />
                      </ActionBtn>
                      {isExcluded ? (
                        <ActionBtn
                          $variant="restore"
                          onClick={(e) => handleRestore(exp.id, e)}
                          title="Przywróć do statystyk"
                        >
                          <IconEye />
                        </ActionBtn>
                      ) : (
                        <ActionBtn
                          $variant="exclude"
                          onClick={(e) => handleExclude(exp.id, e)}
                          title="Ukryj ze statystyk"
                        >
                          <IconEyeOff />
                        </ActionBtn>
                      )}
                      {exp.source === 'MANUAL' && (
                        <ActionBtn
                          $variant="delete"
                          onClick={(e) => handleDelete(exp.id, e)}
                          title="Usuń fakturę ręczną"
                        >
                          <IconTrash />
                        </ActionBtn>
                      )}
                      {currentPaymentStatus === 'PENDING' && !isExcluded && (
                        <ActionBtn
                          $variant="pay"
                          onClick={(e) => { e.stopPropagation(); handlePaymentChange(exp.id, 'PAID'); }}
                          title="Oznacz jako opłaconą"
                        >
                          <IconCheck />
                        </ActionBtn>
                      )}
                    </ActionsCell>
                  </Td>

                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Wrapper>

      {openPaymentId && dropdownPos &&
        createPortal(
          <>
            <Backdrop onClick={() => setOpenPaymentId(null)} />
            <Dropdown ref={dropdownRef} style={{ top: dropdownPos.top, left: dropdownPos.left }}>
              <DropdownBody>
                <DropdownItem
                  $active={expenses.find((e) => e.id === openPaymentId)?.paymentStatus === 'PAID'}
                  onClick={() => handlePaymentChange(openPaymentId, 'PAID')}
                >
                  Opłacona
                </DropdownItem>
                <DropdownItem
                  $active={expenses.find((e) => e.id === openPaymentId)?.paymentStatus === 'PENDING'}
                  onClick={() => handlePaymentChange(openPaymentId, 'PENDING')}
                >
                  Oczekuje na płatność
                </DropdownItem>
              </DropdownBody>
            </Dropdown>
          </>,
          document.body
        )}

      <ExpenseNoteModal
        isOpen={noteExpense !== null}
        onClose={() => setNoteExpense(null)}
        expense={noteExpense}
      />

      <InvoicePreviewModal
        expenseId={previewId}
        onClose={() => setPreviewId(null)}
      />
    </>
  );
};
