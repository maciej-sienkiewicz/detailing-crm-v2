// src/modules/leads/views/LeadListView.tsx
import React, { useState, useCallback, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Inbox,
  Users,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  PenLine,
  Car,
  Calendar,
  User,
  Wrench,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { visitApi } from '@/modules/visits/api/visitApi';
import { Modal } from '@/common/components/Modal/Modal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { StatTile, StatTileSkeleton } from '@/common/components/StatTile';
import { LeadForm } from '../components/LeadForm';
import {
  useLeads,
  useLead,
  useUpdateLeadStatus,
  useUpdateLeadValue,
  useLeadPipelineSummary,
  useLeadSocket,
} from '../hooks';
import { LeadStatus, LeadSource } from '../types';
import type { Lead, LeadListFilters } from '../types';
import {
  formatCurrency,
  formatRelativeTime,
  formatPhoneNumber,
  truncateEmail,
  parseCurrencyToGrosze,
} from '../utils/formatters';

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

const ViewHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const TitleSection = styled.div`
  flex: 1;
  min-width: 0;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${st.fontXl};
  font-weight: 700;
  color: ${st.text};
  letter-spacing: -0.3px;
  line-height: 1.2;
`;

const PageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

const PageSubtitle = styled.span`
  font-size: ${st.fontSm};
  color: ${st.textMuted};
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

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 9999px;
  font-size: ${st.fontSm};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all ${st.transition};
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

  &:hover {
    background: #0284c7;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
  }
  &:active { transform: translateY(0); }
  svg { flex-shrink: 0; width: 15px; height: 15px; }
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
  overflow: hidden;
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

// ─── Table — same structure as CustomerTable ──────────────────────────────────

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px;
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
  width: 52px;
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
  width: 52px;
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
  max-width: 260px;
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

const StatusBadge = styled.span<{ $variant: 'new' | 'progress' | 'converted' | 'abandoned' }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;

  ${p => {
    switch (p.$variant) {
      case 'new':       return css`background:rgba(220,38,38,0.1); color:#dc2626;`;
      case 'progress':  return css`background:#dbeafe; color:#1e40af;`;
      case 'converted': return css`background:#dcfce7; color:#166534;`;
      case 'abandoned': return css`background:#f3f4f6; color:#4b5563;`;
    }
  }}
