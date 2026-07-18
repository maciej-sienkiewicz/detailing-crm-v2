// src/modules/statistics/views/CostsView.tsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { ReceiptText, Package, Tag, Plus, Pencil, Trash2, X, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/common/components/PageHeader';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { StatsNav } from '../components/StatsNav';
import { st } from '../components/StatisticsTheme';
import {
    useCostCategories,
    useCreateCostCategory,
    useUpdateCostCategory,
    useDeleteCostCategory,
    useAssignCostItems,
    useUnassignCostItem,
    useCostExpenseItems,
    useCostBreakdown,
    COST_ITEMS_KEY,
    COST_BREAKDOWN_KEY,
} from '../hooks/useCostCategories';
import { costsApi } from '../api/costsApi';
import type {
    CostCategory,
    CostExpenseItem,
    CostInvoiceGroup,
    CostNameGroup,
    CostViewMode,
    CreateCostCategoryRequest,
    UpdateCostCategoryRequest,
} from '../costTypes';

// ─── Utilities ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const oneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
};
const spDaysAgo   = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const spMonthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };

const fmtPLN = (v: number) =>
    v.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 });

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: ${p => p.theme.spacing.lg};
    max-width: 1800px;
    margin: 0 auto;
    width: 100%;
    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionHeading = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.7px;
`;

const SectionRule = styled.div`
    flex: 1;
    height: 1px;
    background: ${st.border};
`;

const twoColGrid = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    @media (max-width: ${(p: any) => p.theme.breakpoints.lg}) { grid-template-columns: 1fr; }
`;

const TablesHeaderRow = styled.div`${twoColGrid} align-items: start;`;
const TablesGrid = styled.div`${twoColGrid} align-items: start;`;

const TableColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

const TableColumnHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

const TableColumnTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

// ─── KPI tiles ────────────────────────────────────────────────────────────────

const KpiRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    @media (max-width: 700px) { grid-template-columns: 1fr 1fr; }
`;

const KpiCard = styled.div<{ $accent: string }>`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px 20px 16px;
    border-top: 3px solid ${p => p.$accent};
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const KpiLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const KpiValue = styled.div`
    font-size: ${st.fontXl};
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
`;

// ─── Simple cost chart ────────────────────────────────────────────────────────

const ChartCard = styled.div`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px;
`;

const ChartTitle = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 16px;
`;

const BarsWrap = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 120px;
    overflow-x: auto;
    overflow-y: hidden;
`;

const BarItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 28px;
`;

const BarFill = styled.div<{ $h: number; $color: string }>`
    width: 100%;
    height: ${p => p.$h}px;
    min-height: 3px;
    background: ${p => p.$color};
    border-radius: 3px 3px 0 0;
    transition: height 0.3s ease;
`;

const BarLabel = styled.div`
    font-size: 10px;
    color: ${st.textMuted};
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
`;

const ChartEmpty = styled.div`
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

// ─── Categories table ─────────────────────────────────────────────────────────

const CatTable = styled.div`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CatRow = styled.div<{ $dragOver?: boolean; $selected?: boolean }>`
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};
    position: relative;

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bg}; }

    ${p => p.$selected && css`
        background: ${st.accentBlueDim} !important;
        box-shadow: inset 3px 0 0 ${st.accentBlue};
    `}

    ${p => p.$dragOver && css`
        background: ${st.accentBlueDim} !important;
        outline: 2px dashed ${st.accentBlue};
        outline-offset: -2px;
    `}
`;

const CatDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    box-shadow: 0 0 0 2px ${p => p.$color}22;
    flex-shrink: 0;
`;

const CatName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CatMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const CatActions = styled.div`
    display: flex;
    gap: 3px;
    flex-shrink: 0;
`;

const IconBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.bg}; color: ${st.text}; border-color: ${st.borderHover}; }
    svg { width: 12px; height: 12px; }
`;

const TableEmpty = styled.div`
    padding: 32px 16px;
    text-align: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const TableLoading = styled(TableEmpty)``;

const Spinner = styled.div`
    display: inline-block;
    width: 22px;
    height: 22px;
    border: 2px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Items table (right panel) ────────────────────────────────────────────────

const ItemsTable = styled.div`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const ItemsHeader = styled.div`
    display: grid;
    grid-template-columns: auto 1fr auto auto auto auto;
    gap: 8px;
    padding: 8px 14px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ItemRow = styled.div<{ $draggable?: boolean; $dimmed?: boolean; $assigned?: boolean }>`
    display: grid;
    grid-template-columns: auto 1fr auto auto auto auto;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition}, opacity 0.2s;
    cursor: ${p => p.$draggable ? 'grab' : 'default'};
    opacity: ${p => p.$dimmed ? 0.4 : 1};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.$draggable ? st.bg : 'transparent'}; }
    &:active { cursor: ${p => p.$draggable ? 'grabbing' : 'default'}; }
`;

const DragHandle = styled.span`
    color: ${st.textMuted};
    font-size: 14px;
    user-select: none;
    flex-shrink: 0;
`;

const ItemName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ItemMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const CatBadge = styled.span<{ $color?: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    background: ${p => p.$color ? `${p.$color}22` : st.accentBlueDim};
    color: ${p => p.$color ?? st.accentBlue};
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
`;

// ─── View mode switcher ───────────────────────────────────────────────────────

const ViewModeBar = styled.div`
    display: flex;
    gap: 2px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    padding: 3px;
`;

const ViewModeBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border: none;
    border-radius: ${st.radiusFull};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    background: ${p => p.$active ? '#fff' : 'transparent'};
    color: ${p => p.$active ? st.text : st.textMuted};
    box-shadow: ${p => p.$active ? st.shadowXs : 'none'};
    svg { width: 13px; height: 13px; flex-shrink: 0; }
    &:hover { color: ${p => p.$active ? st.text : st.textSecondary}; }
