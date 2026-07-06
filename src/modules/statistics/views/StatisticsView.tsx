// src/modules/statistics/views/StatisticsView.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { StatsFilters } from '../components/StatsFilters';
import { StatsTotalsBar } from '../components/StatsTotalsBar';
import { StatsChart } from '../components/StatsChart';
import { BreakdownTable } from '../components/BreakdownTable';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { PeriodDetailDrawer } from '../components/PeriodDetailDrawer';
import { StatsNav } from '../components/StatsNav';
import { useCategories, useDeleteCategory, useAssignService, useUnassignService } from '../hooks/useCategories';
import { useBreakdown, useCategoryStats } from '../hooks/useStats';
import type { Category, Granularity } from '../types';
import { st } from '../components/StatisticsTheme';
import { PageHeader } from '@/common/components/PageHeader';

// ─── Layout ──────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: ${props => props.theme.spacing.lg};
    max-width: 1800px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;


const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

// ─── Section heading ──────────────────────────────────────────────────────────

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

// ─── Selected category banner ─────────────────────────────────────────────────

const SelectedCategoryBanner = styled.div<{ $visible: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: ${props => props.$visible ? '10px 16px' : '0 16px'};
    background: ${st.accentBlueDim};
    border: 1px solid ${st.accentBlue}33;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    max-height: ${props => props.$visible ? '60px' : '0'};
    overflow: hidden;
    opacity: ${props => props.$visible ? 1 : 0};
    pointer-events: ${props => props.$visible ? 'auto' : 'none'};
    transition: max-height 0.2s ease, opacity 0.15s ease, padding 0.2s ease;
`;

const ClearSelectionBtn = styled.button`
    margin-left: auto;
    padding: 3px 10px;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 500;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        color: ${st.text};
        border-color: ${st.borderHover};
        background: ${st.bg};
    }
`;

// ─── Two-column breakdown ─────────────────────────────────────────────────────

const twoColGrid = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    @media (max-width: ${(props: any) => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr;
    }
`;

/** Shared header row — both column titles live here so they always align. */
const TablesHeaderRow = styled.div`
    ${twoColGrid}
    align-items: center;
`;

/** Tables sit in a separate grid below the header row. */
const TablesGrid = styled.div`
    ${twoColGrid}
    align-items: start;
`;

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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TableColumnControls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const ServiceTableFilterLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
`;

const ServiceFiltersBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    width: 100%;
`;

const ServiceFilterInput = styled.input`
    flex: 1;
    min-width: 150px;
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

const UnassignedFilterBtn = styled.button<{ $active: boolean }>`
    padding: 5px 12px;
    background: ${p => p.$active ? st.accentAmberDim : 'transparent'};
    border: 1px solid ${p => p.$active ? st.accentAmber : st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${p => p.$active ? '#92400E' : st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        border-color: ${p => p.$active ? st.accentAmber : st.borderHover};
        color: ${p => p.$active ? '#92400E' : st.text};
        background: ${p => p.$active ? 'rgba(245,158,11,0.18)' : st.bg};
    }
`;

const DragHint = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: ${st.accentAmberDim};
    border: 1px solid ${st.accentAmber}44;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

// ─── Common ───────────────────────────────────────────────────────────────────

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

    &:hover {
        background: #2563EB;
        box-shadow: ${st.shadowSm};
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
`;

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ChartArea = styled.div<{ $fading: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 16px;
    opacity: ${props => props.$fading ? 0.4 : 1};
    transform: ${props => props.$fading ? 'scale(0.995)' : 'scale(1)'};
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: ${props => props.$fading ? 'none' : 'auto'};
`;

const ErrorBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    background: ${st.accentRedDim};
    border: 1px solid ${st.accentRed}33;
    border-radius: ${st.radius};
    text-align: center;
`;

const ErrorText = styled.p`
    margin: 0;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
    font-weight: 500;
`;

const RetryButton = styled.button`
    padding: 8px 20px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlueDim};
    }
`;

const RowActionBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: 13px;
    cursor: pointer;
    color: ${st.textMuted};
    transition: all ${st.transition};

    &:hover {
        background: ${st.bg};
        color: ${st.text};
        border-color: ${st.borderHover};
        box-shadow: ${st.shadowXs};
    }

    &:not(:last-child) {
        margin-right: 3px;
    }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const oneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
};
const spDaysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const spMonthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };

// ─── Header date picker ───────────────────────────────────────────────────────

const HdrBtns = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const HdrPickerWrap = styled.div`
    position: relative;
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
    white-space: nowrap;
    transition: all ${st.transition};

    &:hover {
        background: ${p => p.$active ? 'rgba(14, 165, 233, 0.3)' : 'rgba(255, 255, 255, 0.14)'};
        color: #fff;
    }
    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const HdrPickerPanel = styled.div`
    position: fixed;
    z-index: 9000;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
    min-width: 250px;
    padding: 8px;
`;

const HdrPresetGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
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
    cursor: pointer;
    transition: border-color ${st.transition};
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
    transition: background ${st.transition};
    &:hover { background: #2563eb; }
    &:disabled { background: #94a3b8; cursor: not-allowed; }
`;

const HdrSep = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

const HdrCalIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const HdrChevIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const HdrCheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

type StatsPreset = { label: string; hint: string; startDate: string; endDate: string; granularity: Granularity; };

const getStatsPresets = (): StatsPreset[] => [
    { label: t.statistics.presets.last7days,    hint: '7 dni',    startDate: spDaysAgo(7),    endDate: today(), granularity: 'DAILY' },
    { label: t.statistics.presets.last30days,   hint: '30 dni',   startDate: spDaysAgo(30),   endDate: today(), granularity: 'WEEKLY' },
    { label: t.statistics.presets.last3months,  hint: '3 mies.',  startDate: spMonthsAgo(3),  endDate: today(), granularity: 'MONTHLY' },
    { label: t.statistics.presets.last12months, hint: '12 mies.', startDate: spMonthsAgo(12), endDate: today(), granularity: 'MONTHLY' },
];

interface StatsDatePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (d: string) => void;
    onEndDateChange: (d: string) => void;
    onGranularityChange: (g: Granularity) => void;
}

