// src/modules/leads/components/LeadDetailModal/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import {
  X, Phone, Mail, PenLine, FileText, Edit3,
  MessageSquare, UserCheck, UserX, Check, Search, Plus,
  Camera, Calendar, ArrowRight, ArrowUpRight, AlertCircle,
  History, Images, ChevronDown, User, Car,
  ExternalLink, Gauge, StickyNote, Wrench,
  GitMerge, Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core';
import { useToast } from '@/common/components/Toast';
import { Modal } from '@/common/components/Modal/Modal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal/ConfirmationModal';
import { ImageViewerModal } from '@/modules/visits/components/ImageViewerModal';
import { visitApi } from '@/modules/visits/api/visitApi';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { VisitPhoto } from '@/modules/visits/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  useLead,
  useUpdateLeadValue,
  useUpdateLeadStatus,
  useDeleteLead,
  useAssignLeadUser,
  useSetLostReason,
  useSaveUserQuote,
  useDeleteUserQuote,
  useLeads,
  useMergeLead,
} from '../../hooks';
import { OfferComposerModal } from '../OfferComposer/OfferComposerModal';
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

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const InlineSpinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  opacity: 0.6;
  vertical-align: middle;
  flex-shrink: 0;
`;

const PendingLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${st.textMuted};
  font-style: italic;
  font-size: 0.85em;
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

// ─── Related visits (reference realisations) ──────────────────────────────────

const RelatedVisitsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const RelatedVisitsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
  svg { width: 15px; height: 15px; color: ${st.textMuted}; }
`;

const PhotoToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: ${p => (p.$active ? '#f0f9ff' : 'transparent')};
  border: 1px solid ${p => (p.$active ? '#bae6fd' : st.border)};
  border-radius: 9999px;
  color: ${p => (p.$active ? '#0284c7' : st.textSecondary)};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;

  &:hover { border-color: #7dd3fc; color: #0284c7; }
  svg { width: 14px; height: 14px; }
  .chev {
    transition: transform 240ms ease;
    transform: rotate(${p => (p.$active ? '180deg' : '0deg')});
  }
`;

const RVCoverCollapse = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${p => (p.$open ? '1fr' : '0fr')};
  transition: grid-template-rows 300ms ease;
`;

const RVCoverClip = styled.div`
  overflow: hidden;
  min-height: 0;
`;

const RVHeadRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const RVStatusInline = styled.span`
  flex-shrink: 0;
`;

const RelatedVisitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(228px, 1fr));
  gap: 12px;
`;

const RVCard = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

  &:hover {
    border-color: #7dd3fc;
    box-shadow: 0 10px 24px -12px rgba(14, 165, 233, 0.45);
    transform: translateY(-2px);
  }
  &:hover .rv-cta { color: #0284c7; }
  &:hover .rv-cta svg { transform: translateX(3px); }
  &:hover .rv-cover img { transform: scale(1.06); }
`;

const RVCover = styled.div.attrs({ className: 'rv-cover' })`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 320ms ease;
  }
`;

const RVCoverPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  svg { width: 22px; height: 22px; }
`;

const RVPhotoBadge = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  svg { width: 12px; height: 12px; }
`;

const RVBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px 13px;
`;

const RVVehicle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${st.text};
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RVMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${st.textMuted};
  margin-top: -4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

const RVChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

const RVChip = styled.span`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 3px 9px;
  border-radius: 9999px;
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  color: #0369a1;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RVChipMore = styled(RVChip)`
  background: #f1f5f9;
  border-color: ${st.border};
  color: ${st.textMuted};
`;

const RVFooter = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 1px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
`;

const RVPriceLabel = styled.span`
  display: block;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${st.textMuted};
  margin-bottom: 3px;
`;

const RVPrice = styled.span`
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
  line-height: 1;
`;

const RVCta = styled.span.attrs({ className: 'rv-cta' })`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #0ea5e9;
  white-space: nowrap;
  transition: color 180ms ease;
  svg { width: 14px; height: 14px; transition: transform 180ms ease; }
`;

const RVSkeleton = styled.div`
  border: 1px solid ${st.border};
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
`;

const RVErrorCard = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 16px 14px;
  border: 1px dashed ${st.border};
  border-radius: 12px;
  background: #f8fafc;
  color: ${st.textMuted};
  font-size: 12.5px;
  font-weight: 500;
  svg { width: 16px; height: 16px; flex-shrink: 0; color: #cbd5e1; }
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

const VStatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
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

// ── Hero ──────────────────────────────────────────────────────────────────────

const VHero = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #243043 100%);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -45%;
    right: -8%;
    width: 240px;
    height: 240px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0) 70%);
    pointer-events: none;
  }
