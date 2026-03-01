// src/modules/statistics/views/StatisticsView.tsx
import { useState, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { StatsFilters } from '../components/StatsFilters';
import { StatsTotalsBar } from '../components/StatsTotalsBar';
import { StatsChart } from '../components/StatsChart';
import { BreakdownTable } from '../components/BreakdownTable';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { useCategories, useDeleteCategory, useAssignService, useUnassignService } from '../hooks/useCategories';
import { useBreakdown, useCategoryStats } from '../hooks/useStats';
import type { Category, Granularity } from '../types';

// ─── Layout ──────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
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

const PageHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
    }
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

// ─── Chart area ───────────────────────────────────────────────────────────────

// Banner is always rendered to avoid layout shift when a category is selected.
// Visibility is toggled via opacity/pointer-events so height stays constant.
const SelectedCategoryBanner = styled.div<{ $visible: boolean }>`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    opacity: ${props => props.$visible ? 1 : 0};
    pointer-events: ${props => props.$visible ? 'auto' : 'none'};
    transition: opacity 0.15s ease;
`;

const ClearSelectionBtn = styled.button`
    margin-left: auto;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;

    &:hover {
        color: ${props => props.theme.colors.text};
        border-color: ${props => props.theme.colors.text};
    }
`;

// ─── Two-column breakdown ─────────────────────────────────────────────────────

const TablesGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.lg};
    align-items: start;

    @media (max-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr;
    }
`;

const TableColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    min-width: 0;
`;

const TableColumnHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const TableColumnTitle = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TableColumnControls = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-shrink: 0;
`;

const ServiceTableFilterLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
`;

const DragHint = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

// ─── Common ───────────────────────────────────────────────────────────────────

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
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
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ChartArea = styled.div<{ $fading: boolean }>`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    opacity: ${props => props.$fading ? 0.4 : 1};
    transform: ${props => props.$fading ? 'scale(0.995)' : 'scale(1)'};
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: ${props => props.$fading ? 'none' : 'auto'};
`;

const ErrorText = styled.p`
    color: ${props => props.theme.colors.error};
    font-size: ${props => props.theme.fontSizes.sm};
    text-align: center;
`;

const RetryButton = styled.button`
    margin-top: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: transparent;
    border: 1px solid ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    cursor: pointer;
`;

const RowActionBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    font-size: 13px;
    cursor: pointer;
    color: ${props => props.theme.colors.textMuted};
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        color: ${props => props.theme.colors.text};
        border-color: ${props => props.theme.colors.text};
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

// ─── Component ────────────────────────────────────────────────────────────────

