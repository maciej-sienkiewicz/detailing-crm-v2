import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { FinanceTab, IncomeDocument, IncomeDocumentType } from '../types';
import type { ExpenseSource, ExpensePaymentStatus } from '../types';
import { useFinanceDocument } from '../hooks/useFinance';
import { useKsefExpenses } from '../hooks/useKsef';
import { useIncomeDocuments } from '../hooks/useIncomeDocuments';
import {
  FinanceSummaryCards,
  CreateDocumentModal,
  EditDocumentModal,
  CashRegisterPanel,
  PaymentSummaryTab,
  KsefExpensesTable,
  KsefSyncWidget,
  AddExpenseModal,
  IncomeDocumentsTable,
  IssueInvoiceModal,
  RevenueInvoiceDetailModal,
} from '../components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderPrimaryButton, PageHeaderGhostButton } from '@/common/components/PageHeader';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.xl};
  padding: ${(p) => p.theme.spacing.lg};
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  animation: ${fadeUp} 300ms ease both;

  @media (max-width: 639px) {
    padding: ${(p) => p.theme.spacing.md};
  }

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    padding: ${(p) => p.theme.spacing.xl};
  }
`;

// ─── Hero: wyciągnięty do PageHeader w common/components ─────────────────────

// ─── Section divider ──────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: -${(p) => p.theme.spacing.md};
`;

const SectionLabelText = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

const SectionLabelLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${(p) => p.theme.colors.border};
`;


// ─── Panel card (tabs + content) ──────────────────────────────────────────────

const PanelCard = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
  overflow: hidden;
  margin-top: ${(p) => p.theme.spacing.md};
`;

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 639px) {
    display: none;
  }
`;

const TabSelect = styled.select`
  display: none;

  @media (max-width: 639px) {
    display: block;
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    color: ${(p) => p.theme.colors.text};
    background: ${(p) => p.theme.colors.surface};
    border: none;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
    padding-right: 40px;
    cursor: pointer;
  }
`;

const TabItem = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  padding: 14px 20px;
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? st.accentBlue : 'transparent')};
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  transition: color ${st.transition}, border-color ${st.transition}, background ${st.transition};

  &:hover {
    color: ${(p) => (p.$active ? st.accentBlue : st.text)};
    background: ${(p) => (p.$active ? 'transparent' : st.bg)};
  }

  @media (max-width: 639px) {
    padding: 10px 14px;
    font-size: 12px;
  }
`;

// ─── Filters strip ────────────────────────────────────────────────────────────

const FiltersStrip = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const FilterSeparator = styled.div`
  flex: 1;
`;

// ─── Custom Select for filters ────────────────────────────────────────────────

const SelectTrigger = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: ${(p) => (p.$active ? st.accentBlueDim : p.theme.colors.surface)};
  color: ${(p) => (p.$active ? st.accentBlue : st.textSecondary)};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}44` : p.theme.colors.border)};
  border-radius: ${st.radiusSm};
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: all ${st.transition};
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$active ? st.accentBlueDim : p.theme.colors.surfaceHover)};
    border-color: ${(p) => (p.$active ? `${st.accentBlue}55` : st.borderHover)};
    color: ${(p) => (p.$active ? st.accentBlue : st.text)};
  }
`;

const SelectBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

const SelectPanel = styled.div`
  position: fixed;
  min-width: 200px;
  background: ${(p) => p.theme.colors.surface};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowLg};
  z-index: 1000;
  overflow: hidden;
  border: 1px solid ${(p) => p.theme.colors.border};
`;

const SelectPanelBody = styled.div`
  padding: 6px;
`;

const SelectPanelOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? `${st.accentBlue}22` : 'transparent')};
  border-radius: ${st.radiusSm};
  background: ${(p) => (p.$active ? st.accentBlueDim : 'transparent')};
  color: ${(p) => (p.$active ? st.text : st.textSecondary)};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${(p) => (p.$active ? st.accentBlueDim : p.theme.colors.surfaceAlt)};
    color: ${st.text};
  }