`;

// ─── Search bar ───────────────────────────────────────────────────────────────

const SearchInput = styled.input`
    flex: 1;
    min-width: 140px;
    padding: 6px 12px;
    background: ${st.bg};
    color: ${st.text};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-family: inherit;
    font-size: ${st.fontSm};
    transition: border-color ${st.transition};
    &::placeholder { color: ${st.textMuted}; }
    &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

// ─── Assignment filter bar ────────────────────────────────────────────────────

const FilterBar = styled.div`
    display: flex;
    gap: 2px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    padding: 3px;
    flex-shrink: 0;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
    padding: 4px 10px;
    border: none;
    border-radius: ${st.radiusFull};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    color: ${p => p.$active ? st.text : st.textMuted};
    box-shadow: ${p => p.$active ? st.shadowXs : 'none'};
    &:hover { color: ${p => p.$active ? st.text : st.textSecondary}; }
`;

// ─── Context menu ─────────────────────────────────────────────────────────────

const CtxPanel = styled.div`
    position: fixed;
    z-index: 9100;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
    min-width: 220px;
    max-width: 280px;
    padding: 4px;
    overflow: hidden;
`;

const CtxItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${p => p.$danger ? '#DC2626' : st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};
    &:hover { background: ${p => p.$danger ? '#FEF2F2' : st.bg}; }
    svg { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.6; }
`;

const CtxDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

const CtxSectionLabel = styled.div`
    padding: 4px 12px 2px;
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const CtxCatDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const KebabBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: ${st.radiusSm};
    color: ${st.textMuted};
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    transition: all ${st.transition};
    flex-shrink: 0;
    &:hover { background: ${st.bg}; border-color: ${st.border}; color: ${st.text}; }
`;

// ─── Invoice preview modal ────────────────────────────────────────────────────

const InvTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const InvTh = styled.th`
    padding: 6px 10px;
    text-align: left;
    color: ${st.textMuted};
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid ${st.border};
    white-space: nowrap;
    &:not(:first-child) { text-align: right; }
`;

const InvTd = styled.td`
    padding: 8px 10px;
    color: ${st.text};
    border-bottom: 1px solid ${st.border};
    &:not(:first-child) { text-align: right; color: ${st.textMuted}; font-variant-numeric: tabular-nums; }
    &:last-child { color: ${st.text}; font-weight: 600; }
`;

const InvMeta = styled.div`
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${st.border};
`;

const InvMetaField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const InvMetaLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const InvMetaValue = styled.div`
    font-size: ${st.fontSm};
    color: ${st.text};
    font-weight: 500;
`;

// ─── Add / action buttons ─────────────────────────────────────────────────────

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: ${st.shadowXs};
    transition: all ${st.transition};
    svg { width: 14px; height: 14px; }
    &:hover { background: #2563EB; box-shadow: ${st.shadowSm}; transform: translateY(-1px); }
    &:active { transform: translateY(0); }
`;

// ─── Date picker (reused from StatisticsView pattern) ────────────────────────

const HdrBtns = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
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
    transition: all ${st.transition};
    &:hover { background: ${p => p.$active ? 'rgba(14, 165, 233, 0.3)' : 'rgba(255, 255, 255, 0.14)'}; color: #fff; }
    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const HdrPickerPanel = styled.div`
    position: fixed;
    z-index: 9000;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 8px 32px rgba(0,0,0,0.14);
    min-width: 250px;
    padding: 8px;
`;

const HdrPresetBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    background: ${p => p.$active ? '#eff6ff' : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.text};
    border: none;
    border-radius: 6px;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => p.$active ? '600' : '500'};
    text-align: left;
    cursor: pointer;
    transition: background ${st.transition}, color ${st.transition};
    &:hover { background: ${p => p.$active ? '#dbeafe' : st.bg}; }
    span.hint { font-size: 11px; color: ${p => p.$active ? '#7dd3fc' : st.textMuted}; font-weight: 400; }
`;

const HdrDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 6px 0;
`;

const HdrDateLabel = styled.div`
    padding: 2px 10px 6px;
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const HdrRangeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 2px;
`;

const HdrDateInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    background: ${st.bg};
    color: ${st.text};
    border: 1.5px solid ${st.border};
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
    &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

const HdrApplyBtn = styled.button`
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
    &:hover { background: #2563eb; }
    &:disabled { background: #94a3b8; cursor: not-allowed; }
`;

const CalIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ChevIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

type Preset = { label: string; hint: string; startDate: string; endDate: string };
const getPresets = (): Preset[] => [
    { label: 'Ostatnie 7 dni',    hint: '7 dni',    startDate: spDaysAgo(7),    endDate: today() },
    { label: 'Ostatnie 30 dni',   hint: '30 dni',   startDate: spDaysAgo(30),   endDate: today() },
    { label: 'Ostatnie 3 miesiące', hint: '3 mies.', startDate: spMonthsAgo(3), endDate: today() },
    { label: 'Ostatnie 12 miesięcy', hint: '12 mies.', startDate: spMonthsAgo(12), endDate: today() },
];

