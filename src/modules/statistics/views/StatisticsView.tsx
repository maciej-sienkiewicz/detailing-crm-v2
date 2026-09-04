// src/modules/statistics/views/StatisticsView.tsx
import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { t } from '@/common/i18n';
import { PageHeader } from '@/common/components/PageHeader';
import { StatsChart } from '../components/StatsChart';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { PeriodDetailDrawer } from '../components/PeriodDetailDrawer';
import { StatsNav } from '../components/StatsNav';
import { StatsMobileOverview } from '../components/StatsMobileOverview';
import { useMediaQuery } from '@/common/hooks';
import { useCategories, useDeleteCategory, useAssignService, useUnassignService } from '../hooks/useCategories';
import { useBreakdown, useCategoryStats } from '../hooks/useStats';
import type { Category, Granularity } from '../types';
import { st } from '../components/StatisticsTheme';
import {
    // layout
    ViewContainer, Section, SectionHeading, SectionTitle, SectionRule,
    TablesHeaderRow, TablesGrid, TableColumn, TableColumnHeader, TableColumnTitle,
    HdrBtns,
    // KPI + charts
    KpiRow, KpiCard, KpiLabel, KpiValue,
    ChartsRow, ChartCard, ChartTitle,
    Spinner, LoadingOverlay, ErrorBox, ErrorText, RetryButton,
    // tables
    CatTable, CatRow, CatDot, CatName, CatMeta, CatActions, IconBtn,
    TableEmpty, TableLoading,
    ItemsTable, ItemsHeader, ItemRow, ItemName, ItemMeta, CatBadge, KebabBtn,
    // filters / buttons
    FilterBar, FilterBtn, SearchInput, ClearFilterBtn, AddButton, DragHint,
    // pie
    CategorySharePie, buildCategoryShareSlices, type PieSliceDatum,
    // context menu
    CategoryAssignMenu, ctxMenuPosition,
    // date picker + helpers
    HeaderDatePicker,
    fmtPLNFromGrosz, today, currentMonthStart,
} from '../components/shared';

// ─── View-specific styled ─────────────────────────────────────────────────────

