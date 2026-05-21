// src/modules/leads/views/LeadListView.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import {
  Inbox,
  PhoneCall,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  PenLine,
  Trash2,
  Car,
  Calendar,
  User,
  Wrench,
  UserCheck,
  UserX,
  Search,
  X,
  FileText,
  Edit3,
  CalendarDays,
  Check,
} from 'lucide-react';
import { customerApi } from '@/modules/customers/api/customerApi';
import type { Customer } from '@/modules/customers/types';
import { useToast } from '@/common/components/Toast';
import { servicesApi } from '@/modules/services/api/servicesApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '@/modules/visits/api/visitApi';
import { LEADS_KEY } from '../hooks';
import { leadApi } from '../api/leadApi';
import { Modal } from '@/common/components/Modal/Modal';
import { ImageViewerModal } from '@/modules/visits/components/ImageViewerModal';
import type { VisitPhoto } from '@/modules/visits/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';
import { StatTile, StatTileSkeleton } from '@/common/components/StatTile';
import { ConfirmationModal } from '@/common/components/ConfirmationModal/ConfirmationModal';
import { LeadForm } from '../components/LeadForm';
import { OfferComposer } from '../components/OfferComposer';
import {
  useLeads,
  useLead,
  useUpdateLeadStatus,
  useUpdateLeadValue,
  useDeleteLead,
  useLeadPipelineSummary,
  useLeadSocket,
  useAssignLeadCustomer,
  useSaveUserQuote,
  useDeleteUserQuote,
  useLeadAppointmentCreation,
} from '../hooks';
import { LeadStatus, LeadSource } from '../types';
import type { Lead, LeadDetail, LeadListFilters, CustomerSnapshot, LeadUserQuote, LeadEstimationItem, SaveUserQuoteItemRequest } from '../types';
import { QuickEventModal } from '@/modules/calendar/components/QuickEventModal';
import type { QuickEventFormData, QuickEventInitialData } from '@/modules/calendar/components/QuickEventModal';
import {
  formatCurrency,
  formatPLN,
  formatWaitingTime,
  formatRelativeTime,
  formatDateTime,
  formatPhoneNumber,
  truncateEmail,
  parseCurrencyToGrosze,
} from '../utils/formatters';

// ─── Date range types & helpers ───────────────────────────────────────────────

type DatePreset = 'week' | 'month' | 'quarter' | 'all' | 'custom';

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const getPresetRange = (preset: DatePreset): { dateFrom?: string; dateTo?: string } => {
  if (preset === 'all') return {};
  const today = new Date();
  const days = preset === 'week' ? 7 : preset === 'month' ? 30 : 90;
  const from = new Date(today);
  from.setDate(today.getDate() - days);
  return { dateFrom: toISODate(from), dateTo: toISODate(today) };
};

const formatPresetLabel = (preset: DatePreset, customFrom?: string, customTo?: string): string => {
  if (preset === 'all') return 'Cały czas';
  if (preset === 'week') return 'Ostatni tydzień';
  if (preset === 'month') return 'Ostatni miesiąc';
  if (preset === 'quarter') return 'Ostatni kwartał';
  if (customFrom && customTo) return `${customFrom} – ${customTo}`;
  if (customFrom) return `Od ${customFrom}`;
  if (customTo) return `Do ${customTo}`;
  return 'Zakres dat';
};

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const pulseDot = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`;

// ─── Page layout — identical to CustomerListView ──────────────────────────────

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  min-height: 100vh;
  background: ${st.bg};

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    padding: 32px;
  }

  @media (min-width: ${p => p.theme.breakpoints.xl}) {
    padding: 40px 48px;
  }
`;

const TotalChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: ${st.accentBlueDim};
  color: ${st.accentBlue};
  border-radius: ${st.radiusFull};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1px;
`;

const NewChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border-radius: ${st.radiusFull};
  font-size: 12px;
  font-weight: 600;
`;

const NewDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #dc2626;
  display: inline-block;
  animation: ${pulseDot} 1.8s ease-in-out infinite;
`;

const HeaderBtns = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;


const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  color: #475569;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all ${st.transition};

  &:hover { background: #e2e8f0; color: #0f172a; }
  svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

// ─── Date range picker ────────────────────────────────────────────────────────

const DatePickerWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const DatePickerTrigger = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${p => p.$active ? '#eff6ff' : '#f1f5f9'};
  color: ${p => p.$active ? '#0ea5e9' : '#475569'};
  border: 1.5px solid ${p => p.$active ? '#bae6fd' : '#e2e8f0'};
  border-radius: 9999px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    background: ${p => p.$active ? '#dbeafe' : '#e2e8f0'};
    color: ${p => p.$active ? '#0284c7' : '#0f172a'};
  }
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const DatePickerPanel = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 200;
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  min-width: 260px;
  padding: 8px;
  animation: ${fadeIn} 0.12s ease;
`;

const DatePresetGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DatePresetBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: ${p => p.$active ? '#eff6ff' : 'transparent'};
  color: ${p => p.$active ? '#0ea5e9' : st.text};
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: ${p => p.$active ? '600' : '500'};
  text-align: left;
  cursor: pointer;
  transition: background ${st.transition}, color ${st.transition};

  &:hover {
    background: ${p => p.$active ? '#dbeafe' : st.hover};
  }

  span.range-label {
    font-size: 11px;
    color: ${p => p.$active ? '#7dd3fc' : st.textMuted};
    font-weight: 400;
  }
`;

const DatePanelDivider = styled.div`
  height: 1px;
  background: ${st.border};
  margin: 8px 0;
`;

const DatePanelLabel = styled.div`
  padding: 4px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CustomRangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
`;

const DateInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  background: ${st.bg};
  color: ${st.text};
  border: 1.5px solid ${st.border};
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color ${st.transition};

  &:focus {
    outline: none;
    border-color: #0ea5e9;
  }
`;

const DateInputSep = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
  flex-shrink: 0;
`;

const ApplyBtn = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  transition: background ${st.transition};

  &:hover { background: #0284c7; }
  &:disabled { background: #94a3b8; cursor: not-allowed; }
`;

// ─── Stats grid ───────────────────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// ─── Content section — identical to CustomerListView ─────────────────────────

const ContentSection = styled.section`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowSm};
`;

const FilterBar = styled.div`
  border-bottom: 1px solid ${st.border};
`;

const FilterTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  flex-wrap: wrap;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    flex-wrap: nowrap;
  }
`;

// ─── Search input ─────────────────────────────────────────────────────────────

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 320px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  font-size: ${st.fontSm};
  font-family: inherit;
  background: #f8fafc;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  color: ${st.text};
  outline: none;
  transition: all ${st.transition};

  &:focus {
    border-color: #0ea5e9;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }

  &::placeholder { color: ${st.textMuted}; }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: ${st.textMuted};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const Spacer = styled.div` flex: 1; `;

// ─── Tab groups — same as CustomerListView ────────────────────────────────────

const TabGroup = styled.div`
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  flex-shrink: 0;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${p => p.$active ? '#fff' : 'transparent'};
  padding: 6px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$active ? '#0f172a' : '#64748b'};
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;
  box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'};

  &:hover:not(:disabled) {
    color: ${p => p.$active ? '#0f172a' : '#475569'};
  }
`;

// ─── Status dropdown filter ───────────────────────────────────────────────────

const StatusFilterWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const StatusFilterBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1.5px solid ${p => p.$active ? '#0ea5e9' : st.border};
  background: ${p => p.$active ? '#f0f9ff' : '#f8fafc'};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$active ? '#0369a1' : st.textSecondary};
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;

  &:hover {
    border-color: #0ea5e9;
    background: #f0f9ff;
    color: #0369a1;
  }

  svg { flex-shrink: 0; transition: transform 180ms ease; }
`;

const StatusFilterCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #0ea5e9;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
`;

const StatusDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 500;
  min-width: 200px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const StatusDropdownItem = styled.button<{ $checked: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: ${p => p.$checked ? `${p.$color}12` : 'transparent'};
  font-family: inherit;
  font-size: 13px;
  font-weight: ${p => p.$checked ? 600 : 400};
  color: ${p => p.$checked ? p.$color : st.text};
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;

  &:hover { background: ${p => `${p.$color}1e`}; }
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

const StatusCheckbox = styled.span<{ $checked: boolean; $color: string }>`
  margin-left: auto;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid ${p => p.$checked ? p.$color : '#cbd5e1'};
  background: ${p => p.$checked ? p.$color : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.12s;

  &::after {
    content: '';
    display: ${p => p.$checked ? 'block' : 'none'};
    width: 4px;
    height: 7px;
    border: 1.5px solid #fff;
    border-top: none;
    border-left: none;
    transform: rotate(45deg) translateY(-1px);
  }
`;

const StatusDropdownDivider = styled.div`
  height: 1px;
  background: ${st.border};
  margin: 4px 2px;
`;

const ClearAllBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: ${st.textMuted};
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;

  &:hover { background: #f1f5f9; color: ${st.textSecondary}; }
`;

// ─── Table — same structure as CustomerTable ──────────────────────────────────

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px;
  table-layout: fixed;
  border-collapse: collapse;
  background: ${st.bgCard};
`;

const Th = styled.th`
  padding: 12px 20px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.07em;
  white-space: nowrap;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};
`;

const ThIcon = styled(Th)`
  width: 44px;
  padding-right: 0;
`;

const ThActions = styled(Th)`
  width: 150px;
  padding-left: 0;
`;

const Tr = styled.tr<{ $isExpanded?: boolean }>`
  border-bottom: 1px solid #f1f5f9;
  transition: background ${st.transition};
  cursor: pointer;
  animation: ${fadeIn} 200ms ease both;

  &:last-child { border-bottom: none; }

  &:hover {
    background: ${p => p.$isExpanded ? '#f0f7ff' : st.bg};
  }

  ${p => p.$isExpanded && css`
    background: #f0f7ff;
    border-bottom: none;
  `}
`;

const Td = styled.td`
  padding: 14px 20px;
  font-size: 13px;
  color: ${st.text};
  vertical-align: middle;
`;

const TdIcon = styled(Td)`
  padding-right: 0;
  width: 44px;
`;

const TdActions = styled(Td)`
  padding-left: 0;
  width: 150px;
