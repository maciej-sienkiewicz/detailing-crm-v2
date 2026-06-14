// src/modules/leads/components/LeadDetailModal/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import {
  X, Phone, Mail, PenLine, FileText, Edit3, Wrench, ChevronRight,
  MessageSquare, UserCheck, UserX, Check, Search, Plus, CalendarCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core';
import { useCalendarNavigation } from '@/common/context/CalendarNavigationContext';
import { useToast } from '@/common/components/Toast';
import { Modal } from '@/common/components/Modal/Modal';
import { ImageViewerModal } from '@/modules/visits/components/ImageViewerModal';
import { visitApi } from '@/modules/visits/api/visitApi';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { VisitPhoto } from '@/modules/visits/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  useLead,
  useUpdateLeadValue,
  useAssignLeadUser,
  useSetLostReason,
  useSaveUserQuote,
  useDeleteUserQuote,
} from '../../hooks';
import { OfferComposer } from '../OfferComposer';
import { LeadThread } from '../LeadThread';
import { EmployeePickerModal } from '../EmployeePickerModal';
import { LeadSource, LeadStatus } from '../../types';
import type {
  Lead,
  LeadEstimationItem,
  LeadUserQuote,
  SaveUserQuoteItemRequest,
} from '../../types';
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  formatPhoneNumber,
  truncateEmail,
  parseCurrencyToGrosze,
} from '../../utils/formatters';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const pricePulse = keyframes`
  0%, 100% { background: rgba(239, 68, 68, 0.08); }
  50%       { background: rgba(239, 68, 68, 0.25); }
`;

// ─── Modal body layout ─────────────────────────────────────────────────────────

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${fadeIn} 150ms ease both;
`;

// ─── Header card ───────────────────────────────────────────────────────────────

const HeaderCard = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
  padding: 16px 18px;
  background: linear-gradient(135deg, #f8fbff 0%, #f0f7ff 100%);
  border: 1px solid #dbeafe;
  border-radius: 14px;
`;

const SourceIcon = styled.div<{ $source: LeadSource }>`
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  svg { width: 17px; height: 17px; }

  ${p => {
    switch (p.$source) {
      case LeadSource.PHONE:  return css`background:#dcfce7; color:#16a34a;`;
      case LeadSource.EMAIL:  return css`background:#dbeafe; color:#1d4ed8;`;
      default:                return css`background:#f3e8ff; color:#7c3aed;`;
    }
  }}
`;

const HeaderMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const HeaderName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`;

const HeaderContact = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${st.textSecondary};
  margin-top: 1px;
`;

const HeaderMeta = styled.div`
  font-size: 12px;
  color: ${st.textMuted};
  margin-top: 3px;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

const PriceStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const PriceGross = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
  line-height: 1.2;
`;

const PriceDetail = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  font-variant-numeric: tabular-nums;
  text-align: right;
  margin-top: 2px;
`;

const AssignChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 6px;
  background: #fff;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  color: ${st.textSecondary};
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 180ms ease;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
  svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

const AssignChipAvatar = styled.div`
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  flex-shrink: 0;
`;

// ─── Section label ─────────────────────────────────────────────────────────────

const PanelLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

const PanelSection = styled.div`
  display: flex;
  flex-direction: column;
`;

// ─── Message box ───────────────────────────────────────────────────────────────

const MessageBox = styled.p`
  font-size: 13px;
  color: ${st.textSecondary};
  line-height: 1.6;
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  border-left: 3px solid #0ea5e9;
  white-space: pre-wrap;
  word-break: break-word;
`;

// ─── Estimations grid ──────────────────────────────────────────────────────────

const EstimationsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;
  row-gap: 8px;
  align-items: start;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
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
  &:last-of-type { border-bottom: none; }
`;

const EstName = styled.span<{ $isTotal?: boolean }>`
  font-size: ${p => p.$isTotal ? '13px' : '12px'};
  font-weight: ${p => p.$isTotal ? 700 : 400};
  color: ${p => p.$isTotal ? st.text : st.textSecondary};
  min-width: 0;
`;

const EstPrice = styled.span<{ $isTotal?: boolean }>`
  font-size: ${p => p.$isTotal ? '13px' : '12px'};
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
  font-size: 13px;
  color: ${st.textMuted};
  text-align: center;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonPulse = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '13px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Lost reason ──────────────────────────────────────────────────────────────

