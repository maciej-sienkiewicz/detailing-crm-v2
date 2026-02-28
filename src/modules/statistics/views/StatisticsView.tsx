// src/modules/statistics/views/StatisticsView.tsx
import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { StatsFilters } from '../components/StatsFilters';
import { StatsTotalsBar } from '../components/StatsTotalsBar';
import { StatsChart } from '../components/StatsChart';
import { BreakdownTable } from '../components/BreakdownTable';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { useCategories, useCategoriesDetails, useAssignServices } from '../hooks/useCategories';
import { useOverviewStats, useCategoriesBreakdown, useServicesBreakdown, useUnassignedServices } from '../hooks/useStats';
import type { Category, Granularity } from '../types';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1600px;
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
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
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

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
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

// — Category filter pill (shown when a category is selected) —

const CategoryPill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: 5px ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    width: fit-content;
`;

const PillDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.$color};
    flex-shrink: 0;
`;

const PillName = styled.span`
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const PillEditBtn = styled.button`
    border: none;
    background: none;
    padding: 0 2px;
    font-size: 13px;
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    line-height: 1;

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const PillClearBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    font-size: 11px;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;

    &:hover {
        background: ${props => props.theme.colors.error};
        color: white;
    }
`;

// — Breakdown section —

const BreakdownHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
`;

const SegmentedControl = styled.div`
    display: flex;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: 3px;
    gap: 2px;
`;

const SegmentBtn = styled.button<{ $active: boolean }>`
    padding: 5px ${props => props.theme.spacing.md};
    border-radius: 6px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all ${props => props.theme.transitions.fast};
    background: ${props => props.$active ? props.theme.colors.surface : 'transparent'};
    color: ${props => props.$active ? props.theme.colors.text : props.theme.colors.textMuted};
    box-shadow: ${props => props.$active ? props.theme.shadows.sm : 'none'};

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const UnassignedSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.lg};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const UnassignedLabel = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.warning};
`;

const today = () => new Date().toISOString().slice(0, 10);
const oneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
};