`;

// ─── Icon action button — same as CustomerTable ───────────────────────────────

const IconBtn = styled.button<{ $rotated?: boolean }>`
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
  &:hover { background: #e2e8f0 !important; color: #0f172a !important; }
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  border-top: 1px solid #dbeafe;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    padding: 16px;
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

// ─── Visit preview modal ──────────────────────────────────────────────────────

const VisitModalGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const VisitModalMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const VisitMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 9px;
  border: 1px solid ${st.border};
`;

const VisitMetaLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  display: flex;
  align-items: center;
  gap: 5px;
  svg { width: 11px; height: 11px; }
`;

const VisitMetaValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
`;

const VisitServicesTable = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const VisitServicesHead = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 14px;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};
`;

const VisitServicesHeadCell = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
`;

const VisitServiceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-bottom: 1px solid #f1f5f9;
  &:last-of-type { border-bottom: none; }
`;

const VisitServiceName = styled.span`
  font-size: 13px;
  color: ${st.textSecondary};
  min-width: 0;
`;

const VisitServicePrice = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
`;

const VisitTotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border-top: 1px solid ${st.border};
`;

const VisitTotalLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
`;

const VisitTotalPrice = styled.span`
  font-size: 15px;
  font-weight: 800;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
`;

const VisitNotes = styled.p`
  font-size: 13px;
  color: ${st.textSecondary};
  line-height: 1.6;
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  border-left: 3px solid #e2e8f0;
`;

const VisitStatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  ${p => {
    switch (p.$status?.toLowerCase()) {
      case 'completed': case 'done': case 'zakończona': case 'zrealizowana':
        return 'background:#dcfce7; color:#166534;';
      case 'in_progress': case 'in progress': case 'w trakcie':
        return 'background:#dbeafe; color:#1e40af;';
      case 'cancelled': case 'anulowana':
        return 'background:#f3f4f6; color:#4b5563;';
      default:
        return `background:${st.accentBlueDim}; color:${st.accentBlue};`;
    }
  }}
`;

const ModalLoadingBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: ${st.textMuted};
  font-size: ${st.fontSm};
`;

const ModalErrorBox = styled.div`
  padding: 24px;
  text-align: center;
  color: #dc2626;
  font-size: ${st.fontSm};
`;

// ─── Visit Preview Modal component ───────────────────────────────────────────

interface VisitPreviewModalProps {
  visitId: string | null;
  onClose: () => void;
}

const VisitPreviewModal: React.FC<VisitPreviewModalProps> = ({ visitId, onClose }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['visit-preview', visitId],
    queryFn: () => visitApi.getVisitDetail(visitId!),
    enabled: !!visitId,
    staleTime: 5 * 60_000,
  });

  const visit = data?.visit ?? data?.operation ?? (data as any);
  const title = visit?.visitNumber
    ? `Wizyta #${visit.visitNumber}`
    : 'Podgląd wizyty';

  return (
    <Modal isOpen={!!visitId} onClose={onClose} title={title} maxWidth="600px">
      {isLoading && (
        <ModalLoadingBox>
          <SkeletonPulse $w="200px" $h="14px" />
        </ModalLoadingBox>
      )}
      {isError && (
        <ModalErrorBox>Nie udało się załadować wizyty.</ModalErrorBox>
      )}
      {visit && !isLoading && (
        <VisitModalGrid>
          <VisitModalMeta>
            {visit.status && (
              <VisitMetaItem>
                <VisitMetaLabel>Status</VisitMetaLabel>
                <VisitStatusBadge $status={visit.status}>{visit.status}</VisitStatusBadge>
              </VisitMetaItem>
            )}
            {visit.scheduledDate && (
              <VisitMetaItem>
                <VisitMetaLabel><Calendar />Data</VisitMetaLabel>
                <VisitMetaValue>{visit.scheduledDate.slice(0, 10)}</VisitMetaValue>
              </VisitMetaItem>
            )}
            {(visit.vehicle?.brand || visit.vehicle?.model) && (
              <VisitMetaItem>
                <VisitMetaLabel><Car />Pojazd</VisitMetaLabel>
                <VisitMetaValue>
                  {[visit.vehicle.brand, visit.vehicle.model].filter(Boolean).join(' ')}
                  {visit.vehicle.licensePlate && (
                    <span style={{ fontWeight: 400, color: st.textMuted, marginLeft: 6 }}>
                      {visit.vehicle.licensePlate}
                    </span>
                  )}
                </VisitMetaValue>
              </VisitMetaItem>
            )}
            {visit.customer?.name && (
              <VisitMetaItem>
                <VisitMetaLabel><User />Klient</VisitMetaLabel>
                <VisitMetaValue>{visit.customer.name}</VisitMetaValue>
              </VisitMetaItem>
            )}
          </VisitModalMeta>

          {visit.services && visit.services.length > 0 && (
            <div>
              <VisitServicesTable>
                <VisitServicesHead>
                  <VisitServicesHeadCell>Usługa</VisitServicesHeadCell>
                  <VisitServicesHeadCell>Brutto</VisitServicesHeadCell>
                </VisitServicesHead>
                {visit.services.map((svc: any, i: number) => (
                  <VisitServiceRow key={i}>
                    <VisitServiceName>{svc.serviceName ?? svc.name ?? '—'}</VisitServiceName>
                    <VisitServicePrice>
                      {formatCurrency(svc.finalPriceGross ?? svc.priceGross ?? 0)}
                    </VisitServicePrice>
                  </VisitServiceRow>
                ))}
                {(visit.totalCost != null) && (
                  <VisitTotalRow>
                    <VisitTotalLabel>ŁĄCZNIE</VisitTotalLabel>
                    <VisitTotalPrice>{formatCurrency(visit.totalCost)} brutto</VisitTotalPrice>
                  </VisitTotalRow>
                )}
              </VisitServicesTable>
            </div>
          )}

          {visit.technicalNotes && (
            <div>
              <PanelLabel style={{ marginBottom: 6 }}>Notatki techniczne</PanelLabel>
              <VisitNotes>{visit.technicalNotes}</VisitNotes>
            </div>
          )}
        </VisitModalGrid>
      )}
    </Modal>
  );
};

// ─── Static config ────────────────────────────────────────────────────────────