const DatePicker = ({
    startDate, endDate, onStartChange, onEndChange,
}: {
    startDate: string; endDate: string;
    onStartChange: (d: string) => void; onEndChange: (d: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
    const [pFrom, setPFrom] = useState('');
    const [pTo, setPTo] = useState('');
    const trigRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const presets = getPresets();
    const activeIdx = presets.findIndex(p => p.startDate === startDate && p.endDate === endDate);

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
                trigRef.current && !trigRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    const handleToggle = () => {
        if (!open && trigRef.current) {
            const r = trigRef.current.getBoundingClientRect();
            setPanelPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
            setPFrom(startDate); setPTo(endDate);
        }
        setOpen(p => !p);
    };

    const label = activeIdx >= 0 ? presets[activeIdx].label : `${startDate} – ${endDate}`;

    return (
        <div style={{ position: 'relative', flexShrink: 0 }}>
            <HdrPickerTrigger ref={trigRef} $active onClick={handleToggle}>
                <CalIcon />{label}<ChevIcon />
            </HdrPickerTrigger>
            {open && panelPos && createPortal(
                <HdrPickerPanel ref={panelRef} style={{ top: panelPos.top, right: panelPos.right }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {presets.map((p, i) => (
                            <HdrPresetBtn key={p.label} $active={i === activeIdx} onClick={() => {
                                onStartChange(p.startDate); onEndChange(p.endDate); setOpen(false);
                            }}>
                                {p.label}<span className="hint">{p.hint}</span>
                            </HdrPresetBtn>
                        ))}
                    </div>
                    <HdrDivider />
                    <HdrDateLabel>Niestandardowy zakres</HdrDateLabel>
                    <HdrRangeRow>
                        <HdrDateInput type="date" value={pFrom} max={pTo || undefined} onChange={e => setPFrom(e.target.value)} />
                        <span style={{ fontSize: 12, color: st.textMuted }}>–</span>
                        <HdrDateInput type="date" value={pTo} min={pFrom || undefined} onChange={e => setPTo(e.target.value)} />
                    </HdrRangeRow>
                    <HdrApplyBtn disabled={!pFrom && !pTo} onClick={() => {
                        if (pFrom) onStartChange(pFrom);
                        if (pTo) onEndChange(pTo);
                        setOpen(false);
                    }}>Zastosuj zakres</HdrApplyBtn>
                </HdrPickerPanel>,
                document.body
            )}
        </div>
    );
};

// ─── Category form modal ──────────────────────────────────────────────────────

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.xs};
`;
const Label = styled.label`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 500;
    color: ${p => p.theme.colors.textSecondary};
`;
const FormInput = styled.input`
    padding: ${p => p.theme.spacing.sm} ${p => p.theme.spacing.md};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    transition: border-color ${p => p.theme.transitions.fast};
    &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
`;
const FormTextarea = styled.textarea`
    padding: ${p => p.theme.spacing.sm} ${p => p.theme.spacing.md};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    resize: vertical;
    min-height: 72px;
    transition: border-color ${p => p.theme.transitions.fast};
    &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
`;
const ColorPalette = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${p => p.theme.spacing.sm};
`;
const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: ${p => p.$color};
    border: 3px solid ${p => p.$selected ? p.theme.colors.text : 'transparent'};
    cursor: pointer;
    transition: transform ${p => p.theme.transitions.fast};
    &:hover { transform: scale(1.15); }
`;
const FieldError = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.error};
`;
const FormInner = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.lg};
`;

const COLOR_OPTIONS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
    '#6B7280', '#0EA5E9', '#A855F7', '#F43F5E',
];

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: CostCategory;
}

const CategoryFormModal = ({ isOpen, onClose, category }: CategoryFormModalProps) => {
    const isEdit = !!category;
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLOR_OPTIONS[4]);
    const [nameError, setNameError] = useState('');

    const createMut = useCreateCostCategory();
    const updateMut = useUpdateCostCategory();
    const isPending = createMut.isPending || updateMut.isPending;

    useEffect(() => {
        if (isOpen) {
            setName(category?.name ?? '');
            setDescription(category?.description ?? '');
            setColor(category?.color ?? COLOR_OPTIONS[4]);
            setNameError('');
        }
    }, [isOpen, category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setNameError('Nazwa kategorii jest wymagana'); return; }
        if (name.trim().length < 2) { setNameError('Nazwa musi mieć minimum 2 znaki'); return; }
        const data = { name: name.trim(), description: description.trim() || null, color };
        if (isEdit && category) {
            await updateMut.mutateAsync({ categoryId: category.id, data });
        } else {
            await createMut.mutateAsync(data);
        }
        onClose();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{isEdit ? 'Edytuj kategorię kosztów' : 'Nowa kategoria kosztów'}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <form onSubmit={handleSubmit}>
                <ModalContent>
                    <FormInner>
                        <FieldGroup>
                            <Label>Nazwa kategorii</Label>
                            <FormInput value={name} onChange={e => { setName(e.target.value); setNameError(''); }}
                                placeholder="np. Rolki folii PPF" disabled={isPending} />
                            {nameError && <FieldError>{nameError}</FieldError>}
                        </FieldGroup>
                        <FieldGroup>
                            <Label>Opis (opcjonalnie)</Label>
                            <FormTextarea value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Krótki opis tej kategorii wydatków..." disabled={isPending} />
                        </FieldGroup>
                        <FieldGroup>
                            <Label>Kolor kategorii</Label>
                            <ColorPalette>
                                {COLOR_OPTIONS.map(c => (
                                    <ColorSwatch key={c} type="button" $color={c} $selected={color === c}
                                        onClick={() => setColor(c)} disabled={isPending} />
                                ))}
                            </ColorPalette>
                        </FieldGroup>
                    </FormInner>
                </ModalContent>
                <ModalFooter>
                    <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isPending}>Anuluj</SharedButton>
                    <SharedButton $variant="primary" type="submit" disabled={isPending}>
                        {isPending ? 'Zapisywanie...' : 'Zapisz'}
                    </SharedButton>
                </ModalFooter>
            </form>
        </ModalShell>
    );
};

// ─── Confirm assign modal ─────────────────────────────────────────────────────

const ConfirmText = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.6;
`;

const ConfirmHighlight = styled.strong`
    color: ${st.accentBlue};
`;

interface ConfirmAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemCount: number;
    categoryName: string;
    isPending: boolean;
}