`;

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface SelectOptionItem { value: string; label: string; }
interface FilterSelectProps {
  value:       string;
  onChange:    (value: string) => void;
  options:     SelectOptionItem[];
  placeholder: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      let left = rect.left;
      if (left + 200 > vw - 8) left = vw - 208;
      setPanelPos({ top: rect.bottom + 4, left });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {isOpen && <SelectBackdrop onClick={() => setIsOpen(false)} />}
      <SelectTrigger ref={triggerRef} $active={!!value} onClick={handleToggle}>
        {selectedLabel}
        <ChevronDownIcon />
      </SelectTrigger>
      {isOpen && panelPos && createPortal(
        <SelectPanel style={{ top: panelPos.top, left: panelPos.left }}>
          <SelectPanelBody>
            <SelectPanelOption $active={value === ''} onClick={() => { onChange(''); setIsOpen(false); }}>
              {placeholder}
            </SelectPanelOption>
            {options.map((opt) => (
              <SelectPanelOption
                key={opt.value}
                $active={value === opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
              >
                {opt.label}
              </SelectPanelOption>
            ))}
          </SelectPanelBody>
        </SelectPanel>,
        document.body
      )}
    </>
  );
};

// ─── Toggle switch ────────────────────────────────────────────────────────────

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  position: relative;
  display: inline-block;
  width: 30px; height: 17px;
  border-radius: 999px;
  background: ${(p) => (p.$on ? st.accentBlue : p.theme.colors.border)};
  transition: background 0.18s ease;
  flex-shrink: 0;
  &::after {
    content: '';
    position: absolute;
    top: 2px; left: ${(p) => (p.$on ? '15px' : '2px')};
    width: 13px; height: 13px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.18);
    transition: left 0.18s ease;
  }
`;

const ToggleText = styled.span`
  font-size: ${st.fontSm};
  font-weight: 500;
  color: ${st.textSecondary};
  white-space: nowrap;
`;

// ─── Other filter elements ────────────────────────────────────────────────────

const ClearFiltersBtn = styled.button`
  padding: 5px 11px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: transparent;
  color: ${st.textSecondary};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; color: ${st.text}; border-color: ${st.borderHover}; }
`;

const RefreshBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  transition: all ${st.transition};
  flex-shrink: 0;
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; color: ${st.text}; border-color: ${st.borderHover}; }
`;

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Error / Pagination ───────────────────────────────────────────────────────

const InlineError = styled.div`
  padding: 40px 24px;
  text-align: center;
  background: ${st.accentRedDim};
  color: ${st.accentRed};
  font-size: ${st.fontSm};
  font-weight: 500;

  button {
    margin-top: 8px;
    cursor: pointer;
    text-decoration: underline;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    padding: 0;
  }
`;

const PaginationFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};
  flex-wrap: wrap;
  gap: 8px;
`;

const PaginationInfo = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: 1px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  overflow: hidden;
`;

const PageBtn = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: ${st.fontSm};
  font-weight: 500;
  border: none;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$disabled ? st.textMuted : st.text)};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  transition: background ${st.transition};
  &:last-child { border-right: none; }
  &:hover:not(:disabled) { background: ${(p) => p.theme.colors.surfaceAlt}; }
`;

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ─── Header date picker (dark, portal-based) ──────────────────────────────────

const FinHdrActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 639px) {
    flex-wrap: wrap;
  }
`;

const HdrPickerWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const HdrPickerTrigger = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  background: ${p => p.$active ? 'rgba(14, 165, 233, 0.22)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${p => p.$active ? '#7dd3fc' : '#e2e8f0'};
  border: 1px solid ${p => p.$active ? 'rgba(125, 211, 252, 0.45)' : 'rgba(255, 255, 255, 0.14)'};
  border-radius: 9999px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.3)' : 'rgba(255, 255, 255, 0.14)'};
    color: #fff;
  }
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const HdrPickerPanel = styled.div`
  position: fixed;
  z-index: 9000;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${st.radius};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  min-width: 240px;
  padding: 8px;
