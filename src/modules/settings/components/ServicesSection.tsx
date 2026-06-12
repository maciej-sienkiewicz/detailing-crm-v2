import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useArchiveService,
  useCreatePackage,
  useUpdatePackage,
  useSyncItemName,
} from '@/modules/services/hooks/useServices';
import {
  calculateGrossFromNet,
  calculateNetFromGross,
  formatMoneyAmount,
  parseMoneyInput,
} from '@/modules/services/utils/priceCalculator';
import type { Service, VatRate, AffectedPackage } from '@/modules/services/types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
`;

const expandDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
`;

const SearchIconWrap = styled.div`
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  display: flex;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: 0 12px 0 34px;
  font-size: 13px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
  }
  &::placeholder { color: #94a3b8; }
`;

const ToggleFilterBtn = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: ${p => p.$on ? 600 : 500};
  background: ${p => p.$on ? 'rgba(14,165,233,0.08)' : 'white'};
  color: ${p => p.$on ? '#0ea5e9' : '#475569'};
  border: 1.5px solid ${p => p.$on ? 'rgba(14,165,233,0.4)' : '#e2e8f0'};
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: inherit;
  transition: all 150ms;

  &:hover { border-color: #0ea5e9; color: #0ea5e9; }
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 600;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: inherit;
  transition: opacity 150ms, transform 100ms;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

// ─── Stats ────────────────────────────────────────────────────────────────────

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 18px;
`;

const StatText = styled.span`
  font-size: 11px;
  color: #94a3b8;

  strong { color: #0f172a; font-weight: 700; }
`;

// ─── Form panel ───────────────────────────────────────────────────────────────

const FormPanel = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  animation: ${expandDown} 220ms ease both;
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
`;

const FormTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 7px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 150ms;

  &:hover {
    background: #f8fafc;
    color: #0f172a;
    border-color: #cbd5e1;
  }
`;

const FormBody = styled.div`
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 100px;
  gap: 12px;
  align-items: flex-start;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
`;

const FieldInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid ${p => p.$error ? '#ef4444' : '#e2e8f0'};
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: ${p => p.$error ? '#ef4444' : '#0ea5e9'};
    box-shadow: 0 0 0 3px ${p => p.$error ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
  }
  &::placeholder { color: #94a3b8; }
  &:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const FieldSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  transition: border-color 180ms, box-shadow 180ms;

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.14);
  }
  &:disabled {
    background-color: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.span`
  font-size: 11px;
  color: #ef4444;
`;

const GrossPreview = styled.div`
  height: 38px;
  padding: 0 12px;
  font-size: 13px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  color: #475569;
  white-space: nowrap;
  display: flex;
  align-items: center;
`;

const ManualRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  user-select: none;
`;

const ToggleTrack = styled.div<{ $on: boolean }>`
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  margin-top: 2px;
  background: ${p => p.$on ? '#0ea5e9' : '#f1f5f9'};
  border: 1px solid ${p => p.$on ? '#0ea5e9' : '#e2e8f0'};
  border-radius: 9999px;
  position: relative;
  transition: background 150ms, border-color 150ms;
`;

const ToggleThumb = styled.div<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  background: ${p => p.$on ? '#fff' : '#94a3b8'};
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: ${p => p.$on ? '22px' : '2px'};
  transition: left 150ms, background 150ms;
  box-shadow: 0 1px 3px rgba(15,23,42,0.12);
`;

const ManualTextWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ManualLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
`;

const ManualDesc = styled.span`
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
`;

const FormFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
`;

const CancelBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  background: white;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: background 150ms;

  &:hover { background: #f8fafc; }
`;

const SubmitBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 150ms, transform 100ms;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Service table ────────────────────────────────────────────────────────────

const ServiceList = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const ListHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 64px 160px 90px 72px;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
`;

const ColLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const ServiceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 64px 160px 90px 72px;
  gap: 8px;
  align-items: center;
  padding: 13px 20px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 150ms;

  &:last-child { border-bottom: none; }
  &:hover { background: #fafbfc; }
`;

const RowNameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const ServiceName = styled.span<{ $muted?: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$muted ? '#94a3b8' : '#0f172a'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ManualBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const VatBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
  border-radius: 9999px;
  white-space: nowrap;
`;

const PriceCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
`;

const PriceNet = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
`;

const PriceGross = styled.span`
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
`;

const StatusCell = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding-left: 14px;
`;

const StatusDot = styled.div<{ $active: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => p.$active ? '#10b981' : '#94a3b8'};
`;

const StatusLabel = styled.span<{ $active: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.$active ? '#10b981' : '#94a3b8'};
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
`;

const ActionBtn = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${p => p.$danger ? '#ef4444' : '#94a3b8'};
  cursor: pointer;
  transition: all 150ms;

  &:hover:not(:disabled) {
    background: ${p => p.$danger ? 'rgba(239,68,68,0.08)' : '#f1f5f9'};
    border-color: ${p => p.$danger ? 'rgba(239,68,68,0.2)' : '#e2e8f0'};
    color: ${p => p.$danger ? '#ef4444' : '#334155'};
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBox = styled.div<{ $w?: string }>`
  height: 13px;
  width: ${p => p.$w ?? '100%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`;

const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 64px 160px 90px 72px;
  gap: 8px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child { border-bottom: none; }
`;

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 10px;
  text-align: center;
`;

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`;

const EmptyDesc = styled.p`
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.6;
`;

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pager = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
`;

const PagerInfo = styled.span`
  font-size: 11px;
  color: #94a3b8;
`;

const PagerControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const PagerBtn = styled.button<{ $active?: boolean }>`
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-family: inherit;
  font-weight: ${p => p.$active ? 700 : 500};
  border-radius: 7px;
  border: 1px solid ${p => p.$active ? 'rgba(14,165,233,0.3)' : '#e2e8f0'};
  background: ${p => p.$active ? 'rgba(14,165,233,0.08)' : 'white'};
  color: ${p => p.$active ? '#0ea5e9' : '#475569'};
  cursor: pointer;
  transition: all 150ms;

  &:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Archive dialog ───────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Dialog = styled.div`
  background: white;
  border-radius: 14px;
  padding: 28px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${expandDown} 200ms ease both;
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
`;

const DialogText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.65;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const DangerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 700;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 150ms;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Package-specific styles ──────────────────────────────────────────────────

const PackageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(37,99,235,0.08);
  color: #2563eb;
  border: 1px solid rgba(37,99,235,0.25);
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const PackageItemsHint = styled.div`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 340px;
`;

const AddPackageButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 600;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: inherit;
  transition: opacity 150ms, transform 100ms;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

const ServicePickerWrap = styled.div`
  position: relative;
`;

const ServicePickerDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  box-shadow: 0 4px 16px rgba(15,23,42,0.10);
  max-height: 180px;
  overflow-y: auto;
  z-index: 100;
`;

const ServicePickerOption = styled.div`
  padding: 9px 14px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;

  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }
`;

const SelectedServicesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
`;

const SelectedServiceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(37,99,235,0.04);
  border: 1px solid rgba(37,99,235,0.15);
  border-radius: 8px;
  font-size: 13px;
`;

const PositionDot = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
`;

const SelectedServiceName = styled.span`
  flex: 1;
  color: #0f172a;
`;

const RemoveServiceBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  color: #94a3b8;
  line-height: 1;
  flex-shrink: 0;
  transition: color 150ms;
  &:hover { color: #ef4444; }
`;

const PackageInfoBox = styled.div`
  padding: 10px 14px;
  background: rgba(245,158,11,0.06);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.55;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VAT_OPTIONS: { value: VatRate; label: string }[] = [
  { value: 23, label: '23%' },
  { value: 8,  label: '8%'  },
  { value: 5,  label: '5%'  },
  { value: 0,  label: '0%'  },
  { value: -1, label: 'zw.' },
];

const formatPLN = (grosze: number): string => {
  const formatted = formatMoneyAmount(grosze);
  return `${parseFloat(formatted).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
};

const formatDecimalInput = (grosze: number): string =>
  formatMoneyAmount(grosze).replace('.', ',');

const isValidPriceInput = (raw: string): boolean =>
  raw === '' || /^\d*[,.]?\d{0,2}$/.test(raw);

const vatLabel = (rate: VatRate): string => (rate === -1 ? 'zw.' : `${rate}%`);

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  netInput: string;
  grossInput: string;
  vatRate: VatRate;
  requireManualPrice: boolean;
}

interface FormErrors {
  name?: string;
  netInput?: string;
}

const EMPTY_FORM: FormValues = {
  name: '',
  netInput: '',
  grossInput: '',
  vatRate: 23,
  requireManualPrice: false,
};

function serviceToForm(s: Service): FormValues {
  if (s.requireManualPrice) {
    return { name: s.name, netInput: '', grossInput: '', vatRate: s.vatRate, requireManualPrice: true };
  }
  return {
    name: s.name,
    netInput: formatDecimalInput(s.basePriceNet),
    grossInput: formatDecimalInput(calculateGrossFromNet(s.basePriceNet, s.vatRate).priceGross),
    vatRate: s.vatRate,
    requireManualPrice: false,
  };
}

function validateForm(v: FormValues): FormErrors {
  const errors: FormErrors = {};
  const name = v.name.trim();
  if (!name) {
    errors.name = 'Nazwa jest wymagana';
  } else if (name.length < 3) {
    errors.name = 'Nazwa musi mieć co najmniej 3 znaki';
  } else if (name.length > 100) {
    errors.name = 'Nazwa może mieć maksymalnie 100 znaków';
  }
  if (!v.requireManualPrice) {
    const amount = parseMoneyInput(v.netInput);
    if (isNaN(amount) || amount < 0) {
      errors.netInput = 'Podaj poprawną cenę netto';
    }
  }
  return errors;
}

interface PackageFormValues {
  name: string;
  netInput: string;
  grossInput: string;
  vatRate: VatRate;
  requireManualPrice: boolean;
  selectedServices: Service[];
}

interface PackageFormErrors {
  name?: string;
  netInput?: string;
  services?: string;
}

const EMPTY_PKG_FORM: PackageFormValues = {
  name: '',
  netInput: '',
  grossInput: '',
  vatRate: 23,
  requireManualPrice: false,
  selectedServices: [],
};

function packageToForm(pkg: Service): PackageFormValues {
  const selectedServices: Service[] = (pkg.packageItems || []).map(item => ({
    id: item.serviceId,
    name: item.serviceName,
    basePriceNet: 0,
    vatRate: 23,
    requireManualPrice: false,
    isActive: true,
    isPackage: false,
    packageItems: null,
    createdAt: '', updatedAt: '',
    createdByFirstName: '', createdByLastName: '',
    updatedBy: '', replacesServiceId: null,
  }));
  if (pkg.requireManualPrice) {
    return { name: pkg.name, netInput: '', grossInput: '', vatRate: pkg.vatRate, requireManualPrice: true, selectedServices };
  }
  return {
    name: pkg.name,
    netInput: formatDecimalInput(pkg.basePriceNet),
    grossInput: formatDecimalInput(calculateGrossFromNet(pkg.basePriceNet, pkg.vatRate).priceGross),
    vatRate: pkg.vatRate,
    requireManualPrice: false,
    selectedServices,
  };
}

function validatePackageForm(v: PackageFormValues): PackageFormErrors {
  const errors: PackageFormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Nazwa jest wymagana';
  else if (name.length < 3) errors.name = 'Nazwa musi mieć co najmniej 3 znaki';
  if (!v.requireManualPrice) {
    const amount = parseMoneyInput(v.netInput);
    if (isNaN(amount) || amount < 0) errors.netInput = 'Podaj poprawną cenę netto';
  }
  if (v.selectedServices.length < 2) errors.services = 'Pakiet musi zawierać co najmniej 2 usługi';
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

type FormMode = 'add' | 'edit';

const PAGE_SIZE = 15;

export const ServicesSection: React.FC = () => {
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebounced]   = useState('');
  const [page, setPage]                   = useState(1);
  const [showInactive, setShowInactive]   = useState(false);

  const [formMode, setFormMode]           = useState<FormMode | null>(null);
  const [editTarget, setEditTarget]       = useState<Service | null>(null);
  const [formValues, setFormValues]       = useState<FormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors]       = useState<FormErrors>({});

  // Package form state
  const [pkgFormMode, setPkgFormMode]           = useState<FormMode | null>(null);
  const [pkgEditTarget, setPkgEditTarget]       = useState<Service | null>(null);
  const [pkgFormValues, setPkgFormValues]       = useState<PackageFormValues>(EMPTY_PKG_FORM);
  const [pkgFormErrors, setPkgFormErrors]       = useState<PackageFormErrors>({});
  const [pkgServiceSearch, setPkgServiceSearch] = useState('');
  const [pkgDropdownOpen, setPkgDropdownOpen]   = useState(false);
  const pkgDropdownRef                          = useRef<HTMLDivElement>(null);

  // affectedPackages dialog after service update
  const [affectedPackages, setAffectedPackages]       = useState<AffectedPackage[] | null>(null);
  const [updatedServiceId, setUpdatedServiceId]       = useState<string | null>(null);
  const [updatedServiceName, setUpdatedServiceName]   = useState('');

  const [archiveTarget, setArchiveTarget] = useState<Service | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Service picker search for package form
  const { services: pickerServices } = useServices({
    search: pkgServiceSearch,
    page: 1,
    limit: 50,
    showInactive: false,
  });

  const availablePickerServices = pickerServices.filter(
    s => !s.isPackage && !pkgFormValues.selectedServices.some(sel => sel.id === s.id)
  );

  // Close package service picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pkgDropdownRef.current && !pkgDropdownRef.current.contains(e.target as Node)) {
        setPkgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filters = { search: debouncedSearch, page, limit: PAGE_SIZE, showInactive };
  const { services, pagination, isLoading } = useServices(filters);

  const createMutation  = useCreateService();
  const updateMutation  = useUpdateService();
  const archiveMutation = useArchiveService();
  const createPkgMutation = useCreatePackage();
  const updatePkgMutation = useUpdatePackage();
  const syncItemName      = useSyncItemName();

  const isSaving    = createMutation.isPending || updateMutation.isPending;
  const isPkgSaving = createPkgMutation.isPending || updatePkgMutation.isPending;
  const totalItems  = pagination?.totalItems ?? 0;
  const totalPages  = pagination?.totalPages ?? 1;

  // ── Form handlers ──
  const anyFormOpen = formMode !== null || pkgFormMode !== null;

  const openAdd = () => {
    setPkgFormMode(null);
    setFormMode('add');
    setEditTarget(null);
    setFormValues(EMPTY_FORM);
    setFormErrors({});
  };

  const openEdit = (s: Service) => {
    if (s.isPackage) {
      setFormMode(null);
      setPkgFormMode('edit');
      setPkgEditTarget(s);
      setPkgFormValues(packageToForm(s));
      setPkgFormErrors({});
      setPkgServiceSearch('');
    } else {
      setPkgFormMode(null);
      setFormMode('edit');
      setEditTarget(s);
      setFormValues(serviceToForm(s));
      setFormErrors({});
    }
  };

  const closeForm = () => { setFormMode(null); setEditTarget(null); };

  // ── Package form handlers ──
  const openAddPackage = () => {
    setFormMode(null);
    setPkgFormMode('add');
    setPkgEditTarget(null);
    setPkgFormValues(EMPTY_PKG_FORM);
    setPkgFormErrors({});
    setPkgServiceSearch('');
  };

  const closePkgForm = () => { setPkgFormMode(null); setPkgEditTarget(null); };

  const setPkgField = <K extends keyof PackageFormValues>(key: K, value: PackageFormValues[K]) => {
    setPkgFormValues(prev => ({ ...prev, [key]: value }));
    if (key in pkgFormErrors) setPkgFormErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handlePkgNetChange = (raw: string) => {
    if (!isValidPriceInput(raw)) return;
    const net = parseMoneyInput(raw);
    const grossStr = raw.trim() === '' || net <= 0
      ? ''
      : formatDecimalInput(calculateGrossFromNet(net, pkgFormValues.vatRate).priceGross);
    setPkgFormValues(prev => ({ ...prev, netInput: raw, grossInput: grossStr }));
    setPkgFormErrors(prev => ({ ...prev, netInput: undefined }));
  };

  const handlePkgGrossChange = (raw: string) => {
    if (!isValidPriceInput(raw)) return;
    const gross = parseMoneyInput(raw);
    const netStr = raw.trim() === '' || gross <= 0
      ? ''
      : formatDecimalInput(calculateNetFromGross(gross, pkgFormValues.vatRate).priceNet);
    setPkgFormValues(prev => ({ ...prev, grossInput: raw, netInput: netStr }));
    setPkgFormErrors(prev => ({ ...prev, netInput: undefined }));
  };

  const handlePkgVatChange = (vatRate: VatRate) => {
    const net = parseMoneyInput(pkgFormValues.netInput);
    const grossStr = pkgFormValues.netInput.trim() === '' || isNaN(net) || net <= 0
      ? ''
      : formatDecimalInput(calculateGrossFromNet(net, vatRate).priceGross);
    setPkgFormValues(prev => ({ ...prev, vatRate, grossInput: grossStr }));
  };

  const addServiceToPkg = (svc: Service) => {
    setPkgFormValues(prev => ({ ...prev, selectedServices: [...prev.selectedServices, svc] }));
    setPkgServiceSearch('');
    setPkgDropdownOpen(false);
    setPkgFormErrors(prev => ({ ...prev, services: undefined }));
  };

  const removeServiceFromPkg = (id: string) => {
    setPkgFormValues(prev => ({ ...prev, selectedServices: prev.selectedServices.filter(s => s.id !== id) }));
  };

  const handlePkgSubmit = async () => {
    const errors = validatePackageForm(pkgFormValues);
    if (Object.keys(errors).length > 0) { setPkgFormErrors(errors); return; }

    const basePriceNet = pkgFormValues.requireManualPrice ? 0 : parseMoneyInput(pkgFormValues.netInput);
    const serviceIds = pkgFormValues.selectedServices.map(s => s.id);

    if (pkgFormMode === 'add') {
      await createPkgMutation.mutateAsync({
        name: pkgFormValues.name.trim(),
        basePriceNet,
        vatRate: pkgFormValues.vatRate,
        requireManualPrice: pkgFormValues.requireManualPrice,
        serviceIds,
      });
    } else if (pkgEditTarget) {
      await updatePkgMutation.mutateAsync({
        originalPackageId: pkgEditTarget.id,
        name: pkgFormValues.name.trim(),
        basePriceNet,
        vatRate: pkgFormValues.vatRate,
        requireManualPrice: pkgFormValues.requireManualPrice,
        serviceIds,
      });
    }
    closePkgForm();
  };

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    if (key in formErrors) setFormErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleNetChange = (raw: string) => {
    if (!isValidPriceInput(raw)) return;
    const net = parseMoneyInput(raw);
    const grossStr = raw.trim() === '' || net <= 0
      ? ''
      : formatDecimalInput(calculateGrossFromNet(net, formValues.vatRate).priceGross);
    setFormValues(prev => ({ ...prev, netInput: raw, grossInput: grossStr }));
    setFormErrors(prev => ({ ...prev, netInput: undefined }));
  };

  const handleGrossChange = (raw: string) => {
    if (!isValidPriceInput(raw)) return;
    const gross = parseMoneyInput(raw);
    const netStr = raw.trim() === '' || gross <= 0
      ? ''
      : formatDecimalInput(calculateNetFromGross(gross, formValues.vatRate).priceNet);
    setFormValues(prev => ({ ...prev, grossInput: raw, netInput: netStr }));
    setFormErrors(prev => ({ ...prev, netInput: undefined }));
  };

  const handleVatChange = (vatRate: VatRate) => {
    const net = parseMoneyInput(formValues.netInput);
    const grossStr = formValues.netInput.trim() === '' || isNaN(net) || net <= 0
      ? ''
      : formatDecimalInput(calculateGrossFromNet(net, vatRate).priceGross);
    setFormValues(prev => ({ ...prev, vatRate, grossInput: grossStr }));
  };

  const handleManualToggle = () => {
    setFormValues(prev =>
      prev.requireManualPrice
        ? { ...prev, requireManualPrice: false }
        : { ...prev, requireManualPrice: true, netInput: '', grossInput: '', vatRate: 23 }
    );
    setFormErrors(prev => ({ ...prev, netInput: undefined }));
  };

  const handleSubmit = async () => {
    const errors = validateForm(formValues);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    const basePriceNet = formValues.requireManualPrice ? 0 : parseMoneyInput(formValues.netInput);

    if (formMode === 'add') {
      await createMutation.mutateAsync({
        name: formValues.name.trim(),
        basePriceNet,
        vatRate: formValues.vatRate,
        requireManualPrice: formValues.requireManualPrice,
      });
      closeForm();
    } else if (editTarget) {
      const result = await updateMutation.mutateAsync({
        originalServiceId: editTarget.id,
        name: formValues.name.trim(),
        basePriceNet,
        vatRate: formValues.vatRate,
        requireManualPrice: formValues.requireManualPrice,
      });
      closeForm();
      if (result.affectedPackages && result.affectedPackages.length > 0) {
        setAffectedPackages(result.affectedPackages);
        setUpdatedServiceId(result.id);
        setUpdatedServiceName(result.name);
      }
    }
  };

  const handleSyncPackages = async (confirm: boolean) => {
    if (confirm && affectedPackages && updatedServiceId) {
      await Promise.all(
        affectedPackages.map(pkg =>
          syncItemName.mutateAsync({
            packageId: pkg.packageId,
            data: { serviceId: updatedServiceId, newName: updatedServiceName },
          })
        )
      );
    }
    setAffectedPackages(null);
    setUpdatedServiceId(null);
    setUpdatedServiceName('');
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    await archiveMutation.mutateAsync(archiveTarget.id);
    setArchiveTarget(null);
  };

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <Container>
      {/* ── Toolbar ── */}
      <Toolbar>
        <SearchWrap>
          <SearchIconWrap>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </SearchIconWrap>
          <SearchInput
            placeholder="Szukaj usługi…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </SearchWrap>

        <ToggleFilterBtn $on={showInactive} onClick={() => { setShowInactive(v => !v); setPage(1); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showInactive ? (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </>
            ) : (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </>
            )}
          </svg>
          Pokaż archiwalne
        </ToggleFilterBtn>

        <AddButton onClick={openAdd} disabled={anyFormOpen}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Dodaj usługę
        </AddButton>

        <AddPackageButton onClick={openAddPackage} disabled={anyFormOpen}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Utwórz pakiet
        </AddPackageButton>
      </Toolbar>

      {/* ── Stats ── */}
      <StatsRow>
        {!isLoading && (
          <StatText>
            <strong>{totalItems}</strong>{' '}
            {showInactive ? 'usług łącznie (w tym archiwalne)' : 'aktywnych usług'}
          </StatText>
        )}
      </StatsRow>

      {/* ── Form panel ── */}
      {formMode !== null && (
        <FormPanel>
          <FormHeader>
            <FormTitle>
              {formMode === 'add' ? 'Nowa usługa' : `Edytuj: ${editTarget?.name}`}
            </FormTitle>
            <CloseBtn onClick={closeForm} aria-label="Zamknij">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </CloseBtn>
          </FormHeader>

          <FormBody>
            {/* Nazwa */}
            <FormField>
              <FieldLabel>Nazwa usługi</FieldLabel>
              <FieldInput
                placeholder="np. Mycie ręczne premium"
                value={formValues.name}
                onChange={e => setField('name', e.target.value)}
                $error={!!formErrors.name}
                autoFocus
              />
              {formErrors.name && <ErrorMsg>{formErrors.name}</ErrorMsg>}
            </FormField>

            {/* Cena netto / Cena brutto / VAT */}
            <FormRow>
              <FormField>
                <FieldLabel>Cena netto</FieldLabel>
                <FieldInput
                  placeholder={formValues.requireManualPrice ? 'Wycena ręczna' : 'np. 150,00'}
                  value={formValues.netInput}
                  onChange={e => handleNetChange(e.target.value)}
                  disabled={formValues.requireManualPrice}
                  $error={!!formErrors.netInput}
                />
                {formErrors.netInput && <ErrorMsg>{formErrors.netInput}</ErrorMsg>}
              </FormField>

              <FormField>
                <FieldLabel>Cena brutto</FieldLabel>
                <FieldInput
                  placeholder={formValues.requireManualPrice ? 'Wycena ręczna' : 'np. 184,50'}
                  value={formValues.grossInput}
                  onChange={e => handleGrossChange(e.target.value)}
                  disabled={formValues.requireManualPrice}
                />
              </FormField>

              <FormField>
                <FieldLabel>Stawka VAT</FieldLabel>
                <FieldSelect
                  value={formValues.vatRate}
                  onChange={e => handleVatChange(Number(e.target.value) as VatRate)}
                  disabled={formValues.requireManualPrice}
                >
                  {VAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </FieldSelect>
              </FormField>
            </FormRow>

            {/* Wycena ręczna */}
            <ManualRow onClick={handleManualToggle}>
              <ToggleTrack $on={formValues.requireManualPrice}>
                <ToggleThumb $on={formValues.requireManualPrice} />
              </ToggleTrack>
              <ManualTextWrap>
                <ManualLabel>Wycena ręczna</ManualLabel>
                <ManualDesc>
                  Cena będzie ustalana indywidualnie podczas tworzenia zlecenia
                </ManualDesc>
              </ManualTextWrap>
            </ManualRow>
          </FormBody>

          <FormFooter>
            <CancelBtn onClick={closeForm}>Anuluj</CancelBtn>
            <SubmitBtn onClick={handleSubmit} disabled={isSaving}>
              {isSaving
                ? (formMode === 'add' ? 'Dodawanie…' : 'Zapisywanie…')
                : (formMode === 'add' ? 'Dodaj usługę' : 'Zapisz zmiany')}
            </SubmitBtn>
          </FormFooter>
        </FormPanel>
      )}

      {/* ── Package form panel ── */}
      {pkgFormMode !== null && (
        <FormPanel>
          <FormHeader>
            <FormTitle>
              {pkgFormMode === 'add' ? 'Nowy pakiet' : `Edytuj pakiet: ${pkgEditTarget?.name}`}
            </FormTitle>
            <CloseBtn onClick={closePkgForm} aria-label="Zamknij">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </CloseBtn>
          </FormHeader>

          <FormBody>
            {/* Nazwa */}
            <FormField>
              <FieldLabel>Nazwa pakietu</FieldLabel>
              <FieldInput
                placeholder="np. Pakiet Premium"
                value={pkgFormValues.name}
                onChange={e => setPkgField('name', e.target.value)}
                $error={!!pkgFormErrors.name}
                autoFocus
              />
              {pkgFormErrors.name && <ErrorMsg>{pkgFormErrors.name}</ErrorMsg>}
            </FormField>

            {/* Cena / VAT */}
            <FormRow>
              <FormField>
                <FieldLabel>Cena netto pakietu</FieldLabel>
                <FieldInput
                  placeholder={pkgFormValues.requireManualPrice ? 'Wycena ręczna' : 'np. 250,00'}
                  value={pkgFormValues.netInput}
                  onChange={e => handlePkgNetChange(e.target.value)}
                  disabled={pkgFormValues.requireManualPrice}
                  $error={!!pkgFormErrors.netInput}
                />
                {pkgFormErrors.netInput && <ErrorMsg>{pkgFormErrors.netInput}</ErrorMsg>}
              </FormField>

              <FormField>
                <FieldLabel>Cena brutto</FieldLabel>
                <FieldInput
                  placeholder={pkgFormValues.requireManualPrice ? 'Wycena ręczna' : 'np. 307,50'}
                  value={pkgFormValues.grossInput}
                  onChange={e => handlePkgGrossChange(e.target.value)}
                  disabled={pkgFormValues.requireManualPrice}
                />
              </FormField>

              <FormField>
                <FieldLabel>Stawka VAT</FieldLabel>
                <FieldSelect
                  value={pkgFormValues.vatRate}
                  onChange={e => handlePkgVatChange(Number(e.target.value) as VatRate)}
                  disabled={pkgFormValues.requireManualPrice}
                >
                  {VAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </FieldSelect>
              </FormField>
            </FormRow>

            {/* Wycena ręczna */}
            <ManualRow onClick={() => {
              setPkgFormValues(prev =>
                prev.requireManualPrice
                  ? { ...prev, requireManualPrice: false }
                  : { ...prev, requireManualPrice: true, netInput: '', grossInput: '', vatRate: 23 }
              );
            }}>
              <ToggleTrack $on={pkgFormValues.requireManualPrice}>
                <ToggleThumb $on={pkgFormValues.requireManualPrice} />
              </ToggleTrack>
              <ManualTextWrap>
                <ManualLabel>Wycena ręczna</ManualLabel>
                <ManualDesc>Cena będzie ustalana indywidualnie podczas tworzenia zlecenia</ManualDesc>
              </ManualTextWrap>
            </ManualRow>

            {/* Usługi w pakiecie */}
            <div>
              <FieldLabel style={{ marginBottom: 8 }}>Usługi wchodzące w skład pakietu</FieldLabel>
              <PackageInfoBox>
                Pakiet musi zawierać co najmniej 2 usługi. Cena pakietu jest ustawiana całościowo — składowe nie mają własnych cen w kontekście pakietu.
              </PackageInfoBox>

              <FormField style={{ marginTop: 10 }}>
                <FieldLabel>Dodaj usługę</FieldLabel>
                <ServicePickerWrap ref={pkgDropdownRef}>
                  <FieldInput
                    placeholder="Wpisz nazwę usługi…"
                    value={pkgServiceSearch}
                    onChange={e => { setPkgServiceSearch(e.target.value); setPkgDropdownOpen(true); }}
                    onFocus={() => setPkgDropdownOpen(true)}
                    $error={!!pkgFormErrors.services && pkgFormValues.selectedServices.length === 0}
                  />
                  {pkgDropdownOpen && availablePickerServices.length > 0 && (
                    <ServicePickerDropdown>
                      {availablePickerServices.map(svc => (
                        <ServicePickerOption
                          key={svc.id}
                          onMouseDown={() => addServiceToPkg(svc)}
                        >
                          {svc.name}
                        </ServicePickerOption>
                      ))}
                    </ServicePickerDropdown>
                  )}
                </ServicePickerWrap>
                {pkgFormErrors.services && <ErrorMsg>{pkgFormErrors.services}</ErrorMsg>}
              </FormField>

              {pkgFormValues.selectedServices.length > 0 && (
                <SelectedServicesList>
                  {pkgFormValues.selectedServices.map((svc, index) => (
                    <SelectedServiceItem key={svc.id}>
                      <PositionDot>{index + 1}</PositionDot>
                      <SelectedServiceName>{svc.name}</SelectedServiceName>
                      <RemoveServiceBtn type="button" onClick={() => removeServiceFromPkg(svc.id)}>×</RemoveServiceBtn>
                    </SelectedServiceItem>
                  ))}
                </SelectedServicesList>
              )}
            </div>
          </FormBody>

          <FormFooter>
            <CancelBtn onClick={closePkgForm}>Anuluj</CancelBtn>
            <SubmitBtn onClick={handlePkgSubmit} disabled={isPkgSaving} style={{ background: '#2563eb' }}>
              {isPkgSaving
                ? (pkgFormMode === 'add' ? 'Tworzenie…' : 'Zapisywanie…')
                : (pkgFormMode === 'add' ? 'Utwórz pakiet' : 'Zapisz pakiet')}
            </SubmitBtn>
          </FormFooter>
        </FormPanel>
      )}

      {/* ── List ── */}
      <ServiceList>
        <ListHeader>
          <ColLabel>Usługa</ColLabel>
          <ColLabel style={{ textAlign: 'center' }}>VAT</ColLabel>
          <ColLabel style={{ textAlign: 'right' }}>Cena</ColLabel>
          <ColLabel style={{ paddingLeft: '14px' }}>Status</ColLabel>
          <ColLabel />
        </ListHeader>

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i}>
              <SkeletonBox $w={`${42 + (i % 4) * 10}%`} />
              <SkeletonBox $w="36px" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <SkeletonBox $w="90px" />
                <SkeletonBox $w="70px" />
              </div>
              <SkeletonBox $w="56px" />
              <SkeletonBox $w="52px" />
            </SkeletonRow>
          ))
        ) : services.length === 0 ? (
          <EmptyWrap>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <EmptyTitle>Brak usług</EmptyTitle>
            <EmptyDesc>
              {debouncedSearch
                ? 'Żadna usługa nie pasuje do wyszukiwania.'
                : 'Dodaj pierwszą usługę klikając „Dodaj usługę".'}
            </EmptyDesc>
          </EmptyWrap>
        ) : (
          services.map(service => {
            const calc = !service.requireManualPrice
              ? calculateGrossFromNet(service.basePriceNet, service.vatRate)
              : null;

            return (
              <ServiceRow key={service.id}>
                <RowNameCell style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ServiceName $muted={!service.isActive}>{service.name}</ServiceName>
                    {service.isPackage && <PackageBadge>Pakiet</PackageBadge>}
                    {service.requireManualPrice && <ManualBadge>Wycena ręczna</ManualBadge>}
                  </div>
                  {service.isPackage && service.packageItems && service.packageItems.length > 0 && (
                    <PackageItemsHint>
                      {service.packageItems.map(i => i.serviceName).join(' · ')}
                    </PackageItemsHint>
                  )}
                </RowNameCell>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <VatBadge>{vatLabel(service.vatRate)}</VatBadge>
                </div>

                {service.requireManualPrice ? (
                  <PriceCell>
                    <PriceNet style={{ color: '#94a3b8' }}>–</PriceNet>
                  </PriceCell>
                ) : (
                  <PriceCell>
                    <PriceNet>{formatPLN(service.basePriceNet)}</PriceNet>
                    {calc && <PriceGross>{formatPLN(calc.priceGross)} brutto</PriceGross>}
                  </PriceCell>
                )}

                <StatusCell>
                  <StatusDot $active={service.isActive} />
                  <StatusLabel $active={service.isActive}>
                    {service.isActive ? 'Aktywna' : 'Archiwalna'}
                  </StatusLabel>
                </StatusCell>

                <ActionsCell>
                  {service.isActive && (
                    <>
                      <ActionBtn
                        title="Edytuj"
                        disabled={anyFormOpen}
                        onClick={() => openEdit(service)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </ActionBtn>
                      <ActionBtn
                        $danger
                        title="Archiwizuj"
                        onClick={() => setArchiveTarget(service)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="21 8 21 21 3 21 3 8"/>
                          <rect x="1" y="3" width="22" height="5"/>
                          <line x1="10" y1="12" x2="14" y2="12"/>
                        </svg>
                      </ActionBtn>
                    </>
                  )}
                </ActionsCell>
              </ServiceRow>
            );
          })
        )}

        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <Pager>
            <PagerInfo>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)} z {totalItems}
            </PagerInfo>
            <PagerControls>
              <PagerBtn
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                title="Poprzednia"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </PagerBtn>
              {pageNumbers.map((n, i) =>
                n === '…' ? (
                  <PagerBtn key={`e${i}`} disabled style={{ cursor: 'default' }}>…</PagerBtn>
                ) : (
                  <PagerBtn key={n} $active={n === page} onClick={() => setPage(n)}>
                    {n}
                  </PagerBtn>
                )
              )}
              <PagerBtn
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                title="Następna"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </PagerBtn>
            </PagerControls>
          </Pager>
        )}
      </ServiceList>

      {/* ── Affected packages dialog ── */}
      {affectedPackages && affectedPackages.length > 0 && (
        <Overlay onClick={e => e.target === e.currentTarget && handleSyncPackages(false)}>
          <Dialog>
            <DialogTitle>Zaktualizować nazwy w pakietach?</DialogTitle>
            <DialogText>
              Zmieniono nazwę na <strong>„{updatedServiceName}"</strong>.
              Usługa ta wchodzi w skład{' '}
              {affectedPackages.length === 1 ? 'pakietu' : 'pakietów'}:{' '}
              <strong>{affectedPackages.map(p => p.packageName).join(', ')}</strong>.
              Czy zaktualizować nazwę w{' '}
              {affectedPackages.length === 1 ? 'tym pakiecie' : 'tych pakietach'}?
            </DialogText>
            <DialogActions>
              <CancelBtn onClick={() => handleSyncPackages(false)}>Nie, zostaw stare nazwy</CancelBtn>
              <SubmitBtn onClick={() => handleSyncPackages(true)}>Tak, zaktualizuj</SubmitBtn>
            </DialogActions>
          </Dialog>
        </Overlay>
      )}

      {/* ── Archive dialog ── */}
      {archiveTarget && (
        <Overlay onClick={e => e.target === e.currentTarget && setArchiveTarget(null)}>
          <Dialog>
            <DialogTitle>Archiwizuj usługę</DialogTitle>
            <DialogText>
              Czy na pewno chcesz zarchiwizować usługę{' '}
              <strong>„{archiveTarget.name}"</strong>?{' '}
              Usługa nie będzie dostępna przy tworzeniu nowych zleceń, ale
              historyczne wizyty pozostaną niezmienione.
            </DialogText>
            <DialogActions>
              <CancelBtn onClick={() => setArchiveTarget(null)}>Anuluj</CancelBtn>
              <DangerBtn
                onClick={handleArchiveConfirm}
                disabled={archiveMutation.isPending}
              >
                {archiveMutation.isPending ? 'Archiwizowanie…' : 'Archiwizuj'}
              </DangerBtn>
            </DialogActions>
          </Dialog>
        </Overlay>
      )}
    </Container>
  );
};