const StatsDatePicker = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onGranularityChange,
}: StatsDatePickerProps) => {
    const [open, setOpen] = useState(false);
    const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
    const [pendingFrom, setPendingFrom] = useState('');
    const [pendingTo, setPendingTo] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const presets = getStatsPresets();
    const activeIdx = presets.findIndex(p => p.startDate === startDate && p.endDate === endDate);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleToggle = () => {
        if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
            setPendingFrom(startDate);
            setPendingTo(endDate);
        }
        setOpen(p => !p);
    };

    const applyPreset = (preset: StatsPreset) => {
        onStartDateChange(preset.startDate);
        onEndDateChange(preset.endDate);
        onGranularityChange(preset.granularity);
        setOpen(false);
    };

    const applyCustom = () => {
        if (pendingFrom) onStartDateChange(pendingFrom);
        if (pendingTo) onEndDateChange(pendingTo);
        setOpen(false);
    };

    const label = activeIdx >= 0 ? presets[activeIdx].label : `${startDate} – ${endDate}`;

    return (
        <HdrPickerWrap>
            <HdrPickerTrigger ref={triggerRef} $active onClick={handleToggle}>
                <HdrCalIcon />
                {label}
                <HdrChevIcon />
            </HdrPickerTrigger>

            {open && panelPos && createPortal(
                <HdrPickerPanel ref={panelRef} style={{ top: panelPos.top, right: panelPos.right }}>
                    <HdrPresetGroup>
                        {presets.map((p, idx) => (
                            <HdrPresetBtn key={p.label} $active={idx === activeIdx} onClick={() => applyPreset(p)}>
                                {p.label}
                                <span className="hint">{p.hint}</span>
                                {idx === activeIdx && <HdrCheckIcon />}
                            </HdrPresetBtn>
                        ))}
                    </HdrPresetGroup>

                    <HdrDivider />
                    <HdrDateLabel>Niestandardowy zakres</HdrDateLabel>

                    <HdrRangeRow>
                        <HdrDateInput
                            type="date"
                            value={pendingFrom}
                            max={pendingTo || undefined}
                            onChange={e => setPendingFrom(e.target.value)}
                        />
                        <HdrSep>–</HdrSep>
                        <HdrDateInput
                            type="date"
                            value={pendingTo}
                            min={pendingFrom || undefined}
                            onChange={e => setPendingTo(e.target.value)}
                        />
                    </HdrRangeRow>

                    <HdrApplyBtn disabled={!pendingFrom && !pendingTo} onClick={applyCustom}>
                        Zastosuj zakres
                    </HdrApplyBtn>
                </HdrPickerPanel>,
                document.body
            )}
        </HdrPickerWrap>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const StatisticsView = () => {
    const [granularity, setGranularity] = useState<Granularity>('MONTHLY');
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate, setEndDate] = useState(today());
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [drillPeriod, setDrillPeriod] = useState<string | null>(null);
    const [serviceNameFilter, setServiceNameFilter] = useState('');
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

    const {
        breakdown,
        isLoading: breakdownLoading,
        isFetching: breakdownFetching,
        isError: breakdownError,
        refetch: breakdownRefetch,
    } = useBreakdown(granularity, startDate, endDate);

    const { stats: categoryStats, isLoading: catStatsLoading, isFetching: catStatsFetching } = useCategoryStats(
        selectedCategoryId || '',
        granularity,
        startDate,
        endDate
    );

    const {
        categories,
        isLoading: catLoading,
        isError: catError,
        refetch: catRefetch,
    } = useCategories();

    const deleteMutation = useDeleteCategory();
    const assignMutation = useAssignService();
    const unassignMutation = useUnassignService();

    const selectedCategory = selectedCategoryId
        ? categories.find(c => c.id === selectedCategoryId) ?? null
        : null;

    const chartData = selectedCategoryId ? categoryStats : breakdown?.overview;
    const chartInitialLoading = selectedCategoryId ? catStatsLoading : breakdownLoading;
    const chartFetching = selectedCategoryId ? catStatsFetching : breakdownFetching;

    const lastChartDataRef = useRef(chartData);
    if (chartData !== undefined) lastChartDataRef.current = chartData;
    const displayData = chartData ?? lastChartDataRef.current;

    const unassignedCount = breakdown?.unassignedServices.length ?? 0;

    const serviceCategoryColor = useMemo(() => {
        const map = new Map<string, string>();
        breakdown?.categories.forEach(cat => {
            if (cat.color) {
                cat.services.forEach(s => map.set(s.serviceId, cat.color!));
            }
        });
        return map;
    }, [breakdown]);

    const serviceRows = useMemo(() => {
        if (!breakdown) return [];

        if (selectedCategoryId) {
            const cat = breakdown.categories.find(c => c.categoryId === selectedCategoryId);
            return (cat?.services ?? []).map(s => ({
                id: s.serviceId,
                name: s.serviceName,
                orderCount: s.totals.orderCount,
                totalRevenueGross: s.totals.totalRevenueGross,
                isActive: s.isActive,
                categoryId: selectedCategoryId,
                isDraggable: false,
            }));
        }

        const assigned = breakdown.categories.flatMap(cat =>
            cat.services.map(s => ({
                id: s.serviceId,
                name: s.serviceName,
                orderCount: s.totals.orderCount,
                totalRevenueGross: s.totals.totalRevenueGross,
                isActive: s.isActive,
                color: cat.color ?? undefined,
                categoryId: cat.categoryId,
                isUnassigned: false,
                isDraggable: false,
            }))
        );

        const unassigned = breakdown.unassignedServices.map(s => ({
            id: s.serviceId,
            name: s.serviceName,
            orderCount: s.totals.orderCount,
            totalRevenueGross: s.totals.totalRevenueGross,
            isActive: s.isActive,
            color: undefined,
            isUnassigned: true,
            isDraggable: true,
        }));

        return [...assigned, ...unassigned];
    }, [breakdown, selectedCategoryId, serviceCategoryColor]);

    const filteredServiceRows = useMemo(() => {
        let rows = serviceRows;
        if (!selectedCategoryId && showUnassignedOnly) {
            rows = rows.filter(r => r.isUnassigned);
        }
        const q = serviceNameFilter.trim().toLowerCase();
        if (q) {
            rows = rows.filter(r => r.name.toLowerCase().includes(q));
        }
        return rows;
    }, [serviceRows, serviceNameFilter, showUnassignedOnly, selectedCategoryId]);

    const handleCategoryRowClick = (id: string) => {
        setSelectedCategoryId(prev => {
            const next = prev === id ? null : id;
            if (next !== null) setShowUnassignedOnly(false);
            return next;
        });
    };

    const handleShowUnassignedOnly = () => {
        if (!showUnassignedOnly) setSelectedCategoryId(null);
        setShowUnassignedOnly(prev => !prev);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setIsFormModalOpen(true);
    };

    const handleDeleteCategory = async (category: Category) => {
        if (window.confirm(t.statistics.categories.deleteConfirm.replace('{name}', category.name))) {
            if (selectedCategoryId === category.id) setSelectedCategoryId(null);
            await deleteMutation.mutateAsync(category.id);
        }
    };

    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setEditingCategory(undefined);
    };

    const handleAssignServiceToCategory = async (serviceId: string, categoryId: string) => {
        await assignMutation.mutateAsync({ categoryId, serviceId });
    };

    const handleUnpinService = async (serviceId: string, categoryId: string) => {
        await unassignMutation.mutateAsync({ categoryId, serviceId });
    };

    return (
        <ViewContainer>
            <PageHeader
                title={t.statistics.title}
                subtitle="Analiza przychodów i struktury usług"
                actions={
                    <HdrBtns>
                        <StatsDatePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                            onGranularityChange={setGranularity}
                        />
                        <StatsNav />
                    </HdrBtns>
                }
            />

            {/* ── Filters ──────────────────────────────────── */}
            <Section>
                <StatsFilters
                    granularity={granularity}
                    startDate={startDate}
                    endDate={endDate}
                    onGranularityChange={setGranularity}
                />
            </Section>

            {/* ── Overview section ─────────────────────────── */}
            <Section>
                <SectionHeading>
                    <SectionTitle>Przegląd okresu</SectionTitle>
                    <SectionRule />
                </SectionHeading>

                {chartInitialLoading && !displayData && (
                    <LoadingOverlay><Spinner /></LoadingOverlay>
                )}

                {breakdownError && !selectedCategoryId && (
                    <ErrorBox>
                        <ErrorText>{t.statistics.overview.error}</ErrorText>
                        <RetryButton onClick={() => breakdownRefetch()}>{t.common.retry}</RetryButton>
                    </ErrorBox>
                )}

                <SelectedCategoryBanner $visible={!!selectedCategory}>
                    <span style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: selectedCategory?.color ?? 'transparent',
                        flexShrink: 0,
                        boxShadow: `0 0 0 3px ${selectedCategory?.color ?? 'transparent'}33`,
                    }} />
                    <span>
                        {t.statistics.overview.title}: <strong>{selectedCategory?.name ?? ''}</strong>
                    </span>
                    <ClearSelectionBtn onClick={() => setSelectedCategoryId(null)}>
                        ✕ Wszystkie kategorie
                    </ClearSelectionBtn>
                </SelectedCategoryBanner>

                {displayData && (
                    <ChartArea $fading={chartFetching || (chartInitialLoading && !chartData)}>
                        <StatsTotalsBar totals={displayData.totals} />
                        <StatsChart
                            data={displayData.data}
                            onBarClick={setDrillPeriod}
                        />
                    </ChartArea>
                )}
            </Section>

            {/* ── Breakdown section ─────────────────────────── */}
            <Section>
                <SectionHeading>
                    <SectionTitle>Podział według kategorii</SectionTitle>
                    <SectionRule />
                </SectionHeading>

                {/* Column headers in a shared grid — guaranteed same-line alignment */}
                <TablesHeaderRow>
                    <TableColumnHeader>
                        <TableColumnTitle>{t.statistics.breakdown.categoriesTitle}</TableColumnTitle>
                        <AddButton
                            onClick={() => { setEditingCategory(undefined); setIsFormModalOpen(true); }}
                        >
                            + {t.statistics.categories.add}
                        </AddButton>
                    </TableColumnHeader>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <TableColumnHeader>
                            <TableColumnTitle>
                                {selectedCategory
                                    ? selectedCategory.name
                                    : t.statistics.breakdown.servicesTitle}
                            </TableColumnTitle>
                            <TableColumnControls>
                                {selectedCategory && (
                                    <ServiceTableFilterLabel>
                                        przypisane usługi
                                    </ServiceTableFilterLabel>
                                )}
                                {selectedCategory && (
                                    <ClearSelectionBtn onClick={() => setSelectedCategoryId(null)}>
                                        ✕ Pokaż wszystkie
                                    </ClearSelectionBtn>
                                )}
                            </TableColumnControls>
                        </TableColumnHeader>

                        <ServiceFiltersBar>
                            <ServiceFilterInput
                                type="text"
                                placeholder="Szukaj po nazwie..."
                                value={serviceNameFilter}
                                onChange={e => setServiceNameFilter(e.target.value)}
                            />
                            {!selectedCategoryId && (
                                <UnassignedFilterBtn
                                    $active={showUnassignedOnly}
                                    onClick={handleShowUnassignedOnly}
                                >
                                    {showUnassignedOnly ? '✕ ' : ''}Pokaż bez kategorii
                                </UnassignedFilterBtn>
                            )}
                        </ServiceFiltersBar>
                    </div>
                </TablesHeaderRow>

                {/* Tables in a matching grid below */}
                <TablesGrid>
                    {/* LEFT: Categories */}
                    <TableColumn>
                        {catLoading && <LoadingOverlay><Spinner /></LoadingOverlay>}
                        {catError && (
                            <ErrorBox>
                                <ErrorText>{t.statistics.categories.error}</ErrorText>
                                <RetryButton onClick={() => catRefetch()}>{t.common.retry}</RetryButton>
                            </ErrorBox>
                        )}

                        <BreakdownTable
                            rows={(breakdown?.categories ?? []).map(cs => ({
                                id: cs.categoryId,
                                name: cs.categoryName,
                                orderCount: cs.totals.orderCount,
                                totalRevenueGross: cs.totals.totalRevenueGross,
                                color: cs.color ?? undefined,
                            }))}
                            isLoading={breakdownLoading}
                            showColorDot
                            selectedId={selectedCategoryId}
                            onRowClick={handleCategoryRowClick}
                            droppable
                            onDrop={handleAssignServiceToCategory}
                            rowActions={(row) => {
                                const cat = categories.find(c => c.id === row.id);
                                if (!cat) return null;
                                return (
                                    <>
                                        <RowActionBtn
                                            title={t.common.edit}
                                            onClick={() => handleEditCategory(cat)}
                                        >
                                            ✏
                                        </RowActionBtn>
                                        <RowActionBtn
                                            title={t.common.delete}
                                            onClick={() => handleDeleteCategory(cat)}
                                        >
                                            🗑
                                        </RowActionBtn>
                                    </>
                                );
                            }}
                        />
                    </TableColumn>

                    {/* RIGHT: Services */}
                    <TableColumn>
                        {!selectedCategoryId && unassignedCount > 0 && (
                            <DragHint>
                                ⚠ {unassignedCount} usług bez kategorii — przeciągnij na wybraną kategorię po lewej.
                            </DragHint>
                        )}

                        <BreakdownTable
                            rows={filteredServiceRows}
                            isLoading={breakdownLoading}
                            showColorDot={!selectedCategoryId}
                            emptyText={
                                serviceNameFilter.trim()
                                    ? 'Brak usług pasujących do wyszukiwanej frazy'
                                    : showUnassignedOnly
                                    ? 'Brak usług bez kategorii'
                                    : selectedCategoryId
                                    ? 'Brak usług przypisanych do tej kategorii'
                                    : t.statistics.breakdown.empty
                            }
                            rowActions={(row) => row.categoryId ? (
                                <RowActionBtn
                                    title="Odepnij od kategorii"
                                    onClick={() => handleUnpinService(row.id, row.categoryId!)}
                                >
                                    ✕
                                </RowActionBtn>
                            ) : null}
                        />
                    </TableColumn>
                </TablesGrid>
            </Section>

            <CategoryFormModal
                isOpen={isFormModalOpen}
                onClose={handleCloseModal}
                category={editingCategory}
            />

            <PeriodDetailDrawer
                period={drillPeriod}
                granularity={granularity}
                categoryId={selectedCategoryId}
                categoryName={selectedCategory?.name ?? null}
                onClose={() => setDrillPeriod(null)}
            />
        </ViewContainer>
    );
};