`;

interface FinHeaderDatePickerProps {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onChange: (preset: DatePreset, from: string, to: string) => void;
}

const FinHeaderDatePicker: React.FC<FinHeaderDatePickerProps> = ({ preset, customFrom, customTo, onChange }) => {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const PANEL_W = 240;
      const MARGIN = 8;
      const right = Math.min(Math.max(MARGIN, vw - rect.right), vw - PANEL_W - MARGIN);
      setPanelPos({ top: rect.bottom + 8, right });
      setPendingFrom(customFrom);
      setPendingTo(customTo);
    }
    setOpen(p => !p);
  };

  const selectPreset = (p: Exclude<DatePreset, 'custom'>) => {
    onChange(p, '', '');
    setOpen(false);
  };

  const applyCustom = () => {
    onChange('custom', pendingFrom, pendingTo);
    setOpen(false);
  };

  const label = formatPresetLabel(preset, preset === 'custom' ? customFrom : undefined, preset === 'custom' ? customTo : undefined);

  return (
    <HdrPickerWrap>
      <HdrPickerTrigger ref={triggerRef} $active={preset !== 'all'} onClick={handleToggle}>
        <CalendarIcon />
        {label}
        <SmallChevron />
      </HdrPickerTrigger>

      {open && panelPos && createPortal(
        <HdrPickerPanel ref={panelRef} style={{ top: panelPos.top, right: panelPos.right }}>
          <DPPresetGroup>
            {([
              ['currentMonth', 'Bieżący miesiąc', currentMonthHint()] as const,
              ['all',     'Cały czas',       ''] as const,
              ['week',    'Ostatni tydzień',  '7 dni'] as const,
              ['month',   'Ostatni miesiąc',  '30 dni'] as const,
              ['quarter', 'Ostatni kwartał',  '90 dni'] as const,
            ]).map(([id, lbl, hint]) => (
              <DPPresetBtn key={id} $active={preset === id} onClick={() => selectPreset(id)}>
                {lbl}
                {hint && <span className="hint">{hint}</span>}
                {preset === id && <SmallCheck />}
              </DPPresetBtn>
            ))}
          </DPPresetGroup>

          <DPDivider />
          <DPLabel>Niestandardowy zakres</DPLabel>

          <DPRangeRow>
            <DPDateInput type="date" value={pendingFrom} max={pendingTo || undefined} onChange={e => setPendingFrom(e.target.value)} />
            <DPSep>-</DPSep>
            <DPDateInput type="date" value={pendingTo} min={pendingFrom || undefined} onChange={e => setPendingTo(e.target.value)} />
          </DPRangeRow>

          <DPApplyBtn disabled={!pendingFrom && !pendingTo} onClick={applyCustom}>
            Zastosuj zakres
          </DPApplyBtn>
        </HdrPickerPanel>,
        document.body
      )}
    </HdrPickerWrap>
  );
};

// ─── Date range picker (filter strip, light) ──────────────────────────────────

export type DatePreset = 'currentMonth' | 'all' | 'week' | 'month' | 'quarter' | 'custom';

/**
 * Data w strefie użytkownika, nie w UTC. toISOString() cofa datę o strefę, więc nad
 * ranem pierwszego dnia miesiąca „bieżący miesiąc" zaczynałby się w miesiącu poprzednim.
 */
const toISODate = (d: Date): string => {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

export const getPresetRange = (preset: DatePreset): { dateFrom?: string; dateTo?: string } => {
  if (preset === 'all' || preset === 'custom') return {};
  const today = new Date();

  // Bieżący miesiąc to miesiąc kalendarzowy, a nie ostatnie 30 dni: rozliczenia
  // prowadzi się od pierwszego do ostatniego dnia, więc zakres obejmuje cały miesiąc
  // (także dni, które dopiero nadejdą — faktura bywa wystawiona z datą w przód).
  if (preset === 'currentMonth') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { dateFrom: toISODate(from), dateTo: toISODate(to) };
  }

  const days = preset === 'week' ? 7 : preset === 'month' ? 30 : 90;
  const from = new Date(today);
  from.setDate(today.getDate() - days);
  return { dateFrom: toISODate(from), dateTo: toISODate(today) };
};

/** Nazwa bieżącego miesiąca jako podpowiedź przy presecie — „sierpień 2026". */
const currentMonthHint = (): string =>
  new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

const formatPresetLabel = (preset: DatePreset, customFrom?: string, customTo?: string): string => {
  if (preset === 'currentMonth') return 'Bieżący miesiąc';
  if (preset === 'all') return 'Cały czas';
  if (preset === 'week') return 'Ostatni tydzień';
  if (preset === 'month') return 'Ostatni miesiąc';
  if (preset === 'quarter') return 'Ostatni kwartał';
  if (customFrom && customTo) return `${customFrom} - ${customTo}`;
  if (customFrom) return `Od ${customFrom}`;
  if (customTo) return `Do ${customTo}`;
  return 'Zakres dat';
};

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SmallChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SmallCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DPPresetGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DPPresetBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 10px;
  background: ${(p) => p.$active ? '#eff6ff' : 'transparent'};
  color: ${(p) => p.$active ? st.accentBlue : st.text};
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: ${(p) => p.$active ? '600' : '500'};
  text-align: left;
  cursor: pointer;
  transition: background ${st.transition}, color ${st.transition};

  &:hover { background: ${(p) => p.$active ? '#dbeafe' : p.theme.colors.surfaceHover}; }

  span.hint { font-size: 11px; color: ${(p) => p.$active ? '#7dd3fc' : st.textMuted}; font-weight: 400; }
`;

