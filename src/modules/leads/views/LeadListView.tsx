// src/modules/leads/views/LeadListView.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { LeadStatsBar } from '../components/LeadStatsBar';
import { LeadForm } from '../components/LeadForm';
import { useLeads, useLead, useUpdateLeadStatus, useUpdateLeadValue, useLeadSocket } from '../hooks';
import { LeadStatus, LeadSource } from '../types';
import type { Lead, LeadListFilters } from '../types';
import {
  formatCurrency,
  formatRelativeTime,
  formatPhoneNumber,
  truncateEmail,
  parseCurrencyToGrosze,
} from '../utils/formatters';

// ============================================================================
// ANIMATIONS
// ============================================================================

const pulse = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  50% { opacity: 0.85; box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ============================================================================
// PAGE LAYOUT
// ============================================================================

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.lg};
  padding: ${p => p.theme.spacing.md};
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    padding: ${p => p.theme.spacing.lg};
  }
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.md};

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PageTitle = styled.h1`
  font-size: ${p => p.theme.fontSizes.xxl};
  font-weight: ${p => p.theme.fontWeights.bold};
  color: ${p => p.theme.colors.text};
  margin: 0;
  line-height: 1.2;
`;

const PageSubtitle = styled.p`
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textSecondary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing.sm};
  align-items: center;
  flex-shrink: 0;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.xs};
  padding: 10px 20px;
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: ${p => p.theme.fontWeights.semibold};
  background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
  color: white;
  border: none;
  border-radius: ${p => p.theme.radii.md};
  cursor: pointer;
  transition: all ${p => p.theme.transitions.fast};
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
  }
  &:active { transform: translateY(0); }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.textSecondary};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  cursor: pointer;
  transition: all ${p => p.theme.transitions.fast};

  &:hover {
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.text};
  }
`;

// ============================================================================
// NEW LEADS BANNER
// ============================================================================

const NewLeadsBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.md};
  padding: ${p => p.theme.spacing.md} ${p => p.theme.spacing.lg};
  background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
  border: 1px solid #fca5a5;
  border-radius: ${p => p.theme.radii.lg};
  animation: ${slideDown} 0.25s ease-out;
`;

const BannerDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #dc2626;
  flex-shrink: 0;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const BannerText = styled.p`
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: ${p => p.theme.fontWeights.semibold};
  color: #991b1b;
  margin: 0;
`;

const BannerSub = styled.span`
  font-weight: ${p => p.theme.fontWeights.normal};
  color: #b91c1c;
`;

// ============================================================================
// FILTERS
// ============================================================================

const FiltersSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.sm};
  padding: ${p => p.theme.spacing.md};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
    gap: ${p => p.theme.spacing.md};
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 38px;
  font-size: ${p => p.theme.fontSizes.sm};
  border: 1.5px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  background: ${p => p.theme.colors.surfaceAlt};
  color: ${p => p.theme.colors.text};
  outline: none;
  transition: all ${p => p.theme.transitions.fast};

  &:focus {
    border-color: var(--brand-primary);
    background: ${p => p.theme.colors.surface};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
  &::placeholder { color: ${p => p.theme.colors.textMuted}; }
`;

const SearchIconWrap = styled.div`
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: ${p => p.theme.colors.textMuted};
  pointer-events: none;
`;

const FilterDivider = styled.div`
  display: none;
  width: 1px;
  height: 22px;
  background: ${p => p.theme.colors.border};

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    display: block;
  }
`;

const ChipsGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Chip = styled.button<{ $active: boolean; $color?: string }>`
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: ${p => p.theme.radii.full};
  border: 1.5px solid;
  cursor: pointer;
  transition: all ${p => p.theme.transitions.fast};
  white-space: nowrap;

  ${p => p.$active
    ? css`
        border-color: ${p.$color || 'var(--brand-primary)'};
        background: ${p.$color || 'var(--brand-primary)'};
        color: white;
      `
    : css`
        border-color: ${p.theme.colors.border};
        background: transparent;
        color: ${p.theme.colors.textSecondary};
        &:hover { border-color: ${p.$color || 'var(--brand-primary)'}; color: ${p.$color || 'var(--brand-primary)'}; }
      `
  }
`;

// ============================================================================
// LEADS LIST & STATES
// ============================================================================

const LeadsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};
  overflow: hidden;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${p => p.theme.spacing.md};
  padding: 64px ${p => p.theme.spacing.xl};
  text-align: center;
  color: ${p => p.theme.colors.textMuted};
`;

const EmptyTitle = styled.p`
  font-size: ${p => p.theme.fontSizes.md};
  font-weight: 600;
  color: ${p => p.theme.colors.textSecondary};
  margin: 0;
`;

const EmptyDesc = styled.p`
  font-size: ${p => p.theme.fontSizes.sm};
  margin: 0;
`;

const ErrorBox = styled.div`
  padding: ${p => p.theme.spacing.xl};
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: ${p => p.theme.radii.lg};
  text-align: center;
  color: #991b1b;
`;

// ============================================================================
// ACCORDION CARD — COLLAPSED ROW
// ============================================================================

const CardWrapper = styled.div<{ $isNew: boolean; $status: LeadStatus; $isExpanded: boolean }>`
  position: relative;
  border-bottom: 1px solid ${p => p.theme.colors.border};
  transition: background ${p => p.theme.transitions.fast};

  &:last-child { border-bottom: none; }

  ${p => p.$isExpanded && css`
    background: #f8faff;
    border-left: 3px solid var(--brand-primary);
  `}

  ${p => !p.$isExpanded && p.$isNew && css`
    border-left: 3px solid #dc2626;
    background: linear-gradient(90deg, rgba(254, 242, 242, 0.6) 0%, transparent 60%);
  `}

  &:hover {
    background: ${p => p.$isExpanded ? '#f8faff' : p.theme.colors.surfaceAlt};
  }
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.md};
  padding: 14px ${p => p.theme.spacing.md};
  cursor: pointer;
  user-select: none;

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: ${p => p.theme.spacing.sm};
  }
`;

const SourceBadge = styled.div<{ $source: LeadSource }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${p => p.theme.radii.md};
  flex-shrink: 0;

  ${p => {
    switch (p.$source) {
      case LeadSource.PHONE: return css`background:#dcfce7; color:#16a34a;`;
      case LeadSource.EMAIL: return css`background:#dbeafe; color:#1d4ed8;`;
      default:               return css`background:#f3e8ff; color:#7c3aed;`;
    }
  }}
`;

const ContactBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
  flex-shrink: 0;
`;

const ContactName = styled.span`
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const ContactId = styled.span`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
  white-space: nowrap;
`;

const MessagePreview = styled.span`
  flex: 1;
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.sm};
  flex-shrink: 0;
  margin-left: auto;
`;

const TimeLabel = styled.span`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
  white-space: nowrap;

  @media (max-width: 640px) {
    display: none;
  }
`;

const NewBadge = styled.span`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: #dc2626;
  color: white;
  border-radius: ${p => p.theme.radii.full};
  animation: ${pulse} 2.5s ease-in-out infinite;
  white-space: nowrap;
`;

const ValueChip = styled.span`
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  border: 1px solid #fcd34d;
  border-radius: ${p => p.theme.radii.md};
  white-space: nowrap;
`;

const StatusPill = styled.span<{ $status: LeadStatus }>`
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-radius: ${p => p.theme.radii.full};
  white-space: nowrap;

  ${p => {
    switch (p.$status) {
      case LeadStatus.IN_PROGRESS: return css`background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;`;
      case LeadStatus.CONVERTED:   return css`background:#dcfce7; color:#166534; border:1px solid #86efac;`;
      case LeadStatus.ABANDONED:   return css`background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db;`;
    }
  }}

  @media (max-width: 480px) {
    display: none;
  }
`;

const ExpandToggle = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${p => p.theme.colors.textMuted};
  transition: transform ${p => p.theme.transitions.fast};
  transform: ${p => p.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  flex-shrink: 0;
`;

// ============================================================================
// ACCORDION CARD — EXPANDED PANEL
// ============================================================================

const ExpandedPanel = styled.div`
  padding: ${p => p.theme.spacing.lg};
  padding-top: 0;
  border-top: 1px dashed ${p => p.theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.lg};
  animation: ${slideDown} 0.2s ease-out;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    padding: ${p => p.theme.spacing.lg} ${p => p.theme.spacing.xl};
    padding-top: ${p => p.theme.spacing.md};
  }
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.sm};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: ${p => p.theme.colors.textMuted};
  margin-bottom: ${p => p.theme.spacing.xs};

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${p => p.theme.colors.border};
  }
`;

