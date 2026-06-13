// src/modules/leads/views/LeadListView.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core';
import styled, { css, keyframes } from 'styled-components';
import {
  Inbox,
  PhoneCall,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronDown,
  Phone,
  Mail,
  PenLine,
  Trash2,
  Calendar,
  CalendarCheck,
  User,
  UserCheck,
  Search,
  X,
  CalendarDays,
  Check,
  BarChart2,
  DollarSign,
} from 'lucide-react';
import { employeeApi } from '@/modules/employees/api/employeeApi';
import type { EmployeeListItem } from '@/modules/employees/types';
import { LeadAnalyticsModal } from '../components/LeadAnalyticsModal';
import { useToast } from '@/common/components/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LEADS_KEY } from '../hooks';
import { leadApi } from '../api/leadApi';
import { visitApi } from '@/modules/visits/api/visitApi';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { useCalendarNavigation } from '@/common/context/CalendarNavigationContext';
import { Modal } from '@/common/components/Modal/Modal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderPrimaryButton } from '@/common/components/PageHeader';
import { StatTile, StatTileSkeleton } from '@/common/components/StatTile';
import { ConfirmationModal } from '@/common/components/ConfirmationModal/ConfirmationModal';
import { LeadForm } from '../components/LeadForm';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { CustomerPickerModal } from '../components/CustomerPickerModal';
import { EmployeePickerModal } from '../components/EmployeePickerModal';
import { BookingPickerModal } from '../components/BookingPickerModal';
import type { PickerMode } from '../components/BookingPickerModal';
import type { Operation } from '@/modules/operations/types';
import {
  useLeads,
  useUpdateLeadStatus,
  useUpdateLeadValue,
  useDeleteLead,
  useLeadPipelineSummary,
  useLeadSocket,
  useLeadAppointmentCreation,
  useSetLostReason,
} from '../hooks';
import { LeadStatus, LeadSource } from '../types';
import type { Lead, LeadDetail, LeadListFilters, CustomerSnapshot } from '../types';
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