export const StatisticsView = () => {
    const [granularity, setGranularity] = useState<Granularity>('MONTHLY');
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate, setEndDate] = useState(today());
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // ── Single breakdown call replaces all N+M stats fetches ─────────────────
    const {
        breakdown,
        isLoading: breakdownLoading,
        isFetching: breakdownFetching,
        isError: breakdownError,
        refetch: breakdownRefetch,
    } = useBreakdown(granularity, startDate, endDate);

    // ── Per-category chart (only when a category is selected) ─────────────────
    const { stats: categoryStats, isLoading: catStatsLoading, isFetching: catStatsFetching } = useCategoryStats(
        selectedCategoryId || '',
        granularity,
        startDate,
        endDate
    );

    // ── Category list for management (edit / delete actions) ──────────────────
    const {
        categories,
        isLoading: catLoading,
        isError: catError,
        refetch: catRefetch,
    } = useCategories();

    const deleteMutation = useDeleteCategory();
    const assignMutation = useAssignService();
    const unassignMutation = useUnassignService();

    // ── Derived data from breakdown ───────────────────────────────────────────

    const selectedCategory = selectedCategoryId
        ? categories.find(c => c.id === selectedCategoryId) ?? null
        : null;

    const chartData = selectedCategoryId ? categoryStats : breakdown?.overview;
    // isLoading: true only on first fetch (no cached data yet) → show spinner
    // isFetching: true on any background refetch → show subtle fade instead
    const chartInitialLoading = selectedCategoryId ? catStatsLoading : breakdownLoading;
    const chartFetching = selectedCategoryId ? catStatsFetching : breakdownFetching;

    // Keep the last successfully loaded data so the ChartArea never unmounts
    // during transitions (e.g. first category selection). The chart fades via
    // $fading while stale data is shown, then snaps to fresh data — no scroll jump.
    const lastChartDataRef = useRef(chartData);
    if (chartData !== undefined) lastChartDataRef.current = chartData;
    const displayData = chartData ?? lastChartDataRef.current;

    const unassignedCount = breakdown?.unassignedServices.length ?? 0;

    // Color lookup: serviceId → category color (for "all services" view)
    const serviceCategoryColor = useMemo(() => {
        const map = new Map<string, string>();
        breakdown?.categories.forEach(cat => {
            if (cat.color) {
                cat.services.forEach(s => map.set(s.serviceId, cat.color!));
            }
        });
        return map;
    }, [breakdown]);

    // Service rows for the right-side table
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

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleCategoryRowClick = (id: string) => {
        setSelectedCategoryId(prev => prev === id ? null : id);
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

    /** Drag service from right table → drop on category row in left table */
    const handleAssignServiceToCategory = async (serviceId: string, categoryId: string) => {
        await assignMutation.mutateAsync({ categoryId, serviceId });
    };

    /** Unpin button in service rows — works regardless of which category is selected */
    const handleUnpinService = async (serviceId: string, categoryId: string) => {
        await unassignMutation.mutateAsync({ categoryId, serviceId });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ViewContainer>
            <PageHeader>
                <PageTitle>{t.statistics.title}</PageTitle>
            </PageHeader>

            <Section>
                <StatsFilters
                    granularity={granularity}
                    startDate={startDate}
                    endDate={endDate}
                    onGranularityChange={setGranularity}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                />

                {/* Initial spinner — only on very first load before any data is available */}
                {chartInitialLoading && !displayData && (
                    <LoadingOverlay><Spinner /></LoadingOverlay>
                )}

                {breakdownError && !selectedCategoryId && (
                    <div style={{ textAlign: 'center' }}>
                        <ErrorText>{t.statistics.overview.error}</ErrorText>
                        <RetryButton onClick={() => breakdownRefetch()}>{t.common.retry}</RetryButton>
                    </div>
                )}

                {/* Always rendered — prevents layout shift when category is selected */}
                <SelectedCategoryBanner $visible={!!selectedCategory}>
                    <span style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: selectedCategory?.color ?? 'transparent',
                        flexShrink: 0,
                    }} />
                    <span>
                        {t.statistics.overview.title}: <strong>{selectedCategory?.name ?? ''}</strong>
                    </span>
                    <ClearSelectionBtn onClick={() => setSelectedCategoryId(null)}>
                        ✕ Wszystkie kategorie
                    </ClearSelectionBtn>
                </SelectedCategoryBanner>

                {/* Chart stays mounted via displayData (last known); fades during transitions — no scroll jump */}
                {displayData && (
                    <ChartArea $fading={chartFetching || (chartInitialLoading && !chartData)}>
                        <StatsTotalsBar totals={displayData.totals} />
                        <StatsChart data={displayData.data} />
                    </ChartArea>
                )}

                {/* ── Two-column breakdown ─────────────────────────────── */}
                <TablesGrid>
                    {/* LEFT: Categories */}
                    <TableColumn>
                        <TableColumnHeader>
                            <TableColumnTitle>{t.statistics.breakdown.categoriesTitle}</TableColumnTitle>
                            <TableColumnControls>
                                <AddButton
                                    onClick={() => { setEditingCategory(undefined); setIsFormModalOpen(true); }}
                                >
                                    + {t.statistics.categories.add}
                                </AddButton>
                            </TableColumnControls>
                        </TableColumnHeader>

                        {catLoading && <LoadingOverlay><Spinner /></LoadingOverlay>}
                        {catError && (
                            <div style={{ textAlign: 'center' }}>
                                <ErrorText>{t.statistics.categories.error}</ErrorText>
                                <RetryButton onClick={() => catRefetch()}>{t.common.retry}</RetryButton>
                            </div>
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

                        {!selectedCategoryId && unassignedCount > 0 && (
                            <DragHint>
                                ⚠ {unassignedCount} usług bez kategorii — przeciągnij na wybraną kategorię po lewej.
                            </DragHint>
                        )}

                        <BreakdownTable
                            rows={serviceRows}
                            isLoading={breakdownLoading}
                            showColorDot={!selectedCategoryId}
                            emptyText={
                                selectedCategoryId
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
        </ViewContainer>
    );
};