const FullMessage = styled.p`
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.text};
  line-height: 1.6;
  margin: 0;
  padding: ${p => p.theme.spacing.md};
  background: ${p => p.theme.colors.surfaceAlt};
  border-radius: ${p => p.theme.radii.md};
  border-left: 3px solid var(--brand-primary);
`;

// --- Estimation ---

const EstimationBox = styled.div`
  background: linear-gradient(135deg, #f0f4ff 0%, #f8f9ff 100%);
  border: 1px solid #c7d2fe;
  border-radius: ${p => p.theme.radii.lg};
  overflow: hidden;
`;

const EstimationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.sm};
  padding: 10px ${p => p.theme.spacing.md};
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
`;

const EstimationTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EstimationBody = styled.div`
  padding: ${p => p.theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EstimationRow = styled.div<{ $isTotal?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${p => p.$isTotal ? '10px 0 4px' : '6px 0'};
  border-top: ${p => p.$isTotal ? '1px solid #c7d2fe' : 'none'};
  gap: ${p => p.theme.spacing.md};
`;

const EstRowName = styled.span<{ $isTotal?: boolean }>`
  font-size: ${p => p.$isTotal ? p.theme.fontSizes.md : p.theme.fontSizes.sm};
  font-weight: ${p => p.$isTotal ? 700 : 400};
  color: ${p => p.$isTotal ? '#1e1b4b' : '#3730a3'};
  min-width: 0;
`;

const EstRowPrice = styled.span<{ $isTotal?: boolean }>`
  font-size: ${p => p.$isTotal ? p.theme.fontSizes.md : p.theme.fontSizes.sm};
  font-weight: ${p => p.$isTotal ? 700 : 500};
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  color: ${p => p.$isTotal ? '#1e1b4b' : '#4338ca'};
  white-space: nowrap;
`;

const UnmatchedSection = styled.div`
  padding: ${p => p.theme.spacing.sm} ${p => p.theme.spacing.md};
  background: #fffbeb;
  border-top: 1px solid #fde68a;
`;

const UnmatchedTitle = styled.p`
  font-size: 11px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const UnmatchedList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const UnmatchedItem = styled.li`
  font-size: ${p => p.theme.fontSizes.xs};
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: ${p => p.theme.radii.full};
  padding: 2px 8px;

  &::before { content: '• '; }
`;

const EstimationLoadingRow = styled.div`
  height: 16px;
  background: linear-gradient(90deg, #e0e7ff 25%, #c7d2fe 50%, #e0e7ff 75%);
  background-size: 400px 100%;
  border-radius: 4px;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

const NoEstimation = styled.p`
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textMuted};
  text-align: center;
  padding: ${p => p.theme.spacing.md};
  margin: 0;
`;

// --- Admin Price Override ---

const PriceOverrideRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.sm};
  flex-wrap: wrap;
`;

const PriceLabel = styled.label`
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: 500;
  color: ${p => p.theme.colors.text};
  white-space: nowrap;
`;

const PriceInputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PriceInput = styled.input`
  width: 140px;
  padding: 8px 44px 8px 12px;
  font-size: ${p => p.theme.fontSizes.sm};
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-weight: 500;
  border: 1.5px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  outline: none;
  transition: all ${p => p.theme.transitions.fast};

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const PriceSuffix = styled.span`
  position: absolute;
  right: 10px;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.colors.textMuted};
  pointer-events: none;