const TILE_CONFIGS = {
  active: {
    accentColor: '#0ea5e9',
    bgGradient: 'linear-gradient(140deg, #f0f9ff 0%, #ffffff 55%)',
    iconBg: 'rgba(14, 165, 233, 0.1)',
  },
  pipeline: {
    accentColor: '#3B82F6',
    bgGradient: 'linear-gradient(140deg, #eff6ff 0%, #ffffff 55%)',
    iconBg: 'rgba(59, 130, 246, 0.1)',
  },
  converted: {
    accentColor: '#10B981',
    bgGradient: 'linear-gradient(140deg, #f0fdf4 0%, #ffffff 55%)',
    iconBg: 'rgba(16, 185, 129, 0.1)',
  },
  monthly: {
    accentColor: '#F59E0B',
    bgGradient: 'linear-gradient(140deg, #fffbeb 0%, #ffffff 55%)',
    iconBg: 'rgba(245, 158, 11, 0.1)',
  },
} as const;

type StatusTab = 'ALL' | LeadStatus;
type SourceTab = 'ALL' | LeadSource;

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'ALL',                  label: 'Wszystkie' },
  { id: LeadStatus.IN_PROGRESS, label: 'W kontakcie' },
  { id: LeadStatus.CONVERTED,   label: 'Zrealizowane' },
  { id: LeadStatus.ABANDONED,   label: 'Odpuszczone' },
];

const SOURCE_TABS: { id: SourceTab; label: string }[] = [
  { id: 'ALL',             label: 'Wszystkie' },
  { id: LeadSource.PHONE,  label: 'Telefon' },
  { id: LeadSource.EMAIL,  label: 'E-mail' },
  { id: LeadSource.MANUAL, label: 'Ręczne' },
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.IN_PROGRESS]: 'W kontakcie',
  [LeadStatus.CONVERTED]:   'Zrealizowany',
  [LeadStatus.ABANDONED]:   'Odpuszczony',
};

const getStatusVariant = (lead: Lead): 'new' | 'progress' | 'converted' | 'abandoned' => {
  if (lead.requiresVerification && lead.status === LeadStatus.IN_PROGRESS) return 'new';
  if (lead.status === LeadStatus.IN_PROGRESS) return 'progress';
  if (lead.status === LeadStatus.CONVERTED)   return 'converted';
  return 'abandoned';
};

const getStatusLabel = (lead: Lead): string => {
  if (lead.requiresVerification && lead.status === LeadStatus.IN_PROGRESS) return 'Nowy';
  return STATUS_LABELS[lead.status];
};

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

// ─── Expanded row component ───────────────────────────────────────────────────

interface ExpandedRowProps {
  lead: Lead;
  colSpan: number;
}

