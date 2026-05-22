import styled, { keyframes, css } from 'styled-components';
import { useState } from 'react';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
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
    const [editedPrices, setEditedPrices] = useState<Record<string, { basePriceNet: number; adjustment: { type: 'SET_NET' | 'SET_GROSS'; value: number } }>>({}); // id → price override

    const epln = (c: number) => c / 100;
    const eCents = (v: number) => Math.round(v * 100);
    const eGrossFromNet = (net: number, vat: number) => net * (1 + vat / 100);
    const eNetFromGross = (gross: number, vat: number) => gross / (1 + vat / 100);
    const eFmt = (v: number) => v.toFixed(2);
    const eParse = (raw: string) => { const v = parseFloat(raw.replace(',', '.')); return isNaN(v) || v < 0 ? null : v; };

    const startEditPrice = (service: ServiceLineItem) => {
        const pricing = calculateServicePrice(service);
        const netCents = editedPrices[service.id]?.basePriceNet ?? pricing.finalPriceNet;
        const netPln = epln(netCents);
        setEditingId(service.id);
        setEditNetStr(eFmt(netPln));
        setEditGrossStr(eFmt(eGrossFromNet(netPln, service.vatRate)));
    };

    const confirmEditPrice = (serviceId: string) => {
        const net = eParse(editNetStr);
        const gross = eParse(editGrossStr);
        if (net !== null) {
            const adjustment = editLastField === 'gross' && gross !== null
                ? { type: 'SET_GROSS' as const, value: eCents(gross) }
                : { type: 'SET_NET' as const, value: eCents(net) };
            setEditedPrices(prev => ({ ...prev, [serviceId]: { basePriceNet: eCents(net), adjustment } }));
        }
        setEditingId(null);
    };

    const cancelEditPrice = () => setEditingId(null);

    const handleEditNetChange = (val: string, vatRate: number) => {
        if (val && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(val)) return;
        setEditLastField('net');
        setEditNetStr(val);
        const n = eParse(val);
        if (n !== null) setEditGrossStr(eFmt(eGrossFromNet(n, vatRate)));
    };

    const handleEditGrossChange = (val: string, vatRate: number) => {
        if (val && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(val)) return;
        setEditLastField('gross');
        setEditGrossStr(val);
        const g = eParse(val);
        if (g !== null) setEditNetStr(eFmt(eNetFromGross(g, vatRate)));
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
            updated: Object.entries(editedPrices).map(([serviceLineItemId, { basePriceNet, adjustment }]) => ({
                serviceLineItemId,
                basePriceNet,
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
                const net = editedPrices[service.id].basePriceNet;
                const gross = Math.round(net * (1 + service.vatRate / 100));
                totalFinalNet += net;
                totalFinalGross += gross;
                totalVat += Math.max(gross - net, 0);
                totalOriginalGross += gross;
            } else {
                const pricing = calculateServicePrice(service);
                totalFinalNet += pricing.finalPriceNet;
                totalFinalGross += pricing.finalPriceGross;
                totalVat += pricing.vatAmount;
                totalOriginalGross += pricing.originalPriceGross;
            }
        });

        newRows.filter(r => r.serviceName.trim()).forEach(r => {
            const gross = Math.round(r.basePriceNet * (1 + r.vatRate / 100));
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
                    <AddBtn onClick={addNewRow} disabled={isSaving}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Dodaj usługę
                    </AddBtn>
                )}
            </TableHeader>

            <Table>
                <Thead>
                    <Tr>
                        <Th>Usługa</Th>
                        <Th>Cena netto</Th>
                        <Th>VAT</Th>
                        <Th>Cena brutto</Th>
                        {showActionsCol && <Th style={{ textAlign: 'right' }}>Akcje</Th>}
                    </Tr>
                </Thead>
                <Tbody>
                    {services.map(service => {
                        const pricing = calculateServicePrice(service);
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
                                            <ServiceName>{service.serviceName}</ServiceName>
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
                                                        onChange={e => handleEditNetChange(e.target.value, service.vatRate)}
                                                        onKeyDown={e => { if (e.key === 'Enter') confirmEditPrice(service.id); if (e.key === 'Escape') cancelEditPrice(); }}
                                                        autoFocus
                                                        placeholder="0.00"
                                                    />
                                                );
                                            }
                                            if (hasEditedPrice) {
                                                return (
                                                    <EditedPriceWrap>
                                                        <PriceValue>{formatCurrency(editedPrices[service.id].basePriceNet / 100)}</PriceValue>
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
                                    <PriceValue>{service.vatRate}%</PriceValue>
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
                                                        onChange={e => handleEditGrossChange(e.target.value, service.vatRate)}
                                                        onKeyDown={e => { if (e.key === 'Enter') confirmEditPrice(service.id); if (e.key === 'Escape') cancelEditPrice(); }}
                                                        placeholder="0.00"
                                                    />
                                                );
                                            }
                                            if (hasEditedPrice) {
                                                const editedGross = Math.round(editedPrices[service.id].basePriceNet * (1 + service.vatRate / 100));
                                                return (
                                                    <EditedPriceWrap>
                                                        <PriceValue>{formatCurrency(editedGross / 100)}</PriceValue>
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