`;

const SavePriceBtn = styled.button`
  padding: 8px 16px;
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: 600;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
  color: white;
  border: none;
  border-radius: ${p => p.theme.radii.md};
  cursor: pointer;
  transition: all ${p => p.theme.transitions.fast};

  &:hover { filter: brightness(1.05); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const PriceSaved = styled.span`
  font-size: ${p => p.theme.fontSizes.xs};
  color: #16a34a;
  font-weight: 500;
  animation: ${fadeIn} 0.2s ease-out;
`;

// --- Status Actions ---

const StatusActions = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
`;

const StatusActionLabel = styled.span`
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: 500;
  color: ${p => p.theme.colors.textSecondary};
  white-space: nowrap;
`;

const StatusBtn = styled.button<{ $active: boolean; $variant: 'blue' | 'green' | 'gray' }>`
  padding: 7px 16px;
  font-size: 12px;
  font-weight: 600;
  border-radius: ${p => p.theme.radii.md};
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all ${p => p.theme.transitions.fast};

  ${p => {
    const variants = {
      blue:  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', activeBg: '#1e40af' },
      green: { bg: '#dcfce7', text: '#166534', border: '#86efac', activeBg: '#16a34a' },
      gray:  { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db', activeBg: '#6b7280' },
    };
    const v = variants[p.$variant];
    return p.$active
      ? css`background:${v.activeBg}; color:white; border-color:${v.activeBg};`
      : css`background:${v.bg}; color:${v.text}; border-color:${v.border};
            &:hover { background:${v.activeBg}; color:white; border-color:${v.activeBg}; }`;
  }}
`;

// ============================================================================
// PAGINATION
// ============================================================================

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px ${p => p.theme.spacing.md};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};
  gap: ${p => p.theme.spacing.sm};
  flex-wrap: wrap;
`;

const PaginationInfo = styled.span`
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textSecondary};
`;

const PaginationBtns = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing.xs};
`;

const PagBtn = styled.button`
  padding: 6px 14px;
  font-size: ${p => p.theme.fontSizes.sm};
  font-weight: 500;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  cursor: pointer;
  transition: all ${p => p.theme.transitions.fast};

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:not(:disabled):hover { background: ${p => p.theme.colors.surfaceAlt}; }
`;

// ============================================================================
// SKELETON ROWS
// ============================================================================

const SkeletonBar = styled.div<{ $w?: string; $h?: string }>`
  width: ${p => p.$w || '100%'};
  height: ${p => p.$h || '14px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 400px 100%;
  border-radius: 4px;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

// ============================================================================
// SVG ICONS
// ============================================================================

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const ManualIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const BotIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);
const WalletIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);
const InboxEmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 12h-6l-2 3H10l-2-3H2"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);

// ============================================================================
// HELPERS
// ============================================================================

const getSourceIcon = (source: LeadSource) => {
  switch (source) {
    case LeadSource.PHONE:  return <PhoneIcon />;
    case LeadSource.EMAIL:  return <EmailIcon />;
    default:                return <ManualIcon />;
  }
};

const formatContact = (lead: Lead): { primary: string; secondary?: string } => {
  if (lead.customerName) {
    const isPhone = !lead.contactIdentifier.includes('@');
    return {
      primary: lead.customerName,
      secondary: isPhone
        ? formatPhoneNumber(lead.contactIdentifier)
        : truncateEmail(lead.contactIdentifier, 28),
    };
  }
  const isPhone = !lead.contactIdentifier.includes('@');
  return {
    primary: isPhone
      ? formatPhoneNumber(lead.contactIdentifier)
      : truncateEmail(lead.contactIdentifier, 28),
  };
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.IN_PROGRESS]: 'W kontakcie',
  [LeadStatus.CONVERTED]:   'Zrealizowany',
  [LeadStatus.ABANDONED]:   'Odpuszczony',
};

// ============================================================================
// LEAD ACCORDION CARD
// ============================================================================