const LostReasonBox = styled.div`
  padding: 10px 14px;
  background: #fef3f2;
  border: 1px solid #fecaca;
  border-left: 3px solid #dc2626;
  border-radius: 10px;
  font-size: 13px;
  color: #7f1d1d;
  line-height: 1.5;
`;

const LostReasonTextarea = styled.textarea`
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 10px;
  background: #fff;
  color: ${st.text};
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 180ms ease;
  &:focus { border-color: #0ea5e9; }
  &::placeholder { color: ${st.textMuted}; }
`;

const LostReasonActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 6px;
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
  transition: all 180ms ease;

  &:hover { background: #0284c7; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const CancelBtn = styled.button`
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
  transition: all 180ms ease;
  &:hover { background: #fee2e2; }
`;

const InlineEditBtn = styled.button`
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
  transition: all 180ms ease;
  margin-left: auto;

  &:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
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
  transition: background 180ms ease;

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
  transition: all 180ms ease;
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

// ─── User quote editor ────────────────────────────────────────────────────────

const UserQuoteCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
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
  transition: all 180ms ease;

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
  transition: all 180ms ease;

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
  transition: all 180ms ease;

  &:hover { background: #fee2e2; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
  transition: all 180ms ease;
  &:hover { background: #fee2e2; color: #dc2626; }
  svg { width: 13px; height: 13px; }
`;

const InlineNameInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  color: ${st.textSecondary};
  width: 100%;
  min-width: 0;
  font-family: inherit;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 180ms ease;

  &:focus { color: ${st.text}; background: rgba(14,165,233,0.07); }
  &::placeholder { color: #c0cad8; }
`;

const InlinePriceInput = styled.input<{ $pulse?: boolean }>`
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  font-weight: 500;
  color: ${st.textSecondary};
  width: 72px;
  text-align: right;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 180ms ease;

  &:focus { color: ${st.text}; background: rgba(14,165,233,0.07); }
  &::placeholder { color: #c0cad8; }

  ${props => props.$pulse && css`
    animation: ${pricePulse} 0.6s ease-in-out 3;
  `}

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
  transition: background 180ms ease, color 180ms ease;

  &:focus { background: rgba(14, 165, 233, 0.07); color: ${st.text}; }
  &::placeholder { color: #c0cad8; }
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
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
  transition: background 180ms ease;

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

// ─── Visit Preview Modal styled components ────────────────────────────────────

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
    return `background:#eff6ff; color:#1d4ed8;`;
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
  transition: all 180ms ease;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.18);
    transform: scale(1.02);
  }
`;

const VPhotoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 180ms ease;
  color: #fff;
  svg { width: 20px; height: 20px; opacity: 0; transition: opacity 180ms ease; }

  ${VPhotoThumb}:hover & {
    background: rgba(0,0,0,0.28);
    svg { opacity: 1; }
  }
`;

const VEmptyPhotos = styled.div`
  padding: 20px;
  text-align: center;
  font-size: 13px;
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
  font-size: 13px;
  font-weight: 500;
`;

// ─── Visit Preview Modal ───────────────────────────────────────────────────────

interface VisitPreviewModalProps {
  visitId: string | null;
  onClose: () => void;
}

const VisitPreviewModal: React.FC<VisitPreviewModalProps> = ({ visitId, onClose }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: detailData, isLoading, isError } = useQuery({
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
  const visitTitle = visit?.visitNumber ? `Wizyta ${visit.visitNumber}` : 'Podgląd wizyty';
  const customerName = visit?.customer ? `${visit.customer.firstName} ${visit.customer.lastName}`.trim() : null;
  const vehicleLabel = visit?.vehicle ? `${visit.vehicle.brand} ${visit.vehicle.model}`.trim() : null;
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
        {isError && <VModalError>Nie udało się załadować danych wizyty.</VModalError>}
        {visit && !isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <VInfoStrip>
              <VInfoCard>
                <VInfoIconBox $color="#0ea5e9" $bg="rgba(14,165,233,0.1)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1" ry="1"/><line x1="12" y1="11" x2="12" y2="21"/><line x1="9" y1="15" x2="23" y2="15"/>
                  </svg>
                </VInfoIconBox>
                <VInfoLabel>Pojazd</VInfoLabel>
                <VInfoMain>{vehicleLabel ?? '—'}</VInfoMain>
                {vehicleSub && <VInfoSub>{vehicleSub}</VInfoSub>}
              </VInfoCard>
              <VInfoCard>
                <VInfoIconBox $color="#10b981" $bg="rgba(16,185,129,0.1)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </VInfoIconBox>
                <VInfoLabel>Właściciel</VInfoLabel>
                <VInfoMain>{customerName ?? '—'}</VInfoMain>
                {visit.customer?.phone && <VInfoSub>{visit.customer.phone}</VInfoSub>}
                {visit.customer?.companyName && <VInfoSub>{visit.customer.companyName}</VInfoSub>}
              </VInfoCard>
            </VInfoStrip>

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

            <div>
              <VSectionLabel>
                Galeria zdjęć
                {!isPhotosLoading && photos.length > 0 && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>({photos.length})</span>
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
                    <VPhotoThumb key={photo.id} onClick={() => setLightboxIndex(idx)} title={photo.description ?? photo.fileName}>
                      <img src={photo.thumbnailUrl} alt={photo.fileName} loading="lazy" />
                      <VPhotoOverlay>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          <line x1="11" y1="8" x2="11" y2="14"/>
                          <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                      </VPhotoOverlay>
                    </VPhotoThumb>
                  ))}
                </VPhotoGrid>
              ) : (
                <VEmptyPhotos>Brak zdjęć przypisanych do tej wizyty</VEmptyPhotos>
              )}
            </div>
          </div>
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

// ─── Service name input with autocomplete ─────────────────────────────────────

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
              <SuggestPrice>{(svc.basePriceNet / 100).toFixed(2)} PLN netto · VAT {svc.vatRate}%</SuggestPrice>
            </SuggestRow>
          ))}
        </SuggestBox>,
        document.body
      )}
    </>
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
      <UserQuoteCard>
        {items.map(item => (
          <EstRow key={item._key}>
            <ServiceNameInput
              value={item.serviceName}
              onChange={(name, serviceId, priceNet, vatRate) => {
                const patch: Partial<UserQuoteItem> = { serviceName: name, serviceId: serviceId ?? null };
                if (priceNet !== undefined) patch.priceNet = (priceNet / 100).toFixed(2);
                if (vatRate !== undefined) patch.vatRate = vatRate;
                updateItem(item._key, patch);
              }}
            />
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
                <span style={{ fontSize: '12px', fontWeight: 500, color: st.textSecondary, whiteSpace: 'nowrap' }}>brutto</span>
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

// ─── Main modal component ─────────────────────────────────────────────────────

export interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { start: startCalendarNav } = useCalendarNavigation();
  const { lead: detail, isLoading: isDetailLoading } = useLead(lead?.id);
  const updateValue   = useUpdateLeadValue();
  const assignUser    = useAssignLeadUser(lead?.id ?? '');
  const setLostReason = useSetLostReason(lead?.id ?? '');
  const { showSuccess } = useToast();
  const { user: authUser } = useAuth();

  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const [isEditingLostReason, setIsEditingLostReason] = useState(false);
  const [lostReasonDraft, setLostReasonDraft] = useState(lead?.lostReason ?? '');
  const [previewVisitId, setPreviewVisitId] = useState<string | null>(null);
  const [calNavLoadingId, setCalNavLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsEmployeePickerOpen(false);
      setIsEditingLostReason(false);
      setPreviewVisitId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setLostReasonDraft(lead?.lostReason ?? '');
  }, [lead?.lostReason]);

  const handleGoToVisitInCalendar = async (visitId: string, btnEl: HTMLElement) => {
    if (calNavLoadingId) return;
    setCalNavLoadingId(visitId);
    try {
      const res = await visitApi.getVisitDetail(visitId);
      const visit = res.visit;
      const sourceRect = btnEl.getBoundingClientRect();
      const snap = {
        id: visitId,
        label: visit.vehicle ? `${visit.vehicle.brand} ${visit.vehicle.model}`.trim() : (lead?.vehicleBrand ?? 'Wizyta'),
        customer: visit.customer
          ? `${visit.customer.firstName} ${visit.customer.lastName}`.trim()
          : (lead?.customerName ?? lead?.contactIdentifier ?? ''),
        amount: '',
        accentColor: '#0ea5e9',
        sourceRect,
        scheduledDate: visit.scheduledDate ?? undefined,
      };
      const doNavigate = () => navigate('/calendar', {
        state: { highlightEventId: visitId, highlightDate: visit.scheduledDate ?? '' },
      });
      startCalendarNav(snap, doNavigate);
    } catch {
      navigate('/calendar');
    } finally {
      setCalNavLoadingId(null);
    }
  };

  if (!lead) return null;

  const estimation    = detail?.estimation ?? null;
  const userQuote     = detail?.userQuote ?? null;
  const relatedVisits = estimation?.relatedVisits ?? detail?.relatedVisits ?? lead.relatedVisits ?? [];
  const hasQuote      = !!userQuote;
  const aiDimmed      = hasQuote;

  // Price breakdown — prefer user quote, fall back to AI estimation, then lead value
  const activeQuote  = userQuote ?? estimation;
  const headerGross  = activeQuote?.totalGross ?? lead.estimatedValue;
  const headerNet    = activeQuote?.totalNet ?? null;
  const headerVat    = headerNet !== null ? headerGross - headerNet : null;

  const handleSaveLostReason = () => {
    setLostReason.mutate(
      { lostReason: lostReasonDraft.trim() || null },
      { onSuccess: () => { showSuccess('Powód zapisany'); setIsEditingLostReason(false); } }
    );
  };

  const handleQuoteSaved = (totalGross: number) => {
    updateValue.mutate({ id: lead.id, estimatedValue: totalGross });
  };

  const handleQuoteDeleted = () => {
    updateValue.mutate({ id: lead.id, estimatedValue: estimation?.totalGross ?? 0 });
  };

  const sourceIcon = lead.source === LeadSource.PHONE
    ? <Phone />
    : lead.source === LeadSource.EMAIL
      ? <Mail />
      : <PenLine />;

  const contactSub = lead.contactIdentifier?.includes('@')
    ? truncateEmail(lead.contactIdentifier, 34)
    : formatPhoneNumber(lead.contactIdentifier);

  const assignedUserName = detail?.assignedUserName ?? lead.assignedUserName;
  const assignedUserInitials = assignedUserName
    ? assignedUserName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '';

  const vehicleLabel = lead.vehicleBrand
    ? `${lead.vehicleBrand}${lead.vehicleModel ? ` ${lead.vehicleModel}` : ''}`
    : null;

  const modalTitle = lead.customerName || lead.contactIdentifier || 'Szczegóły leada';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="860px">
        <ModalBody>

          {/* Header card — source icon | name+contact+date | price+assign chip */}
          <HeaderCard>
            <SourceIcon $source={lead.source}>{sourceIcon}</SourceIcon>

            <HeaderMain>
              <HeaderName>{lead.customerName || lead.contactIdentifier}</HeaderName>
              {lead.customerName && <HeaderContact>{contactSub}</HeaderContact>}
              <HeaderMeta>
                {formatDateTime(lead.createdAt)}
                {vehicleLabel && ` · ${vehicleLabel}`}
              </HeaderMeta>
              <HeaderMeta>Ost. aktualizacja: {formatRelativeTime(lead.updatedAt || lead.createdAt)}</HeaderMeta>
            </HeaderMain>

            <HeaderRight>
              <PriceStack>
                <PriceGross>{formatCurrency(headerGross)}</PriceGross>
                {headerNet !== null ? (
                  <PriceDetail>
                    {formatCurrency(headerNet)} netto
                    {headerVat !== null && ` · VAT ${formatCurrency(headerVat)}`}
                  </PriceDetail>
                ) : (
                  <PriceDetail>brutto</PriceDetail>
                )}
              </PriceStack>

              <AssignChip onClick={() => setIsEmployeePickerOpen(true)} title={assignedUserName ? 'Zmień przypisanie pracownika' : 'Przypisz pracownika'}>
                {assignedUserName ? (
                  <>
                    <AssignChipAvatar>{assignedUserInitials}</AssignChipAvatar>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{assignedUserName}</span>
                    <Check size={11} color="#16a34a" />
                  </>
                ) : (
                  <>
                    <UserCheck size={12} />
                    Przypisz pracownika
                  </>
                )}
              </AssignChip>
            </HeaderRight>
          </HeaderCard>

          {/* Initial message */}
          {lead.initialMessage && (
            <PanelSection>
              <PanelLabel>Wiadomość od klienta</PanelLabel>
              <MessageBox>{lead.initialMessage}</MessageBox>
            </PanelSection>
          )}

          {/* Lost reason */}
          {lead.status === LeadStatus.LOST && (
            <PanelSection>
              <PanelLabel style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={13} /> Powód utraty
                </span>
                {!isEditingLostReason && (
                  <InlineEditBtn onClick={() => { setLostReasonDraft(lead.lostReason ?? ''); setIsEditingLostReason(true); }}>
                    {lead.lostReason ? 'Edytuj' : 'Dodaj powód'}
                  </InlineEditBtn>
                )}
              </PanelLabel>
              {isEditingLostReason ? (
                <div>
                  <LostReasonTextarea
                    autoFocus
                    value={lostReasonDraft}
                    onChange={e => setLostReasonDraft(e.target.value)}
                    placeholder="Dlaczego klient odpadł? (np. zbyt wysoka cena, wybrał konkurencję…)"
                    maxLength={500}
                  />
                  <LostReasonActions>
                    <SaveBtn onClick={handleSaveLostReason} disabled={setLostReason.isPending}>
                      {setLostReason.isPending ? 'Zapisywanie…' : 'Zapisz'}
                    </SaveBtn>
                    <CancelBtn onClick={() => setIsEditingLostReason(false)}>Anuluj</CancelBtn>
                  </LostReasonActions>
                </div>
              ) : lead.lostReason ? (
                <LostReasonBox>{lead.lostReason}</LostReasonBox>
              ) : (
                <span style={{ fontSize: 12, color: st.textMuted, fontStyle: 'italic' }}>Brak powodu utraty</span>
              )}
            </PanelSection>
          )}

          {/* Estimations */}
          <EstimationsGrid>
            <PanelLabel style={{ marginBottom: 0 }}>
              <FileText size={13} /> Kosztorys stworzony przez system
            </PanelLabel>
            <PanelLabel style={{ marginBottom: 0 }}>
              <Edit3 size={13} /> Twój kosztorys
            </PanelLabel>

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
                <NoEstBox>System nie był w stanie stworzyć wstępnego kosztorysu.</NoEstBox>
              )}
            </EstColumnWrapper>

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
                    onClick={() => setPreviewVisitId(rv.id)}
                  >
                    <RelatedVisitIcon><Wrench /></RelatedVisitIcon>
                    <RelatedVisitTitle>{rv.title ?? `Wizyta ${rv.id.slice(0, 8)}…`}</RelatedVisitTitle>
                    <button
                      title="Przejdź do rezerwacji w kalendarzu"
                      disabled={!!calNavLoadingId}
                      onClick={e => { e.stopPropagation(); handleGoToVisitInCalendar(rv.id, e.currentTarget); }}
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        background: 'transparent',
                        border: '1.5px solid #0ea5e9',
                        borderRadius: 9999,
                        color: '#0ea5e9',
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        opacity: calNavLoadingId === rv.id ? 0.5 : 1,
                      }}
                    >
                      <CalendarCheck size={12} />
                      {calNavLoadingId === rv.id ? '…' : 'Przejdź do rezerwacji'}
                    </button>
                    <RelatedVisitArrow><ChevronRight /></RelatedVisitArrow>
                  </RelatedVisitRow>
                ))}
              </RelatedVisitsCard>
            </PanelSection>
          )}

          {/* Offer composer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <OfferComposer lead={lead} />
          </div>

          {/* Comments & history */}
          <div style={{ borderTop: `1px solid ${st.border}`, paddingTop: 16 }}>
            <LeadThread leadId={lead.id} />
          </div>

        </ModalBody>
      </Modal>

      <VisitPreviewModal
        visitId={previewVisitId}
        onClose={() => setPreviewVisitId(null)}
      />

      <EmployeePickerModal
        isOpen={isEmployeePickerOpen}
        onClose={() => setIsEmployeePickerOpen(false)}
        hasAssigned={!!assignedUserName}
        onSelect={emp => {
          assignUser.mutate(
            { userId: emp.linkedUserId ?? emp.id, userName: emp.fullName },
            { onSuccess: () => showSuccess('Pracownik przypisany') }
          );
        }}
        onAssignSelf={() => {
          if (!authUser) return;
          const name = [authUser.firstName, authUser.lastName].filter(Boolean).join(' ') || authUser.userId;
          assignUser.mutate(
            { userId: authUser.userId, userName: name },
            { onSuccess: () => showSuccess('Przypisano do Ciebie') }
          );
        }}
        onUnassign={() => {
          assignUser.mutate(
            { userId: null },
            { onSuccess: () => showSuccess('Pracownik odpięty') }
          );
        }}
      />
    </>
  );
};