`;

// ─── Source icon ──────────────────────────────────────────────────────────────

const SourceWrap = styled.div<{ $source: LeadSource }>`
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 15px; height: 15px; }

  ${p => {
    switch (p.$source) {
      case LeadSource.PHONE:  return css`background:#dcfce7; color:#16a34a;`;
      case LeadSource.EMAIL:  return css`background:#dbeafe; color:#1d4ed8;`;
      default:                return css`background:#f3e8ff; color:#7c3aed;`;
    }
  }}
`;

const NewIndicator = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #dc2626;
  border: 2px solid #fff;
  animation: ${pulseDot} 1.8s ease-in-out infinite;
`;

// ─── Cell helpers — same as CustomerTable ────────────────────────────────────

const CellStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const CellMain = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CellSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CellNote = styled.div`
  font-size: 13px;
  color: ${st.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CellMono = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
  letter-spacing: -0.3px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = styled.span<{ $variant: 'new' | 'progress' | 'confirmed' | 'completed' | 'lost' | 'noshow' }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.92); }

  ${p => {
    switch (p.$variant) {
      case 'new':       return css`background:rgba(220,38,38,0.1); color:#dc2626;`;
      case 'progress':  return css`background:#dbeafe; color:#1e40af;`;
      case 'confirmed': return css`background:#dcfce7; color:#166534;`;
      case 'completed': return css`background:#d1fae5; color:#065f46;`;
      case 'lost':      return css`background:#f3f4f6; color:#4b5563;`;
      case 'noshow':    return css`background:#fef3c7; color:#92400e;`;
    }
  }}
`;

const StatusTd = styled.td`
  padding: 0 12px;
  vertical-align: middle;
  white-space: nowrap;
`;

const StatusMenu = styled.div`
  position: fixed;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  z-index: 9999;
  overflow: hidden;
  min-width: 170px;