interface AccordionCardProps {
  lead: Lead;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

const LeadAccordionCard: React.FC<AccordionCardProps> = ({ lead, isExpanded, onToggle }) => {
  const { lead: detail, isLoading: isDetailLoading } = useLead(isExpanded ? lead.id : undefined);
  const updateStatus = useUpdateLeadStatus();
  const updateValue  = useUpdateLeadValue();

  const [priceInput, setPriceInput]   = useState('');
  const [priceSaved, setPriceSaved]   = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Sync input with current value when card expands
  useEffect(() => {
    if (isExpanded) {
      setPriceInput(String(lead.estimatedValue / 100));
      setPriceSaved(false);
    }
  }, [isExpanded, lead.estimatedValue]);

  const handleSavePrice = useCallback(() => {
    const newValue = parseCurrencyToGrosze(priceInput);
    if (!isNaN(newValue) && newValue >= 0) {
      updateValue.mutate({ id: lead.id, estimatedValue: newValue });
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 2500);
    }
  }, [priceInput, lead.id, updateValue]);

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSavePrice();
  };

  const handleStatusChange = useCallback((status: LeadStatus) => {
    updateStatus.mutate({ id: lead.id, status });
  }, [lead.id, updateStatus]);

  const contact   = formatContact(lead);
  const isNew     = lead.requiresVerification;
  const estimation = detail?.estimation ?? null;

  return (
    <CardWrapper $isNew={isNew} $status={lead.status} $isExpanded={isExpanded}>
      {/* ── Collapsed Row ── */}
      <CardRow onClick={() => onToggle(lead.id)}>
        <SourceBadge $source={lead.source}>
          {getSourceIcon(lead.source)}
        </SourceBadge>

        <ContactBlock>
          <ContactName title={contact.primary}>{contact.primary}</ContactName>
          {contact.secondary && <ContactId>{contact.secondary}</ContactId>}
        </ContactBlock>

        {lead.initialMessage && (
          <MessagePreview title={lead.initialMessage}>
            {lead.initialMessage}
          </MessagePreview>
        )}

        <CardMeta>
          <TimeLabel>{formatRelativeTime(lead.updatedAt || lead.createdAt)}</TimeLabel>
          {isNew && <NewBadge>Nowy</NewBadge>}
          <ValueChip>{formatCurrency(lead.estimatedValue)}</ValueChip>
          <StatusPill $status={lead.status}>{STATUS_LABELS[lead.status]}</StatusPill>
          <ExpandToggle $isExpanded={isExpanded}>
            <ChevronIcon />
          </ExpandToggle>
        </CardMeta>
      </CardRow>

      {/* ── Expanded Panel ── */}
      {isExpanded && (
        <ExpandedPanel>
          {/* Wiadomość */}
          {lead.initialMessage && (
            <div>
              <SectionLabel>Wiadomość od klienta</SectionLabel>
              <FullMessage>{lead.initialMessage}</FullMessage>
            </div>
          )}

          {/* AI Estimation */}
          <div>
            <SectionLabel>Automatyczna wycena AI</SectionLabel>
            {isDetailLoading ? (
              <EstimationBox>
                <EstimationHeader>
                  <BotIcon />
                  <EstimationTitle>Wczytywanie wyceny…</EstimationTitle>
                </EstimationHeader>
                <EstimationBody>
                  <EstimationLoadingRow style={{ width: '70%' }} />
                  <EstimationLoadingRow style={{ width: '55%' }} />
                  <EstimationLoadingRow style={{ width: '40%', marginTop: 8 }} />
                </EstimationBody>
              </EstimationBox>
            ) : estimation ? (
              <EstimationBox>
                <EstimationHeader>
                  <BotIcon />
                  <EstimationTitle>Szacowany koszt (na podstawie dopasowania)</EstimationTitle>
                </EstimationHeader>
                <EstimationBody>
                  {estimation.matchedItems.map((item) => (
                    <EstimationRow key={item.serviceName}>
                      <EstRowName>{item.serviceName}</EstRowName>
                      <EstRowPrice>
                        {formatCurrency(item.priceGross)} brutto
                      </EstRowPrice>
                    </EstimationRow>
                  ))}
                  <EstimationRow $isTotal>
                    <EstRowName $isTotal>ŁĄCZNIE</EstRowName>
                    <EstRowPrice $isTotal>
                      {formatCurrency(estimation.totalGross)} brutto
                      {estimation.unmatchedNeeds.length > 0 && (
                        <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 4 }}>
                          + {estimation.unmatchedNeeds.join(', ')}
                        </span>
                      )}
                    </EstRowPrice>
                  </EstimationRow>
                </EstimationBody>
                {estimation.unmatchedNeeds.length > 0 && (
                  <UnmatchedSection>
                    <UnmatchedTitle>Nie znaleziono w cenniku</UnmatchedTitle>
                    <UnmatchedList>
                      {estimation.unmatchedNeeds.map((need) => (
                        <UnmatchedItem key={need}>{need}</UnmatchedItem>
                      ))}
                    </UnmatchedList>
                  </UnmatchedSection>
                )}
              </EstimationBox>
            ) : (
              <EstimationBox>
                <EstimationHeader>
                  <BotIcon />
                  <EstimationTitle>Wycena AI</EstimationTitle>
                </EstimationHeader>
                <NoEstimation>Brak automatycznej wyceny dla tego leada.</NoEstimation>
              </EstimationBox>
            )}
          </div>

          {/* Admin price override */}
          <div>
            <SectionLabel>Twoja wycena</SectionLabel>
            <PriceOverrideRow>
              <PriceLabel htmlFor={`price-${lead.id}`}>Szacowana wartość:</PriceLabel>
              <PriceInputWrap>
                <PriceInput
                  id={`price-${lead.id}`}
                  ref={priceInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => { setPriceInput(e.target.value); setPriceSaved(false); }}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="0"
                />
                <PriceSuffix>PLN</PriceSuffix>
              </PriceInputWrap>
              <SavePriceBtn
                onClick={handleSavePrice}
                disabled={updateValue.isPending}
              >
                {updateValue.isPending ? 'Zapisywanie…' : 'Zapisz'}
              </SavePriceBtn>
              {priceSaved && <PriceSaved>✓ Zapisano</PriceSaved>}
            </PriceOverrideRow>
          </div>

          {/* Status Actions */}
          <div>
            <SectionLabel>Zmień status</SectionLabel>
            <StatusActions>
              <StatusActionLabel>Status:</StatusActionLabel>
              <StatusBtn
                $variant="blue"
                $active={lead.status === LeadStatus.IN_PROGRESS}
                onClick={() => handleStatusChange(LeadStatus.IN_PROGRESS)}
                disabled={updateStatus.isPending}
              >
                W kontakcie
              </StatusBtn>
              <StatusBtn
                $variant="green"
                $active={lead.status === LeadStatus.CONVERTED}
                onClick={() => handleStatusChange(LeadStatus.CONVERTED)}
                disabled={updateStatus.isPending}
              >
                Zrealizowany
              </StatusBtn>
              <StatusBtn
                $variant="gray"
                $active={lead.status === LeadStatus.ABANDONED}
                onClick={() => handleStatusChange(LeadStatus.ABANDONED)}
                disabled={updateStatus.isPending}
              >
                Odpuszczony
              </StatusBtn>
            </StatusActions>
          </div>
        </ExpandedPanel>
      )}
    </CardWrapper>
  );
};