const ExpandedRow: React.FC<ExpandedRowProps> = ({ lead, colSpan }) => {
  const { lead: detail, isLoading: isDetailLoading } = useLead(lead.id);
  const updateStatus = useUpdateLeadStatus();
  const updateValue  = useUpdateLeadValue();

  const [priceInput, setPriceInput] = useState(String(lead.estimatedValue / 100));
  const [savedMsg, setSavedMsg]     = useState(false);
  const [previewVisitId, setPreviewVisitId] = useState<string | null>(null);

  useEffect(() => {
    setPriceInput(String(lead.estimatedValue / 100));
    setSavedMsg(false);
  }, [lead.estimatedValue]);

  const handleSave = () => {
    const val = parseCurrencyToGrosze(priceInput);
    if (!isNaN(val) && val >= 0) {
      updateValue.mutate({ id: lead.id, estimatedValue: val });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    }
  };

  const estimation = detail?.estimation ?? null;
  const relatedVisits = detail?.relatedVisits ?? lead.relatedVisits ?? [];

  return (
    <>
      <ExpandedTr>
        <ExpandedTd colSpan={colSpan}>
          <ExpandedPanel>
            {/* Left — message + estimation + related visits */}
            <PanelSection>
              {lead.initialMessage && (
                <>
                  <PanelLabel>Wiadomość od klienta</PanelLabel>
                  <MessageBox>{lead.initialMessage}</MessageBox>
                </>
              )}

              <PanelLabel>Kosztorys wstępny</PanelLabel>

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
                      <EstPrice>{formatCurrency(item.priceGross)} brutto</EstPrice>
                    </EstRow>
                  ))}
                  <EstRow $isTotal>
                    <EstName $isTotal>ŁĄCZNIE</EstName>
                    <EstPrice $isTotal>
                      {formatCurrency(estimation.totalGross)} brutto
                      {estimation.unmatchedNeeds.length > 0 && (
                        <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 4, color: '#92400e' }}>
                          + {estimation.unmatchedNeeds.join(', ')}
                        </span>
                      )}
                    </EstPrice>
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
                <NoEstBox>Brak kosztorysu wstępnego dla tego leada.</NoEstBox>
              )}

              {relatedVisits.length > 0 && (
                <>
                  <PanelLabel style={{ marginTop: 4 }}>Na podstawie wizyt</PanelLabel>
                  <RelatedVisitsCard>
                    {relatedVisits.map(rv => (
                      <RelatedVisitRow
                        key={rv.id}
                        onClick={e => { e.stopPropagation(); setPreviewVisitId(rv.id); }}
                      >
                        <RelatedVisitIcon>
                          <Wrench />
                        </RelatedVisitIcon>
                        <RelatedVisitTitle>
                          {rv.title ?? `Wizyta ${rv.id.slice(0, 8)}…`}
                        </RelatedVisitTitle>
                        <RelatedVisitArrow>
                          <ChevronRight />
                        </RelatedVisitArrow>
                      </RelatedVisitRow>
                    ))}
                  </RelatedVisitsCard>
                </>
              )}
            </PanelSection>

            {/* Right — price override + status */}
            <PanelSection>
              <PanelLabel>Twoja wycena</PanelLabel>
              <PriceRow>
                <PriceInputWrap>
                  <PriceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceInput}
                    onChange={e => { setPriceInput(e.target.value); setSavedMsg(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                  <PriceSuffix>PLN</PriceSuffix>
                </PriceInputWrap>
                <SaveBtn onClick={handleSave} disabled={updateValue.isPending}>
                  {updateValue.isPending ? 'Zapisywanie…' : 'Zapisz'}
                </SaveBtn>
                {savedMsg && <SavedTag>✓ Zapisano</SavedTag>}
              </PriceRow>

              <PanelLabel style={{ marginTop: 6 }}>Zmień status</PanelLabel>
              <StatusBtnGroup>
                <StatusActionBtn
                  $active={lead.status === LeadStatus.IN_PROGRESS}
                  $color="#1d4ed8"
                  onClick={() => updateStatus.mutate({ id: lead.id, status: LeadStatus.IN_PROGRESS })}
                  disabled={updateStatus.isPending}
                >
                  W kontakcie
                </StatusActionBtn>
                <StatusActionBtn
                  $active={lead.status === LeadStatus.CONVERTED}
                  $color="#16a34a"
                  onClick={() => updateStatus.mutate({ id: lead.id, status: LeadStatus.CONVERTED })}
                  disabled={updateStatus.isPending}
                >
                  Zrealizowany
                </StatusActionBtn>
                <StatusActionBtn
                  $active={lead.status === LeadStatus.ABANDONED}
                  $color="#64748b"
                  onClick={() => updateStatus.mutate({ id: lead.id, status: LeadStatus.ABANDONED })}
                  disabled={updateStatus.isPending}
                >
                  Odpuszczony
                </StatusActionBtn>
              </StatusBtnGroup>
            </PanelSection>
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<StatusTab>('ALL');
  const [activeSource, setActiveSource] = useState<SourceTab>('ALL');
  const [searchValue, setSearchValue]   = useState('');

  const [filters, setFilters] = useState<LeadListFilters>({
    search: '',
    status: [],
    source: [],
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const { leads, pagination, isLoading, isError, refetch } = useLeads(filters);
  const { summary, isLoading: isSummaryLoading } = useLeadPipelineSummary();

  const newLeadsCount = leads.filter(l => l.requiresVerification).length;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchValue(v);
    setFilters(p => ({ ...p, search: v, page: 1 }));
  }, []);

  const handleStatus = useCallback((v: StatusTab) => {
    setActiveStatus(v);
    setFilters(p => ({ ...p, status: v === 'ALL' ? [] : [v], page: 1 }));
  }, []);

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
              <SkeletonPulse $w={j === 0 ? '34px' : j === 1 ? '120px' : j === 5 ? '80px' : '60px'} $h={j === 0 ? '34px' : '13px'} />
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
                  {searchValue || activeStatus !== 'ALL' || activeSource !== 'ALL'
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

          <Td>
            <CellStack>
              <CellMain>{contact.primary}</CellMain>
              {contact.secondary && <CellSub>{contact.secondary}</CellSub>}
            </CellStack>
          </Td>

          <Td>
            {lead.reasoning
              ? <CellNote title={lead.reasoning}>{lead.reasoning}</CellNote>
              : lead.initialMessage
                ? <CellNote title={lead.initialMessage}>{lead.initialMessage}</CellNote>
                : <CellSub style={{ fontStyle: 'italic' }}>—</CellSub>
            }
          </Td>

          <Td>
            <CellSub>{formatRelativeTime(lead.updatedAt || lead.createdAt)}</CellSub>
          </Td>

          <Td>
            <StatusBadge $variant={getStatusVariant(lead)}>
              {getStatusLabel(lead)}
            </StatusBadge>
          </Td>

          <Td>
            <CellMono>{formatCurrency(lead.estimatedValue)}</CellMono>
            <CellSub>brutto</CellSub>
          </Td>

          <TdActions onClick={e => e.stopPropagation()}>
            <IconBtn
              $rotated={isExpanded}
              title={isExpanded ? 'Zwiń' : 'Rozwiń'}
              onClick={() => toggleExpand(lead.id)}
            >
              <ChevronDown />
            </IconBtn>
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
      {/* Header */}
      <ViewHeader>
        <TitleSection>
          <PageTitle>Leady</PageTitle>
          <PageMeta>
            <PageSubtitle>Zarządzaj zapytaniami i potencjalnymi klientami</PageSubtitle>
            {pagination && (
              <TotalChip>{pagination.totalItems} leadów</TotalChip>
            )}
            {!isLoading && newLeadsCount > 0 && (
              <NewChip>
                <NewDot />
                {newLeadsCount} {newLeadsCount === 1 ? 'nowy' : newLeadsCount < 5 ? 'nowe' : 'nowych'}
              </NewChip>
            )}
          </PageMeta>
        </TitleSection>

        <HeaderBtns>
          <SecondaryBtn onClick={() => refetch()}>
            <RefreshCw />
            Odśwież
          </SecondaryBtn>
          <AddButton onClick={() => setIsFormOpen(true)}>
            <Plus />
            Dodaj lead
          </AddButton>
        </HeaderBtns>
      </ViewHeader>

      {/* Stats tiles */}
      <StatsGrid>
        {isSummaryLoading ? (
          <>
            <StatTileSkeleton {...TILE_CONFIGS.active} />
            <StatTileSkeleton {...TILE_CONFIGS.pipeline} />
            <StatTileSkeleton {...TILE_CONFIGS.converted} />
            <StatTileSkeleton {...TILE_CONFIGS.monthly} />
          </>
        ) : (
          <>
            <StatTile
              {...TILE_CONFIGS.active}
              icon={Users}
              value={summary?.inProgressCount ?? 0}
              label="Aktywne leady"
            />
            <StatTile
              {...TILE_CONFIGS.pipeline}
              icon={TrendingUp}
              value={summary ? formatCurrency(summary.totalPipelineValue) : '—'}
              label="Wartość pipeline"
            />
            <StatTile
              {...TILE_CONFIGS.converted}
              icon={CheckCircle2}
              value={summary?.convertedThisWeekCount ?? 0}
              label="Zrealizowane (tydzień)"
              subContent={
                summary
                  ? <span style={{ fontSize: 12, color: st.textMuted }}>{formatCurrency(summary.convertedThisWeekValue)}</span>
                  : undefined
              }
            />
            <StatTile
              {...TILE_CONFIGS.monthly}
              icon={BarChart3}
              value={summary ? formatCurrency(summary.leadsValueThisMonth) : '—'}
              label="Wartość (ten miesiąc)"
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

            <TabGroup>
              {STATUS_TABS.map(tab => (
                <TabBtn
                  key={tab.id}
                  $active={activeStatus === tab.id}
                  onClick={() => handleStatus(tab.id)}
                >
                  {tab.label}
                </TabBtn>
              ))}
            </TabGroup>
          </FilterTopRow>
        </FilterBar>

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <ThIcon />
                <Th>Kontakt</Th>
                <Th>Uzasadnienie</Th>
                <Th>Aktywność</Th>
                <Th>Status</Th>
                <Th>Wartość</Th>
                <ThActions />
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </Table>
        </TableWrapper>

        {pagination && pagination.totalPages > 1 && (
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
    </ViewContainer>
  );
};