const ConfirmAssignModal = ({ isOpen, onClose, onConfirm, itemCount, categoryName, isPending }: ConfirmAssignModalProps) => (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="440px">
        <ModalHeader>
            <ModalTitleGroup>
                <ModalTitle>Potwierdź przypisanie</ModalTitle>
            </ModalTitleGroup>
            <CloseBtn onClick={onClose} />
        </ModalHeader>
        <ModalContent>
            <ConfirmText>
                Czy na pewno chcesz dodać wszystkie{' '}
                <ConfirmHighlight>{itemCount} {itemCount === 1 ? 'pozycję' : itemCount < 5 ? 'pozycje' : 'pozycji'}</ConfirmHighlight>
                {' '}do grupy <ConfirmHighlight>„{categoryName}"</ConfirmHighlight>?
            </ConfirmText>
        </ModalContent>
        <ModalFooter>
            <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isPending}>Anuluj</SharedButton>
            <SharedButton $variant="primary" type="button" onClick={onConfirm} disabled={isPending}>
                {isPending ? 'Przypisuję...' : 'Tak, przypisz'}
            </SharedButton>
        </ModalFooter>
    </ModalShell>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByInvoice(items: CostExpenseItem[]): CostInvoiceGroup[] {
    const map = new Map<string, CostInvoiceGroup>();
    for (const item of items) {
        if (!map.has(item.invoiceId)) {
            map.set(item.invoiceId, {
                invoiceId:     item.invoiceId,
                invoiceNumber: item.invoiceNumber,
                sellerName:    item.sellerName,
                saleDate:      item.saleDate,
                itemCount:     0,
                totalGross:    0,
                items:         [],
                costCategoryId: item.costCategoryId,
            });
        }
        const grp = map.get(item.invoiceId)!;
        grp.items.push(item);
        grp.itemCount++;
        grp.totalGross += item.grossValue ?? 0;
        // If any item in invoice is unassigned, treat invoice as unassigned
        if (!item.costCategoryId) grp.costCategoryId = null;
    }
    return [...map.values()].sort((a, b) => (b.saleDate ?? '').localeCompare(a.saleDate ?? ''));
}

function groupByName(items: CostExpenseItem[]): CostNameGroup[] {
    const map = new Map<string, CostNameGroup>();
    for (const item of items) {
        const key = item.name ?? '(brak nazwy)';
        if (!map.has(key)) {
            map.set(key, { name: key, itemCount: 0, totalGross: 0, items: [], costCategoryId: item.costCategoryId });
        }
        const grp = map.get(key)!;
        grp.items.push(item);
        grp.itemCount++;
        grp.totalGross += item.grossValue ?? 0;
        if (!item.costCategoryId) grp.costCategoryId = null;
    }
    return [...map.values()].sort((a, b) => b.totalGross - a.totalGross);
}

// ─── Category color map from breakdown ───────────────────────────────────────

function categoryColorById(categories: CostCategory[]): Map<string, string> {
    const m = new Map<string, string>();
    categories.forEach(c => { if (c.color) m.set(c.id, c.color); });
    return m;
}

// ─── Invoice preview modal ────────────────────────────────────────────────────

interface InvoicePreviewModalProps {
    invoiceId: string;
    allItems: CostExpenseItem[];
    onClose: () => void;
}

const InvoicePreviewModal = ({ invoiceId, allItems, onClose }: InvoicePreviewModalProps) => {
    const items = allItems.filter(i => i.invoiceId === invoiceId);
    const head  = items[0];
    const totalGross = items.reduce((s, i) => s + (i.grossValue ?? 0), 0);

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="720px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>
                        {head?.invoiceNumber ? `Faktura ${head.invoiceNumber}` : `Faktura (ID …${invoiceId.slice(-8)})`}
                    </ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {head && (
                    <InvMeta>
                        {head.sellerName && (
                            <InvMetaField>
                                <InvMetaLabel>Sprzedawca</InvMetaLabel>
                                <InvMetaValue>{head.sellerName}</InvMetaValue>
                            </InvMetaField>
                        )}
                        {head.saleDate && (
                            <InvMetaField>
                                <InvMetaLabel>Data sprzedaży</InvMetaLabel>
                                <InvMetaValue>{head.saleDate}</InvMetaValue>
                            </InvMetaField>
                        )}
                        <InvMetaField>
                            <InvMetaLabel>Pozycji</InvMetaLabel>
                            <InvMetaValue>{items.length}</InvMetaValue>
                        </InvMetaField>
                        <InvMetaField>
                            <InvMetaLabel>Łącznie brutto</InvMetaLabel>
                            <InvMetaValue style={{ fontWeight: 700 }}>{fmtPLN(totalGross)}</InvMetaValue>
                        </InvMetaField>
                    </InvMeta>
                )}
                <div style={{ overflowX: 'auto' }}>
                    <InvTable>
                        <thead>
                            <tr>
                                <InvTh style={{ textAlign: 'left' }}>Pozycja</InvTh>
                                <InvTh>Ilość</InvTh>
                                <InvTh>Cena netto</InvTh>
                                <InvTh>Netto</InvTh>
                                <InvTh>VAT</InvTh>
                                <InvTh>Brutto</InvTh>
                                <InvTh style={{ textAlign: 'left' }}>Kategoria</InvTh>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <InvTd style={{ textAlign: 'left', color: undefined }}>{item.name ?? '—'}</InvTd>
                                    <InvTd>{item.quantity != null ? `${item.quantity} ${item.unit ?? ''}`.trim() : '—'}</InvTd>
                                    <InvTd>{item.unitPriceNet != null ? fmtPLN(item.unitPriceNet) : '—'}</InvTd>
                                    <InvTd>{item.netValue != null ? fmtPLN(item.netValue) : '—'}</InvTd>
                                    <InvTd>{item.vatRate ?? '—'}</InvTd>
                                    <InvTd>{item.grossValue != null ? fmtPLN(item.grossValue) : '—'}</InvTd>
                                    <InvTd style={{ textAlign: 'left', fontWeight: undefined }}>
                                        {item.costCategoryName
                                            ? <span style={{ fontSize: '11px', fontWeight: 600, color: st.accentBlue }}>{item.costCategoryName}</span>
                                            : <span style={{ fontSize: '11px', color: st.textMuted }}>—</span>}
                                    </InvTd>
                                </tr>
                            ))}
                        </tbody>
                    </InvTable>
                </div>
            </ModalContent>
        </ModalShell>
    );
};