// ============================================================================
// SKELETON ROWS
// ============================================================================

const SkeletonCardRow: React.FC = () => (
  <CardWrapper $isNew={false} $status={LeadStatus.IN_PROGRESS} $isExpanded={false}>
    <CardRow style={{ cursor: 'default' }}>
      <div style={{ width: 36, height: 36, background: '#f0f0f0', borderRadius: 8, flexShrink: 0 }} />
      <ContactBlock>
        <SkeletonBar $w="120px" $h="14px" />
        <SkeletonBar $w="80px" $h="11px" style={{ marginTop: 3 }} />
      </ContactBlock>
      <MessagePreview as="div">
        <SkeletonBar $w="240px" $h="13px" />
      </MessagePreview>
      <CardMeta>
        <SkeletonBar $w="50px" $h="12px" />
        <SkeletonBar $w="70px" $h="22px" />
        <SkeletonBar $w="80px" $h="22px" />
      </CardMeta>
    </CardRow>
  </CardWrapper>
);

// ============================================================================
// MAIN VIEW
// ============================================================================

const statusFilterOptions: { value: LeadStatus | 'ALL'; label: string; color?: string }[] = [
  { value: 'ALL',                   label: 'Wszystkie' },
  { value: LeadStatus.IN_PROGRESS,  label: 'W kontakcie',  color: '#1d4ed8' },
  { value: LeadStatus.CONVERTED,    label: 'Zrealizowane', color: '#16a34a' },
  { value: LeadStatus.ABANDONED,    label: 'Odpuszczone',  color: '#6b7280' },
];

const sourceFilterOptions: { value: LeadSource | 'ALL'; label: string }[] = [
  { value: 'ALL',             label: 'Wszystkie źródła' },
  { value: LeadSource.PHONE,  label: 'Telefon' },
  { value: LeadSource.EMAIL,  label: 'E-mail' },
  { value: LeadSource.MANUAL, label: 'Ręczne' },
];