const SelectedCategoryBanner = styled.div<{ $visible: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: ${p => p.$visible ? '10px 16px' : '0 16px'};
    background: ${st.accentBlueDim};
    border: 1px solid ${st.accentBlue}33;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    max-height: ${p => p.$visible ? '60px' : '0'};
    overflow: hidden;
    opacity: ${p => p.$visible ? 1 : 0};
    pointer-events: ${p => p.$visible ? 'auto' : 'none'};
    transition: max-height 0.2s ease, opacity 0.15s ease, padding 0.2s ease;
`;

const ChartArea = styled.div<{ $fading: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 16px;
    opacity: ${p => p.$fading ? 0.4 : 1};
    transform: ${p => p.$fading ? 'scale(0.995)' : 'scale(1)'};
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: ${p => p.$fading ? 'none' : 'auto'};
`;

const ManageToggle = styled.button<{ $open: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    padding: 13px 16px;
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: ${p => (p.$open ? st.text : st.textSecondary)};
    text-align: left;
    cursor: pointer;
`;

const ManageChevron = styled.svg<{ $open: boolean }>`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: ${st.textMuted};
    transform: rotate(${p => (p.$open ? '180deg' : '0deg')});
    transition: transform 0.18s ease;
`;

const ManageHint = styled.div`
    padding: 10px 14px;
    background: ${st.bgAccentAmber};
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: ${st.radiusSm};
    font-size: 12.5px;
    line-height: 1.45;
    color: #92400E;
`;

const InactiveBadge = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 400;
    white-space: nowrap;
`;

// ─── Component ────────────────────────────────────────────────────────────────

type AssignmentFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED';

interface ServiceRow {
    id: string;
    name: string;
    orderCount: number;
    totalRevenueGross: number;
    isActive: boolean;
    categoryId: string | null;
    categoryName: string | null;
    categoryColor: string | null;
}

type ServiceCtxMenu = {
    serviceId: string;
    categoryId: string | null;
    x: number;
    y: number;
};

export const StatisticsView = () => {
    // Domyślnie bieżący miesiąc: to okres, o który właściciel pyta najczęściej,
    // a roczny zakres kazał przy każdym wejściu szukać aktualnych liczb.
    const [granularity, setGranularity] = useState<Granularity>('DAILY');
    const [startDate, setStartDate] = useState(currentMonthStart());
    const [endDate, setEndDate] = useState(today());
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [drillPeriod, setDrillPeriod] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('ALL');
    const [catDragOver, setCatDragOver] = useState<string | null>(null);
    const [ctxMenu, setCtxMenu] = useState<ServiceCtxMenu | null>(null);
    const isMobile = useMediaQuery('(max-width: 639px)');
    // Zarządzanie kategoriami na telefonie jest schowane: to praca warsztatowa
    // (przypisz usługę, popraw nazwę), a nie powód, dla którego ktoś zagląda
    // w statystyki z telefonu.
    const [manageOpen, setManageOpen] = useState(false);

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

    // Podczas przełączania kategorii trzymamy ostatnie dane, żeby wykres nie znikał
    const [lastChartData, setLastChartData] = useState(chartData);
    if (chartData !== undefined && chartData !== lastChartData) setLastChartData(chartData);
    const displayData = chartData ?? lastChartData;

    const unassignedCount = breakdown?.unassignedServices.length ?? 0;

    // ── KPI (podąża za wyborem kategorii, baner wyjaśnia kontekst) ──────────
    const totals = displayData?.totals;
    const avgOrderGross = totals && totals.orderCount > 0
        ? totals.totalRevenueGross / totals.orderCount
        : 0;

    // ── Donut: udział kategorii w przychodach całego okresu ──────────────────
    const pieSlices = useMemo<PieSliceDatum[]>(() => {
        if (!breakdown) return [];
        const cats = breakdown.categories.map(c => ({
            categoryId: c.categoryId,
            name:       c.categoryName,
            color:      c.color,
            value:      c.totals.totalRevenueGross / 100,
            itemCount:  c.services.length,
        }));
        const unassignedGross = breakdown.unassignedServices
            .reduce((s, x) => s + x.totals.totalRevenueGross, 0);
        return buildCategoryShareSlices(cats, {
            value:     unassignedGross / 100,
            itemCount: breakdown.unassignedServices.length,
        });
    }, [breakdown]);

    // ── Wiersze usług (prawy panel) ───────────────────────────────────────────
    const serviceRows = useMemo<ServiceRow[]>(() => {
        if (!breakdown) return [];

        const assigned = breakdown.categories.flatMap(cat =>
            cat.services.map(s => ({
                id: s.serviceId,
                name: s.serviceName,
                orderCount: s.totals.orderCount,
                totalRevenueGross: s.totals.totalRevenueGross,
                isActive: s.isActive,
                categoryId: cat.categoryId as string | null,
                categoryName: cat.categoryName as string | null,
                categoryColor: cat.color,
            }))
        );

        const unassigned = breakdown.unassignedServices.map(s => ({
            id: s.serviceId,
            name: s.serviceName,
            orderCount: s.totals.orderCount,
            totalRevenueGross: s.totals.totalRevenueGross,
            isActive: s.isActive,
            categoryId: null,
            categoryName: null,
            categoryColor: null,
        }));

        return [...assigned, ...unassigned].sort((a, b) => b.totalRevenueGross - a.totalRevenueGross);
    }, [breakdown]);

    const filteredServiceRows = useMemo(() => {
        let rows = serviceRows;
        if (selectedCategoryId) rows = rows.filter(r => r.categoryId === selectedCategoryId);
        if (assignmentFilter === 'UNASSIGNED') rows = rows.filter(r => !r.categoryId);
        if (assignmentFilter === 'ASSIGNED') rows = rows.filter(r => r.categoryId);
        const q = search.trim().toLowerCase();
        if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q));
        return rows;
    }, [serviceRows, selectedCategoryId, assignmentFilter, search]);

    // ── Handlers ──────────────────────────────────────────────────────────────

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

    const handleAssignService = (serviceId: string, categoryId: string) => {
        assignMutation.mutate({ categoryId, serviceId });
    };

    const handleUnassignService = (serviceId: string, categoryId: string) => {
        unassignMutation.mutate({ categoryId, serviceId });
    };

    const openServiceMenu = (e: React.MouseEvent<HTMLButtonElement>, row: ServiceRow) => {
        e.stopPropagation();
        const { x, y } = ctxMenuPosition(e.currentTarget.getBoundingClientRect());
        setCtxMenu({ serviceId: row.id, categoryId: row.categoryId, x, y });
    };

    const handleCtxAssign = (categoryId: string) => {
        if (!ctxMenu) return;
        setCtxMenu(null);
        if (categoryId !== ctxMenu.categoryId) {
            handleAssignService(ctxMenu.serviceId, categoryId);
        }
    };

    const handleCtxUnassign = () => {
        if (!ctxMenu?.categoryId) return;
        setCtxMenu(null);
        handleUnassignService(ctxMenu.serviceId, ctxMenu.categoryId);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ViewContainer>
            <PageHeader
                title={t.statistics.title}
                subtitle="Analiza przychodów i struktury usług"
                actions={
                    <HdrBtns>
                        <HeaderDatePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartChange={setStartDate}
                            onEndChange={setEndDate}
                            onGranularityChange={setGranularity}
                            granularity={granularity}
                        />
                        <StatsNav />
                    </HdrBtns>
                }
            />

            {/* ── Overview section ─────────────────────────── */}
            <Section>
                <SectionHeading>
                    <SectionTitle>Przegląd przychodów</SectionTitle>
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
                    <CatDot $color={selectedCategory?.color ?? 'transparent'} />
                    <span>
                        {t.statistics.overview.title}: <strong>{selectedCategory?.name ?? ''}</strong>
                    </span>
                    <ClearFilterBtn style={{ marginLeft: 'auto' }} onClick={() => setSelectedCategoryId(null)}>
                        ✕ Wszystkie kategorie
                    </ClearFilterBtn>
                </SelectedCategoryBanner>

                {displayData && isMobile && (
                    <ChartArea $fading={chartFetching || (chartInitialLoading && !chartData)}>
                        <StatsMobileOverview
                            chart={<StatsChart data={displayData.data} onBarClick={setDrillPeriod} />}
                            points={displayData.data}
                            totals={displayData.totals}
                            granularity={granularity}
                            categories={breakdown?.categories ?? []}
                            unassigned={breakdown?.unassignedServices ?? []}
                            selectedCategoryId={selectedCategoryId}
                            onSelectCategory={setSelectedCategoryId}
                        />
                    </ChartArea>
                )}

                {displayData && !isMobile && (
                    <ChartArea $fading={chartFetching || (chartInitialLoading && !chartData)}>
                        <KpiRow>
                            <KpiCard $accent="#10B981">
                                <KpiLabel>Łączny przychód brutto</KpiLabel>
                                <KpiValue>{fmtPLNFromGrosz(displayData.totals.totalRevenueGross)}</KpiValue>
                            </KpiCard>
                            <KpiCard $accent="#3B82F6">
                                <KpiLabel>Liczba zleceń</KpiLabel>
                                <KpiValue>{displayData.totals.orderCount.toLocaleString('pl-PL')}</KpiValue>
                            </KpiCard>
                            <KpiCard $accent="#8B5CF6">
                                <KpiLabel>Średnia wartość zlecenia</KpiLabel>
                                <KpiValue>{fmtPLNFromGrosz(avgOrderGross)}</KpiValue>
                            </KpiCard>
                        </KpiRow>

                        <ChartsRow>
                            <ChartCard>
                                <ChartTitle>Struktura przychodów wg kategorii</ChartTitle>
                                <CategorySharePie
                                    slices={pieSlices}
                                    isLoading={breakdownLoading}
                                    selectedCategoryId={selectedCategoryId}
                                    onSelectCategory={setSelectedCategoryId}
                                    ariaLabel="Udział kategorii w przychodach"
                                    countNoun="usł."
                                />
                            </ChartCard>

                            <StatsChart
                                data={displayData.data}
                                onBarClick={setDrillPeriod}
                            />
                        </ChartsRow>
                    </ChartArea>
                )}
            </Section>

            {/* ── Breakdown section ─────────────────────────── */}
            <Section>
                {isMobile ? (
                    <ManageToggle onClick={() => setManageOpen(v => !v)} $open={manageOpen}>
                        <span>Zarządzanie kategoriami i usługami</span>
                        <ManageChevron $open={manageOpen} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="6 9 12 15 18 9" />
                        </ManageChevron>
                    </ManageToggle>
                ) : (
                    <SectionHeading>
                        <SectionTitle>Podział według kategorii</SectionTitle>
                        <SectionRule />
                    </SectionHeading>
                )}

                {isMobile && manageOpen && (
                    <ManageHint>
                        Przypisywanie usług przeciąganiem działa na komputerze - tutaj użyj menu ⋮ w wierszu usługi.
                    </ManageHint>
                )}

                {(!isMobile || manageOpen) && (
                <>
                <TablesHeaderRow>
                    {/* LEFT header */}
                    <TableColumnHeader>
                        <TableColumnTitle>Kategorie usług</TableColumnTitle>
                        <AddButton onClick={() => { setEditingCategory(undefined); setIsFormModalOpen(true); }}>
                            <Plus /> {t.statistics.categories.add}
                        </AddButton>
                    </TableColumnHeader>

                    {/* RIGHT header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <TableColumnHeader>
                            <TableColumnTitle>
                                {selectedCategory ? selectedCategory.name : 'Usługi'}
                            </TableColumnTitle>
                            {selectedCategoryId && (
                                <ClearFilterBtn onClick={() => setSelectedCategoryId(null)}>
                                    ✕ Pokaż wszystkie
                                </ClearFilterBtn>
                            )}
                        </TableColumnHeader>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <FilterBar>
                                <FilterBtn $active={assignmentFilter === 'ALL'} onClick={() => setAssignmentFilter('ALL')}>Wszystkie</FilterBtn>
                                <FilterBtn $active={assignmentFilter === 'UNASSIGNED'} onClick={() => setAssignmentFilter('UNASSIGNED')}>Nieprzypisane</FilterBtn>
                                <FilterBtn $active={assignmentFilter === 'ASSIGNED'} onClick={() => setAssignmentFilter('ASSIGNED')}>Przypisane</FilterBtn>
                            </FilterBar>
                            <SearchInput
                                type="text"
                                placeholder="Szukaj po nazwie..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </TablesHeaderRow>

                <TablesGrid>
                    {/* ── LEFT: categories ───────────────────────────── */}
                    <TableColumn>
                        {catError && (
                            <ErrorBox>
                                <ErrorText>{t.statistics.categories.error}</ErrorText>
                                <RetryButton onClick={() => catRefetch()}>{t.common.retry}</RetryButton>
                            </ErrorBox>
                        )}

                        <CatTable
                            onDragLeave={e => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node))
                                    setCatDragOver(null);
                            }}
                        >
                            {(catLoading || breakdownLoading) && <TableLoading><Spinner /></TableLoading>}
                            {!catLoading && !breakdownLoading && (breakdown?.categories.length ?? 0) === 0 && (
                                <TableEmpty>
                                    Brak kategorii usług. Utwórz pierwszą, aby zacząć grupować przychody.
                                </TableEmpty>
                            )}
                            {!catLoading && !breakdownLoading && (breakdown?.categories ?? []).map(cs => {
                                const cat = categories.find(c => c.id === cs.categoryId);
                                const isSelected = selectedCategoryId === cs.categoryId;
                                return (
                                    <CatRow
                                        key={cs.categoryId}
                                        $selected={isSelected}
                                        $dragOver={catDragOver === cs.categoryId}
                                        onClick={() => setSelectedCategoryId(prev => prev === cs.categoryId ? null : cs.categoryId)}
                                        onDragOver={e => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setCatDragOver(cs.categoryId);
                                        }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            setCatDragOver(null);
                                            const serviceId = e.dataTransfer.getData('text/plain');
                                            if (serviceId) handleAssignService(serviceId, cs.categoryId);
                                        }}
                                    >
                                        <CatDot $color={cs.color ?? '#94A3B8'} />
                                        <CatName>{cs.categoryName}</CatName>
                                        <CatMeta>{fmtPLNFromGrosz(cs.totals.totalRevenueGross)}</CatMeta>
                                        <CatActions onClick={e => e.stopPropagation()}>
                                            {cat && (
                                                <>
                                                    <IconBtn title={t.common.edit} onClick={() => handleEditCategory(cat)}>
                                                        <Pencil />
                                                    </IconBtn>
                                                    <IconBtn title={t.common.delete} onClick={() => handleDeleteCategory(cat)}>
                                                        <Trash2 />
                                                    </IconBtn>
                                                </>
                                            )}
                                        </CatActions>
                                    </CatRow>
                                );
                            })}
                        </CatTable>
                    </TableColumn>

                    {/* ── RIGHT: services ─────────────────────────────── */}
                    <TableColumn>
                        {!selectedCategoryId && unassignedCount > 0 && (
                            <DragHint>
                                {isMobile
                                    ? `⚠ ${unassignedCount} usług bez kategorii - przypisz je menu ⋮ w wierszu.`
                                    : `⚠ ${unassignedCount} usług bez kategorii, przeciągnij na wybraną kategorię po lewej lub użyj menu ⋮ w wierszu.`}
                            </DragHint>
                        )}

                        <ItemsTable $maxHeight="min(560px, 70vh)">
                            {breakdownLoading && <TableLoading><Spinner /></TableLoading>}

                            {!breakdownLoading && (
                                <>
                                    <ItemsHeader>
                                        <span>Usługa</span>
                                        <span>Zlecenia</span>
                                        <span>Przychód</span>
                                        <span>Kategoria</span>
                                        <span />
                                    </ItemsHeader>
                                    {filteredServiceRows.length === 0 && (
                                        <TableEmpty>
                                            {search.trim()
                                                ? 'Brak usług pasujących do wyszukiwanej frazy'
                                                : assignmentFilter === 'UNASSIGNED'
                                                ? 'Brak usług bez kategorii'
                                                : selectedCategoryId
                                                ? 'Brak usług przypisanych do tej kategorii'
                                                : t.statistics.breakdown.empty}
                                        </TableEmpty>
                                    )}
                                    {filteredServiceRows.map(row => (
                                        <ItemRow
                                            key={row.id}
                                            $draggable
                                            draggable
                                            onDragStart={e => {
                                                e.dataTransfer.setData('text/plain', row.id);
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                        >
                                            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <ItemName title={row.name}>{row.name}</ItemName>
                                                {!row.isActive && (
                                                    <InactiveBadge>({t.statistics.categories.statusInactive.toLowerCase()})</InactiveBadge>
                                                )}
                                            </div>
                                            <ItemMeta>{row.orderCount}</ItemMeta>
                                            <ItemMeta>{fmtPLNFromGrosz(row.totalRevenueGross)}</ItemMeta>
                                            {row.categoryId ? (
                                                <CatBadge $color={row.categoryColor ?? undefined}>
                                                    {row.categoryName}
                                                </CatBadge>
                                            ) : (
                                                <span style={{ fontSize: st.fontXs, color: st.textMuted }}>-</span>
                                            )}
                                            <KebabBtn title="Opcje" onClick={e => openServiceMenu(e, row)}>⋮</KebabBtn>
                                        </ItemRow>
                                    ))}
                                </>
                            )}
                        </ItemsTable>
                    </TableColumn>
                </TablesGrid>
                </>
                )}
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

            {/* ── Context menu: przypisanie kategorii ───────── */}
            {ctxMenu && (
                <CategoryAssignMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    categories={categories}
                    onAssign={handleCtxAssign}
                    onUnassign={ctxMenu.categoryId ? handleCtxUnassign : undefined}
                    onClose={() => setCtxMenu(null)}
                />
            )}
        </ViewContainer>
    );
};
