import styled, { keyframes, css } from 'styled-components';
import { useState } from 'react';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import { netPlnToGrossPln, grossPlnToNetPln, netToGross, applyAdjustment, distributeAdjustment } from '@/common/utils/priceAdjustment';
import type { AdjustmentType } from '@/common/utils/priceAdjustment';
import { formatCurrency } from '@/common/utils';
import type { ServiceLineItem, VisitStatus } from '../types';
import type { ServicesChangesPayload } from '../types';
import { useApproveServiceChange, useRejectServiceChange, useSaveServicesChanges } from '../hooks';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ServiceInlineRow } from './ServiceInlineRow';
import type { NewRow } from './ServiceInlineRow';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';

const pendingPulse = keyframes`
    0%   { background-color: rgba(245,158,11,0.04); }
    50%  { background-color: rgba(245,158,11,0.18); }
    100% { background-color: rgba(245,158,11,0.04); }
`;

const TableContainer = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};

    @media (max-width: 640px) {
        border-radius: 10px;
    }
`;

const TableHeader = styled.div`
    padding: 16px 20px;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
`;

const TableHeaderLeft = styled.div``;

const TableTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    letter-spacing: -0.2px;
    color: ${st.text};
`;

const TableSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const BulkVatTrigger = styled.button`
    display: inline-flex;
    align-items: center;
    padding: 0;
    margin-left: 3px;
    background: transparent;
    color: ${st.textMuted};
    border: none;
    cursor: pointer;
    opacity: 0.5;
    vertical-align: middle;
    line-height: 1;

    svg { width: 9px; height: 9px; display: block; }
    &:hover:not(:disabled) { opacity: 1; }
    &:disabled { opacity: 0.2; cursor: not-allowed; }
`;

const AddBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: ${st.bgCard};
    color: ${st.textSecondary};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    box-shadow: ${st.shadowXs};

    svg { width: 13px; height: 13px; }

    &:hover:not(:disabled) {
        border-color: ${BRAND};
        color: ${BRAND};
        background: ${BRAND_DIM};
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    @media (max-width: 640px) {
        width: 100%;
        justify-content: center;
    }
`;

const DeleteRowBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    background: transparent;
    color: ${st.textMuted};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, color 150ms;
    white-space: nowrap;

    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; color: ${st.textSecondary}; }
    svg { width: 11px; height: 11px; }

    @media (max-width: 767px) { padding: 8px 14px; font-size: ${st.fontSm}; min-height: 36px; }
`;

const EditPriceBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    background: transparent;
    color: ${st.textMuted};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, color 150ms;
    white-space: nowrap;

    &:hover { background: ${BRAND_DIM}; border-color: ${BRAND}; color: ${BRAND_DARK}; }
    svg { width: 11px; height: 11px; }

    @media (max-width: 767px) { padding: 8px 14px; font-size: ${st.fontSm}; min-height: 36px; }
`;

const VatEditSelect = styled.select`
    padding: 4px 6px;
    border: 1.5px solid ${BRAND};
    border-radius: 7px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    cursor: pointer;
`;

const PriceEditInput = styled.input`
    width: 80px;
    padding: 4px 7px;
    border: 1.5px solid ${BRAND};
    border-radius: 7px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    font-feature-settings: 'tnum';
    text-align: right;
`;

const EditConfirmBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    background: #22c55e;
    color: white;
    cursor: pointer;
    transition: background 150ms;
    flex-shrink: 0;

    &:hover { background: #16a34a; }
    svg { width: 13px; height: 13px; }
`;

const EditCancelBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid ${st.border};
    border-radius: 50%;
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    flex-shrink: 0;

    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
    svg { width: 11px; height: 11px; }
`;

const EditedPriceWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const EditedBadge = styled.span`
    font-size: 10px;
    color: ${BRAND_DARK};
    font-weight: 600;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;

    @media (max-width: 767px) { display: block; }
`;

const Thead = styled.thead`
    background: ${st.bg};
    position: sticky;
    top: 0;
    z-index: 1;

    @media (max-width: 767px) { display: none; }
`;

const Th = styled.th`
    padding: 9px 16px;
    text-align: left;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 1px solid ${st.border};
`;

const ActionsCell = styled.td`
    padding: 12px 16px;
    text-align: right;

    @media (max-width: 767px) { padding: 0; }
`;

const RowActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    @media (max-width: 767px) { flex-wrap: wrap; gap: 6px; justify-content: flex-start; }
`;

const ActionMenuWrapper = styled.div`
    position: relative;
    display: inline-flex;
`;

const ActionMenuBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    background: ${st.bgCard};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    box-shadow: ${st.shadowXs};

    &:hover:not(:disabled) {
        border-color: ${BRAND};
        color: ${BRAND};
        background: ${BRAND_DIM};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    @media (max-width: 767px) { padding: 8px 14px; font-size: ${st.fontSm}; min-height: 36px; }
`;

const ContextMenu = styled.div`
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 100;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    min-width: 180px;
    overflow: hidden;
`;

const ContextMenuItem = styled.button<{ $variant?: 'danger' }>`
    display: block;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: transparent;
    text-align: left;
    font-size: ${st.fontSm};
    cursor: pointer;
    color: ${props => props.$variant === 'danger' ? st.accentRed : st.text};
    transition: background ${st.transition};

    &:hover:not(:disabled) {
        background: ${props => props.$variant === 'danger' ? st.accentRedDim : st.bg};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

// Confirm modal
const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
`;

const ModalCard = styled.div`
    width: 100%;
    max-width: 440px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 16px;
    box-shadow: ${st.shadowLg};
    overflow: hidden;

    @media (max-width: 480px) {
        margin: 16px;
        max-width: calc(100% - 32px);
        border-radius: 12px;
    }
`;

const ModalHeader = styled.div`
    padding: 20px 24px;
    border-bottom: 1px solid ${st.border};
`;

const ModalTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const ModalBody = styled.div`
    padding: 20px 24px;
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    line-height: 1.6;
`;

const ModalFooter = styled.div`
    padding: 14px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};
`;

const SecondaryBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
`;

const PrimaryBtn = styled.button<{ $danger?: boolean }>`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${props => props.$danger ? `${st.accentRed}44` : 'rgba(14,165,233,0.3)'};
    background: ${props => props.$danger ? st.accentRedDim : BRAND_DIM};
    color: ${props => props.$danger ? st.accentRed : BRAND_DARK};
    font-size: ${st.fontSm};
    font-weight: 700;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        background: ${props => props.$danger ? '#fee2e2' : 'rgba(14,165,233,0.18)'};
        transform: translateY(-1px);
    }

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Tbody = styled.tbody`
    @media (max-width: 767px) { display: block; }
`;

const Tr = styled.tr<{ $pendingOp?: 'ADD' | 'EDIT' | 'DELETE' | null; $highlight?: boolean }>`
    transition: background-color ${st.transition};
    background: ${props => props.$pendingOp === 'DELETE' ? 'rgba(239,68,68,0.04)'
        : props.$pendingOp === 'EDIT' ? 'rgba(245,158,11,0.04)'
        : props.$pendingOp === 'ADD' ? 'rgba(16,185,129,0.04)'
        : 'transparent'};

    ${props => props.$highlight && css`animation: ${pendingPulse} 0.9s ease-in-out 4;`}

    &:hover {
        background: ${props => props.$pendingOp ? 'inherit' : st.bg};
    }

    &:not(:last-child) {
        border-bottom: 1px solid ${st.border};
    }

    @media (max-width: 767px) {
        display: flex;
        flex-wrap: wrap;
        padding: 14px 16px;

        /* Usługa — full width */
        td:nth-child(1) {
            flex: 0 0 100%;
            padding: 0 0 12px;
            border-bottom: 1px dashed ${st.border};
            margin-bottom: 12px;
        }

        /* Netto */
        td:nth-child(2) {
            flex: 1;
            padding: 0;
            min-width: 0;
        }
        td:nth-child(2)::before {
            content: 'Netto';
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: ${st.textMuted};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
        }

        /* VAT */
        td:nth-child(3) {
            flex: 0 0 52px;
            padding: 0 10px;
            text-align: center;
            border-left: 1px solid ${st.border};
            border-right: 1px solid ${st.border};
        }
        td:nth-child(3)::before {
            content: 'VAT';
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: ${st.textMuted};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
            text-align: center;
        }

        /* Brutto */
        td:nth-child(4) {
            flex: 1;
            padding: 0;
            min-width: 0;
            text-align: right;
        }
        td:nth-child(4)::before {
            content: 'Brutto';
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: ${st.textMuted};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
            text-align: right;
        }

        /* Akcje */
        td:nth-child(5) {
            flex: 0 0 100%;
            padding: 10px 0 0;
            border-top: 1px dashed ${st.border};
            margin-top: 10px;
            text-align: left;
        }
    }
`;

const Td = styled.td`
    padding: 12px 16px;
    font-size: ${st.fontSm};
    color: ${st.text};

    @media (max-width: 767px) { padding: 0; }
`;

const ServiceName = styled.div`
    font-weight: 600;
    margin-bottom: 2px;
    color: ${st.text};
`;

const ServiceNote = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
`;

const PackageBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    background: rgba(37, 99, 235, 0.08);
    color: #2563eb;
    border: 1px solid rgba(37, 99, 235, 0.18);
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
`;

const PackageItems = styled.div`
    margin-top: 6px;
    background: rgba(37, 99, 235, 0.03);
    border: 1px solid rgba(37, 99, 235, 0.10);
    border-radius: 8px;
    overflow: hidden;
`;

const PackageItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-bottom: 1px solid rgba(37, 99, 235, 0.06);
    font-size: 12px;
    font-weight: 500;
    color: #475569;

    &:last-child { border-bottom: none; }

    &::before {
        content: '';
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.35);
        flex-shrink: 0;
    }
`;

const ServiceStatusBadge = styled.div<{ $status: 'CONFIRMED' | 'PENDING' }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    background: ${props => props.$status === 'PENDING' ? st.accentAmberDim : st.accentGreenDim};
    color: ${props => props.$status === 'PENDING' ? st.accentAmber : st.accentGreen};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    margin-left: 8px;
    white-space: nowrap;
`;

const PriceStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PriceValue = styled.div<{ $strikethrough?: boolean; $secondary?: boolean }>`
    font-weight: 500;
    ${props => props.$strikethrough && `
        text-decoration: line-through;
        opacity: 0.5;
        font-size: ${st.fontXs};
    `}
    ${props => props.$secondary && `
        color: ${st.textSecondary};
        font-size: ${st.fontXs};
        font-weight: 500;
    `}
`;

const PriceLabel = styled.span`
    display: inline-block;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-left: 6px;
`;

const ChangePill = styled.span<{ $trend: 'up' | 'down' | 'neutral' }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    margin-left: 6px;
    background: ${p => p.$trend === 'up' ? st.accentRedDim : p.$trend === 'down' ? st.accentGreenDim : st.bg};
    color: ${p => p.$trend === 'up' ? st.accentRed : p.$trend === 'down' ? st.accentGreen : st.textMuted};
`;

const DiscountBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    background: ${st.accentAmberDim};
    color: ${st.accentAmber};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    margin-top: 4px;
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};

    @media (max-width: 480px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
`;

const TotalLabel = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const TotalValue = styled.span`
    font-size: 22px;
    font-weight: 800;
    color: ${BRAND_DARK};
    font-feature-settings: 'tnum';
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
`;

const TotalBreakdown = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-end;
`;

const BreakdownItem = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-feature-settings: 'tnum';
`;

const RabatujCaoscBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 700;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    box-shadow: ${st.shadowXs};

    svg { width: 13px; height: 13px; }
    &:hover:not(:disabled) { background: #fde68a; border-color: #f59e0b; transform: translateY(-1px); }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const RabatujBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    border: 1px solid #fde68a;
    border-radius: ${st.radiusFull};
    background: #fef3c7;
    color: #92400e;
    font-size: ${st.fontXs};
    font-weight: 700;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    white-space: nowrap;

    &:hover { background: #fde68a; border-color: #f59e0b; }
    svg { width: 11px; height: 11px; }

    @media (max-width: 767px) { padding: 8px 14px; font-size: ${st.fontSm}; min-height: 36px; }
`;

const DiscountModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

const DiscountModalCard = styled.div`
    width: min(400px, calc(100vw - 32px));
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0,0,0,0.06);
`;

const DiscountModalHeader = styled.div`
    padding: 16px 20px 12px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const DiscountModalTitle = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const DiscountModalSubtitle = styled.p`
    margin: 2px 0 0;
    font-size: 12px;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
`;

const DiscountModalBody = styled.div`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const DiscountModalFooter = styled.div`
    padding: 12px 20px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
`;

const DiscountFromBox = styled.div`
    padding: 10px 14px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
`;

const DiscountFromBoxLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
`;

const DiscountFromPrices = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const DiscountFromPrice = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DiscountFromPriceValue = styled.span`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
`;

const DiscountFromPriceLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const DiscountSectionLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
`;

const DiscountTypeRow = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const DiscountTypePill = styled.button<{ $selected?: boolean }>`
    padding: 3px 9px;
    font-size: 11px;
    font-weight: ${p => p.$selected ? 700 : 500};
    color: ${p => p.$selected ? '#92400e' : '#78716c'};
    background: ${p => p.$selected ? '#fde68a' : '#f5f5f4'};
    border: 1.5px solid ${p => p.$selected ? '#f59e0b' : '#e7e5e4'};
    border-radius: 6px;
    cursor: pointer;
    transition: all 120ms ease;
    white-space: nowrap;
    font-family: inherit;
    &:hover { background: #fde68a; color: #92400e; border-color: #f59e0b; }
`;

const DiscountValueRow = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
`;

const DiscountValueInput = styled.input`
    width: 110px;
    padding: 5px 8px;
    font-size: 13px;
    font-weight: 500;
    text-align: right;
    background: #ffffff;
    border: 1.5px solid #f59e0b;
    border-radius: 8px;
    color: #0f172a;
    outline: none;
    font-family: inherit;
    transition: all 150ms ease;
    &:focus { box-shadow: 0 0 0 2px rgba(245,158,11,0.20); }
    &::placeholder { color: #d1cdc7; }
`;

const DiscountValueSuffix = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
    min-width: 20px;
`;

const DiscountCloseBtn = styled.button`
    flex-shrink: 0;
    padding: 4px;
    color: #94a3b8;
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;
    &:hover { color: #ef4444; background: #fef2f2; }
    svg { width: 14px; height: 14px; }
`;

const DiscountApplyBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    background: #d97706;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms ease;
    &:hover { background: #b45309; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DiscountCancelBtn = styled.button`
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    background: transparent;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    &:hover { background: #f1f5f9; }
`;

const DiscountRemoveBtn = styled.button`
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    background: transparent;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    margin-right: auto;
    transition: all 150ms ease;
    &:hover { color: #ef4444; border-color: #fca5a5; background: #fef2f2; }
`;

const DISCOUNT_TYPES: { type: AdjustmentType; label: string }[] = [
    { type: 'PERCENT', label: '%' },
    { type: 'FIXED_NET', label: '−Netto' },
    { type: 'FIXED_GROSS', label: '−Brutto' },
    { type: 'SET_NET', label: '=Netto' },
    { type: 'SET_GROSS', label: '=Brutto' },
];

const MAX_2_DECIMALS = /^\d*[.,]?\d{0,2}$/;

const DraftBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    background: rgba(14, 165, 233, 0.05);
    border-top: 1px solid rgba(14, 165, 233, 0.18);

    @media (max-width: 560px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const DraftBarCheckboxes = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
`;

const DraftBarLabel = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${st.fontSm};
    color: ${p => p.$disabled ? st.textMuted : st.textSecondary};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    user-select: none;
    opacity: ${p => p.$disabled ? 0.5 : 1};
    transition: opacity 150ms, color 150ms;

    input[type='checkbox'] {
        width: 14px;
        height: 14px;
        accent-color: ${BRAND};
        cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    }
`;

const DraftBarActions = styled.div`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
`;

const DraftBarSmsWrap = styled.div`
    flex: 1;
    min-width: 0;
`;

const DiscardBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const AcceptBtn = styled.button`
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    border: none;
    background: ${BRAND};
    color: white;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover:not(:disabled) {
        background: ${BRAND_DARK};
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
        transform: translateY(-1px);
    }

    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

interface ServicesTableProps {
    services: ServiceLineItem[];
    visitStatus?: VisitStatus;
    visitId?: string;
    highlightPending?: boolean;
}

export const ServicesTable = ({ services, visitStatus, visitId, highlightPending }: ServicesTableProps) => {
    const { calculateServicePrice } = useServicePricing();
    const { saveServicesChanges, isSaving } = useSaveServicesChanges(visitId ?? '');
    const smsFeature = useFeature('SMS_EMAIL');

    /* ── Per-service approve/reject menu ── */
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<null | 'approve' | 'reject'>(null);
    const [targetService, setTargetService] = useState<ServiceLineItem | null>(null);

    /* ── Draft / inline-edit state ── */
    const [newRows, setNewRows] = useState<NewRow[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [notifyCustomer, setNotifyCustomer] = useState(true);
    const [requireConfirmation, setRequireConfirmation] = useState(false);
    const [isQuickServiceOpen, setIsQuickServiceOpen] = useState(false);
    const [quickServicePrefill, setQuickServicePrefill] = useState('');
    const [quickServiceDraftId, setQuickServiceDraftId] = useState<string | null>(null);

    /* ── Price editing state ── */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNetStr, setEditNetStr] = useState('');
    const [editGrossStr, setEditGrossStr] = useState('');
    const [editLastField, setEditLastField] = useState<'net' | 'gross'>('gross');
    const [editedPrices, setEditedPrices] = useState<Record<string, { basePriceNet: number; vatRate: number; adjustment: { type: AdjustmentType; value: number } }>>({}); // id → price override
    const [editVatRate, setEditVatRate] = useState<number>(23);

    /* ── Per-service discount modal ── */
    const [discountModalId, setDiscountModalId] = useState<string | null>(null);
    const [discountModalType, setDiscountModalType] = useState<AdjustmentType>('PERCENT');
    const [discountModalValue, setDiscountModalValue] = useState('');
    // Snapshot of basePriceNet/vatRate at modal open time (may differ from state if just-edited)
    const [discountModalBase, setDiscountModalBase] = useState<{ basePriceNet: number; vatRate: number } | null>(null);

    /* ── Bulk discount modal ── */
    const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
    const [bulkDiscountType, setBulkDiscountType] = useState<AdjustmentType>('PERCENT');
    const [bulkDiscountValue, setBulkDiscountValue] = useState('');
    const [bulkDiscountConflictOpen, setBulkDiscountConflictOpen] = useState(false);
    const [bulkDiscountUseEdited, setBulkDiscountUseEdited] = useState(false);

    /* ── Bulk VAT modal ── */
    const [bulkVatOpen, setBulkVatOpen] = useState(false);
    const [bulkVatRate, setBulkVatRate] = useState<number>(23);

    const epln = (c: number) => c / 100;
    const eCents = (v: number) => Math.round(v * 100);
    const eGrossFromNet = netPlnToGrossPln;
    const eNetFromGross = grossPlnToNetPln;
    const eFmt = (v: number) => v.toFixed(2);
    const eParse = (raw: string) => { const v = parseFloat(raw.replace(',', '.')); return isNaN(v) || v < 0 ? null : v; };

    const startEditPrice = (service: ServiceLineItem) => {
        const ep = editedPrices[service.id];
        let netCents: number;
        let vatRate: number;
        if (ep) {
            // Show current effective price (after adjustment), not the stored base
            const { finalNetCents } = applyAdjustment(ep.basePriceNet, ep.vatRate, ep.adjustment);
            netCents = finalNetCents;
            vatRate = ep.vatRate;
        } else {
            const pricing = calculateServicePrice(service);
            netCents = pricing.finalPriceNet;
            vatRate = service.vatRate;
        }
        const netPln = epln(netCents);
        setEditingId(service.id);
        setEditVatRate(vatRate);
        setEditNetStr(eFmt(netPln));
        setEditGrossStr(eFmt(eGrossFromNet(netPln, vatRate)));
    };

    const confirmEditPrice = (serviceId: string) => {
        const net = eParse(editNetStr);
        const gross = eParse(editGrossStr);
        if (net !== null) {
            const adjustment = editLastField === 'gross' && gross !== null
                ? { type: 'SET_GROSS' as const, value: eCents(gross) }
                : { type: 'SET_NET' as const, value: eCents(net) };
            // Always preserve the original server basePriceNet so the "before discount" price stays correct
            const service = services.find(s => s.id === serviceId);
            const originalBaseNet = service?.basePriceNet ?? eCents(net);
            setEditedPrices(prev => ({ ...prev, [serviceId]: { basePriceNet: originalBaseNet, vatRate: editVatRate, adjustment } }));
        }
        setEditingId(null);
    };

    const handleEditVatChange = (vat: number) => {
        setEditVatRate(vat);
        const net = eParse(editNetStr);
        if (net !== null) setEditGrossStr(eFmt(eGrossFromNet(net, vat)));
    };

    const cancelEditPrice = () => setEditingId(null);

    /* ── Discount helpers ── */
    const openDiscountModal = (service: ServiceLineItem) => {
        // Base is ALWAYS the original service price — discounts stack/replace on top of it,
        // never compound on a previously-discounted value.
        const originalBase = { basePriceNet: service.basePriceNet, vatRate: service.vatRate };
        const existing = editedPrices[service.id];
        const adj = existing?.adjustment ?? service.adjustment;
        const isInlinePriceEdit = adj.type === 'SET_NET' || adj.type === 'SET_GROSS';
        setDiscountModalId(service.id);
        setDiscountModalBase(originalBase);
        setDiscountModalType(isInlinePriceEdit ? 'PERCENT' : adj.type);
        setDiscountModalValue(
            isInlinePriceEdit || adj.value === 0 ? ''
                : adj.type === 'PERCENT'
                    ? String(Math.abs(adj.value))
                    : String(adj.value / 100)
        );
    };

    const closeDiscountModal = () => { setDiscountModalId(null); setDiscountModalValue(''); setDiscountModalBase(null); };

    const applyServiceDiscount = () => {
        if (!discountModalId || !discountModalBase) return;
        const val = parseFloat(discountModalValue.replace(',', '.'));
        const storeVal = isNaN(val) ? 0
            : discountModalType === 'PERCENT' ? -Math.abs(val) : Math.round(val * 100);
        // Preserve original basePriceNet so future discounts always re-base from it
        setEditedPrices(prev => ({
            ...prev,
            [discountModalId]: { ...discountModalBase, adjustment: { type: discountModalType, value: storeVal } },
        }));
        closeDiscountModal();
    };

    const removeServiceDiscount = () => {
        if (!discountModalId || !discountModalBase) return;
        setEditedPrices(prev => ({
            ...prev,
            [discountModalId]: { ...discountModalBase, adjustment: { type: 'PERCENT', value: 0 } },
        }));
        closeDiscountModal();
    };

    const applyBulkDiscount = () => {
        const val = parseFloat(bulkDiscountValue.replace(',', '.'));
        if (isNaN(val) || val <= 0) return;
        const valueInCents = bulkDiscountType === 'PERCENT' ? val : Math.round(val * 100);
        const eligible = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')));

        if (bulkDiscountUseEdited) {
            // Distribute against current effective prices (respecting manual edits),
            // but preserve original basePriceNet — store result as SET_NET.
            const effectiveBases = eligible.map(s => {
                const ep = editedPrices[s.id];
                if (ep) {
                    const { finalNetCents } = applyAdjustment(ep.basePriceNet, ep.vatRate, ep.adjustment);
                    return { basePriceNetCents: finalNetCents, vatRate: ep.vatRate };
                }
                return { basePriceNetCents: s.basePriceNet, vatRate: s.vatRate };
            });
            const adjustments = distributeAdjustment(effectiveBases, bulkDiscountType, valueInCents);
            setEditedPrices(prev => {
                const next = { ...prev };
                eligible.forEach((s, i) => {
                    const vatRate = editedPrices[s.id]?.vatRate ?? s.vatRate;
                    const { finalNetCents } = applyAdjustment(effectiveBases[i].basePriceNetCents, vatRate, adjustments[i]);
                    next[s.id] = {
                        basePriceNet: s.basePriceNet, // always keep original base
                        vatRate,
                        adjustment: { type: 'SET_NET', value: Math.max(0, finalNetCents) },
                    };
                });
                return next;
            });
        } else {
            const bases = eligible.map(s => ({ basePriceNetCents: s.basePriceNet, vatRate: s.vatRate }));
            const adjustments = distributeAdjustment(bases, bulkDiscountType, valueInCents);
            setEditedPrices(prev => {
                const next = { ...prev };
                eligible.forEach((s, i) => {
                    next[s.id] = {
                        basePriceNet: s.basePriceNet,
                        vatRate: s.vatRate,
                        adjustment: adjustments[i],
                    };
                });
                return next;
            });
        }

        setBulkDiscountOpen(false);
        setBulkDiscountValue('');
    };

    const openBulkDiscountModal = () => {
        const eligible = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')));
        const hasManualPriceEdits = eligible.some(s => {
            const ep = editedPrices[s.id];
            return ep && (ep.adjustment.type === 'SET_NET' || ep.adjustment.type === 'SET_GROSS');
        });
        if (hasManualPriceEdits) {
            setBulkDiscountConflictOpen(true);
        } else {
            setBulkDiscountUseEdited(false);
            setBulkDiscountValue('');
            setBulkDiscountOpen(true);
        }
    };

    const applyBulkVat = (rate: number) => {
        const eligible = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')));
        setEditedPrices(prev => {
            const next = { ...prev };
            eligible.forEach(s => {
                const ep = prev[s.id];
                const currentNet = ep
                    ? applyAdjustment(ep.basePriceNet, ep.vatRate, ep.adjustment).finalNetCents
                    : applyAdjustment(s.basePriceNet, s.vatRate, s.adjustment).finalNetCents;
                next[s.id] = {
                    basePriceNet: s.basePriceNet,
                    vatRate: rate,
                    adjustment: { type: 'SET_NET', value: currentNet },
                };
            });
            return next;
        });
        setBulkVatOpen(false);
    };

    const handleEditNetChange = (val: string) => {
        if (val && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(val)) return;
        setEditLastField('net');
        setEditNetStr(val);
        const n = eParse(val);
        if (n !== null) setEditGrossStr(eFmt(eGrossFromNet(n, editVatRate)));
    };

    const handleEditGrossChange = (val: string) => {
        if (val && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(val)) return;
        setEditLastField('gross');
        setEditGrossStr(val);
        const g = eParse(val);
        if (g !== null) setEditNetStr(eFmt(eNetFromGross(g, editVatRate)));
    };

    const addNewRow = () => {
        const draftId = `draft-${Date.now()}`;
        setNewRows(prev => [...prev, {
            draftId,
            serviceId: null,
            serviceName: '',
            basePriceNet: 0,
            vatRate: 23,
            requireManualPrice: false,
        }]);
    };

    const updateRow = (draftId: string, partial: Partial<NewRow>) => {
        setNewRows(prev => prev.map(r => r.draftId === draftId ? { ...r, ...partial } : r));
    };

    const removeRow = (draftId: string) => {
        setNewRows(prev => prev.filter(r => r.draftId !== draftId));
    };

    const toggleDelete = (serviceId: string) => {
        setDeletedIds(prev => {
            const next = new Set(prev);
            next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId);
            return next;
        });
    };

    const handleAddCustom = (draftId: string, name: string) => {
        setQuickServicePrefill(name);
        setQuickServiceDraftId(draftId);
        setIsQuickServiceOpen(true);
    };

    const handleQuickServiceCreate = (svc: { id?: string; name: string; basePriceNet: number; vatRate: number }) => {
        if (quickServiceDraftId) {
            updateRow(quickServiceDraftId, {
                serviceId: svc.id ?? null,
                serviceName: svc.name,
                basePriceNet: svc.basePriceNet,
                vatRate: svc.vatRate,
                requireManualPrice: false,
            });
        }
        setIsQuickServiceOpen(false);
        setQuickServiceDraftId(null);
    };

    const hasChanges = newRows.some(r => r.serviceName.trim()) || deletedIds.size > 0 || Object.keys(editedPrices).length > 0;

    const discardDraft = () => {
        setNewRows([]);
        setDeletedIds(new Set());
        setEditedPrices({});
        setEditingId(null);
    };

    const acceptDraft = () => {
        const validNewRows = newRows.filter(r => r.serviceName.trim());
        const effectiveNotify = smsFeature.enabled ? notifyCustomer : false;
        const payload: ServicesChangesPayload = {
            notifyCustomer: effectiveNotify,
            requireConfirmation: effectiveNotify ? requireConfirmation : false,
            added: validNewRows.map(r => ({
                serviceId: r.serviceId,
                serviceName: r.serviceName,
                basePriceNet: r.basePriceNet,
                vatRate: r.vatRate,
                adjustment: { type: 'FIXED_NET', value: 0 },
                note: '',
            })),
            updated: Object.entries(editedPrices).map(([serviceLineItemId, { basePriceNet, vatRate, adjustment }]) => ({
                serviceLineItemId,
                basePriceNet,
                vatRate,
                adjustment,
            })),
            deleted: Array.from(deletedIds).map(id => ({ serviceLineItemId: id })),
        };
        saveServicesChanges(payload, {
            onSuccess: () => { setNewRows([]); setDeletedIds(new Set()); setEditedPrices({}); },
        });
    };

    const openConfirm = (service: ServiceLineItem, action: 'approve' | 'reject') => {
        setTargetService(service);
        setConfirmAction(action);
        setIsConfirmOpen(true);
    };

    const closeConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction(null);
        setTargetService(null);
    };

    const totals = (() => {
        let totalFinalNet = 0;
        let totalFinalGross = 0;
        let totalVat = 0;
        let totalOriginalGross = 0;

        services.forEach(service => {
            if (deletedIds.has(service.id)) return;
            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceNet ?? null) !== null && (service.previousPriceGross ?? null) !== null;
            if (isEditPending) {
                const net = service.previousPriceNet as number;
                const gross = service.previousPriceGross as number;
                totalFinalNet += net;
                totalFinalGross += gross;
                totalVat += Math.max(gross - net, 0);
                totalOriginalGross += gross;
            } else if (editedPrices[service.id] !== undefined) {
                const ep = editedPrices[service.id];
                const result = applyAdjustment(ep.basePriceNet, ep.vatRate, ep.adjustment);
                const originalGross = netToGross(ep.basePriceNet, ep.vatRate);
                totalFinalNet += result.finalNetCents;
                totalFinalGross += result.finalGrossCents;
                totalVat += Math.max(result.finalGrossCents - result.finalNetCents, 0);
                totalOriginalGross += originalGross;
            } else {
                const pricing = calculateServicePrice(service);
                totalFinalNet += pricing.finalPriceNet;
                totalFinalGross += pricing.finalPriceGross;
                totalVat += pricing.vatAmount;
                totalOriginalGross += pricing.originalPriceGross;
            }
        });

        newRows.filter(r => r.serviceName.trim()).forEach(r => {
            const gross = r.vatRate <= 0 ? r.basePriceNet : Math.round(r.basePriceNet * (1 + r.vatRate / 100));
            totalFinalNet += r.basePriceNet;
            totalFinalGross += gross;
            totalVat += Math.max(gross - r.basePriceNet, 0);
            totalOriginalGross += gross;
        });

        return {
            totalFinalNet,
            totalFinalGross,
            totalVat,
            hasTotalDiscount: totalFinalGross < totalOriginalGross,
        };
    })();

    const { approveServiceChange, isApproving } = useApproveServiceChange(visitId || '');
    const { rejectServiceChange, isRejecting } = useRejectServiceChange(visitId || '');

    const canEdit = visitStatus === 'IN_PROGRESS' || visitStatus === 'READY_FOR_PICKUP';
    const hasPendingServices = services.some(s => (s.hasPendingChange ?? (s.status === 'PENDING')));
    const showActionsCol = canEdit || hasPendingServices;

    return (
        <>
        {openMenuId && (
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setOpenMenuId(null)}
            />
        )}
        <TableContainer>
            <TableHeader>
                <TableHeaderLeft>
                    <TableTitle>Wykaz usług</TableTitle>
                    <TableSubtitle>
                        {services.length} pozycji
                        {hasPendingServices && ' · Zawiera usługi oczekujące na potwierdzenie'}
                    </TableSubtitle>
                </TableHeaderLeft>
                {canEdit && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <RabatujCaoscBtn
                            onClick={openBulkDiscountModal}
                            disabled={isSaving || services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING'))).length === 0}
                            title="Zastosuj rabat do wszystkich usług"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                            </svg>
                            Rabatuj całość
                        </RabatujCaoscBtn>
                        <AddBtn onClick={addNewRow} disabled={isSaving}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Dodaj usługę
                        </AddBtn>
                    </div>
                )}
            </TableHeader>

            <Table>
                <Thead>
                    <Tr>
                        <Th>Usługa</Th>
                        <Th>Cena netto</Th>
                        <Th style={{ whiteSpace: 'nowrap' }}>
                            VAT
                            {canEdit && (
                                <BulkVatTrigger
                                    type="button"
                                    onClick={() => setBulkVatOpen(true)}
                                    disabled={isSaving || services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING'))).length === 0}
                                    title="Zmień stawkę VAT dla wszystkich usług"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </BulkVatTrigger>
                            )}
                        </Th>
                        <Th>Cena brutto</Th>
                        {showActionsCol && <Th style={{ textAlign: 'right' }}>Akcje</Th>}
                    </Tr>
                </Thead>
                <Tbody>
                    {services.map(service => {
                        const ep = editedPrices[service.id];
                        const effectiveService = ep ? { ...service, ...ep } : service;
                        const pricing = calculateServicePrice(effectiveService);
                        const showDiscount = pricing.hasDiscount && service.basePriceNet !== 0;
                        const isMarkedForDelete = deletedIds.has(service.id);
                        const isPendingRow = service.hasPendingChange ?? (service.status === 'PENDING');
                        const canDelete = canEdit && !isPendingRow && !isMarkedForDelete;
                        const isEditing = editingId === service.id;
                        const canEditPrice = canEdit && !isPendingRow && !isMarkedForDelete && !isEditing;
                        const hasEditedPrice = editedPrices[service.id] !== undefined;

                        return (
                            <Tr
                                key={service.id}
                                $pendingOp={isMarkedForDelete ? 'DELETE' : (isPendingRow ? (service.pendingOperation || 'EDIT') : null)}
                                $highlight={highlightPending && service.status === 'PENDING'}
                                style={isMarkedForDelete ? { opacity: 0.5 } : undefined}
                            >
                                <Td>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                                <ServiceName style={{ marginBottom: 0 }}>{service.serviceName}</ServiceName>
                                                {service.isPackage && <PackageBadge>Pakiet</PackageBadge>}
                                            </div>
                                            {service.isPackage && service.packageItems && service.packageItems.length > 0 && (
                                                <PackageItems>
                                                    {service.packageItems.map(item => (
                                                        <PackageItem key={item.serviceId}>{item.serviceName}</PackageItem>
                                                    ))}
                                                </PackageItems>
                                            )}
                                            {service.note && <ServiceNote>{service.note}</ServiceNote>}
                                            {showDiscount && (
                                                <DiscountBadge>{pricing.discountLabel}</DiscountBadge>
                                            )}
                                        </div>
                                        <ServiceStatusBadge $status={service.status}>
                                            {(service.hasPendingChange ?? (service.status === 'PENDING'))
                                                ? (service.pendingOperation === 'ADD' ? 'Nowa (oczekuje)'
                                                    : service.pendingOperation === 'EDIT' ? 'Edycja (oczekuje)'
                                                    : service.pendingOperation === 'DELETE' ? 'Usunięcie (oczekuje)'
                                                    : 'Oczekuje')
                                                : 'Potwierdzona'}
                                        </ServiceStatusBadge>
                                    </div>
                                </Td>
                                <Td>
                                    <PriceStack>
                                        {(() => {
                                            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
                                            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceNet ?? null) !== null;
                                            if (isEditPending) {
                                                const prevNet = service.previousPriceNet as number;
                                                const proposedNet = pricing.finalPriceNet;
                                                const trendNet: 'up' | 'down' | 'neutral' = proposedNet > prevNet ? 'up' : proposedNet < prevNet ? 'down' : 'neutral';
                                                return (
                                                    <>
                                                        <div>
                                                            <PriceValue>
                                                                {formatCurrency(prevNet / 100)}
                                                                <PriceLabel>Obowiązująca</PriceLabel>
                                                            </PriceValue>
                                                        </div>
                                                        <div>
                                                            <PriceValue $secondary>
                                                                {formatCurrency(proposedNet / 100)}
                                                                <PriceLabel>Proponowana</PriceLabel>
                                                                <ChangePill $trend={trendNet}>
                                                                    {trendNet === 'up' ? '▲' : trendNet === 'down' ? '▼' : '▬'}
                                                                </ChangePill>
                                                            </PriceValue>
                                                        </div>
                                                    </>
                                                );
                                            }

                                            if (isEditing) {
                                                return (
                                                    <PriceEditInput
                                                        value={editNetStr}
                                                        onChange={e => handleEditNetChange(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') confirmEditPrice(service.id); if (e.key === 'Escape') cancelEditPrice(); }}
                                                        autoFocus
                                                        placeholder="0.00"
                                                    />
                                                );
                                            }
                                            if (hasEditedPrice) {
                                                return (
                                                    <EditedPriceWrap>
                                                        {showDiscount && <PriceValue $strikethrough>{formatCurrency(pricing.originalPriceNet / 100)}</PriceValue>}
                                                        <PriceValue>{formatCurrency(pricing.finalPriceNet / 100)}</PriceValue>
                                                        <EditedBadge>Zmieniona</EditedBadge>
                                                    </EditedPriceWrap>
                                                );
                                            }
                                            return (
                                                <>
                                                    {showDiscount && (
                                                        <PriceValue $strikethrough>
                                                            {formatCurrency(pricing.originalPriceNet / 100)}
                                                        </PriceValue>
                                                    )}
                                                    <PriceValue>
                                                        {formatCurrency(pricing.finalPriceNet / 100)}
                                                    </PriceValue>
                                                </>
                                            );
                                        })()}
                                    </PriceStack>
                                </Td>
                                <Td>
                                    <PriceValue>{editedPrices[service.id]?.vatRate !== undefined
                                        ? (editedPrices[service.id].vatRate === -1 ? 'zw.' : `${editedPrices[service.id].vatRate}%`)
                                        : (service.vatRate === -1 ? 'zw.' : `${service.vatRate}%`)
                                    }</PriceValue>
                                </Td>
                                <Td>
                                    <PriceStack>
                                        {(() => {
                                            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
                                            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceGross ?? null) !== null;
                                            if (isEditPending) {
                                                const prevGross = service.previousPriceGross as number;
                                                const proposedGross = pricing.finalPriceGross;
                                                const trendGross: 'up' | 'down' | 'neutral' = proposedGross > prevGross ? 'up' : proposedGross < prevGross ? 'down' : 'neutral';
                                                return (
                                                    <>
                                                        <div>
                                                            <PriceValue>
                                                                {formatCurrency(prevGross / 100)}
                                                                <PriceLabel>Obowiązująca</PriceLabel>
                                                            </PriceValue>
                                                        </div>
                                                        <div>
                                                            <PriceValue $secondary>
                                                                {formatCurrency(proposedGross / 100)}
                                                                <PriceLabel>Proponowana</PriceLabel>
                                                                <ChangePill $trend={trendGross}>
                                                                    {trendGross === 'up' ? '▲' : trendGross === 'down' ? '▼' : '▬'}
                                                                </ChangePill>
                                                            </PriceValue>
                                                        </div>
                                                    </>
                                                );
                                            }

                                            if (isEditing) {
                                                return (
                                                    <PriceEditInput
                                                        value={editGrossStr}
                                                        onChange={e => handleEditGrossChange(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') confirmEditPrice(service.id); if (e.key === 'Escape') cancelEditPrice(); }}
                                                        placeholder="0.00"
                                                    />
                                                );
                                            }
                                            if (hasEditedPrice) {
                                                return (
                                                    <EditedPriceWrap>
                                                        {showDiscount && <PriceValue $strikethrough>{formatCurrency(pricing.originalPriceGross / 100)}</PriceValue>}
                                                        <PriceValue>{formatCurrency(pricing.finalPriceGross / 100)}</PriceValue>
                                                        <EditedBadge>Zmieniona</EditedBadge>
                                                    </EditedPriceWrap>
                                                );
                                            }
                                            return (
                                                <>
                                                    {showDiscount && (
                                                        <PriceValue $strikethrough>
                                                            {formatCurrency(pricing.originalPriceGross / 100)}
                                                        </PriceValue>
                                                    )}
                                                    <PriceValue>
                                                        {formatCurrency(pricing.finalPriceGross / 100)}
                                                    </PriceValue>
                                                </>
                                            );
                                        })()}
                                    </PriceStack>
                                </Td>
                                {showActionsCol && (
                                    <ActionsCell>
                                        <RowActions>
                                            {isEditing && (
                                                <>
                                                    <RabatujBtn
                                                        onClick={() => {
                                                            confirmEditPrice(service.id);
                                                            openDiscountModal(service);
                                                        }}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                                                        </svg>
                                                        Rabatuj
                                                    </RabatujBtn>
                                                    <EditConfirmBtn onClick={() => confirmEditPrice(service.id)} title="Zatwierdź">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </EditConfirmBtn>
                                                    <EditCancelBtn onClick={cancelEditPrice} title="Anuluj">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                    </EditCancelBtn>
                                                </>
                                            )}
                                            {isPendingRow && !isEditing && (
                                                <ActionMenuWrapper>
                                                    <ActionMenuBtn
                                                        onClick={() => setOpenMenuId(openMenuId === service.id ? null : service.id)}
                                                        disabled={!visitId || isApproving || isRejecting}
                                                    >
                                                        Podejmij akcję
                                                        <span style={{ fontSize: '9px' }}>▾</span>
                                                    </ActionMenuBtn>
                                                    {openMenuId === service.id && (
                                                        <ContextMenu>
                                                            <ContextMenuItem onClick={() => { setOpenMenuId(null); openConfirm(service, 'approve'); }}>
                                                                Zatwierdź zmianę
                                                            </ContextMenuItem>
                                                            <ContextMenuItem $variant="danger" onClick={() => { setOpenMenuId(null); openConfirm(service, 'reject'); }}>
                                                                Wycofaj zmianę
                                                            </ContextMenuItem>
                                                        </ContextMenu>
                                                    )}
                                                </ActionMenuWrapper>
                                            )}
                                            {canEditPrice && (
                                                <EditPriceBtn onClick={() => startEditPrice(service)}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                    Edytuj cenę
                                                </EditPriceBtn>
                                            )}
                                            {canDelete && (
                                                <DeleteRowBtn onClick={() => toggleDelete(service.id)}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                    Usuń
                                                </DeleteRowBtn>
                                            )}
                                            {isMarkedForDelete && (
                                                <DeleteRowBtn
                                                    style={{ borderColor: 'rgba(14,165,233,0.3)', color: BRAND_DARK, background: BRAND_DIM }}
                                                    onClick={() => toggleDelete(service.id)}
                                                >
                                                    Przywróć
                                                </DeleteRowBtn>
                                            )}
                                        </RowActions>
                                    </ActionsCell>
                                )}
                            </Tr>
                        );
                    })}
                    {newRows.map(row => (
                        <ServiceInlineRow
                            key={row.draftId}
                            row={row}
                            onUpdate={partial => updateRow(row.draftId, partial)}
                            onRemove={() => removeRow(row.draftId)}
                            onAddCustom={name => handleAddCustom(row.draftId, name)}
                        />
                    ))}
                </Tbody>
            </Table>

            <TotalRow>
                <div>
                    <TotalLabel>Razem do zapłaty</TotalLabel>
                    {totals.hasTotalDiscount && (
                        <div style={{ fontSize: st.fontXs, color: st.accentAmber, marginTop: '3px', fontWeight: 600 }}>
                            Uwzględniono rabaty
                        </div>
                    )}
                </div>
                <TotalBreakdown>
                    <BreakdownItem>Netto: {formatCurrency(totals.totalFinalNet / 100)}</BreakdownItem>
                    <BreakdownItem>VAT: {formatCurrency(totals.totalVat / 100)}</BreakdownItem>
                    <TotalValue>{formatCurrency(totals.totalFinalGross / 100)}</TotalValue>
                </TotalBreakdown>
            </TotalRow>

            {hasChanges && (
                <DraftBar>
                    <DraftBarSmsWrap>
                        <LockedSection
                            locked={!smsFeature.enabled}
                            message="Twój abonament nie obsługuje powiadomień SMS."
                        >
                            <DraftBarCheckboxes>
                                <DraftBarLabel>
                                    <input
                                        type="checkbox"
                                        checked={smsFeature.enabled ? notifyCustomer : false}
                                        onChange={e => setNotifyCustomer(e.target.checked)}
                                    />
                                    Poinformuj klienta SMS-em o zmianach
                                </DraftBarLabel>
                                <DraftBarLabel $disabled={!notifyCustomer}>
                                    <input
                                        type="checkbox"
                                        checked={notifyCustomer ? requireConfirmation : false}
                                        onChange={e => setRequireConfirmation(e.target.checked)}
                                        disabled={!notifyCustomer}
                                    />
                                    Wymagaj potwierdzenia od klienta
                                </DraftBarLabel>
                            </DraftBarCheckboxes>
                        </LockedSection>
                    </DraftBarSmsWrap>
                    <DraftBarActions>
                        <DiscardBtn onClick={discardDraft} disabled={isSaving}>
                            Odrzuć
                        </DiscardBtn>
                        <AcceptBtn onClick={acceptDraft} disabled={isSaving}>
                            {isSaving ? 'Zapisywanie…' : 'Zaakceptuj'}
                        </AcceptBtn>
                    </DraftBarActions>
                </DraftBar>
            )}
        </TableContainer>

        <div style={{ zIndex: 1100, position: 'relative' }}>
            <QuickServiceModal
                isOpen={isQuickServiceOpen}
                onClose={() => { setIsQuickServiceOpen(false); setQuickServiceDraftId(null); }}
                onServiceCreate={handleQuickServiceCreate}
                initialServiceName={quickServicePrefill}
            />
        </div>

        {/* Per-service discount modal */}
        {discountModalId && discountModalBase && (() => {
            const svc = services.find(s => s.id === discountModalId);
            if (!svc) return null;
            const result = applyAdjustment(discountModalBase.basePriceNet, discountModalBase.vatRate, { type: 'PERCENT', value: 0 });
            const baseNet = result.finalNetCents / 100;
            const baseGross = result.finalGrossCents / 100;
            const ep = editedPrices[discountModalId];
            const adj = ep?.adjustment ?? svc.adjustment;
            const hasExistingDiscount = adj.type !== 'SET_NET' && adj.type !== 'SET_GROSS' && adj.value !== 0;
            return (
                <DiscountModalOverlay onClick={closeDiscountModal}>
                    <DiscountModalCard onClick={e => e.stopPropagation()}>
                        <DiscountModalHeader>
                            <div>
                                <DiscountModalTitle>Rabat dla usługi</DiscountModalTitle>
                                <DiscountModalSubtitle>{svc.serviceName}</DiscountModalSubtitle>
                            </div>
                            <DiscountCloseBtn type="button" onClick={closeDiscountModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </DiscountCloseBtn>
                        </DiscountModalHeader>
                        <DiscountModalBody>
                            <DiscountFromBox>
                                <DiscountFromBoxLabel>Od kwoty</DiscountFromBoxLabel>
                                <DiscountFromPrices>
                                    <DiscountFromPrice>
                                        <DiscountFromPriceValue>{baseNet.toFixed(2)} zł</DiscountFromPriceValue>
                                        <DiscountFromPriceLabel>Netto</DiscountFromPriceLabel>
                                    </DiscountFromPrice>
                                    <DiscountFromPrice>
                                        <DiscountFromPriceValue>{baseGross.toFixed(2)} zł</DiscountFromPriceValue>
                                        <DiscountFromPriceLabel>Brutto</DiscountFromPriceLabel>
                                    </DiscountFromPrice>
                                </DiscountFromPrices>
                            </DiscountFromBox>
                            <div>
                                <DiscountSectionLabel>Rodzaj rabatu</DiscountSectionLabel>
                                <DiscountTypeRow>
                                    {DISCOUNT_TYPES.map(({ type, label }) => (
                                        <DiscountTypePill key={type} type="button" $selected={discountModalType === type}
                                            onClick={() => { setDiscountModalType(type); setDiscountModalValue(''); }}>
                                            {label}
                                        </DiscountTypePill>
                                    ))}
                                </DiscountTypeRow>
                            </div>
                            <div>
                                <DiscountSectionLabel>Wartość</DiscountSectionLabel>
                                <DiscountValueRow>
                                    <DiscountValueInput
                                        type="text" inputMode="decimal" placeholder="0" autoFocus
                                        value={discountModalValue}
                                        onChange={e => { if (MAX_2_DECIMALS.test(e.target.value)) setDiscountModalValue(e.target.value); }}
                                    />
                                    <DiscountValueSuffix>{discountModalType === 'PERCENT' ? '%' : 'zł'}</DiscountValueSuffix>
                                </DiscountValueRow>
                            </div>
                        </DiscountModalBody>
                        <DiscountModalFooter>
                            {hasExistingDiscount && (
                                <DiscountRemoveBtn type="button" onClick={removeServiceDiscount}>Usuń rabat</DiscountRemoveBtn>
                            )}
                            <DiscountCancelBtn type="button" onClick={closeDiscountModal}>Anuluj</DiscountCancelBtn>
                            <DiscountApplyBtn type="button" onClick={applyServiceDiscount}
                                disabled={!discountModalValue || parseFloat(discountModalValue.replace(',', '.')) <= 0}>
                                Zastosuj
                            </DiscountApplyBtn>
                        </DiscountModalFooter>
                    </DiscountModalCard>
                </DiscountModalOverlay>
            );
        })()}

        {/* Bulk VAT modal */}
        {bulkVatOpen && (
            <DiscountModalOverlay onClick={() => setBulkVatOpen(false)}>
                <DiscountModalCard onClick={e => e.stopPropagation()}>
                    <DiscountModalHeader>
                        <DiscountModalTitle>VAT dla wszystkich usług</DiscountModalTitle>
                        <DiscountCloseBtn type="button" onClick={() => setBulkVatOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </DiscountCloseBtn>
                    </DiscountModalHeader>
                    <DiscountModalBody>
                        <DiscountTypeRow>
                            {([23, 8, 5, 0, -1] as const).map(rate => (
                                <DiscountTypePill
                                    key={rate}
                                    type="button"
                                    $selected={bulkVatRate === rate}
                                    onClick={() => { setBulkVatRate(rate); applyBulkVat(rate); }}
                                >
                                    {rate === -1 ? 'zw.' : `${rate}%`}
                                </DiscountTypePill>
                            ))}
                        </DiscountTypeRow>
                    </DiscountModalBody>
                </DiscountModalCard>
            </DiscountModalOverlay>
        )}

        {/* Bulk discount modal */}
        {bulkDiscountOpen && (() => {
            const eligible = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')));
            const getEffective = (s: ServiceLineItem) => {
                const ep = editedPrices[s.id];
                if (ep && bulkDiscountUseEdited) {
                    return applyAdjustment(ep.basePriceNet, ep.vatRate, ep.adjustment);
                }
                return { finalNetCents: ep?.basePriceNet ?? s.basePriceNet, finalGrossCents: netToGross(ep?.basePriceNet ?? s.basePriceNet, ep?.vatRate ?? s.vatRate) };
            };
            const bulkBaseNet = eligible.reduce((sum, s) => sum + getEffective(s).finalNetCents, 0) / 100;
            const bulkBaseGross = eligible.reduce((sum, s) => sum + getEffective(s).finalGrossCents, 0) / 100;
            return (
                <DiscountModalOverlay onClick={() => setBulkDiscountOpen(false)}>
                    <DiscountModalCard onClick={e => e.stopPropagation()}>
                        <DiscountModalHeader>
                            <DiscountModalTitle>Rabatuj całość</DiscountModalTitle>
                            <DiscountCloseBtn type="button" onClick={() => setBulkDiscountOpen(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </DiscountCloseBtn>
                        </DiscountModalHeader>
                        <DiscountModalBody>
                            <DiscountFromBox>
                                <DiscountFromBoxLabel>Łącznie przed rabatem</DiscountFromBoxLabel>
                                <DiscountFromPrices>
                                    <DiscountFromPrice>
                                        <DiscountFromPriceValue>{bulkBaseNet.toFixed(2)} zł</DiscountFromPriceValue>
                                        <DiscountFromPriceLabel>Netto</DiscountFromPriceLabel>
                                    </DiscountFromPrice>
                                    <DiscountFromPrice>
                                        <DiscountFromPriceValue>{bulkBaseGross.toFixed(2)} zł</DiscountFromPriceValue>
                                        <DiscountFromPriceLabel>Brutto</DiscountFromPriceLabel>
                                    </DiscountFromPrice>
                                </DiscountFromPrices>
                            </DiscountFromBox>
                            <div>
                                <DiscountSectionLabel>Rodzaj rabatu</DiscountSectionLabel>
                                <DiscountTypeRow>
                                    {DISCOUNT_TYPES.map(({ type, label }) => (
                                        <DiscountTypePill key={type} type="button" $selected={bulkDiscountType === type}
                                            onClick={() => { setBulkDiscountType(type); setBulkDiscountValue(''); }}>
                                            {label}
                                        </DiscountTypePill>
                                    ))}
                                </DiscountTypeRow>
                            </div>
                            <div>
                                <DiscountSectionLabel>Wartość</DiscountSectionLabel>
                                <DiscountValueRow>
                                    <DiscountValueInput
                                        type="text" inputMode="decimal" placeholder="0" autoFocus
                                        value={bulkDiscountValue}
                                        onChange={e => { if (MAX_2_DECIMALS.test(e.target.value)) setBulkDiscountValue(e.target.value); }}
                                    />
                                    <DiscountValueSuffix>{bulkDiscountType === 'PERCENT' ? '%' : 'zł'}</DiscountValueSuffix>
                                </DiscountValueRow>
                            </div>
                        </DiscountModalBody>
                        <DiscountModalFooter>
                            <DiscountCancelBtn type="button" onClick={() => setBulkDiscountOpen(false)}>Anuluj</DiscountCancelBtn>
                            <DiscountApplyBtn type="button" onClick={applyBulkDiscount}
                                disabled={!bulkDiscountValue || parseFloat(bulkDiscountValue.replace(',', '.')) <= 0}>
                                Zastosuj
                            </DiscountApplyBtn>
                        </DiscountModalFooter>
                    </DiscountModalCard>
                </DiscountModalOverlay>
            );
        })()}

        {bulkDiscountConflictOpen && (
            <ModalOverlay onClick={() => setBulkDiscountConflictOpen(false)}>
                <ModalCard role="dialog" aria-modal="true" aria-labelledby="bulk-conflict-title" onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle id="bulk-conflict-title">Naniesione poprawki cen</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        Niektóre usługi mają ręcznie zmienione ceny lub stawki VAT. Czy rabat powinien zostać naliczony od zmienionych wartości, czy nadpisać wszystkie dotychczasowe zmiany i naliczyć od cen pierwotnych?
                    </ModalBody>
                    <ModalFooter>
                        <SecondaryBtn onClick={() => {
                            setBulkDiscountUseEdited(false);
                            setBulkDiscountConflictOpen(false);
                            setBulkDiscountValue('');
                            setBulkDiscountOpen(true);
                        }}>Nadpisz zmiany</SecondaryBtn>
                        <PrimaryBtn $danger={false} onClick={() => {
                            setBulkDiscountUseEdited(true);
                            setBulkDiscountConflictOpen(false);
                            setBulkDiscountValue('');
                            setBulkDiscountOpen(true);
                        }}>Uwzględnij poprawki</PrimaryBtn>
                    </ModalFooter>
                </ModalCard>
            </ModalOverlay>
        )}

        {isConfirmOpen && targetService && (
            <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
                <ModalCard role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                    <ModalHeader>
                        <ModalTitle id="confirm-title">
                            {confirmAction === 'approve' ? 'Potwierdź zmianę' : 'Wycofać zmianę?'}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {confirmAction === 'approve' ? (
                            <>
                                {targetService.pendingOperation === 'DELETE'
                                    ? 'Zatwierdzenie spowoduje trwałe usunięcie tej usługi z wizyty. Czy na pewno chcesz kontynuować?'
                                    : 'Zatwierdzenie zmiany spowoduje jej wejście w życie. Czy na pewno chcesz kontynuować?'}
                            </>
                        ) : (
                            <>Odrzucenie spowoduje przywrócenie ostatniego zatwierdzonego stanu tej usługi. Kontynuować?</>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <SecondaryBtn onClick={closeConfirm}>Anuluj</SecondaryBtn>
                        <PrimaryBtn
                            $danger={confirmAction === 'reject'}
                            disabled={(confirmAction === 'approve' && isApproving) || (confirmAction === 'reject' && isRejecting)}
                            onClick={() => {
                                if (!visitId || !targetService) return;
                                if (confirmAction === 'approve') {
                                    approveServiceChange(targetService.id, { onSettled: closeConfirm });
                                } else if (confirmAction === 'reject') {
                                    rejectServiceChange(targetService.id, { onSettled: closeConfirm });
                                }
                            }}
                        >
                            {confirmAction === 'approve' ? 'Zatwierdź' : 'Wycofaj'}
                        </PrimaryBtn>
                    </ModalFooter>
                </ModalCard>
            </ModalOverlay>
        )}
        </>
    );
};