const AssignBtn = styled.button<{ $secondary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: ${p => p.$secondary ? 'transparent' : 'transparent'};
  border: 1.5px solid ${p => p.$secondary ? '#cbd5e1' : '#0ea5e9'};
  color: ${p => p.$secondary ? '#64748b' : '#0ea5e9'};
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    background: ${p => p.$secondary ? '#f1f5f9' : '#e0f2fe'};
    border-color: ${p => p.$secondary ? '#94a3b8' : '#0ea5e9'};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  svg { width: 12px; height: 12px; }
`;

// ─── Customer chip in row ─────────────────────────────────────────────────────

const CustomerChip = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 5px;
  border-radius: 9999px;
  border: 1.5px solid ${p => p.$primary ? '#0ea5e9' : '#cbd5e1'};
  background: transparent;
  color: ${p => p.$primary ? '#0ea5e9' : '#64748b'};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all ${st.transition};

  &:hover {
    background: ${p => p.$primary ? '#e0f2fe' : '#f1f5f9'};
    border-color: ${p => p.$primary ? '#0ea5e9' : '#94a3b8'};
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

// ─── Value range filter ────────────────────────────────────────────────────────

const ValueFilterWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ValueFilterBtn = styled.button<{ $active: boolean }>`
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

  &:hover { border-color: #0ea5e9; background: #f0f9ff; color: #0369a1; }
  svg { flex-shrink: 0; }
`;

const ValueFilterPanel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 500;
  width: 260px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ValueFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ValueFilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  min-width: 34px;
`;

const ValueFilterInput = styled.input`
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 8px;
  background: #f8fafc;
  color: ${st.text};
  outline: none;
  transition: border-color ${st.transition};
  &:focus { border-color: #0ea5e9; }
`;

const ValueFilterSuffix = styled.span`
  font-size: 11px;
  color: ${st.textMuted};
  flex-shrink: 0;
`;

// ─── Employee filter ──────────────────────────────────────────────────────────

const EmpFilterWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const EmpFilterBtn = styled(StatusFilterBtn)``;

const EmpFilterPanel = styled(StatusDropdownMenu)`
  min-width: 220px;
`;

const EmpFilterRow = styled.button<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: ${p => p.$checked ? '#f0f9ff' : 'transparent'};
  font-family: inherit;
  font-size: 13px;
  font-weight: ${p => p.$checked ? 600 : 400};
  color: ${p => p.$checked ? '#0369a1' : st.text};
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  &:hover { background: #f0f9ff; }
`;

const EmpAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
`;

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

// ─── Main view ────────────────────────────────────────────────────────────────

export const LeadListView: React.FC = () => {
  useLeadSocket();

  const navigate = useNavigate();
  const { start: startCalendarNav } = useCalendarNavigation();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const [calNavLoadingId, setCalNavLoadingId] = useState<string | null>(null);

  const [selectedLead, setSelectedLead]     = useState<Lead | null>(null);
  const [empPickerLeadId, setEmpPickerLeadId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([LeadStatus.NEW, LeadStatus.IN_PROGRESS]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [activeSource, setActiveSource]     = useState<SourceTab>('ALL');
  const [searchValue, setSearchValue]       = useState('');
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);
  const [pickerLeadId, setPickerLeadId]     = useState<string | null>(null);
  const [statusMenuLeadId, setStatusMenuLeadId] = useState<string | null>(null);
  const [statusMenuPos, setStatusMenuPos]       = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [lostReasonPrompt, setLostReasonPrompt] = useState<{ leadId: string } | null>(null);
  const [lostReasonInput, setLostReasonInput]   = useState('');

  // ─── Value range filter ────────────────────────────────────────────────────
  const [isValueFilterOpen, setIsValueFilterOpen] = useState(false);
  const [valueMinInput, setValueMinInput]   = useState('');
  const [valueMaxInput, setValueMaxInput]   = useState('');
  const [appliedValueMin, setAppliedValueMin] = useState<number | undefined>(undefined);
  const [appliedValueMax, setAppliedValueMax] = useState<number | undefined>(undefined);
  const valueFilterRef = useRef<HTMLDivElement>(null);

  const handleApplyValueFilter = () => {
    const min = valueMinInput ? Math.round(parseFloat(valueMinInput) * 100) : undefined;
    const max = valueMaxInput ? Math.round(parseFloat(valueMaxInput) * 100) : undefined;
    setAppliedValueMin(min);
    setAppliedValueMax(max);
    setFilters(p => ({ ...p, valueMin: min, valueMax: max, page: 1 }));
    setIsValueFilterOpen(false);
  };

  const handleClearValueFilter = () => {
    setValueMinInput(''); setValueMaxInput('');
    setAppliedValueMin(undefined); setAppliedValueMax(undefined);
    setFilters(p => ({ ...p, valueMin: undefined, valueMax: undefined, page: 1 }));
  };

  const isValueFilterActive = appliedValueMin !== undefined || appliedValueMax !== undefined;

  useEffect(() => {
    if (!isValueFilterOpen) return;
    const handle = (e: MouseEvent) => {
      if (valueFilterRef.current && !valueFilterRef.current.contains(e.target as Node)) {
        setIsValueFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isValueFilterOpen]);

  // ─── Employee filter ───────────────────────────────────────────────────────
  const [isEmpFilterOpen, setIsEmpFilterOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId]   = useState<string | undefined>(undefined);
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const empFilterRef = useRef<HTMLDivElement>(null);

  const { data: empListData } = useQuery({
    queryKey: ['employee-filter-list'],
    queryFn: () => employeeApi.listEmployees({ search: '', page: 1, limit: 50, includeTerminated: false }),
  });
  const empList = empListData?.items ?? [];

  const handleSelectEmp = (emp: EmployeeListItem) => {
    const uid = emp.linkedUserId ?? emp.id;
    setSelectedEmpId(uid);
    setSelectedEmpName(emp.fullName);
    setFilters(p => ({ ...p, assignedUserId: uid, page: 1 }));
    setIsEmpFilterOpen(false);
  };

  const handleClearEmp = () => {
    setSelectedEmpId(undefined);
    setSelectedEmpName('');
    setFilters(p => ({ ...p, assignedUserId: undefined, page: 1 }));
    setIsEmpFilterOpen(false);
  };

  useEffect(() => {
    if (!isEmpFilterOpen) return;
    const handle = (e: MouseEvent) => {
      if (empFilterRef.current && !empFilterRef.current.contains(e.target as Node)) {
        setIsEmpFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isEmpFilterOpen]);

  // ─── Booking modal state ───────────────────────────────────────────────────
  const [bookingLeadId, setBookingLeadId]           = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingInitialData, setBookingInitialData] = useState<QuickEventInitialData | undefined>(undefined);
  const [isBookingLoading, setIsBookingLoading]     = useState(false);
  const createLeadAppointment = useLeadAppointmentCreation(bookingLeadId);

  const { showError: showBookingError, showWarning } = useToast();

  const updateStatus = useUpdateLeadStatus();
  const setLostReasonMutation = useSetLostReason(lostReasonPrompt?.leadId ?? '');

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

  // Navigate to the visit detail view directly (no calendar animation needed)
  const handleGoToVisit = (visitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/visits/${visitId}`);
  };

  // Navigate to the calendar with the fly-to-cell animation (for appointmentId / relatedVisits)
  const handleGoToCalendarBooking = async (lead: Lead, eventId: string, e: React.MouseEvent) => {
    if (calNavLoadingId) return;
    // Capture DOM ref BEFORE any await — currentTarget is nulled after event dispatch
    const btnEl = e.currentTarget as HTMLElement;
    setCalNavLoadingId(eventId);
    try {
      let eventDate = '';
      let label = lead.vehicleBrand
        ? `${lead.vehicleBrand}${lead.vehicleModel ? ' ' + lead.vehicleModel : ''}`
        : 'Rezerwacja';
      const customer = lead.customerName ?? lead.contactIdentifier;

      const isRelatedVisit = !!lead.relatedVisits?.find(rv => rv.id === eventId);
      if (isRelatedVisit) {
        const res = await visitApi.getVisitDetail(eventId);
        const v = res.visit;
        eventDate = v.scheduledDate ?? '';
        if (v.vehicle) label = `${v.vehicle.brand} ${v.vehicle.model}`.trim();
      } else {
        // appointmentId
        const res = await appointmentApi.getAppointment(eventId);
        eventDate = res.schedule?.startDateTime ?? '';
        if (res.vehicle) label = `${res.vehicle.brand} ${res.vehicle.model}`.trim();
      }

      const sourceRect = btnEl.getBoundingClientRect();
      const snap = {
        id: eventId,
        label,
        customer,
        amount: formatCurrency(lead.estimatedValue),
        accentColor: '#0ea5e9',
        sourceRect,
        scheduledDate: eventDate || undefined,
      };
      const doNavigate = () => navigate('/calendar', {
        state: { highlightEventId: eventId, highlightDate: eventDate },
      });
      startCalendarNav(snap, doNavigate);
    } catch {
      navigate('/calendar');
    } finally {
      setCalNavLoadingId(null);
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
    status: [LeadStatus.NEW, LeadStatus.IN_PROGRESS],
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

  const empPickerLead = leads.find(l => l.id === empPickerLeadId) ?? null;
  const empAssignUser = useMutation({
    mutationFn: ({ leadId, userId, userName }: { leadId: string; userId: string | null; userName?: string }) =>
      leadApi.assignUser(leadId, { userId, userName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
    },
  });

  // ─── Booking picker (assign appointment / visit) ───────────────────────────
  const [bookingPickerLeadId, setBookingPickerLeadId] = useState<string | null>(null);
  const [bookingPickerMode, setBookingPickerMode]     = useState<PickerMode>('appointment');

  const handleLinkError = (err: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (err as any)?.response?.data;
    if (data?.code === 'ALREADY_LINKED') {
      const who = data.linkedLeadName ? `lead: ${data.linkedLeadName}` : 'inny lead';
      showWarning(
        'Już przypisano do innego leada',
        `Ta operacja jest już powiązana z ${who}. Najpierw odepnij ją tamtej osobie.`,
      );
    } else {
      showBookingError('Nie udało się zapisać przypisania');
    }
  };

  const linkAppointmentMutation = useMutation({
    mutationFn: ({ leadId, appointmentId }: { leadId: string; appointmentId: string | null }) =>
      leadApi.linkAppointment(leadId, appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
    onError: handleLinkError,
  });

  const linkVisitMutation = useMutation({
    mutationFn: ({ leadId, visitId }: { leadId: string; visitId: string | null }) =>
      leadApi.linkVisit(leadId, visitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
    onError: handleLinkError,
  });

  const openBookingPicker = (lead: Lead, mode: PickerMode) => {
    setBookingPickerLeadId(lead.id);
    setBookingPickerMode(mode);
  };

  const handleBookingPickerSelect = (item: Operation) => {
    if (!bookingPickerLeadId) return;
    if (bookingPickerMode === 'appointment') {
      linkAppointmentMutation.mutate({ leadId: bookingPickerLeadId, appointmentId: item.id });
    } else {
      linkVisitMutation.mutate({ leadId: bookingPickerLeadId, visitId: item.id });
    }
    setBookingPickerLeadId(null);
  };

  const handleBookingPickerUnlink = () => {
    if (!bookingPickerLeadId) return;
    if (bookingPickerMode === 'appointment') {
      linkAppointmentMutation.mutate({ leadId: bookingPickerLeadId, appointmentId: null });
    } else {
      linkVisitMutation.mutate({ leadId: bookingPickerLeadId, visitId: null });
    }
    setBookingPickerLeadId(null);
  };

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

    return leads.map(lead => {
      const contact = formatContact(lead);

      return (
        <Tr
          key={lead.id}
          $isExpanded={false}
          onClick={() => setSelectedLead(lead)}
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

          <Td>
            {lead.assignedCustomer ? (() => {
              const c = lead.assignedCustomer!;
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
              const contactSub = lead.contactIdentifier.includes('@')
                ? truncateEmail(lead.contactIdentifier, 28)
                : formatPhoneNumber(lead.contactIdentifier);
              return (
                <CellStack>
                  <CellMain style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {name}
                    <Check size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                  </CellMain>
                  <CellSub>{contactSub}</CellSub>
                  <CustomerChip
                    title="Zmień przypisanie klienta"
                    onClick={e => { e.stopPropagation(); setPickerLeadId(lead.id); }}
                  >
                    <User /> Zmień przypisanie
                  </CustomerChip>
                </CellStack>
              );
            })() : (
              <CellStack>
                <CellMain>{contact.primary}</CellMain>
                {contact.secondary && <CellSub>{contact.secondary}</CellSub>}
                <CustomerChip
                  $primary
                  title="Przypisz klienta z bazy"
                  onClick={e => { e.stopPropagation(); setPickerLeadId(lead.id); }}
                >
                  <User /> Przypisz klienta
                </CustomerChip>
              </CellStack>
            )}
          </Td>

          <Td>
            {lead.assignedUserName ? (
              <CellStack>
                <CellMain style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {lead.assignedUserName}
                  <Check size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                </CellMain>
                <AssignBtn
                  $secondary
                  onClick={e => { e.stopPropagation(); setEmpPickerLeadId(lead.id); }}
                >
                  <UserCheck size={12} /> Zmień przypisanie
                </AssignBtn>
              </CellStack>
            ) : (
              <AssignBtn
                onClick={e => { e.stopPropagation(); setEmpPickerLeadId(lead.id); }}
              >
                <UserCheck size={12} /> Przypisz pracownika
              </AssignBtn>
            )}
          </Td>

          <Td>
            <CellStack>
              <CellMain>{formatDateTime(lead.createdAt)}</CellMain>
              <CellSub>Ostatnia aktualizacja: {formatRelativeTime(lead.updatedAt || lead.createdAt)}</CellSub>
            </CellStack>
          </Td>

          <StatusTd>
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

          <TdActions>
            <ActionBtns>
              {lead.visitId ? (
                /* Visit linked → go to visit detail view */
                <>
                  <BookingBtn
                    title="Przejdź do wizyty"
                    onClick={e => handleGoToVisit(lead.visitId!, e)}
                    style={{ borderColor: '#10b981', color: '#10b981' }}
                  >
                    <CalendarCheck size={12} />
                    Wizyta
                  </BookingBtn>
                  {lead.status === LeadStatus.COMPLETED && (
                    <BookingBtn
                      title="Zmień przypisaną wizytę"
                      onClick={e => { e.stopPropagation(); openBookingPicker(lead, 'visit'); }}
                      style={{ borderColor: '#94a3b8', color: '#64748b', padding: '5px 7px' }}
                    >
                      <PenLine size={11} />
                    </BookingBtn>
                  )}
                </>
              ) : (lead.appointmentId || lead.relatedVisits?.length > 0) ? (
                /* Appointment / related visit → calendar with animation + optional change */
                (() => {
                  const calEventId = lead.appointmentId ?? lead.relatedVisits[0].id;
                  const canChange = lead.status === LeadStatus.CONFIRMED || lead.status === LeadStatus.COMPLETED;
                  const pickerMode: PickerMode = lead.status === LeadStatus.COMPLETED ? 'visit' : 'appointment';
                  return (
                    <>
                      <BookingBtn
                        title="Przejdź do rezerwacji w kalendarzu"
                        disabled={!!calNavLoadingId}
                        onClick={e => { e.stopPropagation(); handleGoToCalendarBooking(lead, calEventId, e); }}
                        style={{ borderColor: '#10b981', color: '#10b981' }}
                      >
                        <CalendarCheck size={12} />
                        {calNavLoadingId === calEventId ? '…' : 'Rezerwacja'}
                      </BookingBtn>
                      {canChange && (
                        <BookingBtn
                          title="Zmień przypisanie"
                          onClick={e => { e.stopPropagation(); openBookingPicker(lead, pickerMode); }}
                          style={{ borderColor: '#94a3b8', color: '#64748b', padding: '5px 7px' }}
                        >
                          <PenLine size={11} />
                        </BookingBtn>
                      )}
                    </>
                  );
                })()
              ) : lead.status === LeadStatus.CONFIRMED ? (
                /* CONFIRMED but no appointment yet → assign */
                <BookingBtn
                  title="Przypisz rezerwację"
                  onClick={e => { e.stopPropagation(); openBookingPicker(lead, 'appointment'); }}
                >
                  <Calendar size={12} />
                  Przypisz rez.
                </BookingBtn>
              ) : lead.status === LeadStatus.COMPLETED ? (
                /* COMPLETED but no visit yet → assign */
                <BookingBtn
                  title="Przypisz wizytę"
                  onClick={e => { e.stopPropagation(); openBookingPicker(lead, 'visit'); }}
                >
                  <CalendarCheck size={12} />
                  Przypisz wizytę
                </BookingBtn>
              ) : lead.status !== LeadStatus.LOST && lead.status !== LeadStatus.NO_SHOW && (
                /* NEW / IN_PROGRESS → create new booking */
                <BookingBtn
                  title="Rozpocznij rezerwację"
                  disabled={isBookingLoading}
                  onClick={e => { e.stopPropagation(); handleStartBooking(lead); }}
                >
                  <Calendar size={12} />
                  {isBookingLoading && bookingLeadId === lead.id ? '…' : 'Rezerwuj'}
                </BookingBtn>
              )}
              <IconBtn
                $danger
                title="Usuń leada"
                onClick={e => { e.stopPropagation(); setDeleteTarget({ id: lead.id, name: lead.customerName || lead.contactIdentifier }); }}
              >
                <Trash2 />
              </IconBtn>
            </ActionBtns>
          </TdActions>
        </Tr>
      );
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

          <SecondaryBtn onClick={() => setIsAnalyticsOpen(true)}>
            <BarChart2 size={14} />
            Analityka
          </SecondaryBtn>

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
              onClick={() => {
                const next = [LeadStatus.NEW];
                setSelectedStatuses(next);
                setFilters(p => ({ ...p, status: next, sortBy: 'createdAt', sortDirection: 'desc', page: 1 }));
              }}
              isActive={selectedStatuses.length === 1 && selectedStatuses[0] === LeadStatus.NEW}
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
              onClick={() => {
                const next = [LeadStatus.COMPLETED];
                setSelectedStatuses(next);
                setFilters(p => ({ ...p, status: next, sortBy: 'createdAt', sortDirection: 'desc', page: 1 }));
              }}
              isActive={selectedStatuses.length === 1 && selectedStatuses[0] === LeadStatus.COMPLETED}
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
              onClick={() => {
                const next = [LeadStatus.NEW, LeadStatus.IN_PROGRESS];
                setSelectedStatuses(next);
                setFilters(p => ({ ...p, status: next, sortBy: 'updatedAt', sortDirection: 'desc', page: 1 }));
              }}
              isActive={
                selectedStatuses.length === 2 &&
                selectedStatuses.includes(LeadStatus.NEW) &&
                selectedStatuses.includes(LeadStatus.IN_PROGRESS) &&
                filters.sortBy === 'updatedAt'
              }
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

            {/* Value range filter */}
            <ValueFilterWrap ref={valueFilterRef}>
              <ValueFilterBtn
                $active={isValueFilterActive}
                onClick={() => setIsValueFilterOpen(p => !p)}
              >
                <DollarSign size={13} />
                {isValueFilterActive
                  ? `${appliedValueMin !== undefined ? (appliedValueMin / 100).toFixed(0) : '0'}–${appliedValueMax !== undefined ? (appliedValueMax / 100).toFixed(0) : '∞'} PLN`
                  : 'Wartość'
                }
                {isValueFilterActive && (
                  <span
                    style={{ marginLeft: 2, lineHeight: 1, cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); handleClearValueFilter(); }}
                    title="Wyczyść"
                  >
                    <X size={11} />
                  </span>
                )}
              </ValueFilterBtn>

              {isValueFilterOpen && (
                <ValueFilterPanel>
                  <ValueFilterRow>
                    <ValueFilterLabel>Od</ValueFilterLabel>
                    <ValueFilterInput
                      type="number"
                      min="0"
                      placeholder="0"
                      value={valueMinInput}
                      onChange={e => setValueMinInput(e.target.value)}
                    />
                    <ValueFilterSuffix>PLN</ValueFilterSuffix>
                  </ValueFilterRow>
                  <ValueFilterRow>
                    <ValueFilterLabel>Do</ValueFilterLabel>
                    <ValueFilterInput
                      type="number"
                      min="0"
                      placeholder="∞"
                      value={valueMaxInput}
                      onChange={e => setValueMaxInput(e.target.value)}
                    />
                    <ValueFilterSuffix>PLN</ValueFilterSuffix>
                  </ValueFilterRow>
                  <ApplyBtn onClick={handleApplyValueFilter}>
                    Zastosuj
                  </ApplyBtn>
                </ValueFilterPanel>
              )}
            </ValueFilterWrap>

            {/* Employee filter */}
            <EmpFilterWrap ref={empFilterRef}>
              <EmpFilterBtn
                $active={!!selectedEmpId}
                onClick={() => setIsEmpFilterOpen(p => !p)}
              >
                <UserCheck size={13} />
                {selectedEmpName || 'Pracownik'}
                {selectedEmpId && (
                  <span
                    style={{ marginLeft: 2, lineHeight: 1, cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); handleClearEmp(); }}
                    title="Wyczyść"
                  >
                    <X size={11} />
                  </span>
                )}
              </EmpFilterBtn>

              {isEmpFilterOpen && (
                <EmpFilterPanel>
                  {selectedEmpId && (
                    <>
                      <ClearAllBtn onClick={handleClearEmp}>
                        <X size={12} /> Wyczyść filtr
                      </ClearAllBtn>
                      <StatusDropdownDivider />
                    </>
                  )}
                  {empList.length === 0
                    ? <div style={{ padding: '10px 12px', fontSize: 12, color: st.textMuted }}>Brak pracowników</div>
                    : empList.map(emp => (
                      <EmpFilterRow
                        key={emp.id}
                        $checked={(emp.linkedUserId ?? emp.id) === selectedEmpId}
                        onClick={() => handleSelectEmp(emp)}
                      >
                        <EmpAvatar>
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </EmpAvatar>
                        {emp.fullName}
                      </EmpFilterRow>
                    ))
                  }
                </EmpFilterPanel>
              )}
            </EmpFilterWrap>

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
                <Th>Obsługuje</Th>
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
        prefill={pickerLeadId ? (() => {
          const l = leads.find(x => x.id === pickerLeadId);
          return l ? { contactIdentifier: l.contactIdentifier, customerName: l.customerName } : undefined;
        })() : undefined}
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
                  if (status === LeadStatus.LOST) {
                    setLostReasonInput('');
                    setLostReasonPrompt({ leadId: menuLead.id });
                    setStatusMenuLeadId(null);
                    updateStatus.mutate({ id: menuLead.id, status });
                  } else {
                    updateStatus.mutate({ id: menuLead.id, status });
                    setStatusMenuLeadId(null);
                  }
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
              if (selectedLead?.id === deleteTarget.id) setSelectedLead(null);
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

      <LeadAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      <Modal
        isOpen={!!lostReasonPrompt}
        onClose={() => setLostReasonPrompt(null)}
        title="Powód utraty leada"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
          <p style={{ margin: 0, fontSize: 14, color: st.textMuted }}>
            Możesz podać powód, dla którego lead został utracony. To pole jest opcjonalne.
          </p>
          <textarea
            autoFocus
            placeholder="Np. klient wybrał konkurencję, za wysoka cena…"
            value={lostReasonInput}
            onChange={e => setLostReasonInput(e.target.value)}
            rows={3}
            style={{ width: '100%', minHeight: 72, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', border: `1.5px solid ${st.border}`, borderRadius: 10, background: '#fff', color: st.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <AssignBtn onClick={() => setLostReasonPrompt(null)}>
              Pomiń
            </AssignBtn>
            <AssignBtn
              style={{ background: '#0ea5e9', color: '#fff', border: 'none' }}
              onClick={() => {
                if (!lostReasonPrompt) return;
                setLostReasonMutation.mutate(
                  { lostReason: lostReasonInput.trim() || null },
                  { onSuccess: () => setLostReasonPrompt(null) }
                );
              }}
              disabled={setLostReasonMutation.isPending}
            >
              Zapisz powód
            </AssignBtn>
          </div>
        </div>
      </Modal>

      <BookingPickerModal
        isOpen={!!bookingPickerLeadId}
        mode={bookingPickerMode}
        hasLinked={bookingPickerMode === 'appointment'
          ? !!(leads.find(l => l.id === bookingPickerLeadId)?.appointmentId)
          : !!(leads.find(l => l.id === bookingPickerLeadId)?.visitId)
        }
        onClose={() => setBookingPickerLeadId(null)}
        onSelect={handleBookingPickerSelect}
        onUnlink={handleBookingPickerUnlink}
      />

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      <EmployeePickerModal
        isOpen={!!empPickerLeadId}
        onClose={() => setEmpPickerLeadId(null)}
        hasAssigned={!!empPickerLead?.assignedUserName}
        onSelect={emp => {
          if (!empPickerLeadId) return;
          empAssignUser.mutate(
            { leadId: empPickerLeadId, userId: emp.linkedUserId ?? emp.id, userName: emp.fullName },
            { onSuccess: () => setEmpPickerLeadId(null) }
          );
        }}
        onUnassign={() => {
          if (!empPickerLeadId) return;
          empAssignUser.mutate(
            { leadId: empPickerLeadId, userId: null },
            { onSuccess: () => setEmpPickerLeadId(null) }
          );
        }}
        onAssignSelf={() => {
          if (!authUser || !empPickerLeadId) return;
          const name = [authUser.firstName, authUser.lastName].filter(Boolean).join(' ') || authUser.userId;
          empAssignUser.mutate(
            { leadId: empPickerLeadId, userId: authUser.userId, userName: name },
            { onSuccess: () => setEmpPickerLeadId(null) }
          );
        }}
      />
    </ViewContainer>
  );
};