export const StatisticsView = () => {
    const [granularity, setGranularity] = useState<Granularity>('MONTHLY');
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate, setEndDate] = useState(today());
    const [breakdownMode, setBreakdownMode] = useState<'categories' | 'services'>('categories');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>();
    // Drag & drop state
    const [draggingServiceId, setDraggingServiceId] = useState<string | null>(null);
    const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

    const { stats, isLoading: statsLoading, isError: statsError, refetch: statsRefetch } = useOverviewStats(granularity, startDate, endDate);
    const { categories } = useCategories(false);
    const assignMutation = useAssignServices();

    const activeCategoryIds = categories.filter(c => c.isActive).map(c => c.id);

    const { categoriesStats, isLoading: catBreakdownLoading } = useCategoriesBreakdown(
        activeCategoryIds,
        granularity,
        startDate,
        endDate
    );

    const { categoriesDetails, isLoading: catDetailsLoading } = useCategoriesDetails(activeCategoryIds);

    const allServiceIds = useMemo(
        () => categoriesDetails.flatMap(cd => cd.services.map(s => s.serviceId)),
        [categoriesDetails]
    );

    const serviceCategoryColor = useMemo(() => {
        const map = new Map<string, string>();
        categoriesDetails.forEach(cd => {
            const cat = categories.find(c => c.id === cd.id);
            if (cat?.color) {
                cd.services.forEach(s => map.set(s.serviceId, cat.color!));
            }
        });
        return map;
    }, [categoriesDetails, categories]);

    const { servicesStats, isLoading: servicesLoading } = useServicesBreakdown(
        allServiceIds,
        granularity,
        startDate,
        endDate
    );

    const { services: unassignedList } = useUnassignedServices();
    const unassignedIds = useMemo(() => unassignedList.map(s => s.serviceId), [unassignedList]);
    const { servicesStats: unassignedStats, isLoading: unassignedLoading } = useServicesBreakdown(
        unassignedIds,
        granularity,
        startDate,
        endDate
    );

    // Determine what to show in the chart/KPIs
    const selectedCatStats = selectedCategoryId
        ? categoriesStats.find(cs => cs.categoryId === selectedCategoryId)
        : null;
    const selectedCat = selectedCategoryId
        ? categories.find(c => c.id === selectedCategoryId)
        : null;
    const displayTotals = selectedCatStats ? selectedCatStats.totals : stats?.totals;
    const displayChartData = selectedCatStats ? selectedCatStats.data : stats?.data ?? [];

    const hasBreakdownData =
        categoriesStats.length > 0 || catBreakdownLoading ||
        servicesStats.length > 0 || servicesLoading;

    // — Handlers —

    const handleCategoryClick = (id: string) => {
        setSelectedCategoryId(prev => (prev === id ? null : id));
    };

    const handleServiceDragStart = (serviceId: string) => {
        setDraggingServiceId(serviceId);
        // Reveal the categories drop target
        setBreakdownMode('categories');
    };

    const handleDragEnd = () => {
        setDraggingServiceId(null);
        setDragOverCategoryId(null);
    };

    const handleServiceDropOnCategory = (categoryId: string) => {
        if (!draggingServiceId) return;
        const existing = categoriesDetails.find(cd => cd.id === categoryId);
        const existingIds = existing?.services.map(s => s.serviceId) ?? [];
        if (!existingIds.includes(draggingServiceId)) {
            assignMutation.mutate({ categoryId, serviceIds: [...existingIds, draggingServiceId] });
        }
        setDraggingServiceId(null);
        setDragOverCategoryId(null);
    };

    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setEditingCategory(undefined);
    };

    return (
        <ViewContainer>
            <PageHeader>
                <PageTitle>{t.statistics.title}</PageTitle>
                <AddButton onClick={() => { setEditingCategory(undefined); setIsFormModalOpen(true); }}>
                    + {t.statistics.categories.add}
                </AddButton>
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

                {statsLoading && (
                    <LoadingOverlay><Spinner /></LoadingOverlay>
                )}

                {statsError && (
                    <div style={{ textAlign: 'center' }}>
                        <ErrorText>{t.statistics.overview.error}</ErrorText>
                        <RetryButton onClick={() => statsRefetch()}>{t.common.retry}</RetryButton>
                    </div>
                )}

                {(stats || selectedCatStats) && displayTotals && (
                    <>
                        {selectedCat && (
                            <CategoryPill>
                                {selectedCat.color && <PillDot $color={selectedCat.color} />}
                                <PillName>{selectedCat.name}</PillName>
                                <PillEditBtn
                                    title="Edytuj kategorię"
                                    onClick={() => { setEditingCategory(selectedCat); setIsFormModalOpen(true); }}
                                >
                                    ✎
                                </PillEditBtn>
                                <PillClearBtn
                                    title="Pokaż wszystkie"
                                    onClick={() => setSelectedCategoryId(null)}
                                >
                                    ✕
                                </PillClearBtn>
                            </CategoryPill>
                        )}

                        <StatsTotalsBar totals={displayTotals} />
                        <StatsChart data={displayChartData} />
                    </>
                )}

                {hasBreakdownData && (
                    <>
                        <BreakdownHeader>
                            <SegmentedControl>
                                <SegmentBtn
                                    $active={breakdownMode === 'categories'}
                                    onClick={() => setBreakdownMode('categories')}
                                >
                                    {t.statistics.breakdown.viewCategories}
                                </SegmentBtn>
                                <SegmentBtn
                                    $active={breakdownMode === 'services'}
                                    onClick={() => setBreakdownMode('services')}
                                >
                                    {t.statistics.breakdown.viewServices}
                                </SegmentBtn>
                            </SegmentedControl>
                        </BreakdownHeader>

                        {breakdownMode === 'categories' && (
                            <BreakdownTable
                                rows={categoriesStats.map(cs => {
                                    const cat = categories.find(c => c.id === cs.categoryId);
                                    return {
                                        id: cs.categoryId,
                                        name: cs.categoryName,
                                        orderCount: cs.totals.orderCount,
                                        totalRevenueGross: cs.totals.totalRevenueGross,
                                        color: cat?.color ?? undefined,
                                    };
                                })}
                                isLoading={catBreakdownLoading}
                                showColorDot
                                selectedId={selectedCategoryId}
                                onRowClick={handleCategoryClick}
                                dropTargetRows
                                isDragInProgress={!!draggingServiceId}
                                dragOverRowId={dragOverCategoryId}
                                onRowDragOver={setDragOverCategoryId}
                                onTableDragLeave={() => setDragOverCategoryId(null)}
                                onRowDrop={handleServiceDropOnCategory}
                            />
                        )}

                        {breakdownMode === 'services' && (
                            <BreakdownTable
                                rows={servicesStats.map(s => ({
                                    id: s.serviceId,
                                    name: s.serviceName,
                                    orderCount: s.totals.orderCount,
                                    totalRevenueGross: s.totals.totalRevenueGross,
                                    isActive: s.isActive,
                                    color: serviceCategoryColor.get(s.serviceId),
                                }))}
                                isLoading={servicesLoading || catDetailsLoading}
                                showColorDot
                            />
                        )}

                        {unassignedIds.length > 0 && (
                            <UnassignedSection>
                                <UnassignedLabel>
                                    ⚠ {t.statistics.breakdown.unassignedTitle} ({unassignedIds.length})
                                </UnassignedLabel>
                                <BreakdownTable
                                    rows={unassignedStats.map(s => ({
                                        id: s.serviceId,
                                        name: s.serviceName,
                                        orderCount: s.totals.orderCount,
                                        totalRevenueGross: s.totals.totalRevenueGross,
                                        isActive: s.isActive,
                                    }))}
                                    isLoading={unassignedLoading}
                                    emptyText={t.statistics.breakdown.unassignedEmpty}
                                    draggableRows
                                    onRowDragStart={handleServiceDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            </UnassignedSection>
                        )}
                    </>
                )}
            </Section>

            <CategoryFormModal
                isOpen={isFormModalOpen}
                onClose={handleCloseModal}
                category={editingCategory}
            />
        </ViewContainer>
    );
};