`;

const StatusMenuItem = styled.button<{ $active: boolean; $color: string }>`
  display: block;
  width: 100%;
  padding: 9px 14px;
  background: ${p => p.$active ? `${p.$color}14` : 'transparent'};
  border: none;
  text-align: left;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${p => p.$active ? 700 : 500};
  color: ${p => p.$active ? p.$color : st.textSecondary};
  cursor: pointer;
  transition: background 0.12s;

  &:hover { background: ${p => `${p.$color}1a`}; color: ${p => p.$color}; }
  & + & { border-top: 1px solid #f1f5f9; }
`;

// ─── Icon action button — same as CustomerTable ───────────────────────────────

const IconBtn = styled.button<{ $rotated?: boolean; $danger?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${st.transition};

  svg {
    width: 14px;
    height: 14px;
    transition: transform 180ms ease;
    transform: ${p => p.$rotated ? 'rotate(180deg)' : 'rotate(0deg)'};
  }

  tr:hover & { background: #f1f5f9; color: #475569; }

  ${p => p.$danger
    ? css`
        &:hover { background: #fee2e2 !important; color: #dc2626 !important; }
      `
    : css`
        &:hover { background: #e2e8f0 !important; color: #0f172a !important; }
      `
  }
`;

const ActionBtns = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const BookingBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: transparent;
  border: 1.5px solid #0ea5e9;
  color: #0ea5e9;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all ${st.transition};

  svg { width: 12px; height: 12px; }

  &:hover { background: #e0f2fe; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

// ─── Expanded row panel ───────────────────────────────────────────────────────

const ExpandedTr = styled.tr`
  animation: ${fadeIn} 180ms ease both;
  border-bottom: 1px solid ${st.border};

  &:last-child { border-bottom: none; }
`;

const ExpandedTd = styled.td`
  padding: 0;
  background: #f8fbff;
`;

const ExpandedPanel = styled.div`
  padding: 20px 20px 20px 84px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid #dbeafe;
  overflow-x: hidden;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    padding: 16px;
  }
`;

const EstimationsGrid = styled.div<{ $twoCol: boolean }>`
  display: grid;
  grid-template-columns: ${p => p.$twoCol ? '1fr 1fr' : '1fr'};
  /* labels in row 1, cards in row 2 — both sides start at same height */
  column-gap: 20px;
  row-gap: 8px;
  align-items: start;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const PanelSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PanelLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MessageBox = styled.p`
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
  line-height: 1.6;
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  border-left: 3px solid #0ea5e9;
`;

// ─── Estimation / cost breakdown ──────────────────────────────────────────────

const EstCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const EstColumnWrapper = styled.div<{ $dimmed?: boolean }>`
  transition: opacity 0.2s, filter 0.2s;
  ${p => p.$dimmed && css`
    opacity: 0.38;
    filter: grayscale(0.85);
    pointer-events: none;
    user-select: none;
  `}
`;

const QuotePlaceholder = styled.div`
  background: #fff;
  border: 1.5px dashed ${st.border};
  border-radius: 10px;
  padding: 28px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  font-style: italic;
`;

const EstRow = styled.div<{ $isTotal?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: ${p => p.$isTotal ? '10px 14px' : '8px 14px'};
  border-bottom: ${p => p.$isTotal ? 'none' : `1px solid #f1f5f9`};
  background: ${p => p.$isTotal ? '#f8fafc' : 'transparent'};

  &:last-of-type {
    border-bottom: none;
  }
`;

const EstName = styled.span<{ $isTotal?: boolean }>`
  font-size: ${p => p.$isTotal ? '13px' : st.fontSm};
  font-weight: ${p => p.$isTotal ? 700 : 400};
  color: ${p => p.$isTotal ? st.text : st.textSecondary};
  min-width: 0;
`;

const EstPrice = styled.span<{ $isTotal?: boolean }>`
  font-size: ${p => p.$isTotal ? '13px' : st.fontSm};
  font-weight: ${p => p.$isTotal ? 700 : 500};
  color: ${p => p.$isTotal ? st.text : st.textSecondary};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
`;

const UnmatchedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px;
  background: #fffbeb;
  border-top: 1px solid #fde68a;
`;

const UnmatchedTag = styled.span`
  font-size: 11px;
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 9999px;
  padding: 2px 8px;
  font-weight: 500;
`;

const UnmatchedLabel = styled.span`
  font-size: 11px;
  color: #92400e;
  font-weight: 600;
  align-self: center;
`;

const NoEstBox = styled.div`
  padding: 14px;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  text-align: center;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

// ─── Customer assignment ───────────────────────────────────────────────────────

const AssignedCustomerCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AssignedCustomerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AssignedCustomerName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
`;

const AssignedCustomerContact = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
`;

const AssignBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: transparent;
  border: 1.5px solid #0ea5e9;
  color: #0ea5e9;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover { background: #e0f2fe; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  svg { width: 13px; height: 13px; }
`;

const UnassignBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 5px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  transition: all ${st.transition};
  flex-shrink: 0;

  &:hover { background: #fee2e2; color: #dc2626; }
  svg { width: 14px; height: 14px; }
`;

// ─── Customer picker modal ────────────────────────────────────────────────────

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const PickerBox = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
`;

const PickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${st.border};
`;

const PickerTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
`;

const PickerCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${st.textMuted};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: #f1f5f9; color: ${st.text}; }
  svg { width: 15px; height: 15px; }
`;

const PickerSearchWrap = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${st.border};
  position: relative;
`;

const PickerSearchIcon = styled.div`
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: ${st.textMuted};
  pointer-events: none;
  display: flex;
  svg { width: 14px; height: 14px; }
`;

const PickerSearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  font-size: ${st.fontSm};
  font-family: inherit;
  background: #f8fafc;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  color: ${st.text};
  outline: none;
  transition: all ${st.transition};
  box-sizing: border-box;

  &:focus { border-color: #0ea5e9; background: #fff; box-shadow: 0 0 0 3px rgba(14,165,233,0.12); }
  &::placeholder { color: ${st.textMuted}; }
`;

const PickerList = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const PickerCustomerRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background ${st.transition};

  &:last-child { border-bottom: none; }
  &:hover { background: #f0f9ff; }
`;

const PickerCustomerAvatar = styled.div`
  width: 34px; height: 34px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
`;

const PickerCustomerName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
`;

const PickerCustomerSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 1px;
`;

const PickerEmpty = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
`;

// ─── User quote editor ────────────────────────────────────────────────────────

const QuoteCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const QuoteItemRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;

  &:last-of-type { border-bottom: none; }
`;

const QuoteItemInput = styled.input`
  padding: 5px 8px;
  font-size: 12px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 7px;
  background: #f8fafc;
  color: ${st.text};
  outline: none;
  min-width: 0;
  transition: border-color ${st.transition};

  &:focus { border-color: #0ea5e9; background: #fff; }
  &[type="number"] { width: 80px; font-variant-numeric: tabular-nums; }
`;

const QuoteVatSelect = styled.select`
  padding: 5px 6px;
  font-size: 12px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 7px;
  background: #f8fafc;
  color: ${st.text};
  outline: none;
  cursor: pointer;
  width: 64px;
  transition: border-color ${st.transition};

  &:focus { border-color: #0ea5e9; background: #fff; }
`;

const QuoteGrossCell = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  min-width: 70px;
  text-align: right;
`;

const QuoteRemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: all ${st.transition};
  &:hover { background: #fee2e2; color: #dc2626; }
  svg { width: 13px; height: 13px; }
`;

const QuoteTotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-top: 1px solid ${st.border};
  gap: 8px;
`;

const QuoteTotalLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${st.text};
`;

const QuoteTotalValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
`;

const QuoteActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const QuoteAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: transparent;
  border: 1.5px dashed ${st.border};
  color: ${st.textMuted};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};

  &:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
  svg { width: 13px; height: 13px; }
`;

const QuoteSaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};

  &:hover { background: #0284c7; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const QuoteDeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: transparent;
  border: 1.5px solid #fecaca;
  color: #dc2626;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};

  &:hover { background: #fee2e2; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Inline editing inputs for user quote ─────────────────────────────────────

const InlineNameInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
  width: 100%;
  min-width: 0;
  font-family: inherit;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background ${st.transition};

  &:focus { color: ${st.text}; background: rgba(14,165,233,0.07); }
  &::placeholder { color: #c0cad8; }
`;

const pricePulse = keyframes`
  0%, 100% { background: rgba(239, 68, 68, 0.08); }
  50%       { background: rgba(239, 68, 68, 0.25); }
`;

const InlinePriceInput = styled.input<{ $pulse?: boolean }>`
  border: none;
  background: transparent;
  outline: none;
  font-size: ${st.fontSm};
  font-weight: 500;
  color: ${st.textSecondary};
  width: 72px;
  text-align: right;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background ${st.transition};

  &:focus { color: ${st.text}; background: rgba(14,165,233,0.07); }
  &::placeholder { color: #c0cad8; }

  ${props => props.$pulse && css`
    animation: ${pricePulse} 0.6s ease-in-out 3;
  `}

  /* hide browser number arrows */
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
`;

const InlineNetInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  font-size: 10px;
  font-weight: 400;
  color: ${st.textMuted};
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  text-align: right;
  width: 52px;
  padding: 0;
  cursor: text;
  border-radius: 3px;
  transition: background ${st.transition}, color ${st.transition};

  &:focus {
    background: rgba(14, 165, 233, 0.07);
    color: ${st.text};
  }
  &::placeholder { color: #c0cad8; }
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
`;

// EstCard without overflow:hidden so autocomplete dropdown isn't clipped
const UserQuoteCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

const EditEstBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  background: transparent;
  border: 1.5px solid ${st.border};
  color: ${st.textMuted};
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};
  margin-left: auto;

  &:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
  svg { width: 11px; height: 11px; }
`;

// ─── Service name autocomplete ────────────────────────────────────────────────

const SuggestBox = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1.5px solid #0ea5e9;
  border-radius: 9px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 100;
  overflow: hidden;
  max-height: 180px;
  overflow-y: auto;
`;

const SuggestRow = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background ${st.transition};

  &:last-child { border-bottom: none; }
  &:hover { background: #f0f9ff; }
`;

const SuggestName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${st.text};
`;

const SuggestPrice = styled.span`
  font-size: 10px;
  color: ${st.textMuted};
  margin-top: 1px;
`;

// ─── Customer chip in row ─────────────────────────────────────────────────────

const CustomerChip = styled.button<{ $assigned: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 5px;
  border-radius: 9999px;
  border: 1.5px solid ${p => p.$assigned ? '#bfdbfe' : st.border};
  background: ${p => p.$assigned ? '#eff6ff' : 'transparent'};
  color: ${p => p.$assigned ? '#1d4ed8' : '#94a3b8'};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    border-color: #0ea5e9;
    color: #0ea5e9;
    background: #f0f9ff;
  }
  svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

const SkeletonPulse = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '13px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Price override ───────────────────────────────────────────────────────────

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const PriceInputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PriceInput = styled.input`
  width: 130px;
  padding: 7px 40px 7px 11px;
  font-size: ${st.fontSm};
  font-family: inherit;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  background: #fff;
  color: ${st.text};
  outline: none;
  transition: all ${st.transition};

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const PriceSuffix = styled.span`
  position: absolute;
  right: 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  pointer-events: none;
`;

const SaveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};

  &:hover { background: #0284c7; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const SavedTag = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
  animation: ${fadeIn} 180ms ease both;
`;

// ─── Status action buttons ────────────────────────────────────────────────────

const StatusBtnGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const StatusActionBtn = styled.button<{ $active: boolean; $color: string }>`
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 9999px;
  border: 1.5px solid;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};
  white-space: nowrap;

  ${p => p.$active
    ? css`
        background: ${p.$color};
        border-color: ${p.$color};
        color: #fff;
      `
    : css`
        background: transparent;
        border-color: ${st.border};
        color: ${st.textSecondary};
        &:hover {
          border-color: ${p.$color};
          color: ${p.$color};
        }
      `
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── States ───────────────────────────────────────────────────────────────────

const LoadingRow = styled.tr``;

const LoadingCell = styled.td`
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 24px;
  color: ${st.textMuted};
  text-align: center;
`;

const EmptyTitle = styled.p`
  font-size: ${st.fontMd};
  font-weight: 600;
  color: ${st.textSecondary};
  margin: 0;
`;

const EmptyDesc = styled.p`
  font-size: ${st.fontSm};
  margin: 0;
`;

const ErrorWrap = styled.div`
  padding: 32px;
  text-align: center;
  color: #dc2626;
`;

const RetryBtn = styled.button`
  margin-top: 10px;
  padding: 7px 18px;
  background: transparent;
  border: 1.5px solid #dc2626;
  color: #dc2626;
  border-radius: 9999px;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all ${st.transition};
  &:hover { background: #dc2626; color: #fff; }
`;

// ─── Pagination (same tokens as CustomerPagination) ───────────────────────────

const PaginationContainer = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid ${st.border};

  @media (min-width: ${p => p.theme.breakpoints.sm}) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

const PaginationInfo = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textMuted};
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 4px;
`;

const PageBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  min-width: 36px;
  height: 34px;
  border: 1.5px solid ${st.border};
  border-radius: 8px;
  background: #fff;
  color: ${st.text};
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all ${st.transition};

  &:hover:not(:disabled) { border-color: #0ea5e9; color: #0ea5e9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Related visits ───────────────────────────────────────────────────────────

const RelatedVisitsCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const RelatedVisitRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background ${st.transition};

  &:last-child { border-bottom: none; }
  &:hover { background: #f0f9ff; }
  &:hover .rv-icon { background: #dbeafe; color: #1d4ed8; }
`;

const RelatedVisitIcon = styled.div.attrs({ className: 'rv-icon' })`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all ${st.transition};
  svg { width: 13px; height: 13px; }
`;

const RelatedVisitTitle = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

const RelatedVisitArrow = styled.span`
  flex-shrink: 0;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  svg { width: 13px; height: 13px; }

  ${RelatedVisitRow}:hover & { color: #93c5fd; }
`;

// ─── Visit preview modal — styled components ────────────────────────────────

const VModal = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const VInfoStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const VInfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

const VInfoIconBox = styled.div<{ $color: string; $bg: string }>`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: ${p => p.$bg};
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 13px; height: 13px; }
`;

const VInfoLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
`;

const VInfoMain = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  line-height: 1.3;
`;

const VInfoSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 1px;
`;

const VSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 8px;
`;

const VStatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  ${p => {
    const s = p.$status?.toUpperCase();
    if (s === 'COMPLETED')         return 'background:#dcfce7; color:#166534;';
    if (s === 'READY_FOR_PICKUP')  return 'background:#d1fae5; color:#065f46;';
    if (s === 'IN_PROGRESS')       return 'background:#dbeafe; color:#1e40af;';
    if (s === 'DRAFT')             return 'background:#f1f5f9; color:#475569;';
    if (s === 'REJECTED')          return 'background:#fee2e2; color:#991b1b;';
    if (s === 'ARCHIVED')          return 'background:#f3f4f6; color:#6b7280;';
    return `background:${st.accentBlueDim}; color:${st.accentBlue};`;
  }}
`;

const VStatusLabel: Record<string, string> = {
  DRAFT:            'Szkic',
  IN_PROGRESS:      'W realizacji',
  READY_FOR_PICKUP: 'Gotowy do odbioru',
  COMPLETED:        'Zakończona',
  REJECTED:         'Odrzucona',
  ARCHIVED:         'Zarchiwizowana',
};

const VServicesCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const VServicesHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};
`;

const VServicesHeadCell = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
`;

const VServiceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-bottom: 1px solid #f1f5f9;
  &:last-of-type { border-bottom: none; }
`;

const VServiceName = styled.span`
  font-size: 13px;
  color: ${st.textSecondary};
  min-width: 0;
  flex: 1;
`;

const VServicePrice = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
`;

const VTotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border-top: 1px solid ${st.border};
`;

const VTotalLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
`;

const VTotalPrice = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
`;

const VPhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  @media (max-width: 500px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const VPhotoThumb = styled.button`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${st.border};
  background: #f1f5f9;
  cursor: pointer;
  padding: 0;
  transition: all ${st.transition};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.18);
    transform: scale(1.02);
  }
`;

const VPhotoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0) ;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${st.transition};
  color: #fff;
  svg { width: 20px; height: 20px; opacity: 0; transition: opacity ${st.transition}; }

  ${VPhotoThumb}:hover & {
    background: rgba(0,0,0,0.28);
    svg { opacity: 1; }
  }
`;

const VEmptyPhotos = styled.div`
  padding: 20px;
  text-align: center;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  background: #f8fafc;
  border: 1px dashed ${st.border};
  border-radius: 10px;
`;

const VModalLoading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
`;

const VModalError = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: #dc2626;
  font-size: ${st.fontSm};
  font-weight: 500;
`;

// ─── Visit Preview Modal component ───────────────────────────────────────────

interface VisitPreviewModalProps {
  visitId: string | null;
  onClose: () => void;
}

const VisitPreviewModal: React.FC<VisitPreviewModalProps> = ({ visitId, onClose }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: detailData, isLoading: isDetailLoading, isError } = useQuery({
    queryKey: ['visit-preview', visitId],
    queryFn: () => visitApi.getVisitDetail(visitId!),
    enabled: !!visitId,
  });

  const { data: photosData, isLoading: isPhotosLoading } = useQuery({
    queryKey: ['visit-photos-preview', visitId],
    queryFn: () => visitApi.getVisitPhotos(visitId!),
    enabled: !!visitId,
  });

  const visit = detailData?.visit;
  const photos: VisitPhoto[] = photosData?.photos ?? [];
  const isLoading = isDetailLoading;

  const visitTitle = visit?.visitNumber
    ? `Wizyta ${visit.visitNumber}`
    : 'Podgląd wizyty';

  const customerName = visit?.customer
    ? `${visit.customer.firstName} ${visit.customer.lastName}`.trim()
    : null;

  const vehicleLabel = visit?.vehicle
    ? `${visit.vehicle.brand} ${visit.vehicle.model}`.trim()
    : null;

  const vehicleSub = visit?.vehicle
    ? [
        visit.vehicle.yearOfProduction ? String(visit.vehicle.yearOfProduction) : null,
        visit.vehicle.color ?? null,
        visit.vehicle.licensePlate ?? null,
      ].filter(Boolean).join(' · ')
    : null;

  const formattedDate = visit?.scheduledDate
    ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })
        .format(new Date(visit.scheduledDate))
    : null;

  return (
    <>
      <Modal isOpen={!!visitId} onClose={onClose} title={visitTitle} maxWidth="680px">
        {isLoading && (
          <VModalLoading>
            <SkeletonPulse $h="80px" />
            <SkeletonPulse $h="160px" />
            <SkeletonPulse $h="120px" />
          </VModalLoading>
        )}
        {isError && (
          <VModalError>Nie udało się załadować danych wizyty.</VModalError>
        )}
        {visit && !isLoading && (
          <VModal>
            {/* ── Info strip ─────────────────────────────────────── */}
            <VInfoStrip>
              <VInfoCard>
                <VInfoIconBox $color="#0ea5e9" $bg="rgba(14,165,233,0.1)">
                  <Calendar />
                </VInfoIconBox>
                <VInfoLabel>Data wizyty</VInfoLabel>
                <VInfoMain>{formattedDate ?? '—'}</VInfoMain>
                {visit.status && (
                  <VStatusBadge $status={visit.status}>
                    {VStatusLabel[visit.status] ?? visit.status}
                  </VStatusBadge>
                )}
              </VInfoCard>

              <VInfoCard>
                <VInfoIconBox $color="#6366f1" $bg="rgba(99,102,241,0.1)">
                  <Car />
                </VInfoIconBox>
                <VInfoLabel>Pojazd</VInfoLabel>
                <VInfoMain>{vehicleLabel ?? '—'}</VInfoMain>
                {vehicleSub && <VInfoSub>{vehicleSub}</VInfoSub>}
              </VInfoCard>

              <VInfoCard>
                <VInfoIconBox $color="#10b981" $bg="rgba(16,185,129,0.1)">
                  <User />
                </VInfoIconBox>
                <VInfoLabel>Właściciel</VInfoLabel>
                <VInfoMain>{customerName ?? '—'}</VInfoMain>
                {visit.customer?.phone && (
                  <VInfoSub>{visit.customer.phone}</VInfoSub>
                )}
                {visit.customer?.companyName && (
                  <VInfoSub>{visit.customer.companyName}</VInfoSub>
                )}
              </VInfoCard>
            </VInfoStrip>

            {/* ── Services ───────────────────────────────────────── */}
            {visit.services && visit.services.length > 0 && (
              <div>
                <VSectionLabel>Wykonane usługi</VSectionLabel>
                <VServicesCard>
                  <VServicesHead>
                    <VServicesHeadCell>Usługa</VServicesHeadCell>
                    <VServicesHeadCell>Cena brutto</VServicesHeadCell>
                  </VServicesHead>
                  {visit.services.map(svc => (
                    <VServiceRow key={svc.id}>
                      <VServiceName>{svc.serviceName}</VServiceName>
                      <VServicePrice>{formatCurrency(svc.finalPriceGross)}</VServicePrice>
                    </VServiceRow>
                  ))}
                  {visit.totalCost && (
                    <VTotalRow>
                      <VTotalLabel>ŁĄCZNIE</VTotalLabel>
                      <VTotalPrice>{formatCurrency(visit.totalCost.grossAmount)} brutto</VTotalPrice>
                    </VTotalRow>
                  )}
                </VServicesCard>
              </div>
            )}

            {/* ── Gallery ────────────────────────────────────────── */}
            <div>
              <VSectionLabel>
                Galeria zdjęć
                {isPhotosLoading && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, color: st.textMuted }}>
                    ładowanie…
                  </span>
                )}
                {!isPhotosLoading && photos.length > 0 && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>
                    ({photos.length})
                  </span>
                )}
              </VSectionLabel>
              {isPhotosLoading ? (
                <VPhotoGrid>
                  {Array.from({ length: 4 }, (_, i) => (
                    <SkeletonPulse key={i} $h="0" style={{ aspectRatio: '1', height: 'auto' }} />
                  ))}
                </VPhotoGrid>
              ) : photos.length > 0 ? (
                <VPhotoGrid>
                  {photos.map((photo, idx) => (
                    <VPhotoThumb
                      key={photo.id}
                      onClick={() => setLightboxIndex(idx)}
                      title={photo.description ?? photo.fileName}
                    >
                      <img src={photo.thumbnailUrl} alt={photo.fileName} loading="lazy" />
                      <VPhotoOverlay>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </VPhotoOverlay>
                    </VPhotoThumb>
                  ))}
                </VPhotoGrid>
              ) : (
                <VEmptyPhotos>Brak zdjęć przypisanych do tej wizyty</VEmptyPhotos>
              )}
            </div>
          </VModal>
        )}
      </Modal>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <ImageViewerModal
          imageUrl={photos[lightboxIndex].fullSizeUrl}
          imageName={photos[lightboxIndex].fileName}
          isOpen
          onClose={() => setLightboxIndex(null)}
          onDownload={() => {
            const a = document.createElement('a');
            a.href = photos[lightboxIndex!].fullSizeUrl;
            a.download = photos[lightboxIndex!].fileName;
            a.target = '_blank';
            a.click();
          }}
          hasNext={lightboxIndex < photos.length - 1}
          hasPrev={lightboxIndex > 0}
          onNext={() => setLightboxIndex(i => (i ?? 0) + 1)}
          onPrev={() => setLightboxIndex(i => (i ?? 0) - 1)}
        />
      )}
    </>
  );
};

// ─── Static config ────────────────────────────────────────────────────────────

const TILE_CONFIGS = {
  awaiting: {
    accentColor: '#dc2626',
    bgGradient: 'linear-gradient(140deg, #fef2f2 0%, #ffffff 55%)',
    iconBg: 'rgba(220, 38, 38, 0.1)',
  },
  conversion: {
    accentColor: '#3B82F6',
    bgGradient: 'linear-gradient(140deg, #eff6ff 0%, #ffffff 55%)',
    iconBg: 'rgba(59, 130, 246, 0.1)',
  },
  converted: {
    accentColor: '#10B981',
    bgGradient: 'linear-gradient(140deg, #f0fdf4 0%, #ffffff 55%)',
    iconBg: 'rgba(16, 185, 129, 0.1)',
  },
  atRisk: {
    accentColor: '#F59E0B',
    bgGradient: 'linear-gradient(140deg, #fffbeb 0%, #ffffff 55%)',
    iconBg: 'rgba(245, 158, 11, 0.1)',
  },
} as const;

type SourceTab = 'ALL' | LeadSource;

const SOURCE_TABS: { id: SourceTab; label: string }[] = [
  { id: 'ALL',             label: 'Wszystkie' },
  { id: LeadSource.PHONE,  label: 'Telefon' },
  { id: LeadSource.EMAIL,  label: 'E-mail' },
  { id: LeadSource.MANUAL, label: 'Ręczne' },
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]:        'Nowy',
  [LeadStatus.IN_PROGRESS]: 'W kontakcie',
  [LeadStatus.CONFIRMED]:  'Zarezerwowany',
  [LeadStatus.COMPLETED]:  'Zakończony',
  [LeadStatus.LOST]:       'Utracony',
  [LeadStatus.NO_SHOW]:    'Porzucony',
};