export const LeadListView: React.FC = () => {
  useLeadSocket();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [activeSource, setActiveSource] = useState<LeadSource | 'ALL'>('ALL');
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

  const newLeadsCount = leads.filter(l => l.requiresVerification).length;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchValue(v);
    setFilters(p => ({ ...p, search: v, page: 1 }));
  }, []);

  const handleStatusFilter = useCallback((v: LeadStatus | 'ALL') => {
    setActiveStatus(v);
    setFilters(p => ({ ...p, status: v === 'ALL' ? [] : [v], page: 1 }));
  }, []);

  const handleSourceFilter = useCallback((v: LeadSource | 'ALL') => {
    setActiveSource(v);
    setFilters(p => ({ ...p, source: v === 'ALL' ? [] : [v], page: 1 }));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const sourceFilterForStats =
    activeSource === 'ALL' ? undefined : [activeSource];

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader>
        <TitleSection>
          <PageTitle>Leady</PageTitle>
          <PageSubtitle>Zarządzaj zapytaniami i potencjalnymi klientami</PageSubtitle>
        </TitleSection>
        <HeaderActions>
          <IconButton onClick={() => refetch()} title="Odśwież">
            <RefreshIcon />
          </IconButton>
          <AddButton onClick={() => setIsFormOpen(true)}>
            <PlusIcon />
            Dodaj lead
          </AddButton>
        </HeaderActions>
      </PageHeader>

      {/* Stats */}
      <LeadStatsBar sourceFilter={sourceFilterForStats} />

      {/* New leads banner */}
      {!isLoading && newLeadsCount > 0 && (
        <NewLeadsBanner>
          <BannerDot />
          <BannerText>
            Masz {newLeadsCount} {newLeadsCount === 1 ? 'nowy lead' : newLeadsCount < 5 ? 'nowe leady' : 'nowych leadów'}{' '}
            <BannerSub>— wymagają Twojej uwagi</BannerSub>
          </BannerText>
        </NewLeadsBanner>
      )}

      {/* Filters */}
      <FiltersSection>
        <SearchWrapper>
          <SearchIconWrap><SearchIcon /></SearchIconWrap>
          <SearchInput
            type="text"
            placeholder="Szukaj po nazwie, kontakcie lub wiadomości…"
            value={searchValue}
            onChange={handleSearch}
          />
        </SearchWrapper>

        <FilterDivider />

        <ChipsGroup>
          {sourceFilterOptions.map(opt => (
            <Chip
              key={opt.value}
              $active={activeSource === opt.value}
              onClick={() => handleSourceFilter(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </ChipsGroup>

        <FilterDivider />

        <ChipsGroup>
          {statusFilterOptions.map(opt => (
            <Chip
              key={opt.value}
              $active={activeStatus === opt.value}
              $color={opt.color}
              onClick={() => handleStatusFilter(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </ChipsGroup>
      </FiltersSection>

      {/* Content */}
      {isError ? (
        <ErrorBox>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Nie udało się załadować leadów</p>
          <button onClick={() => refetch()} style={{ cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', color: '#991b1b' }}>
            Spróbuj ponownie
          </button>
        </ErrorBox>
      ) : isLoading ? (
        <LeadsList>
          {[1, 2, 3, 4, 5].map(i => <SkeletonCardRow key={i} />)}
        </LeadsList>
      ) : leads.length === 0 ? (
        <EmptyState>
          <InboxEmptyIcon />
          <div>
            <EmptyTitle>Brak leadów</EmptyTitle>
            <EmptyDesc>
              {searchValue || activeStatus !== 'ALL' || activeSource !== 'ALL'
                ? 'Brak leadów spełniających wybrane kryteria'
                : 'Nowe leady pojawią się tutaj automatycznie'}
            </EmptyDesc>
          </div>
        </EmptyState>
      ) : (
        <LeadsList>
          {leads.map(lead => (
            <LeadAccordionCard
              key={lead.id}
              lead={lead}
              isExpanded={expandedId === lead.id}
              onToggle={handleToggle}
            />
          ))}
        </LeadsList>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <PaginationRow>
          <PaginationInfo>
            Wyświetlanie {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}{' '}
            z {pagination.totalItems}
          </PaginationInfo>
          <PaginationBtns>
            <PagBtn
              disabled={pagination.currentPage === 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
            >
              Poprzednia
            </PagBtn>
            <PagBtn
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
            >
              Następna
            </PagBtn>
          </PaginationBtns>
        </PaginationRow>
      )}

      <LeadForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </PageContainer>
  );
};