`;

const VHeroTop = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const VHeroVehicle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: #fff;
  cursor: pointer;
  text-align: left;
  transition: color 160ms ease;

  .car { width: 18px; height: 18px; color: #38bdf8; flex-shrink: 0; }
  .ext { width: 14px; height: 14px; color: rgba(255, 255, 255, 0.4); flex-shrink: 0; transition: color 160ms ease, transform 160ms ease; }
  &:hover { color: #e0f2fe; }
  &:hover .ext { color: #7dd3fc; transform: translate(1px, -1px); }
`;

const VHeroPlate = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 27px;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
`;

const VHeroSub = styled.span`
  margin-left: 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
`;

const VHeroMeta = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const VHeroMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const VHeroMetaLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.4);
  svg { width: 12px; height: 12px; }
`;

const VHeroMetaValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
`;

// ── Price summary band ──────────────────────────────────────────────────────────

const VPriceBand = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const VPriceTile = styled.div<{ $accent?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${p => (p.$accent ? '#bae6fd' : st.border)};
  background: ${p => (p.$accent ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : '#fff')};
`;

const VPriceTileLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${st.textMuted};
`;

const VPriceTileValue = styled.span<{ $accent?: boolean }>`
  font-size: 18px;
  font-weight: 800;
  color: ${p => (p.$accent ? '#0369a1' : st.text)};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`;

// ── Section heading ─────────────────────────────────────────────────────────────

const VSectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 9px;
  svg { width: 13px; height: 13px; }
`;

// ── Services table (Usługa | Netto | VAT | Brutto) ──────────────────────────────

const VServicesCard = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 12px;
  overflow: hidden;
`;

const VSvcGridRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 78px 104px;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`;

const VSvcHead = styled(VSvcGridRow)`
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};

  @media (max-width: 560px) { display: none; }
`;

const VSvcHeadCell = styled.span<{ $right?: boolean }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${st.textMuted};
  text-align: ${p => (p.$right ? 'right' : 'left')};
`;

const VSvcRow = styled(VSvcGridRow)`
  border-bottom: 1px solid #f1f5f9;
  &:last-of-type { border-bottom: none; }
`;

const VSvcNameWrap = styled.div`
  min-width: 0;
`;

const VSvcName = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
`;

const VSvcNote = styled.span`
  display: block;
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
  line-height: 1.4;
`;

const VSvcCell = styled.span<{ $muted?: boolean }>`
  font-size: 13px;
  font-weight: ${p => (p.$muted ? 500 : 700)};
  color: ${p => (p.$muted ? st.textMuted : st.text)};
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  @media (max-width: 560px) {
    &.vat { display: none; }
    &.net { display: none; }
  }
`;

// ── Notes ───────────────────────────────────────────────────────────────────────

const VNoteCard = styled.div`
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 3px solid #f59e0b;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: #78350f;
  white-space: pre-wrap;
`;

const VEmptyState = styled.div`
  padding: 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${st.textMuted};
  background: #f8fafc;
  border: 1px dashed ${st.border};
  border-radius: 10px;
`;

// ── Customer card ──────────────────────────────────────────────────────────────

const VPartyCard = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 12px;
`;

const VPartyAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  flex-shrink: 0;
`;

const VPartyInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const VPartyName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const VPartyMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px 12px;
  margin-top: 3px;
  font-size: 12px;
  color: ${st.textMuted};
`;

const VPartyStat = styled.span`
  font-weight: 600;
  color: ${st.textSecondary};
`;

const VProfileBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  flex-shrink: 0;
  background: transparent;
  border: 1px solid ${st.border};
  border-radius: 9999px;
  color: ${st.textSecondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
  svg { width: 13px; height: 13px; }
  &:hover { border-color: #7dd3fc; color: #0284c7; background: #f0f9ff; }
`;

// ── Footer action bar ───────────────────────────────────────────────────────────

const VFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid ${st.border};
`;

const VPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  background: #0ea5e9;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  box-shadow: 0 6px 16px -6px rgba(14, 165, 233, 0.6);
  svg { width: 15px; height: 15px; transition: transform 160ms ease; }
  &:hover { background: #0284c7; transform: translateY(-1px); }
  &:hover svg { transform: translateX(2px); }
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
  const navigate = useNavigate();
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
  const vehicleSubShort = visit?.vehicle
    ? [
        visit.vehicle.yearOfProduction ? String(visit.vehicle.yearOfProduction) : null,
        visit.vehicle.color ?? null,
      ].filter(Boolean).join(' · ')
    : null;
  const fmtDate = (d?: string) =>
    d ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d)) : null;
  const formattedDate = fmtDate(visit?.scheduledDate);
  const completedDateLabel = fmtDate(visit?.completedDate);

  const services = visit?.services ?? [];
  const netTotal = visit?.totalCost?.netAmount ?? services.reduce((s, x) => s + x.finalPriceNet, 0);
  const grossTotal = visit?.totalCost?.grossAmount ?? services.reduce((s, x) => s + x.finalPriceGross, 0);
  const vatTotal = Math.max(0, grossTotal - netTotal);

  const custInitials = visit?.customer
    ? `${visit.customer.firstName?.[0] ?? ''}${visit.customer.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <Modal isOpen={!!visitId} onClose={onClose} title={visitTitle} maxWidth="720px">
        {isLoading && (
          <VModalLoading>
            <SkeletonPulse $h="140px" />
            <SkeletonPulse $h="80px" />
            <SkeletonPulse $h="160px" />
          </VModalLoading>
        )}
        {isError && <VModalError>Nie udało się załadować danych wizyty.</VModalError>}
        {visit && !isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Hero */}
            <VHero>
              <VHeroTop>
                <div style={{ minWidth: 0 }}>
                  <VHeroVehicle
                    type="button"
                    title="Otwórz profil pojazdu"
                    onClick={() => visit.vehicle && goTo(`/vehicles/${visit.vehicle.id}`)}
                  >
                    <Car className="car" />
                    {vehicleLabel ?? 'Wizyta'}
                    <ExternalLink className="ext" />
                  </VHeroVehicle>
                  <div>
                    {visit.vehicle?.licensePlate && <VHeroPlate>{visit.vehicle.licensePlate}</VHeroPlate>}
                    {vehicleSubShort && <VHeroSub>{vehicleSubShort}</VHeroSub>}
                  </div>
                </div>
                {visit.status && (
                  <VStatusBadge $status={visit.status}>
                    {VStatusLabel[visit.status] ?? visit.status}
                  </VStatusBadge>
                )}
              </VHeroTop>
              <VHeroMeta>
                {formattedDate && (
                  <VHeroMetaItem>
                    <VHeroMetaLabel><Calendar />Termin</VHeroMetaLabel>
                    <VHeroMetaValue>{formattedDate}</VHeroMetaValue>
                  </VHeroMetaItem>
                )}
                {completedDateLabel && (
                  <VHeroMetaItem>
                    <VHeroMetaLabel><Check />Zakończono</VHeroMetaLabel>
                    <VHeroMetaValue>{completedDateLabel}</VHeroMetaValue>
                  </VHeroMetaItem>
                )}
                {visit.mileageAtArrival != null && (
                  <VHeroMetaItem>
                    <VHeroMetaLabel><Gauge />Przebieg</VHeroMetaLabel>
                    <VHeroMetaValue>{visit.mileageAtArrival.toLocaleString('pl-PL')} km</VHeroMetaValue>
                  </VHeroMetaItem>
                )}
                <VHeroMetaItem>
                  <VHeroMetaLabel><FileText />Numer</VHeroMetaLabel>
                  <VHeroMetaValue>{visit.visitNumber ?? '—'}</VHeroMetaValue>
                </VHeroMetaItem>
              </VHeroMeta>
            </VHero>

            {/* Price summary */}
            <VPriceBand>
              <VPriceTile>
                <VPriceTileLabel>Wartość netto</VPriceTileLabel>
                <VPriceTileValue>{formatCurrency(netTotal)}</VPriceTileValue>
              </VPriceTile>
              <VPriceTile>
                <VPriceTileLabel>VAT</VPriceTileLabel>
                <VPriceTileValue>{formatCurrency(vatTotal)}</VPriceTileValue>
              </VPriceTile>
              <VPriceTile $accent>
                <VPriceTileLabel>Wartość brutto</VPriceTileLabel>
                <VPriceTileValue $accent>{formatCurrency(grossTotal)}</VPriceTileValue>
              </VPriceTile>
            </VPriceBand>

            {/* Services */}
            {services.length > 0 && (
              <div>
                <VSectionLabel><Wrench />Zakres usług</VSectionLabel>
                <VServicesCard>
                  <VSvcHead>
                    <VSvcHeadCell>Usługa</VSvcHeadCell>
                    <VSvcHeadCell $right>Netto</VSvcHeadCell>
                    <VSvcHeadCell $right>VAT</VSvcHeadCell>
                    <VSvcHeadCell $right>Brutto</VSvcHeadCell>
                  </VSvcHead>
                  {services.map(svc => (
                    <VSvcRow key={svc.id}>
                      <VSvcNameWrap>
                        <VSvcName>{svc.serviceName}</VSvcName>
                        {svc.note && <VSvcNote>{svc.note}</VSvcNote>}
                      </VSvcNameWrap>
                      <VSvcCell className="net" $muted>{formatCurrency(svc.finalPriceNet)}</VSvcCell>
                      <VSvcCell className="vat" $muted>{svc.vatRate < 0 ? 'zw.' : `${svc.vatRate}%`}</VSvcCell>
                      <VSvcCell>{formatCurrency(svc.finalPriceGross)}</VSvcCell>
                    </VSvcRow>
                  ))}
                </VServicesCard>
              </div>
            )}

            {/* Notes */}
            <div>
              <VSectionLabel><StickyNote />Notatki z realizacji</VSectionLabel>
              {visit.technicalNotes && visit.technicalNotes.trim() ? (
                <VNoteCard>{visit.technicalNotes}</VNoteCard>
              ) : (
                <VEmptyState>Brak notatek przypisanych do tej wizyty</VEmptyState>
              )}
            </div>

            {/* Photos */}
            <div>
              <VSectionLabel>
                <Camera />Galeria zdjęć
                {!isPhotosLoading && photos.length > 0 && (
                  <span style={{ fontWeight: 600, color: st.textMuted }}>· {photos.length}</span>
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
                <VEmptyState>Brak zdjęć przypisanych do tej wizyty</VEmptyState>
              )}
            </div>

            {/* Customer */}
            {visit.customer && (
              <div>
                <VSectionLabel><User />Klient</VSectionLabel>
                <VPartyCard>
                  <VPartyAvatar>{custInitials}</VPartyAvatar>
                  <VPartyInfo>
                    <VPartyName>{customerName ?? '—'}</VPartyName>
                    <VPartyMeta>
                      {visit.customer.phone && <span>{visit.customer.phone}</span>}
                      {visit.customer.email && <span>{visit.customer.email}</span>}
                      {visit.customer.stats && (
                        <VPartyStat>
                          {visit.customer.stats.totalVisits} wiz. · {formatCurrency(visit.customer.stats.totalSpent.grossAmount)}
                        </VPartyStat>
                      )}
                    </VPartyMeta>
                  </VPartyInfo>
                  <VProfileBtn type="button" onClick={() => goTo(`/customers/${visit.customer.id}`)}>
                    Profil <ArrowUpRight />
                  </VProfileBtn>
                </VPartyCard>
              </div>
            )}

            {/* Actions */}
            <VFooter>
              {visit.vehicle && (
                <VProfileBtn type="button" onClick={() => goTo(`/vehicles/${visit.vehicle.id}`)}>
                  <Car /> Profil pojazdu
                </VProfileBtn>
              )}
              <VPrimaryBtn type="button" onClick={() => goTo(`/visits/${visit.id}`)}>
                Przejdź do wizyty <ArrowRight />
              </VPrimaryBtn>
            </VFooter>
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

// ─── Related visit card (reference realisation) ───────────────────────────────

interface RelatedVisitCardProps {
  visitId: string;
  fallbackTitle: string | null;
  showPhotos: boolean;
  onOpen: (visitId: string) => void;
}

const RV_MAX_CHIPS = 3;

const RelatedVisitCard: React.FC<RelatedVisitCardProps> = ({ visitId, fallbackTitle, showPhotos, onOpen }) => {
  // Reuse the exact query keys of VisitPreviewModal so opening the preview is a cache hit.
  const { data: detailData, isLoading, isError } = useQuery({
    queryKey: ['visit-preview', visitId],
    queryFn: () => visitApi.getVisitDetail(visitId),
    staleTime: 60_000,
  });
  const { data: photosData } = useQuery({
    queryKey: ['visit-photos-preview', visitId],
    queryFn: () => visitApi.getVisitPhotos(visitId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <RVSkeleton>
        {showPhotos && (
          <SkeletonPulse $h="0" style={{ aspectRatio: '16 / 10', height: 'auto', borderRadius: 0 }} />
        )}
        <div style={{ padding: '12px 14px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <SkeletonPulse $w="70%" $h="14px" />
          <SkeletonPulse $w="45%" $h="11px" />
          <SkeletonPulse $w="90%" $h="22px" />
        </div>
      </RVSkeleton>
    );
  }

  if (isError || !detailData?.visit) {
    return (
      <RVErrorCard>
        <AlertCircle />
        <span>{fallbackTitle ?? 'Wizyta jest niedostępna'}</span>
      </RVErrorCard>
    );
  }

  const visit = detailData.visit;
  const photos = photosData?.photos ?? [];
  const cover = photos[0];

  const vehicleLabel = visit.vehicle
    ? `${visit.vehicle.brand} ${visit.vehicle.model}`.trim()
    : (fallbackTitle ?? 'Wizyta');
  const vehicleYear = visit.vehicle?.yearOfProduction;

  const services = visit.services ?? [];
  const shownServices = services.slice(0, RV_MAX_CHIPS);
  const extraCount = services.length - shownServices.length;

  const dateLabel = visit.scheduledDate
    ? new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(visit.scheduledDate))
    : null;

  const metaParts = [dateLabel, visit.visitNumber ? `Wizyta ${visit.visitNumber}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <RVCard type="button" onClick={() => onOpen(visitId)} title="Zobacz szczegóły wizyty i zdjęcia">
      <RVCoverCollapse $open={showPhotos}>
        <RVCoverClip>
          <RVCover>
            {cover ? (
              <img src={cover.thumbnailUrl} alt={vehicleLabel} loading="lazy" />
            ) : (
              <RVCoverPlaceholder>
                <Camera />
                Brak zdjęć
              </RVCoverPlaceholder>
            )}
            {photos.length > 0 && (
              <RVPhotoBadge><Camera />{photos.length}</RVPhotoBadge>
            )}
          </RVCover>
        </RVCoverClip>
      </RVCoverCollapse>

      <RVBody>
        <RVHeadRow>
          <RVVehicle>{vehicleLabel}{vehicleYear ? ` · ${vehicleYear}` : ''}</RVVehicle>
          {visit.status && (
            <RVStatusInline>
              <VStatusBadge $status={visit.status}>{VStatusLabel[visit.status] ?? visit.status}</VStatusBadge>
            </RVStatusInline>
          )}
        </RVHeadRow>
        {metaParts && <RVMeta><Calendar />{metaParts}</RVMeta>}

        {services.length > 0 && (
          <RVChips>
            {shownServices.map(svc => (
              <RVChip key={svc.id} title={svc.serviceName}>{svc.serviceName}</RVChip>
            ))}
            {extraCount > 0 && <RVChipMore>+{extraCount}</RVChipMore>}
          </RVChips>
        )}

        <RVFooter>
          <div>
            <RVPriceLabel>Wartość realizacji</RVPriceLabel>
            <RVPrice>{visit.totalCost ? formatCurrency(visit.totalCost.grossAmount) : '—'}</RVPrice>
          </div>
          <RVCta>Zobacz <ArrowRight /></RVCta>
        </RVFooter>
      </RVBody>
    </RVCard>
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

// ─── Merge dialog ─────────────────────────────────────────────────────────────

const MergeOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
`;

const MergeBox = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
`;

const MergeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${st.border};
`;

const MergeTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
  display: flex;
  align-items: center;
  gap: 7px;
  svg { width: 15px; height: 15px; color: #0ea5e9; }
`;

const MergeDesc = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  color: ${st.textMuted};
  line-height: 1.5;
`;

const MergeCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${st.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 180ms ease;
  &:hover { background: #f1f5f9; color: ${st.text}; }
  svg { width: 15px; height: 15px; }
`;

const MergeList = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const MergeRow = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  background: ${p => p.$selected ? '#f0f9ff' : 'transparent'};
  border: none;
  border-left: 3px solid ${p => p.$selected ? '#0ea5e9' : 'transparent'};
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 180ms ease;

  &:last-child { border-bottom: none; }
  &:hover { background: #f0f9ff; }
`;

const MergeRowMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const MergeLeadName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MergeLeadMeta = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 3px;
  display: flex;
  gap: 6px;
  align-items: center;
`;

const MergeStatusPill = styled.span<{ $color: string }>`
  display: inline-flex;
  padding: 1px 7px;
  border-radius: 9999px;
  background: ${p => p.$color}18;
  color: ${p => p.$color};
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
`;

const MergeRowCheck = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px; height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => p.$selected ? '#0ea5e9' : 'transparent'};
  border: 1.5px solid ${p => p.$selected ? '#0ea5e9' : st.border};
  color: #fff;
  transition: all 150ms ease;
  svg { width: 12px; height: 12px; }
`;

const MergeFooter = styled.div`
  padding: 12px 16px;
  border-top: 1px solid ${st.border};
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-shrink: 0;
`;

const MergeConfirmBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 180ms ease;
  &:hover { background: #0284c7; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  svg { width: 13px; height: 13px; }
`;

const MergeCancelBtn = styled.button`
  padding: 8px 14px;
  background: transparent;
  color: ${st.textSecondary};
  border: 1.5px solid ${st.border};
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 180ms ease;
  &:hover { background: #f1f5f9; color: ${st.text}; }
`;

const MergeEmpty = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: ${st.textMuted};
`;

const STATUS_COLORS: Record<string, string> = {
  NEW: '#dc2626', IN_PROGRESS: '#1e40af', CONFIRMED: '#166534',
  COMPLETED: '#065f46', LOST: '#4b5563', NO_SHOW: '#92400e',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nowy', IN_PROGRESS: 'W kontakcie', CONFIRMED: 'Zarezerwowany',
  COMPLETED: 'Zakończony', LOST: 'Utracony', NO_SHOW: 'Porzucony',
};

const ALL_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.IN_PROGRESS,
  LeadStatus.CONFIRMED,
  LeadStatus.COMPLETED,
  LeadStatus.LOST,
  LeadStatus.NO_SHOW,
];

interface MergeLeadDialogProps {
  sourceLeadId: string;
  contactIdentifier: string;
  onConfirm: (targetLeadId: string) => void;
  onClose: () => void;
  isPending: boolean;
}

const MergeLeadDialog: React.FC<MergeLeadDialogProps> = ({
  sourceLeadId, contactIdentifier, onConfirm, onClose, isPending,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { leads, isLoading } = useLeads({
    search: contactIdentifier,
    page: 1,
    limit: 30,
  });

  const candidates = leads.filter(l => l.id !== sourceLeadId);

  return createPortal(
    <MergeOverlay onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <MergeBox>
        <MergeHeader>
          <div>
            <MergeTitle><GitMerge /> Scal z innym leadem</MergeTitle>
            <MergeDesc>
              Wybierz lead docelowy. Komentarze trafią do niego, a bieżący lead
              zostanie zamknięty jako utracony.
            </MergeDesc>
          </div>
          <MergeCloseBtn onClick={onClose}><X /></MergeCloseBtn>
        </MergeHeader>

        <MergeList>
          {isLoading ? (
            <MergeEmpty>Ładowanie…</MergeEmpty>
          ) : candidates.length === 0 ? (
            <MergeEmpty>Brak innych leadów dla tego klienta</MergeEmpty>
          ) : (
            candidates.map(lead => {
              const selected = selectedId === lead.id;
              return (
                <MergeRow
                  key={lead.id}
                  $selected={selected}
                  onClick={() => setSelectedId(selected ? null : lead.id)}
                >
                  <MergeRowMain>
                    <MergeLeadName>{lead.customerName || lead.contactIdentifier}</MergeLeadName>
                    <MergeLeadMeta>
                      <MergeStatusPill $color={STATUS_COLORS[lead.status] ?? '#64748b'}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </MergeStatusPill>
                      <span>{formatDateTime(lead.createdAt)}</span>
                    </MergeLeadMeta>
                  </MergeRowMain>
                  <MergeRowCheck $selected={selected}>
                    {selected && <Check />}
                  </MergeRowCheck>
                </MergeRow>
              );
            })
          )}
        </MergeList>

        <MergeFooter>
          <MergeCancelBtn onClick={onClose}>Anuluj</MergeCancelBtn>
          <MergeConfirmBtn
            disabled={!selectedId || isPending}
            onClick={() => selectedId && onConfirm(selectedId)}
          >
            <GitMerge />
            {isPending ? 'Scalanie…' : 'Scal leady'}
          </MergeConfirmBtn>
        </MergeFooter>
      </MergeBox>
    </MergeOverlay>,
    document.body
  );
};

// ─── Status pill + menu (header) ──────────────────────────────────────────────

const StatusWrap = styled.div`
  position: relative;
`;

const StatusPillBtn = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px 4px 11px;
  border-radius: 9999px;
  border: 1.5px solid ${p => p.$color}44;
  background: ${p => p.$color}14;
  color: ${p => p.$color};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 180ms ease;

  &:hover { background: ${p => p.$color}22; border-color: ${p => p.$color}77; }
  svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

const StatusMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 50;
  min-width: 170px;
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.14);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: ${fadeIn} 140ms ease both;
`;

const StatusMenuItem = styled.button<{ $color: string; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: ${p => p.$active ? `${p.$color}14` : 'transparent'};
  color: ${st.text};
  font-size: 12px;
  font-weight: ${p => p.$active ? 700 : 500};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover { background: ${p => p.$color}1f; }
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 8px; height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

// ─── Unified action bar ───────────────────────────────────────────────────────

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid ${st.border};
  border-radius: 12px;
`;

const ActionSpacer = styled.div`
  flex: 1 1 auto;
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: #fff;
  border: 1.5px solid ${st.border};
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  color: ${st.textSecondary};
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 180ms ease;

  &:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const ActionBtnAvatar = styled.div`
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

const DangerActionBtn = styled(ActionBtn)`
  color: #dc2626;
  border-color: #fecaca;
  &:hover { border-color: #dc2626; color: #dc2626; background: #fef2f2; }
`;

// ─── Main modal component ─────────────────────────────────────────────────────

export interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose }) => {
  const { lead: detail, isLoading: isDetailLoading } = useLead(lead?.id);
  const updateValue   = useUpdateLeadValue();
  const updateStatus  = useUpdateLeadStatus();
  const deleteLead    = useDeleteLead();
  const assignUser    = useAssignLeadUser(lead?.id ?? '');
  const setLostReason = useSetLostReason(lead?.id ?? '');
  const mergeLead     = useMergeLead();
  const { showSuccess } = useToast();
  const { user: authUser } = useAuth();

  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const [isEditingLostReason, setIsEditingLostReason] = useState(false);
  const [lostReasonDraft, setLostReasonDraft] = useState(lead?.lostReason ?? '');
  const [previewVisitId, setPreviewVisitId] = useState<string | null>(null);
  const [showVisitPhotos, setShowVisitPhotos] = useState(true);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const statusWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsEmployeePickerOpen(false);
      setIsEditingLostReason(false);
      setPreviewVisitId(null);
      setShowVisitPhotos(false);
      setIsMergeOpen(false);
      setIsStatusMenuOpen(false);
      setIsDeleteConfirmOpen(false);
      setIsOfferOpen(false);
    }
  }, [isOpen]);

  // Close status menu on outside click
  useEffect(() => {
    if (!isStatusMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusWrapRef.current && !statusWrapRef.current.contains(e.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isStatusMenuOpen]);

  const handleSplitSuccess = (_newLeadId: string) => {
    showSuccess('Komentarz wydzielony jako nowy lead');
  };

  const handleStatusChange = (status: LeadStatus) => {
    if (!lead || status === lead.status) { setIsStatusMenuOpen(false); return; }
    updateStatus.mutate(
      { id: lead.id, status },
      {
        onSuccess: () => { showSuccess('Status zaktualizowany'); setIsStatusMenuOpen(false); },
      }
    );
  };

  const handleDelete = () => {
    if (!lead) return;
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        showSuccess('Lead usunięty');
        setIsDeleteConfirmOpen(false);
        onClose();
      },
    });
  };

  const handleMergeConfirm = (targetLeadId: string) => {
    if (!lead) return;
    mergeLead.mutate(
      { sourceLeadId: lead.id, targetLeadId },
      {
        onSuccess: () => {
          showSuccess('Leady zostały scalone');
          setIsMergeOpen(false);
          onClose();
        },
      }
    );
  };

  useEffect(() => {
    setLostReasonDraft(lead?.lostReason ?? '');
  }, [lead?.lostReason]);

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

  const currentStatus = detail?.status ?? lead.status;
  const statusColor = STATUS_COLORS[currentStatus] ?? '#64748b';
  const isEmailLead = lead.source === LeadSource.EMAIL;

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
                {lead.estimationStatus === 'PENDING' && !activeQuote ? (
                  <PendingLabel>
                    <InlineSpinner />
                    Przetwarzanie...
                  </PendingLabel>
                ) : (
                  <>
                    <PriceGross>{formatCurrency(headerGross)}</PriceGross>
                    {headerNet !== null ? (
                      <PriceDetail>
                        {formatCurrency(headerNet)} netto
                        {headerVat !== null && ` · VAT ${formatCurrency(headerVat)}`}
                      </PriceDetail>
                    ) : (
                      <PriceDetail>brutto</PriceDetail>
                    )}
                  </>
                )}
              </PriceStack>

              <StatusWrap ref={statusWrapRef}>
                <StatusPillBtn
                  $color={statusColor}
                  onClick={() => setIsStatusMenuOpen(o => !o)}
                  title="Zmień status leada"
                  disabled={updateStatus.isPending}
                >
                  <StatusDot $color={statusColor} />
                  {STATUS_LABELS[currentStatus] ?? currentStatus}
                  <ChevronDown />
                </StatusPillBtn>
                {isStatusMenuOpen && (
                  <StatusMenu>
                    {ALL_STATUSES.map(s => {
                      const c = STATUS_COLORS[s] ?? '#64748b';
                      return (
                        <StatusMenuItem
                          key={s}
                          $color={c}
                          $active={s === currentStatus}
                          onClick={() => handleStatusChange(s)}
                        >
                          <StatusDot $color={c} />
                          {STATUS_LABELS[s] ?? s}
                          {s === currentStatus && <Check size={13} style={{ marginLeft: 'auto', color: c }} />}
                        </StatusMenuItem>
                      );
                    })}
                  </StatusMenu>
                )}
              </StatusWrap>
            </HeaderRight>
          </HeaderCard>

          {/* Unified action bar — assign, offer, merge, delete */}
          <ActionBar>
            <ActionBtn
              onClick={() => setIsEmployeePickerOpen(true)}
              title={assignedUserName ? 'Zmień przypisanie pracownika' : 'Przypisz pracownika'}
            >
              {assignedUserName ? (
                <>
                  <ActionBtnAvatar>{assignedUserInitials}</ActionBtnAvatar>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{assignedUserName}</span>
                </>
              ) : (
                <>
                  <UserCheck />
                  Przypisz pracownika
                </>
              )}
            </ActionBtn>

            {isEmailLead && (
              <ActionBtn onClick={() => setIsOfferOpen(true)}>
                <Mail />
                Przygotuj ofertę
              </ActionBtn>
            )}

            <ActionBtn onClick={() => setIsMergeOpen(true)}>
              <GitMerge />
              Scal z innym leadem
            </ActionBtn>

            <ActionSpacer />

            <DangerActionBtn
              onClick={() => setIsDeleteConfirmOpen(true)}
              title="Usuń leada"
            >
              <Trash2 />
              Usuń
            </DangerActionBtn>
          </ActionBar>

          {/* Initial message */}
          {lead.initialMessage && (
            <PanelSection>
              <PanelLabel>Wiadomość od klienta</PanelLabel>
              <MessageBox>{lead.initialMessage}</MessageBox>
            </PanelSection>
          )}

          {/* Lost reason */}
          {currentStatus === LeadStatus.LOST && (
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
              ) : lead.estimationStatus === 'PENDING' && !estimation ? (
                <NoEstBox>
                  <PendingLabel>
                    <InlineSpinner />
                    System przetwarza zapytanie...
                  </PendingLabel>
                </NoEstBox>
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

          {/* Related visits — reference realisations */}
          {!isDetailLoading && (
            <PanelSection>
              <RelatedVisitsHeader>
                <RelatedVisitsTitle><History /> Podobne realizacje</RelatedVisitsTitle>
                {relatedVisits.length > 0 && (
                  <PhotoToggle
                    type="button"
                    $active={showVisitPhotos}
                    onClick={() => setShowVisitPhotos(v => !v)}
                  >
                    <Images />
                    {showVisitPhotos ? 'Ukryj zdjęcia' : 'Pokaż zdjęcia'}
                    <ChevronDown className="chev" />
                  </PhotoToggle>
                )}
              </RelatedVisitsHeader>
              {relatedVisits.length > 0 ? (
                <RelatedVisitsGrid>
                  {relatedVisits.map(rv => (
                    <RelatedVisitCard
                      key={rv.id}
                      visitId={rv.id}
                      fallbackTitle={rv.title}
                      showPhotos={showVisitPhotos}
                      onOpen={setPreviewVisitId}
                    />
                  ))}
                </RelatedVisitsGrid>
              ) : (
                <NoEstBox>
                  Nie znaleziono wykonanych usług dla tego modelu pojazdu w przeszłości
                </NoEstBox>
              )}
            </PanelSection>
          )}

          {/* Comments & history */}
          <div style={{ borderTop: `1px solid ${st.border}`, paddingTop: 16 }}>
            <LeadThread
              leadId={lead.id}
              onSplitSuccess={handleSplitSuccess}
            />
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

      {isMergeOpen && lead && (
        <MergeLeadDialog
          sourceLeadId={lead.id}
          contactIdentifier={lead.contactIdentifier}
          onConfirm={handleMergeConfirm}
          onClose={() => setIsMergeOpen(false)}
          isPending={mergeLead.isPending}
        />
      )}

      {isOfferOpen && (
        <OfferComposerModal lead={lead} onClose={() => setIsOfferOpen(false)} />
      )}

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        title="Usuń leada"
        message={`Czy na pewno chcesz usunąć leada „${lead.customerName || lead.contactIdentifier}"? Tej operacji nie można cofnąć.`}
        variant="danger"
        confirmText={deleteLead.isPending ? 'Usuwanie…' : 'Usuń'}
        cancelText="Anuluj"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );
};