const getStatusVariant = (lead: Lead): 'new' | 'progress' | 'confirmed' | 'completed' | 'lost' | 'noshow' => {
  switch (lead.status) {
    case LeadStatus.NEW:        return 'new';
    case LeadStatus.IN_PROGRESS: return 'progress';
    case LeadStatus.CONFIRMED:  return 'confirmed';
    case LeadStatus.COMPLETED:  return 'completed';
    case LeadStatus.LOST:       return 'lost';
    case LeadStatus.NO_SHOW:    return 'noshow';
    default:                    return 'progress';
  }
};

const getStatusLabel = (lead: Lead): string => STATUS_LABELS[lead.status];

const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]:         '#dc2626',
  [LeadStatus.IN_PROGRESS]: '#1e40af',
  [LeadStatus.CONFIRMED]:   '#166534',
  [LeadStatus.COMPLETED]:   '#065f46',
  [LeadStatus.LOST]:        '#4b5563',
  [LeadStatus.NO_SHOW]:     '#92400e',
};

const STATUS_FILTER_OPTIONS: { id: LeadStatus; label: string }[] = [
  { id: LeadStatus.NEW,         label: 'Nowe' },
  { id: LeadStatus.IN_PROGRESS, label: 'W kontakcie' },
  { id: LeadStatus.CONFIRMED,   label: 'Zarezerwowane' },
  { id: LeadStatus.COMPLETED,   label: 'Zakończone' },
  { id: LeadStatus.LOST,        label: 'Utracone' },
  { id: LeadStatus.NO_SHOW,     label: 'Porzucony' },
];

const formatContact = (lead: Lead): { primary: string; secondary?: string } => {
  if (lead.customerName) {
    return {
      primary: lead.customerName,
      secondary: lead.contactIdentifier.includes('@')
        ? truncateEmail(lead.contactIdentifier, 28)
        : formatPhoneNumber(lead.contactIdentifier),
    };
  }
  return {
    primary: lead.contactIdentifier.includes('@')
      ? truncateEmail(lead.contactIdentifier, 32)
      : formatPhoneNumber(lead.contactIdentifier),
  };
};

// ─── Customer Picker Modal ────────────────────────────────────────────────────

interface CustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (!isOpen) { setSearch(''); setDebouncedSearch(''); }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-picker', debouncedSearch],
    queryFn: () => customerApi.getCustomers({ search: debouncedSearch, page: 1, limit: 15 }),
    enabled: isOpen,
  });

  // API returns { data: Customer[], pagination: ... }
  const customers = data?.data ?? [];

  if (!isOpen) return null;

  return (
    <PickerOverlay onClick={onClose}>
      <PickerBox onClick={e => e.stopPropagation()}>
        <PickerHeader>
          <PickerTitle>Przypisz klienta z bazy</PickerTitle>
          <PickerCloseBtn onClick={onClose}><X /></PickerCloseBtn>
        </PickerHeader>
        <PickerSearchWrap>
          <PickerSearchIcon><Search /></PickerSearchIcon>
          <PickerSearchInput
            autoFocus
            placeholder="Szukaj po nazwisku, emailu, telefonie…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </PickerSearchWrap>
        <PickerList>
          {isLoading ? (
            <PickerEmpty>Ładowanie…</PickerEmpty>
          ) : customers.length === 0 ? (
            <PickerEmpty>
              {debouncedSearch ? 'Brak wyników dla podanej frazy' : 'Brak klientów w bazie'}
            </PickerEmpty>
          ) : customers.map(customer => {
            const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';
            const initials = [customer.firstName?.[0], customer.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
            const contact = customer.contact?.phone || customer.contact?.email || '';
            return (
              <PickerCustomerRow key={customer.id} onClick={() => { onSelect(customer); onClose(); }}>
                <PickerCustomerAvatar>{initials}</PickerCustomerAvatar>
                <div>
                  <PickerCustomerName>{fullName}</PickerCustomerName>
                  {contact && <PickerCustomerSub>{contact}</PickerCustomerSub>}
                </div>
              </PickerCustomerRow>
            );
          })}
        </PickerList>
      </PickerBox>
    </PickerOverlay>
  );
};