// ─── Main view ────────────────────────────────────────────────────────────────

type AssignmentFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED';

type CtxMenuState = {
    items: CostExpenseItem[];
    invoiceId: string | null;
    needsConfirm: boolean;
    x: number;
    y: number;
};

export const CostsView = () => {
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate,   setEndDate]   = useState(today());
    const [viewMode,  setViewMode]  = useState<CostViewMode>('INVOICE');
    const [search,    setSearch]    = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('ALL');

    const [formModalOpen,  setFormModalOpen]  = useState(false);
    const [editingCategory, setEditingCategory] = useState<CostCategory | undefined>();

    // Pending drop state
    const [confirmOpen,  setConfirmOpen]  = useState(false);
    const [pendingDrop, setPendingDrop]   = useState<{ itemIds: string[]; categoryId: string } | null>(null);

    // Context menu
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
    const ctxRef = useRef<HTMLDivElement>(null);

    // Invoice preview
    const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

    const qc = useQueryClient();

    const { categories, isLoading: catLoading } = useCostCategories();
    const { items: allItems, isLoading: itemsLoading, isFetching: itemsFetching } = useCostExpenseItems(startDate, endDate);
    const { breakdown, isLoading: bdLoading } = useCostBreakdown('MONTHLY', startDate, endDate);

    const deleteMut  = useDeleteCostCategory();
    const assignMut  = useAssignCostItems();
    const unassignMut = useUnassignCostItem();

    const catColorMap = useMemo(() => categoryColorById(categories), [categories]);

    // Close context menu on outside click
    useEffect(() => {
        if (!ctxMenu) return;
        const h = (e: MouseEvent) => {
            if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [ctxMenu]);

    // Filter items by selected category or show all
    const visibleItems = useMemo(() => {
        let list = allItems;
        if (selectedCategoryId) {
            list = list.filter(i => i.costCategoryId === selectedCategoryId);
        }
        if (assignmentFilter === 'ASSIGNED')   list = list.filter(i => i.costCategoryId !== null);
        if (assignmentFilter === 'UNASSIGNED') list = list.filter(i => i.costCategoryId === null);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(i =>
                (i.name ?? '').toLowerCase().includes(q) ||
                (i.sellerName ?? '').toLowerCase().includes(q) ||
                (i.invoiceNumber ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [allItems, selectedCategoryId, assignmentFilter, search]);

    const invoiceGroups = useMemo(() => groupByInvoice(visibleItems), [visibleItems]);
    const nameGroups    = useMemo(() => groupByName(visibleItems),    [visibleItems]);

    // KPI totals from breakdown (or fallback from items)
    const totalCostGross = breakdown?.overview.totals.totalCostGross
        ?? allItems.reduce((s, i) => s + (i.grossValue ?? 0), 0);
    const totalCostNet   = allItems.reduce((s, i) => s + (i.netValue ?? 0), 0);
    const totalItems     = breakdown?.overview.totals.itemCount ?? allItems.length;

    // Chart data
    const chartData = breakdown?.overview.data ?? [];

    // Category totals map from breakdown
    const catTotalsMap = useMemo(() => {
        const m = new Map<string, { totalCostGross: number; itemCount: number }>();
        breakdown?.categories.forEach(c => m.set(c.categoryId, {
            totalCostGross: c.totalCostGross,
            itemCount:      c.itemCount,
        }));
        return m;
    }, [breakdown]);

    // ── Drop handler ──────────────────────────────────────────────────────────

    const [catDragOver, setCatDragOver] = useState<string | null>(null);

    const handleCategoryDrop = (draggedPayload: string, categoryId: string) => {
        // payload is "INVOICE:invoiceId" | "NAME:itemName" | "ITEM:itemId"
        const [type, value] = draggedPayload.split(':');
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        if (type === 'ITEM') {
            // Single item — assign immediately
            assignMut.mutate({ categoryId, itemIds: [value] });
            return;
        }

        // Multi-item — show confirmation modal
        let itemIds: string[] = [];
        if (type === 'INVOICE') {
            itemIds = allItems.filter(i => i.invoiceId === value).map(i => i.id);
        } else if (type === 'NAME') {
            itemIds = allItems.filter(i => (i.name ?? '(brak nazwy)') === value).map(i => i.id);
        }

        if (itemIds.length === 0) return;
        setPendingDrop({ itemIds, categoryId });
        setConfirmOpen(true);
    };

    const handleConfirmAssign = async () => {
        if (!pendingDrop) return;
        await assignMut.mutateAsync({ categoryId: pendingDrop.categoryId, itemIds: pendingDrop.itemIds });
        setConfirmOpen(false);
        setPendingDrop(null);
    };

    const handleCloseConfirm = () => {
        setConfirmOpen(false);
        setPendingDrop(null);
    };

    const pendingCategory = pendingDrop
        ? (categories.find(c => c.id === pendingDrop.categoryId)?.name ?? '')
        : '';

    // ── Context menu helpers ──────────────────────────────────────────────────

    const openCtx = useCallback((
        e: React.MouseEvent<HTMLButtonElement>,
        items: CostExpenseItem[],
        invoiceId: string | null,
        needsConfirm: boolean
    ) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const menuW = 230;
        const x = Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8));
        const y = rect.bottom + 4;
        setCtxMenu({ items, invoiceId, needsConfirm, x, y });
    }, []);

    const handleCtxAssign = (categoryId: string) => {
        if (!ctxMenu) return;
        setCtxMenu(null);
        if (ctxMenu.needsConfirm) {
            setPendingDrop({ itemIds: ctxMenu.items.map(i => i.id), categoryId });
            setConfirmOpen(true);
        } else {
            assignMut.mutate({ categoryId, itemIds: ctxMenu.items.map(i => i.id) });
        }
    };

    const handleCtxUnassign = async () => {
        if (!ctxMenu) return;
        setCtxMenu(null);
        const assigned = ctxMenu.items.filter(i => i.costCategoryId);
        if (assigned.length === 0) return;
        await Promise.all(assigned.map(i => costsApi.unassignItem(i.costCategoryId!, i.id)));
        qc.invalidateQueries({ queryKey: [COST_ITEMS_KEY] });
        qc.invalidateQueries({ queryKey: [COST_BREAKDOWN_KEY] });
    };

    const handleCtxPreview = () => {
        if (!ctxMenu?.invoiceId) return;
        const id = ctxMenu.invoiceId;
        setCtxMenu(null);
        setPreviewInvoiceId(id);
    };

    // ── Edit / delete category ────────────────────────────────────────────────

    const handleEditCategory = (cat: CostCategory) => {
        setEditingCategory(cat);
        setFormModalOpen(true);
    };

    const handleDeleteCategory = async (cat: CostCategory) => {
        if (window.confirm(`Czy na pewno chcesz dezaktywować kategorię „${cat.name}"?`)) {
            if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
            await deleteMut.mutateAsync(cat.id);
        }
    };

    const handleCloseForm = () => {
        setFormModalOpen(false);
        setEditingCategory(undefined);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ViewContainer>
            <PageHeader
                title="Statystyki"
                subtitle="Analiza kosztów i wydatków studia"
                actions={
                    <HdrBtns>
                        <DatePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartChange={setStartDate}
                            onEndChange={setEndDate}
                        />
                        <StatsNav />
                    </HdrBtns>
                }
            />

            {/* ── KPI tiles ──────────────────────────────────────────── */}
            <Section>
                <SectionHeading>
                    <SectionTitle>Przegląd kosztów</SectionTitle>
                    <SectionRule />
                </SectionHeading>

                <KpiRow>
                    <KpiCard $accent="#EF4444">
                        <KpiLabel>Łączny koszt brutto</KpiLabel>
                        <KpiValue>{fmtPLN(totalCostGross)}</KpiValue>
                    </KpiCard>
                    <KpiCard $accent="#F97316">
                        <KpiLabel>Łączny koszt netto</KpiLabel>
                        <KpiValue>{fmtPLN(totalCostNet)}</KpiValue>
                    </KpiCard>
                    <KpiCard $accent="#6B7280">
                        <KpiLabel>Liczba pozycji</KpiLabel>
                        <KpiValue>{totalItems.toLocaleString('pl-PL')}</KpiValue>
                    </KpiCard>
                </KpiRow>

                {/* Cost trend chart */}
                <ChartCard>
                    <ChartTitle>Rozkład kosztów w czasie</ChartTitle>
                    {bdLoading && <ChartEmpty><Spinner /></ChartEmpty>}
                    {!bdLoading && chartData.length === 0 && (
                        <ChartEmpty>Brak danych dla wybranego okresu</ChartEmpty>
                    )}
                    {!bdLoading && chartData.length > 0 && (() => {
                        const max = Math.max(...chartData.map(d => d.totalCostGross), 1);
                        return (
                            <BarsWrap>
                                {chartData.map(d => (
                                    <BarItem key={d.period} title={`${d.period}: ${fmtPLN(d.totalCostGross)}`}>
                                        <BarFill
                                            $h={Math.round((d.totalCostGross / max) * 100)}
                                            $color={selectedCategoryId ? (catColorMap.get(selectedCategoryId) ?? '#EF4444') : '#EF4444'}
                                        />
                                        <BarLabel>{d.period.slice(0, 7)}</BarLabel>
                                    </BarItem>
                                ))}
                            </BarsWrap>
                        );
                    })()}
                </ChartCard>
            </Section>

            {/* ── Breakdown: categories + items ──────────────────────── */}
            <Section>
                <SectionHeading>
                    <SectionTitle>Podział według kategorii</SectionTitle>
                    <SectionRule />
                </SectionHeading>

                <TablesHeaderRow>
                    {/* LEFT header */}
                    <TableColumnHeader>
                        <TableColumnTitle>Kategorie kosztów</TableColumnTitle>
                        <AddButton onClick={() => { setEditingCategory(undefined); setFormModalOpen(true); }}>
                            <Plus /> Nowa kategoria
                        </AddButton>
                    </TableColumnHeader>

                    {/* RIGHT header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <TableColumnHeader>
                            <TableColumnTitle>
                                {selectedCategoryId
                                    ? (categories.find(c => c.id === selectedCategoryId)?.name ?? 'Pozycje kosztowe')
                                    : 'Pozycje kosztowe'}
                            </TableColumnTitle>
                            {selectedCategoryId && (
                                <button
                                    style={{
                                        padding: '3px 10px',
                                        background: 'transparent',
                                        border: `1px solid ${st.border}`,
                                        borderRadius: st.radiusFull,
                                        fontSize: st.fontXs,
                                        fontWeight: 500,
                                        color: st.textSecondary,
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setSelectedCategoryId(null)}
                                >
                                    ✕ Pokaż wszystkie
                                </button>
                            )}
                        </TableColumnHeader>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <ViewModeBar>
                                <ViewModeBtn $active={viewMode === 'INVOICE'} onClick={() => setViewMode('INVOICE')}>
                                    <ReceiptText />Faktury
                                </ViewModeBtn>
                                <ViewModeBtn $active={viewMode === 'ITEM'} onClick={() => setViewMode('ITEM')}>
                                    <Package />Pozycje
                                </ViewModeBtn>
                                <ViewModeBtn $active={viewMode === 'NAME'} onClick={() => setViewMode('NAME')}>
                                    <Tag />Grupy nazw
                                </ViewModeBtn>
                            </ViewModeBar>
                            <FilterBar>
                                <FilterBtn $active={assignmentFilter === 'ALL'} onClick={() => setAssignmentFilter('ALL')}>Wszystkie</FilterBtn>
                                <FilterBtn $active={assignmentFilter === 'UNASSIGNED'} onClick={() => setAssignmentFilter('UNASSIGNED')}>Nieprzypisane</FilterBtn>
                                <FilterBtn $active={assignmentFilter === 'ASSIGNED'} onClick={() => setAssignmentFilter('ASSIGNED')}>Przypisane</FilterBtn>
                            </FilterBar>
                            <SearchInput
                                type="text"
                                placeholder="Szukaj..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </TablesHeaderRow>

                <TablesGrid>
                    {/* ── LEFT: categories ───────────────────────────── */}
                    <TableColumn>
                        <CatTable
                            onDragLeave={e => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node))
                                    setCatDragOver(null);
                            }}
                        >
                            {catLoading && <TableLoading><Spinner /></TableLoading>}
                            {!catLoading && categories.length === 0 && (
                                <TableEmpty>
                                    Brak kategorii kosztów. Utwórz pierwszą, aby zacząć grupować wydatki.
                                </TableEmpty>
                            )}
                            {!catLoading && categories.map(cat => {
                                const totals  = catTotalsMap.get(cat.id);
                                const isSelected = selectedCategoryId === cat.id;
                                return (
                                    <CatRow
                                        key={cat.id}
                                        $selected={isSelected}
                                        $dragOver={catDragOver === cat.id}
                                        onClick={() => setSelectedCategoryId(prev => prev === cat.id ? null : cat.id)}
                                        onDragOver={e => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setCatDragOver(cat.id);
                                        }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            setCatDragOver(null);
                                            const payload = e.dataTransfer.getData('text/plain');
                                            if (payload) handleCategoryDrop(payload, cat.id);
                                        }}
                                    >
                                        <CatDot $color={cat.color ?? '#94A3B8'} />
                                        <CatName>{cat.name}</CatName>
                                        <CatMeta>{totals ? fmtPLN(totals.totalCostGross) : '—'}</CatMeta>
                                        <CatActions onClick={e => e.stopPropagation()}>
                                            <IconBtn title="Edytuj" onClick={() => handleEditCategory(cat)}>
                                                <Pencil />
                                            </IconBtn>
                                            <IconBtn title="Usuń" onClick={() => handleDeleteCategory(cat)}>
                                                <Trash2 />
                                            </IconBtn>
                                        </CatActions>
                                    </CatRow>
                                );
                            })}
                        </CatTable>
                    </TableColumn>

                    {/* ── RIGHT: items panel ─────────────────────────── */}
                    <TableColumn>
                        <ItemsTable>
                            {(itemsLoading || itemsFetching) && <TableLoading><Spinner /></TableLoading>}

                            {!itemsLoading && viewMode === 'INVOICE' && (
                                <>
                                    <ItemsHeader>
                                        <span />
                                        <span>Faktura / sprzedawca</span>
                                        <span>Poz.</span>
                                        <span>Brutto</span>
                                        <span>Kategoria</span>
                                        <span />
                                    </ItemsHeader>
                                    {invoiceGroups.length === 0 && (
                                        <TableEmpty>Brak faktur dla wybranego okresu</TableEmpty>
                                    )}
                                    {invoiceGroups.map(grp => {
                                        const catColor = grp.costCategoryId
                                            ? (catColorMap.get(grp.costCategoryId) ?? undefined)
                                            : undefined;
                                        const catName = grp.costCategoryId
                                            ? categories.find(c => c.id === grp.costCategoryId)?.name
                                            : undefined;
                                        const grpItems = allItems.filter(i => i.invoiceId === grp.invoiceId);
                                        return (
                                            <ItemRow
                                                key={grp.invoiceId}
                                                $draggable
                                                draggable
                                                onDragStart={e => {
                                                    e.dataTransfer.setData('text/plain', `INVOICE:${grp.invoiceId}`);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                            >
                                                <DragHandle>⠿</DragHandle>
                                                <div style={{ minWidth: 0 }}>
                                                    <ItemName>{grp.invoiceNumber ?? '(bez numeru)'}</ItemName>
                                                    {grp.sellerName && (
                                                        <div style={{ fontSize: st.fontXs, color: st.textMuted, marginTop: 2 }}>
                                                            {grp.sellerName}
                                                        </div>
                                                    )}
                                                    {grp.saleDate && (
                                                        <div style={{ fontSize: st.fontXs, color: st.textMuted }}>
                                                            {grp.saleDate}
                                                        </div>
                                                    )}
                                                </div>
                                                <ItemMeta>{grp.itemCount}</ItemMeta>
                                                <ItemMeta>{fmtPLN(grp.totalGross)}</ItemMeta>
                                                {catName ? (
                                                    <CatBadge $color={catColor}>{catName}</CatBadge>
                                                ) : (
                                                    <span style={{ fontSize: st.fontXs, color: st.textMuted }}>—</span>
                                                )}
                                                <KebabBtn
                                                    title="Opcje"
                                                    onClick={e => openCtx(e, grpItems, grp.invoiceId, grpItems.length > 1)}
                                                >⋮</KebabBtn>
                                            </ItemRow>
                                        );
                                    })}
                                </>
                            )}

                            {!itemsLoading && viewMode === 'ITEM' && (
                                <>
                                    <ItemsHeader>
                                        <span />
                                        <span>Pozycja</span>
                                        <span>Ilość</span>
                                        <span>Brutto</span>
                                        <span>Kategoria</span>
                                        <span />
                                    </ItemsHeader>
                                    {visibleItems.length === 0 && (
                                        <TableEmpty>Brak pozycji dla wybranego okresu</TableEmpty>
                                    )}
                                    {visibleItems.map(item => {
                                        const catColor = item.costCategoryId
                                            ? (catColorMap.get(item.costCategoryId) ?? undefined)
                                            : undefined;
                                        return (
                                            <ItemRow
                                                key={item.id}
                                                $draggable
                                                draggable
                                                onDragStart={e => {
                                                    e.dataTransfer.setData('text/plain', `ITEM:${item.id}`);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                            >
                                                <DragHandle>⠿</DragHandle>
                                                <div style={{ minWidth: 0 }}>
                                                    <ItemName>{item.name ?? '(brak nazwy)'}</ItemName>
                                                    {item.sellerName && (
                                                        <div style={{ fontSize: st.fontXs, color: st.textMuted, marginTop: 2 }}>
                                                            {item.sellerName} · {item.saleDate ?? ''}
                                                        </div>
                                                    )}
                                                </div>
                                                <ItemMeta>{item.quantity ?? '—'} {item.unit ?? ''}</ItemMeta>
                                                <ItemMeta>{item.grossValue != null ? fmtPLN(item.grossValue) : '—'}</ItemMeta>
                                                {item.costCategoryName ? (
                                                    <CatBadge $color={catColor}>{item.costCategoryName}</CatBadge>
                                                ) : (
                                                    <span style={{ fontSize: st.fontXs, color: st.textMuted }}>—</span>
                                                )}
                                                <KebabBtn
                                                    title="Opcje"
                                                    onClick={e => openCtx(e, [item], item.invoiceId, false)}
                                                >⋮</KebabBtn>
                                            </ItemRow>
                                        );
                                    })}
                                </>
                            )}

                            {!itemsLoading && viewMode === 'NAME' && (
                                <>
                                    <ItemsHeader>
                                        <span />
                                        <span>Nazwa pozycji</span>
                                        <span>Szt.</span>
                                        <span>Brutto</span>
                                        <span>Kategoria</span>
                                        <span />
                                    </ItemsHeader>
                                    {nameGroups.length === 0 && (
                                        <TableEmpty>Brak pozycji dla wybranego okresu</TableEmpty>
                                    )}
                                    {nameGroups.map(grp => {
                                        const catColor = grp.costCategoryId
                                            ? (catColorMap.get(grp.costCategoryId) ?? undefined)
                                            : undefined;
                                        const catName = grp.costCategoryId
                                            ? categories.find(c => c.id === grp.costCategoryId)?.name
                                            : undefined;
                                        const grpItems = allItems.filter(i => (i.name ?? '(brak nazwy)') === grp.name);
                                        return (
                                            <ItemRow
                                                key={grp.name}
                                                $draggable
                                                draggable
                                                onDragStart={e => {
                                                    e.dataTransfer.setData('text/plain', `NAME:${grp.name}`);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                            >
                                                <DragHandle>⠿</DragHandle>
                                                <ItemName>{grp.name}</ItemName>
                                                <ItemMeta>{grp.itemCount}</ItemMeta>
                                                <ItemMeta>{fmtPLN(grp.totalGross)}</ItemMeta>
                                                {catName ? (
                                                    <CatBadge $color={catColor}>{catName}</CatBadge>
                                                ) : (
                                                    <span style={{ fontSize: st.fontXs, color: st.textMuted }}>—</span>
                                                )}
                                                <KebabBtn
                                                    title="Opcje"
                                                    onClick={e => openCtx(e, grpItems, null, grpItems.length > 1)}
                                                >⋮</KebabBtn>
                                            </ItemRow>
                                        );
                                    })}
                                </>
                            )}
                        </ItemsTable>
                    </TableColumn>
                </TablesGrid>
            </Section>

            {/* ── Modals ─────────────────────────────────────────────── */}
            <CategoryFormModal
                isOpen={formModalOpen}
                onClose={handleCloseForm}
                category={editingCategory}
            />

            <ConfirmAssignModal
                isOpen={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleConfirmAssign}
                itemCount={pendingDrop?.itemIds.length ?? 0}
                categoryName={pendingCategory}
                isPending={assignMut.isPending}
            />

            {previewInvoiceId && (
                <InvoicePreviewModal
                    invoiceId={previewInvoiceId}
                    allItems={allItems}
                    onClose={() => setPreviewInvoiceId(null)}
                />
            )}

            {/* ── Context menu ─────────────────────────────────────── */}
            {ctxMenu && createPortal(
                <CtxPanel ref={ctxRef} style={{ top: ctxMenu.y, left: ctxMenu.x }}>
                    <CtxSectionLabel>Przypisz do kategorii</CtxSectionLabel>
                    {categories.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: st.fontSm, color: st.textMuted }}>Brak kategorii</div>
                    )}
                    {categories.map(cat => (
                        <CtxItem key={cat.id} onClick={() => handleCtxAssign(cat.id)}>
                            <CtxCatDot $color={cat.color ?? '#94A3B8'} />
                            {cat.name}
                        </CtxItem>
                    ))}
                    {(ctxMenu.items.some(i => i.costCategoryId) || ctxMenu.invoiceId) && <CtxDivider />}
                    {ctxMenu.items.some(i => i.costCategoryId) && (
                        <CtxItem $danger onClick={handleCtxUnassign}>
                            <X />
                            {ctxMenu.items.length > 1 ? 'Usuń przypisanie wszystkich' : 'Usuń przypisanie'}
                        </CtxItem>
                    )}
                    {ctxMenu.invoiceId && (
                        <CtxItem onClick={handleCtxPreview}>
                            <FileText />
                            Podgląd faktury
                        </CtxItem>
                    )}
                </CtxPanel>,
                document.body
            )}
        </ViewContainer>
    );
};