const DPDivider = styled.div`
  height: 1px;
  background: ${(p) => p.theme.colors.border};
  margin: 6px 0;
`;

const DPLabel = styled.div`
  padding: 2px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DPRangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 2px;
`;

const DPDateInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  color: ${st.text};
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color ${st.transition};
  &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

const DPApplyBtn = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 7px 10px;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  transition: background ${st.transition};
  &:hover { background: #2563eb; }
  &:disabled { background: #94a3b8; cursor: not-allowed; }
`;

const DPSep = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
  flex-shrink: 0;
`;

// ─── Dokumenty przychodowe (KSeF + moduł finansowy) ──────────────────────────

const PAGE_SIZE = 20;

interface IncomeFilters {
  documentType:  string;
  paymentStatus: string;
  duplicates:    boolean;
  page:          number;
}

const EMPTY_INCOME_FILTERS: IncomeFilters = {
  documentType: '', paymentStatus: '', duplicates: false, page: 1,
};

interface IncomeTabContentProps {
  activeDateRange: { dateFrom?: string; dateTo?: string };
  onSelect: (document: IncomeDocument) => void;
}

/**
 * Jedna lista wszystkich dokumentów przychodowych: faktury i korekty z ledgera
 * KSeF (wystawione w CRM oraz pobrane z KSeF) razem z paragonami i dokumentami
 * „inne" z modułu finansowego.
 */
const IncomeTabContent: React.FC<IncomeTabContentProps> = ({ activeDateRange, onSelect }) => {
  const [filters, setFilters] = useState<IncomeFilters>(EMPTY_INCOME_FILTERS);
  const [showExcluded, setShowExcluded] = useState(false);

  const { documents, total, isLoading, isError, refetch } = useIncomeDocuments({
    documentType:  (filters.documentType  as IncomeDocumentType) || undefined,
    paymentStatus: (filters.paymentStatus as 'PAID' | 'PENDING' | 'OVERDUE') || undefined,
    dateFrom:        activeDateRange.dateFrom,
    dateTo:          activeDateRange.dateTo,
    includeExcluded: showExcluded || undefined,
    page:            filters.page,
    pageSize:        PAGE_SIZE,
  });

  // Podejrzane duplikaty dotyczą wyłącznie faktur z ledgera KSeF, filtr działa
  // po stronie klienta, bo to zawężenie widoku, nie osobne zapytanie
  const visibleDocuments = filters.duplicates
    ? documents.filter((doc) => doc.duplicateStatus === 'SUSPECTED')
    : documents;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.documentType || filters.paymentStatus || filters.duplicates);
  const setFilter  = <K extends keyof IncomeFilters>(key: K, value: IncomeFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <>
      <KsefSyncWidget />

      <FiltersStrip>
        <FilterSelect
          value={filters.documentType}
          onChange={(val) => setFilter('documentType', val)}
          options={[
            { value: 'INVOICE',    label: 'Faktury' },
            { value: 'CORRECTION', label: 'Korekty' },
            { value: 'RECEIPT',    label: 'Paragony' },
            { value: 'OTHER',      label: 'Inne dokumenty' },
          ]}
          placeholder="Wszystkie typy"
        />
        <FilterSelect
          value={filters.paymentStatus}
          onChange={(val) => setFilter('paymentStatus', val)}
          options={[
            { value: 'PAID',    label: 'Opłacone' },
            { value: 'PENDING', label: 'Oczekujące' },
            { value: 'OVERDUE', label: 'Przeterminowane' },
          ]}
          placeholder="Wszystkie statusy"
        />
        <FilterSeparator />
        {hasFilters && (
          <ClearFiltersBtn onClick={() => setFilters(EMPTY_INCOME_FILTERS)}>
            Wyczyść filtry
          </ClearFiltersBtn>
        )}
        <ToggleLabel>
          <ToggleTrack $on={filters.duplicates} />
          <ToggleText>Tylko podejrzane duplikaty</ToggleText>
          <input
            type="checkbox"
            checked={filters.duplicates}
            onChange={(e) => setFilter('duplicates', e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </ToggleLabel>
        <ToggleLabel>
          <ToggleTrack $on={showExcluded} />
          <ToggleText>Pokaż ukryte</ToggleText>
          <input
            type="checkbox"
            checked={showExcluded}
            onChange={(e) => { setShowExcluded(e.target.checked); setFilters((p) => ({ ...p, page: 1 })); }}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </ToggleLabel>
        <RefreshBtn onClick={() => refetch()} title="Odśwież">
          <RefreshIcon />
        </RefreshBtn>
      </FiltersStrip>

      {isError ? (
        <InlineError>
          Nie udało się załadować dokumentów przychodowych.
          <br />
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </InlineError>
      ) : (
        <IncomeDocumentsTable documents={visibleDocuments} isLoading={isLoading} onSelect={onSelect} />
      )}

      {totalPages > 1 && (
        <PaginationFooter>
          <PaginationInfo>
            Wyświetlanie {(filters.page - 1) * PAGE_SIZE + 1}-{Math.min(filters.page * PAGE_SIZE, total)} z {total}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn
              $disabled={filters.page === 1}
              disabled={filters.page === 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft /> Poprzednia
            </PageBtn>
            <PageBtn
              $disabled={filters.page >= totalPages}
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Następna <ChevronRight />
            </PageBtn>
          </PaginationBtns>
        </PaginationFooter>
      )}
    </>
  );
};

// ─── Expenses (KSeF) tab ──────────────────────────────────────────────────────

interface ExpenseFilters {
  source:        string;
  paymentStatus: string;
  page:          number;
}

interface ExpensesTabContentProps {
  activeDateRange: { dateFrom?: string; dateTo?: string };
}

const ExpensesTabContent: React.FC<ExpensesTabContentProps> = ({ activeDateRange }) => {
  const [filters, setFilters] = useState<ExpenseFilters>({
    source: '', paymentStatus: '', page: 1,
  });
  const [showExcluded, setShowExcluded] = useState(false);

  const { expenses, total, isLoading, isError, refetch } = useKsefExpenses({
    source:          (filters.source        as ExpenseSource)        || undefined,
    paymentStatus:   (filters.paymentStatus as ExpensePaymentStatus) || undefined,
    dateFrom:        activeDateRange.dateFrom,
    dateTo:          activeDateRange.dateTo,
    includeExcluded: showExcluded      || undefined,
    page:            filters.page,
    pageSize:        PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(filters.source || filters.paymentStatus);
  const setFilter  = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <>
      <KsefSyncWidget />

      <FiltersStrip>
        <FilterSelect
          value={filters.source}
          onChange={(val) => setFilter('source', val)}
          options={[
            { value: 'KSEF',   label: 'Z KSeF' },
            { value: 'MANUAL', label: 'Ręczna' },
          ]}
          placeholder="Wszystkie źródła"
        />
        <FilterSelect
          value={filters.paymentStatus}
          onChange={(val) => setFilter('paymentStatus', val)}
          options={[
            { value: 'PAID',    label: 'Opłacone' },
            { value: 'PENDING', label: 'Oczekujące' },
          ]}
          placeholder="Wszystkie statusy"
        />
        <FilterSeparator />
        {hasFilters && (
          <ClearFiltersBtn onClick={() => setFilters({ source: '', paymentStatus: '', page: 1 })}>
            Wyczyść filtry
          </ClearFiltersBtn>
        )}
        <ToggleLabel>
          <ToggleTrack $on={showExcluded} />
          <ToggleText>Pokaż ukryte</ToggleText>
          <input
            type="checkbox"
            checked={showExcluded}
            onChange={(e) => setShowExcluded(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </ToggleLabel>
        <RefreshBtn onClick={() => refetch()} title="Odśwież">
          <RefreshIcon />
        </RefreshBtn>
      </FiltersStrip>

      {isError ? (
        <InlineError>
          Nie udało się załadować faktur kosztowych.
          <br />
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </InlineError>
      ) : (
        <KsefExpensesTable expenses={expenses} isLoading={isLoading} />
      )}

      {totalPages > 1 && (
        <PaginationFooter>
          <PaginationInfo>
            Wyświetlanie {(filters.page - 1) * PAGE_SIZE + 1}-{Math.min(filters.page * PAGE_SIZE, total)} z {total}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn
              $disabled={filters.page === 1}
              disabled={filters.page === 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft /> Poprzednia
            </PageBtn>
            <PageBtn
              $disabled={filters.page >= totalPages}
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Następna <ChevronRight />
            </PageBtn>
          </PaginationBtns>
        </PaginationFooter>
      )}
    </>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab]         = useState<FinanceTab>('income');
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isIssueInvoiceModalOpen, setIssueInvoiceModalOpen] = useState(false);
  const [selectedRevenueInvoiceId, setSelectedRevenueInvoiceId] = useState<string | null>(null);
  // Dokument z modułu finansowego (paragon / inny) wybrany do podglądu i edycji;
  // pełne dane dociągamy po id, bo lista zwraca tylko wspólny podzbiór pól
  const [selectedFinanceDocumentId, setSelectedFinanceDocumentId] = useState<string | null>(null);
  const { document: selectedFinanceDocument } = useFinanceDocument(selectedFinanceDocumentId ?? undefined);
  // Domyślnie bieżący miesiąc: rozliczenia prowadzi się miesiącami, a widok „cały czas"
  // kazał przy każdym wejściu przewijać dokumenty sprzed lat, żeby dojść do tych aktualnych.
  const [datePreset, setDatePreset]       = useState<DatePreset>('currentMonth');
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');

  const activeDateRange = datePreset === 'custom'
    ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined }
    : getPresetRange(datePreset);

  const openIncomeModal  = useCallback(() => setIncomeModalOpen(true),  []);
  const closeIncomeModal = useCallback(() => setIncomeModalOpen(false), []);
  /** Szczegóły zależą od źródła: faktura KSeF ma własny widok, dokument finansowy - edycję. */
  const handleSelectDocument = useCallback((doc: IncomeDocument) => {
    if (doc.sourceKind === 'KSEF') setSelectedRevenueInvoiceId(doc.id);
    else setSelectedFinanceDocumentId(doc.id);
  }, []);
  const closeEditModal = useCallback(() => setSelectedFinanceDocumentId(null), []);
  const openExpenseModal  = useCallback(() => setExpenseModalOpen(true),  []);
  const closeExpenseModal = useCallback(() => setExpenseModalOpen(false), []);

  const handleDateChange = (preset: DatePreset, from: string, to: string) => {
    setDatePreset(preset);
    setCustomFrom(from);
    setCustomTo(to);
  };

  return (
    <ViewContainer>
      <PageHeader
        title="Finanse"
        subtitle="Dokumenty przychodowe, koszty KSeF i raporty"
        actions={
          <FinHdrActions>
            <FinHeaderDatePicker
              preset={datePreset}
              customFrom={customFrom}
              customTo={customTo}
              onChange={handleDateChange}
            />
            {activeTab === 'income' && (
              <>
                <PageHeaderGhostButton onClick={openIncomeModal}>
                  <PlusIcon />
                  Dodaj paragon
                </PageHeaderGhostButton>
                <PageHeaderPrimaryButton onClick={() => setIssueInvoiceModalOpen(true)}>
                  <PlusIcon />
                  Wystaw fakturę (KSeF)
                </PageHeaderPrimaryButton>
              </>
            )}
            {activeTab === 'expenses' && (
              <PageHeaderPrimaryButton onClick={openExpenseModal}>
                <PlusIcon />
                Dodaj fakturę ręcznie
              </PageHeaderPrimaryButton>
            )}
          </FinHdrActions>
        }
      />

      <div>
        <SectionLabel>
          <SectionLabelText>Podsumowanie finansowe</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>
        <FinanceSummaryCards />
      </div>

      <div>
        <SectionLabel>
          <SectionLabelText>Dokumenty i raporty</SectionLabelText>
          <SectionLabelLine />
        </SectionLabel>

        <PanelCard>
          <TabBar>
            <TabItem $active={activeTab === 'income'} onClick={() => setActiveTab('income')}>
              Dokumenty przychodowe
            </TabItem>
            <TabItem $active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')}>
              Dokumenty kosztowe
            </TabItem>
            <TabItem $active={activeTab === 'cash'} onClick={() => setActiveTab('cash')}>
              Kasa
            </TabItem>
            <TabItem $active={activeTab === 'payment-summary'} onClick={() => setActiveTab('payment-summary')}>
              Podsumowanie płatności
            </TabItem>
          </TabBar>
          <TabSelect value={activeTab} onChange={e => setActiveTab(e.target.value as FinanceTab)}>
            <option value="income">Dokumenty przychodowe</option>
            <option value="expenses">Dokumenty kosztowe</option>
            <option value="cash">Kasa</option>
            <option value="payment-summary">Podsumowanie płatności</option>
          </TabSelect>

          {activeTab === 'income' && (
            <IncomeTabContent activeDateRange={activeDateRange} onSelect={handleSelectDocument} />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTabContent activeDateRange={activeDateRange} />
          )}
          {activeTab === 'cash' && <CashRegisterPanel />}
          {activeTab === 'payment-summary' && <PaymentSummaryTab />}
        </PanelCard>
      </div>

      <CreateDocumentModal isOpen={isIncomeModalOpen} onClose={closeIncomeModal} />
      <AddExpenseModal     isOpen={isExpenseModalOpen} onClose={closeExpenseModal} />
      <EditDocumentModal   document={selectedFinanceDocument ?? null} onClose={closeEditModal} />
      <IssueInvoiceModal
        isOpen={isIssueInvoiceModalOpen}
        onClose={() => setIssueInvoiceModalOpen(false)}
      />
      <RevenueInvoiceDetailModal
        invoiceId={selectedRevenueInvoiceId}
        onClose={() => setSelectedRevenueInvoiceId(null)}
      />
    </ViewContainer>
  );
};