// ─── User Quote Editor ────────────────────────────────────────────────────────

interface UserQuoteItem {
  _key: string;
  serviceId?: string | null;
  serviceName: string;
  priceNet: string;
  vatRate: number;
  priceGross: string;
}

const computeGross = (netStr: string, vatRate: number): string => {
  const net = parseFloat(netStr.replace(',', '.'));
  if (isNaN(net) || net < 0) return '';
  return (net * (1 + vatRate / 100)).toFixed(2);
};

const parsePLNToGrosze = (str: string): number => Math.round(parseFloat(str.replace(',', '.')) * 100);

// ── Service name input with autocomplete ──────────────────────────────────────

interface ServiceNameInputProps {
  value: string;
  onChange: (name: string, serviceId?: string | null, priceNet?: number, vatRate?: number) => void;
}

const ServiceNameInput: React.FC<ServiceNameInputProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });

  useEffect(() => { setSearch(value); }, [value]);

  const updatePos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 240) });
    }
  };

  const { data } = useQuery({
    queryKey: ['service-suggest', search],
    queryFn: () => servicesApi.getServices({ search, page: 1, limit: 8, showInactive: false }),
    enabled: open && search.length >= 1,
  });

  const suggestions = data?.services ?? [];

  return (
    <>
      <InlineNameInput
        ref={inputRef}
        placeholder="Nazwa usługi"
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value, null); setOpen(true); updatePos(); }}
        onFocus={() => { setOpen(true); updatePos(); }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && suggestions.length > 0 && createPortal(
        <SuggestBox style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}>
          {suggestions.map(svc => (
            <SuggestRow
              key={svc.id}
              onMouseDown={e => {
                e.preventDefault();
                setSearch(svc.name);
                setOpen(false);
                onChange(svc.name, svc.id, svc.basePriceNet, svc.vatRate);
              }}
            >
              <SuggestName>{svc.name}</SuggestName>
              <SuggestPrice>
                {(svc.basePriceNet / 100).toFixed(2)} PLN netto · VAT {svc.vatRate}%
              </SuggestPrice>
            </SuggestRow>
          ))}
        </SuggestBox>,
        document.body
      )}
    </>
  );
};

interface UserQuoteEditorProps {
  leadId: string;
  existingQuote: LeadUserQuote | null;
  prefillItems?: LeadEstimationItem[];
  onSaved?: (totalGross: number) => void;
  onDeleted?: () => void;
}

const UserQuoteEditor: React.FC<UserQuoteEditorProps> = ({ leadId, existingQuote, prefillItems, onSaved, onDeleted }) => {
  const saveQuote   = useSaveUserQuote(leadId);
  const deleteQuote = useDeleteUserQuote(leadId);
  const { showSuccess, showWarning } = useToast();

  const emptyItem = (): UserQuoteItem => ({ _key: `new-${Date.now()}`, serviceName: '', priceNet: '', vatRate: 23, priceGross: '' });

  const buildItemsFromQuote = (quote: LeadUserQuote): UserQuoteItem[] =>
    quote.items.map((item, i) => ({
      _key: `${i}-${item.id}`,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      priceNet: (item.priceNet / 100).toFixed(2),
      vatRate: item.vatRate,
      priceGross: (item.priceGross / 100).toFixed(2),
    }));

  const buildItemsFromEstimation = (estItems: LeadEstimationItem[]): UserQuoteItem[] =>
    estItems.map((item, i) => ({
      _key: `est-${i}`,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      priceNet: (item.priceNet / 100).toFixed(2),
      vatRate: item.vatRate,
      priceGross: (item.priceGross / 100).toFixed(2),
    }));

  const buildInitialItems = (): UserQuoteItem[] => {
    if (existingQuote) return buildItemsFromQuote(existingQuote);
    if (prefillItems?.length) return buildItemsFromEstimation(prefillItems);
    return [emptyItem()];
  };

  const [items, setItems] = useState<UserQuoteItem[]>(buildInitialItems);
  const [savedItems, setSavedItems] = useState<UserQuoteItem[]>(buildInitialItems);
  const [pulseKeys, setPulseKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = existingQuote
      ? buildItemsFromQuote(existingQuote)
      : prefillItems?.length
        ? buildItemsFromEstimation(prefillItems)
        : [emptyItem()];
    setItems(next);
    setSavedItems(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingQuote?.id, existingQuote?.updatedAt]);

  const serializeItems = (its: UserQuoteItem[]) =>
    its.map(i => `${i.serviceName}|${i.priceGross}|${i.priceNet}|${i.vatRate}`).join(';');

  const hasChanges = serializeItems(items) !== serializeItems(savedItems);

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (key: string) => setItems(prev => prev.filter(i => i._key !== key));

  const updateItem = (key: string, patch: Partial<UserQuoteItem>) => {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item;
      const updated = { ...item, ...patch };
      if ('priceNet' in patch || 'vatRate' in patch) {
        updated.priceGross = computeGross(updated.priceNet, updated.vatRate);
      }
      return updated;
    }));
  };

  const limitDecimals = (raw: string): string => {
    const sepIdx = Math.max(raw.indexOf('.'), raw.indexOf(','));
    return sepIdx === -1 ? raw : raw.slice(0, sepIdx + 3);
  };

  const syncFromGross = (key: string, rawGross: string) => {
    const limited = limitDecimals(rawGross);
    const num = parseFloat(limited.replace(',', '.'));
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item;
      if (!isNaN(num)) {
        return { ...item, priceGross: limited, priceNet: (num / (1 + item.vatRate / 100)).toFixed(2) };
      }
      return { ...item, priceGross: limited };
    }));
  };

  const syncFromNet = (key: string, rawNet: string) => {
    const limited = limitDecimals(rawNet);
    const num = parseFloat(limited.replace(',', '.'));
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item;
      if (!isNaN(num)) {
        return { ...item, priceNet: limited, priceGross: (num * (1 + item.vatRate / 100)).toFixed(2) };
      }
      return { ...item, priceNet: limited };
    }));
  };

  const normalizeItem = (key: string) => {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item;
      const gross = parseFloat(item.priceGross.replace(',', '.'));
      if (isNaN(gross)) return item;
      return {
        ...item,
        priceGross: gross.toFixed(2),
        priceNet: (gross / (1 + item.vatRate / 100)).toFixed(2),
      };
    }));
  };

  const handleSave = () => {
    const missingPriceKeys = items
      .filter(i => i.serviceName.trim() && !parseFloat(i.priceGross.replace(',', '.')))
      .map(i => i._key);

    if (missingPriceKeys.length > 0) {
      showWarning('Uzupełnij cenę');
      setPulseKeys(new Set(missingPriceKeys));
      setTimeout(() => setPulseKeys(new Set()), 1800);
      return;
    }

    const validItems: SaveUserQuoteItemRequest[] = items
      .filter(i => i.serviceName.trim() && i.priceNet)
      .map(i => ({
        serviceId: i.serviceId ?? null,
        serviceName: i.serviceName.trim(),
        priceNet: parsePLNToGrosze(i.priceNet),
        vatRate: i.vatRate,
        priceGross: parsePLNToGrosze(i.priceGross || computeGross(i.priceNet, i.vatRate)),
      }));

    saveQuote.mutate({ items: validItems }, {
      onSuccess: (saved) => {
        showSuccess('Kosztorys zapisany');
        setSavedItems([...items]);
        onSaved?.(saved.totalGross);
      },
    });
  };

  const handleDelete = () => {
    deleteQuote.mutate(undefined, {
      onSuccess: () => {
        setItems([emptyItem()]);
        onDeleted?.();
      },
    });
  };

  const totalNet   = items.reduce((s, i) => s + (parseFloat(i.priceNet.replace(',', '.')) || 0), 0);
  const totalGross = items.reduce((s, i) => s + (parseFloat(i.priceGross.replace(',', '.')) || 0), 0);

  return (
    <div>
      {/* Styled identical to EstCard */}
      <UserQuoteCard>
        {items.map(item => (
          <EstRow key={item._key}>
            {/* Service name — inline input, same width as EstName */}
            <ServiceNameInput
              value={item.serviceName}
              onChange={(name, serviceId, priceNet, vatRate) => {
                const patch: Partial<UserQuoteItem> = { serviceName: name, serviceId: serviceId ?? null };
                if (priceNet !== undefined) patch.priceNet = (priceNet / 100).toFixed(2);
                if (vatRate !== undefined) patch.vatRate = vatRate;
                updateItem(item._key, patch);
              }}
            />
            {/* Price — brutto prominent, netto as editable ghost below */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <InlinePriceInput
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={item.priceGross}
                  onChange={e => syncFromGross(item._key, e.target.value)}
                  onBlur={() => normalizeItem(item._key)}
                  title="Cena brutto (PLN)"
                  $pulse={pulseKeys.has(item._key)}
                />
                <span style={{ fontSize: st.fontSm, fontWeight: 500, color: st.textSecondary, whiteSpace: 'nowrap' }}>brutto</span>
                <QuoteRemoveBtn onClick={() => removeItem(item._key)} title="Usuń pozycję" style={{ marginLeft: 2 }}>
                  <X />
                </QuoteRemoveBtn>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontVariantNumeric: 'tabular-nums' }}>
                <InlineNetInput
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={item.priceNet}
                  onChange={e => syncFromNet(item._key, e.target.value)}
                  onBlur={() => normalizeItem(item._key)}
                  title="Cena netto — kliknij aby edytować"
                />
                <span style={{ fontSize: 10, color: st.textMuted }}>PLN netto · VAT {item.vatRate}%</span>
              </div>
            </div>
          </EstRow>
        ))}
        {(totalNet > 0 || totalGross > 0) && (
          <EstRow $isTotal>
            <EstName $isTotal>ŁĄCZNIE</EstName>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <EstPrice $isTotal>{totalGross.toFixed(2)} PLN brutto</EstPrice>
              <span style={{ fontSize: 10, color: st.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {totalNet.toFixed(2)} PLN netto
              </span>
            </div>
          </EstRow>
        )}
      </UserQuoteCard>
      <QuoteActions>
        <QuoteAddBtn onClick={addItem}>
          <Plus /> Dodaj usługę
        </QuoteAddBtn>
        {hasChanges && (
          <QuoteSaveBtn onClick={handleSave} disabled={saveQuote.isPending}>
            {saveQuote.isPending ? 'Zapisywanie…' : 'Zapisz kosztorys'}
          </QuoteSaveBtn>
        )}
        {existingQuote && (
          <QuoteDeleteBtn onClick={handleDelete} disabled={deleteQuote.isPending}>
            {deleteQuote.isPending ? 'Usuwanie…' : 'Usuń kosztorys'}
          </QuoteDeleteBtn>
        )}
      </QuoteActions>
    </div>
  );
};

// ─── Expanded row component ───────────────────────────────────────────────────

interface ExpandedRowProps {
  lead: Lead;
  colSpan: number;
}

const ExpandedRow: React.FC<ExpandedRowProps> = ({ lead, colSpan }) => {
  const { lead: detail, isLoading: isDetailLoading } = useLead(lead.id);
  const updateValue = useUpdateLeadValue();

  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll so the full expanded panel is visible after mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom <= vh) return; // already fully in view
      // Panel fits with breathing room → scroll bottom into view
      // Panel is very tall → scroll to its top so user can read from start
      const block = rect.height < vh - 80 ? 'end' : 'start';
      el.scrollIntoView({ behavior: 'smooth', block });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const [previewVisitId, setPreviewVisitId] = useState<string | null>(null);

  const estimation    = detail?.estimation ?? null;
  const userQuote     = detail?.userQuote ?? null;
  const relatedVisits = estimation?.relatedVisits ?? detail?.relatedVisits ?? lead.relatedVisits ?? [];
  const hasQuote      = !!userQuote;

  // AI is dimmed when user has their own quote
  const aiDimmed = hasQuote;

  // Silently sync estimatedValue when quote is saved or deleted
  const handleQuoteSaved = (totalGross: number) => {
    updateValue.mutate({ id: lead.id, estimatedValue: totalGross });
  };
  const handleQuoteDeleted = () => {
    updateValue.mutate({ id: lead.id, estimatedValue: estimation?.totalGross ?? 0 });
  };

  return (
    <>
      <ExpandedTr>
        <ExpandedTd colSpan={colSpan}>
          <ExpandedPanel ref={panelRef}>

            {/* Initial message — full width */}
            {lead.initialMessage && (
              <div>
                <PanelLabel>Wiadomość od klienta</PanelLabel>
                <MessageBox>{lead.initialMessage}</MessageBox>
              </div>
            )}

            {/* Estimations — always side by side; labels in row 1, cards in row 2 */}
            <EstimationsGrid $twoCol={true}>
              {/* Row 1 col 1 — AI label */}
              <PanelLabel style={{ display: 'flex', alignItems: 'center' }}>
                <FileText size={13} style={{ marginRight: 6 }} /> Kosztorys AI
              </PanelLabel>

              {/* Row 1 col 2 — User quote label */}
              <PanelLabel style={{ display: 'flex', alignItems: 'center' }}>
                <Edit3 size={13} style={{ marginRight: 6 }} /> Twój kosztorys
              </PanelLabel>

              {/* Row 2 col 1 — AI card (dimmed when user quote is active) */}
              <EstColumnWrapper $dimmed={aiDimmed}>
                {isDetailLoading ? (
                  <EstCard>
                    <EstRow><SkeletonPulse $w="55%" /></EstRow>
                    <EstRow><SkeletonPulse $w="45%" /></EstRow>
                    <EstRow $isTotal><SkeletonPulse $w="30%" /></EstRow>
                  </EstCard>
                ) : estimation && estimation.matchedItems.length > 0 ? (
                  <EstCard>
                    {estimation.matchedItems.map(item => (
                      <EstRow key={item.serviceName}>
                        <EstName>{item.serviceName}</EstName>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <EstPrice>{formatCurrency(item.priceGross)} brutto</EstPrice>
                          <span style={{ fontSize: 10, color: st.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(item.priceNet)} netto · VAT {item.vatRate}%
                          </span>
                        </div>
                      </EstRow>
                    ))}
                    <EstRow $isTotal>
                      <EstName $isTotal>ŁĄCZNIE</EstName>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <EstPrice $isTotal>{formatCurrency(estimation.totalGross)} brutto</EstPrice>
                        <span style={{ fontSize: 10, color: st.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(estimation.totalNet)} netto
                        </span>
                      </div>
                    </EstRow>
                    {estimation.unmatchedNeeds.length > 0 && (
                      <UnmatchedRow>
                        <UnmatchedLabel>Nie znaleziono w cenniku:</UnmatchedLabel>
                        {estimation.unmatchedNeeds.map(n => (
                          <UnmatchedTag key={n}>{n}</UnmatchedTag>
                        ))}
                      </UnmatchedRow>
                    )}
                  </EstCard>
                ) : (
                  <NoEstBox>Brak kosztorysu AI.</NoEstBox>
                )}
              </EstColumnWrapper>

              {/* Row 2 col 2 — User quote */}
              <EstColumnWrapper>
                {isDetailLoading ? (
                  <EstCard>
                    <EstRow><SkeletonPulse $w="55%" /></EstRow>
                    <EstRow><SkeletonPulse $w="45%" /></EstRow>
                    <EstRow $isTotal><SkeletonPulse $w="30%" /></EstRow>
                  </EstCard>
                ) : (
                  <UserQuoteEditor
                    leadId={lead.id}
                    existingQuote={userQuote}
                    prefillItems={!userQuote && estimation ? estimation.matchedItems : undefined}
                    onSaved={handleQuoteSaved}
                    onDeleted={handleQuoteDeleted}
                  />
                )}
              </EstColumnWrapper>
            </EstimationsGrid>

            {/* Related visits */}
            {relatedVisits.length > 0 && (
              <PanelSection>
                <PanelLabel>Na podstawie wizyt</PanelLabel>
                <RelatedVisitsCard>
                  {relatedVisits.map(rv => (
                    <RelatedVisitRow
                      key={rv.id}
                      onClick={e => { e.stopPropagation(); setPreviewVisitId(rv.id); }}
                    >
                      <RelatedVisitIcon><Wrench /></RelatedVisitIcon>
                      <RelatedVisitTitle>{rv.title ?? `Wizyta ${rv.id.slice(0, 8)}…`}</RelatedVisitTitle>
                      <RelatedVisitArrow><ChevronRight /></RelatedVisitArrow>
                    </RelatedVisitRow>
                  ))}
                </RelatedVisitsCard>
              </PanelSection>
            )}

            {/* Offer composer — EMAIL leads only */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <OfferComposer lead={lead} />
            </div>

          </ExpandedPanel>
        </ExpandedTd>
      </ExpandedTr>

      <VisitPreviewModal
        visitId={previewVisitId}
        onClose={() => setPreviewVisitId(null)}
      />
    </>
  );
};

// ─── Main view ────────────────────────────────────────────────────────────────

export const LeadListView: React.FC = () => {
  useLeadSocket();

  const queryClient = useQueryClient();

  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [activeSource, setActiveSource]     = useState<SourceTab>('ALL');
  const [searchValue, setSearchValue]       = useState('');
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);
  const [pickerLeadId, setPickerLeadId]     = useState<string | null>(null);
  const [statusMenuLeadId, setStatusMenuLeadId] = useState<string | null>(null);
  const [statusMenuPos, setStatusMenuPos]       = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // ─── Booking modal state ───────────────────────────────────────────────────
  const [bookingLeadId, setBookingLeadId]           = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingInitialData, setBookingInitialData] = useState<QuickEventInitialData | undefined>(undefined);
  const [isBookingLoading, setIsBookingLoading]     = useState(false);
  const createLeadAppointment = useLeadAppointmentCreation(bookingLeadId);

  const { showError: showBookingError } = useToast();

  const updateStatus = useUpdateLeadStatus();

  const buildInitialData = (detail: LeadDetail): QuickEventInitialData => {
    const c = detail.assignedCustomer;
    const customer: QuickEventInitialData['customer'] = c
      ? { id: c.id, firstName: c.firstName ?? undefined, lastName: c.lastName ?? undefined, phone: c.phone ?? undefined, email: c.email ?? undefined, isNew: false }
      : undefined;

    const activeItems = detail.userQuote?.items ?? detail.estimation?.matchedItems ?? [];
    const serviceIds: string[] = [];
    const servicePrices: { [k: string]: number } = {};
    const tempServices: { [k: string]: { name: string; basePriceNet: number; vatRate: number } } = {};

    activeItems.forEach((item, idx) => {
      const id = item.serviceId ?? `lead-temp-${detail.id}-${idx}`;
      serviceIds.push(id);
      servicePrices[id] = item.priceGross / 100;
      if (!item.serviceId) {
        tempServices[id] = { name: item.serviceName, basePriceNet: item.priceNet, vatRate: item.vatRate };
      }
    });

    const vehicle = detail.vehicleBrand
      ? { brand: detail.vehicleBrand, model: detail.vehicleModel ?? '', isNew: true }
      : undefined;

    return { customer, vehicle, serviceIds, servicePrices, tempServices };
  };

  const handleStartBooking = async (lead: Lead) => {
    if (isBookingLoading) return;
    setIsBookingLoading(true);
    setBookingLeadId(lead.id);
    try {
      const detail = await leadApi.getLead(lead.id);
      setBookingInitialData(buildInitialData(detail));
    } catch {
      // Fallback: open modal with just basic lead data (no services pre-filled)
      const c = lead.assignedCustomer;
      setBookingInitialData(c
        ? { customer: { id: c.id, firstName: c.firstName ?? undefined, lastName: c.lastName ?? undefined, phone: c.phone ?? undefined, email: c.email ?? undefined, isNew: false } }
        : undefined
      );
    } finally {
      setIsBookingLoading(false);
      setIsBookingModalOpen(true);
    }
  };

  const handleBookingClose = () => {
    setIsBookingModalOpen(false);
    setBookingLeadId(null);
    setBookingInitialData(undefined);
  };

  const handleBookingSave = async (data: QuickEventFormData) => {
    try {
      await createLeadAppointment.mutateAsync(data);
      handleBookingClose();
    } catch (err) {
      showBookingError(err instanceof Error ? err.message : 'Nie udało się utworzyć rezerwacji');
    }
  };

  // ─── (removed useLead-based effect — now using imperative fetch in handleStartBooking)
  useEffect(() => {
    if (!statusMenuLeadId) return;
    const close = () => setStatusMenuLeadId(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [statusMenuLeadId]);

  const deleteLead = useDeleteLead();

  const assignMutation = useMutation({
    mutationFn: ({ leadId, customerId }: { leadId: string; customerId: string | null }) =>
      leadApi.assignCustomer(leadId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });

  // ─── Date range state ─────────────────────────────────────────────────────
  const [datePreset, setDatePreset]             = useState<DatePreset>('all');
  const [customDateFrom, setCustomDateFrom]     = useState('');
  const [customDateTo, setCustomDateTo]         = useState('');
  const [pendingCustomFrom, setPendingCustomFrom] = useState('');
  const [pendingCustomTo, setPendingCustomTo]   = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const activeDateRange = datePreset === 'all'
    ? { dateFrom: undefined, dateTo: undefined }
    : datePreset === 'custom'
      ? { dateFrom: customDateFrom || undefined, dateTo: customDateTo || undefined }
      : getPresetRange(datePreset);

  const [filters, setFilters] = useState<LeadListFilters>({
    search: '',
    status: [],
    source: [],
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const filtersWithDate: LeadListFilters = {
    ...filters,
    dateFrom: activeDateRange.dateFrom,
    dateTo: activeDateRange.dateTo,
  };

  const { leads, pagination, isLoading, isError, refetch } = useLeads(filtersWithDate);
  const { summary, isLoading: isSummaryLoading } = useLeadPipelineSummary(
    undefined,
    activeDateRange.dateFrom,
    activeDateRange.dateTo,
  );

  const newLeadsCount = leads.filter(l => l.requiresVerification).length;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchValue(v);
    setFilters(p => ({ ...p, search: v, page: 1 }));
  }, []);

  const handleStatusToggle = useCallback((status: LeadStatus) => {
    setSelectedStatuses(prev => {
      const next = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      setFilters(p => ({ ...p, status: next, page: 1 }));
      return next;
    });
  }, []);

  const handleClearStatuses = useCallback(() => {
    setSelectedStatuses([]);
    setFilters(p => ({ ...p, status: [], page: 1 }));
    setIsStatusDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (!isStatusDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isStatusDropdownOpen]);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handle = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isDatePickerOpen]);

  const handleSource = useCallback((v: SourceTab) => {
    setActiveSource(v);
    setFilters(p => ({ ...p, source: v === 'ALL' ? [] : [v], page: 1 }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const COL_SPAN = 7;

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }, (_, i) => (
        <LoadingRow key={i}>
          {Array.from({ length: COL_SPAN }, (_, j) => (
            <LoadingCell key={j}>
              <SkeletonPulse $w={j === 0 ? '34px' : j === 1 ? '120px' : j === 6 ? '80px' : '60px'} $h={j === 0 ? '34px' : '13px'} />
            </LoadingCell>
          ))}
        </LoadingRow>
      ));
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={COL_SPAN}>
            <ErrorWrap>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Nie udało się załadować leadów</p>
              <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
            </ErrorWrap>
          </td>
        </tr>
      );
    }

    if (leads.length === 0) {
      return (
        <tr>
          <td colSpan={COL_SPAN}>
            <EmptyState>
              <Inbox size={40} strokeWidth={1.25} />
              <div>
                <EmptyTitle>Brak leadów</EmptyTitle>
                <EmptyDesc>
                  {searchValue || selectedStatuses.length > 0 || activeSource !== 'ALL'
                    ? 'Brak leadów spełniających wybrane kryteria'
                    : 'Nowe leady pojawią się tutaj automatycznie'}
                </EmptyDesc>
              </div>
            </EmptyState>
          </td>
        </tr>
      );
    }

    return leads.flatMap(lead => {
      const isExpanded = expandedId === lead.id;
      const contact = formatContact(lead);

      const rows = [
        <Tr
          key={lead.id}
          $isExpanded={isExpanded}
          onClick={() => toggleExpand(lead.id)}
        >
          <TdIcon>
            <SourceWrap $source={lead.source}>
              {lead.source === LeadSource.PHONE
                ? <Phone />
                : lead.source === LeadSource.EMAIL
                  ? <Mail />
                  : <PenLine />
              }
              {lead.requiresVerification && <NewIndicator />}
            </SourceWrap>
          </TdIcon>

          <Td onClick={e => e.stopPropagation()}>
            {lead.assignedCustomer ? (() => {
              const c = lead.assignedCustomer!;
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
              const initials = [c.firstName?.[0], c.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
              const contactSub = lead.contactIdentifier.includes('@')
                ? truncateEmail(lead.contactIdentifier, 28)
                : formatPhoneNumber(lead.contactIdentifier);
              return (
                <CellStack>
                  <CustomerChip
                    $assigned
                    title={`Klient: ${name}\nKliknij aby zmienić`}
                    onClick={() => setPickerLeadId(lead.id)}
                  >
                    <PickerCustomerAvatar style={{ width: 14, height: 14, fontSize: 7, flexShrink: 0 }}>
                      {initials}
                    </PickerCustomerAvatar>
                    {name}
                  </CustomerChip>
                  <CellSub>{contactSub}</CellSub>
                </CellStack>
              );
            })() : (
              <CellStack>
                <CellMain>{contact.primary}</CellMain>
                {contact.secondary && <CellSub>{contact.secondary}</CellSub>}
                <CustomerChip
                  $assigned={false}
                  title="Przypisz klienta z bazy"
                  onClick={() => setPickerLeadId(lead.id)}
                >
                  <User /> Przypisz klienta
                </CustomerChip>
              </CellStack>
            )}
          </Td>

          <Td>
            {lead.summary
              ? <CellNote title={lead.summary}>{lead.summary}</CellNote>
              : lead.initialMessage
                ? <CellNote title={lead.initialMessage}>{lead.initialMessage}</CellNote>
                : <CellSub style={{ fontStyle: 'italic' }}>—</CellSub>
            }
          </Td>

          <Td>
            <CellStack>
              <CellMain>{formatDateTime(lead.createdAt)}</CellMain>
              <CellSub>Ostatnia aktualizacja: {formatRelativeTime(lead.updatedAt || lead.createdAt)}</CellSub>
            </CellStack>
          </Td>

          <StatusTd onClick={e => { e.stopPropagation(); toggleExpand(lead.id); }}>
            <StatusBadge
              $variant={getStatusVariant(lead)}
              onClick={e => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setStatusMenuPos({ top: rect.bottom + 4, left: rect.left });
                setStatusMenuLeadId(v => v === lead.id ? null : lead.id);
              }}
            >
              {getStatusLabel(lead)}
            </StatusBadge>
          </StatusTd>

          <Td>
            <CellMono>{formatCurrency(lead.estimatedValue)}</CellMono>
            <CellSub>brutto</CellSub>
          </Td>

          <TdActions onClick={e => e.stopPropagation()}>
            <ActionBtns>
              {lead.status !== LeadStatus.CONFIRMED && lead.status !== LeadStatus.COMPLETED && (
                <BookingBtn
                  title="Rozpocznij rezerwację"
                  disabled={isBookingLoading}
                  onClick={() => handleStartBooking(lead)}
                >
                  <Calendar size={12} />
                  {isBookingLoading && bookingLeadId === lead.id ? '…' : 'Rezerwuj'}
                </BookingBtn>
              )}
              <IconBtn
                $danger
                title="Usuń leada"
                onClick={() => setDeleteTarget({ id: lead.id, name: lead.customerName || lead.contactIdentifier })}
              >
                <Trash2 />
              </IconBtn>
              <IconBtn
                $rotated={isExpanded}
                title={isExpanded ? 'Zwiń' : 'Rozwiń'}
                onClick={() => toggleExpand(lead.id)}
              >
                <ChevronDown />
              </IconBtn>
            </ActionBtns>
          </TdActions>
        </Tr>,
      ];

      if (isExpanded) {
        rows.push(
          <ExpandedRow key={`${lead.id}-expanded`} lead={lead} colSpan={COL_SPAN} />
        );
      }

      return rows;
    });
  };

  const startItem = pagination ? (pagination.currentPage - 1) * pagination.itemsPerPage + 1 : 0;
  const endItem   = pagination ? Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems) : 0;

  return (
    <ViewContainer>
      <PageHeader
        title="Leady"
        subtitle={
          <>
            Zarządzaj zapytaniami i potencjalnymi klientami
            {pagination && (
              <TotalChip>{pagination.totalItems} leadów</TotalChip>
            )}
            {!isLoading && newLeadsCount > 0 && (
              <NewChip>
                <NewDot />
                {newLeadsCount} {newLeadsCount === 1 ? 'nowy' : newLeadsCount < 5 ? 'nowe' : 'nowych'}
              </NewChip>
            )}
          </>
        }
        actions={
          <HeaderBtns>
          {/* Date range picker */}
          <DatePickerWrap ref={datePickerRef}>
            <DatePickerTrigger
              $active={datePreset !== 'all'}
              onClick={() => {
                setIsDatePickerOpen(p => !p);
                setPendingCustomFrom(customDateFrom);
                setPendingCustomTo(customDateTo);
              }}
            >
              <CalendarDays />
              {formatPresetLabel(
                datePreset,
                datePreset === 'custom' ? customDateFrom : undefined,
                datePreset === 'custom' ? customDateTo : undefined,
              )}
              <ChevronDown style={{ opacity: 0.6 }} />
            </DatePickerTrigger>

            {isDatePickerOpen && (
              <DatePickerPanel>
                <DatePresetGroup>
                  {([
                    ['all',     'Cały czas',        ''],
                    ['week',    'Ostatni tydzień',   '7 dni'],
                    ['month',   'Ostatni miesiąc',   '30 dni'],
                    ['quarter', 'Ostatni kwartał',   '90 dni'],
                  ] as const).map(([id, label, hint]) => (
                    <DatePresetBtn
                      key={id}
                      $active={datePreset === id}
                      onClick={() => {
                        setDatePreset(id);
                        setIsDatePickerOpen(false);
                        setFilters(p => ({ ...p, page: 1 }));
                      }}
                    >
                      {label}
                      {hint && <span className="range-label">{hint}</span>}
                      {datePreset === id && <Check size={13} />}
                    </DatePresetBtn>
                  ))}
                </DatePresetGroup>

                <DatePanelDivider />
                <DatePanelLabel>Niestandardowy zakres</DatePanelLabel>

                <CustomRangeRow>
                  <DateInput
                    type="date"
                    value={pendingCustomFrom}
                    max={pendingCustomTo || undefined}
                    onChange={e => setPendingCustomFrom(e.target.value)}
                  />
                  <DateInputSep>–</DateInputSep>
                  <DateInput
                    type="date"
                    value={pendingCustomTo}
                    min={pendingCustomFrom || undefined}
                    onChange={e => setPendingCustomTo(e.target.value)}
                  />
                </CustomRangeRow>

                <ApplyBtn
                  disabled={!pendingCustomFrom && !pendingCustomTo}
                  onClick={() => {
                    setCustomDateFrom(pendingCustomFrom);
                    setCustomDateTo(pendingCustomTo);
                    setDatePreset('custom');
                    setIsDatePickerOpen(false);
                    setFilters(p => ({ ...p, page: 1 }));
                  }}
                >
                  Zastosuj zakres
                </ApplyBtn>
              </DatePickerPanel>
            )}
          </DatePickerWrap>

          <PageHeaderPrimaryButton onClick={() => setIsFormOpen(true)}>
            <Plus />
            Dodaj lead
          </PageHeaderPrimaryButton>
        </HeaderBtns>
        }
      />

      {/* Stats tiles */}
      <StatsGrid>
        {isSummaryLoading ? (
          <>
            <StatTileSkeleton {...TILE_CONFIGS.awaiting} />
            <StatTileSkeleton {...TILE_CONFIGS.conversion} />
            <StatTileSkeleton {...TILE_CONFIGS.converted} />
            <StatTileSkeleton {...TILE_CONFIGS.atRisk} />
          </>
        ) : (
          <>
            <StatTile
              {...TILE_CONFIGS.awaiting}
              icon={PhoneCall}
              value={summary?.awaitingFirstContactCount ?? 0}
              label="Do obsłużenia"
              tooltip="Liczba leadów, które czekają na PIERWSZY kontakt. Każda godzina zwłoki = rosnące ryzyko, że klient zadzwoni do konkurencji. W detailingu przy PPF czy ceramice klient często wysyła zapytanie do 3–5 firm jednocześnie."
              subContent={summary && (
                <span style={{ fontSize: 12, color: '#ef4444' }}>
                  Śr. oczekiwanie: {formatWaitingTime(summary.avgWaitingTimeMinutes)}
                </span>
              )}
            />
            <StatTile
              {...TILE_CONFIGS.conversion}
              icon={TrendingUp}
              value={summary ? `${summary.conversionRateThisMonth.toFixed(1)}%` : '—'}
              label="Konwersja (ten miesiąc)"
              tooltip="Ile procent leadów zamienia się w prawdziwych klientów. To jest zdrowie całego procesu. Jeśli konwersja spada z 45% do 20%, coś się popsuło — może zbyt wolna odpowiedź, może ceny za wysokie, może zły formularz."
              subContent={summary && (() => {
                const trend = summary.conversionRateTrendPp;
                const isUp = trend >= 0;
                return (
                  <span style={{ fontSize: 12, fontWeight: 600, color: isUp ? '#16a34a' : '#dc2626' }}>
                    {isUp ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} pp vs poprzedni miesiąc
                  </span>
                );
              })()}
            />
            <StatTile
              {...TILE_CONFIGS.converted}
              icon={CheckCircle2}
              value={summary ? formatCurrency(summary.convertedValueThisMonth) : '—'}
              label="Zrealizowane (ten miesiąc)"
              tooltip="Suma wartości leadów zamienionych w klientów w bieżącym miesiącu. To nie pipeline, to przychód już potwierdzony. Satysfakcja + motywacja."
              subContent={summary && (
                <span style={{ fontSize: 12, color: st.textMuted }}>
                  {summary.convertedCountThisMonth} {
                    summary.convertedCountThisMonth === 1 ? 'lead' :
                    summary.convertedCountThisMonth < 5 ? 'leady' : 'leadów'
                  } zrealizowanych
                </span>
              )}
            />
            <StatTile
              {...TILE_CONFIGS.atRisk}
              icon={AlertTriangle}
              value={summary ? formatPLN(summary.atRiskValue) : '—'}
              label="Ryzyko utraty"
              tooltip="Suma wartości leadów, z którymi nie było żadnej interakcji od 24+ godzin. To jest koszt bezczynności — liczba, która boli i zmusza do działania."
              subContent={summary && (
                <span style={{ fontSize: 12, color: '#d97706' }}>
                  {summary.atRiskCount} {
                    summary.atRiskCount === 1 ? 'lead' :
                    summary.atRiskCount < 5 ? 'leady' : 'leadów'
                  } bez kontaktu
                </span>
              )}
            />
          </>
        )}
      </StatsGrid>

      {/* Content section */}
      <ContentSection>
        <FilterBar>
          <FilterTopRow>
            <SearchWrap>
              <SearchIcon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Szukaj po nazwie, kontakcie…"
                value={searchValue}
                onChange={handleSearch}
              />
            </SearchWrap>

            <TabGroup>
              {SOURCE_TABS.map(tab => (
                <TabBtn
                  key={tab.id}
                  $active={activeSource === tab.id}
                  onClick={() => handleSource(tab.id)}
                >
                  {tab.label}
                </TabBtn>
              ))}
            </TabGroup>

            <Spacer />

            <StatusFilterWrap ref={statusDropdownRef}>
              <StatusFilterBtn
                $active={selectedStatuses.length > 0}
                onClick={() => setIsStatusDropdownOpen(p => !p)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                {selectedStatuses.length === 0
                  ? 'Status'
                  : selectedStatuses.length === 1
                    ? STATUS_FILTER_OPTIONS.find(o => o.id === selectedStatuses[0])?.label ?? 'Status'
                    : `${selectedStatuses.length} statusy`
                }
                {selectedStatuses.length > 0 && (
                  <StatusFilterCount>{selectedStatuses.length}</StatusFilterCount>
                )}
                <ChevronDown
                  size={12}
                  style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </StatusFilterBtn>

              {isStatusDropdownOpen && (
                <StatusDropdownMenu>
                  {selectedStatuses.length > 0 && (
                    <>
                      <ClearAllBtn onClick={handleClearStatuses}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Wyczyść filtry
                      </ClearAllBtn>
                      <StatusDropdownDivider />
                    </>
                  )}
                  {STATUS_FILTER_OPTIONS.map(opt => (
                    <StatusDropdownItem
                      key={opt.id}
                      $checked={selectedStatuses.includes(opt.id)}
                      $color={STATUS_COLORS[opt.id]}
                      onClick={() => handleStatusToggle(opt.id)}
                    >
                      <StatusDot $color={STATUS_COLORS[opt.id]} />
                      {opt.label}
                      <StatusCheckbox
                        $checked={selectedStatuses.includes(opt.id)}
                        $color={STATUS_COLORS[opt.id]}
                      />
                    </StatusDropdownItem>
                  ))}
                </StatusDropdownMenu>
              )}
            </StatusFilterWrap>
          </FilterTopRow>
        </FilterBar>

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <ThIcon />
                <Th>Klient</Th>
                <Th>Kontekst</Th>
                <Th>Utworzono</Th>
                <Th style={{ width: '130px' }}>Status</Th>
                <Th style={{ width: '120px' }}>Wartość</Th>
                <ThActions />
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </Table>
        </TableWrapper>

        {pagination && (
          <PaginationContainer aria-label="Pagination">
            <PaginationInfo>
              Wyświetlanie {startItem}–{endItem} z {pagination.totalItems} leadów
            </PaginationInfo>
            <PaginationControls>
              <PageBtn
                disabled={pagination.currentPage === 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              >
                ←
              </PageBtn>
              <PageBtn
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              >
                →
              </PageBtn>
            </PaginationControls>
          </PaginationContainer>
        )}
      </ContentSection>

      <LeadForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <CustomerPickerModal
        isOpen={!!pickerLeadId}
        onClose={() => setPickerLeadId(null)}
        onSelect={customer => {
          if (pickerLeadId) {
            assignMutation.mutate({ leadId: pickerLeadId, customerId: customer.id });
            setPickerLeadId(null);
          }
        }}
      />

      {/* Status change dropdown — rendered via portal to escape table stacking context */}
      {statusMenuLeadId && (() => {
        const menuLead = leads.find(l => l.id === statusMenuLeadId);
        if (!menuLead) return null;
        return createPortal(
          <StatusMenu
            style={{ top: statusMenuPos.top, left: statusMenuPos.left }}
            onClick={e => e.stopPropagation()}
          >
            {([
              { status: LeadStatus.NEW,         label: 'Nowy',           color: '#dc2626' },
              { status: LeadStatus.IN_PROGRESS, label: 'W kontakcie',    color: '#1d4ed8' },
              { status: LeadStatus.CONFIRMED,   label: 'Zarezerwowany',  color: '#16a34a' },
              { status: LeadStatus.COMPLETED,   label: 'Zakończony',     color: '#065f46' },
              { status: LeadStatus.LOST,        label: 'Utracony',       color: '#64748b' },
              { status: LeadStatus.NO_SHOW,     label: 'Porzucony',      color: '#92400e' },
            ] as const).map(({ status, label, color }) => (
              <StatusMenuItem
                key={status}
                $active={menuLead.status === status}
                $color={color}
                disabled={updateStatus.isPending}
                onClick={() => {
                  updateStatus.mutate({ id: menuLead.id, status });
                  setStatusMenuLeadId(null);
                }}
              >
                {label}
              </StatusMenuItem>
            ))}
          </StatusMenu>,
          document.body
        );
      })()}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Usuń leada"
        message={deleteTarget
          ? `Czy na pewno chcesz usunąć leada „${deleteTarget.name}"? Tej operacji nie można cofnąć.`
          : ''}
        variant="danger"
        confirmText={deleteLead.isPending ? 'Usuwanie…' : 'Usuń'}
        cancelText="Anuluj"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteLead.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              if (expandedId === deleteTarget.id) setExpandedId(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <QuickEventModal
        isOpen={isBookingModalOpen}
        eventData={null}
        initialData={bookingInitialData}
        onClose={handleBookingClose}
        onSave={handleBookingSave}
      />
    </ViewContainer>
  );
};
