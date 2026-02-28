// src/modules/statistics/views/StatisticsView.tsx
import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { Toggle } from '@/common/components/Toggle';
import { EmptyState } from '@/common/components/EmptyState';
import { StatsFilters } from '../components/StatsFilters';
import { StatsTotalsBar } from '../components/StatsTotalsBar';
import { StatsChart } from '../components/StatsChart';
import { BreakdownTable } from '../components/BreakdownTable';
import { CategoryCard } from '../components/CategoryCard';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { useCategories, useCategoriesDetails, useDeleteCategory } from '../hooks/useCategories';
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
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
    }
`;

const TitleSection = styled.div``;

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

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
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

const SectionControls = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.lg};
`;

const CategoriesGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        grid-template-columns: repeat(3, 1fr);
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
    const [showInactive, setShowInactive] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>();
    const [breakdownMode, setBreakdownMode] = useState<'categories' | 'services'>('categories');

    const { stats, isLoading: statsLoading, isError: statsError, refetch: statsRefetch } = useOverviewStats(granularity, startDate, endDate);
    const { categories, isLoading: catLoading, isError: catError, refetch: catRefetch } = useCategories(showInactive);
    const deleteMutation = useDeleteCategory();

    const activeCategoryIds = categories.filter(c => c.isActive).map(c => c.id);

    // Category-level breakdown (existing)
    const { categoriesStats, isLoading: catBreakdownLoading } = useCategoriesBreakdown(
        activeCategoryIds,
        granularity,
        startDate,
        endDate
    );

    // Fetch details of all active categories to get their service lists
    const { categoriesDetails, isLoading: catDetailsLoading } = useCategoriesDetails(activeCategoryIds);

    // Collect all service IDs from all active categories
    const allServiceIds = useMemo(
        () => categoriesDetails.flatMap(cd => cd.services.map(s => s.serviceId)),
        [categoriesDetails]
    );

    // Build serviceId → category color lookup
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

    // Service-level breakdown across all categories
    const { servicesStats, isLoading: servicesLoading } = useServicesBreakdown(
        allServiceIds,
        granularity,
        startDate,
        endDate
    );

    // Unassigned services
    const { services: unassignedList } = useUnassignedServices();
    const unassignedIds = useMemo(() => unassignedList.map(s => s.serviceId), [unassignedList]);
    const { servicesStats: unassignedStats, isLoading: unassignedLoading } = useServicesBreakdown(
        unassignedIds,
        granularity,
        startDate,
        endDate
    );

    const hasBreakdownData = categoriesStats.length > 0 || catBreakdownLoading || servicesStats.length > 0 || servicesLoading;

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setIsFormModalOpen(true);
    };

    const handleDeleteCategory = async (category: Category) => {
        if (window.confirm(t.statistics.categories.deleteConfirm.replace('{name}', category.name))) {
            await deleteMutation.mutateAsync(category.id);
        }
    };

    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setEditingCategory(undefined);
    };

    return (
        <ViewContainer>
            <PageHeader>
                <TitleSection>
                    <PageTitle>{t.statistics.title}</PageTitle>
                </TitleSection>
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

                {stats && (
                    <>
                        <StatsTotalsBar totals={stats.totals} />
                        <StatsChart data={stats.data} />
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
                                />
                            </UnassignedSection>
                        )}
                    </>
                )}
            </Section>

            <Section>
                <SectionHeader>
                    <SectionTitle>{t.statistics.categories.title}</SectionTitle>
                    <SectionControls>
                        <Toggle
                            checked={showInactive}
                            onChange={setShowInactive}
                            label={t.statistics.categories.showInactive}
                        />
                        <AddButton onClick={() => { setEditingCategory(undefined); setIsFormModalOpen(true); }}>
                            + {t.statistics.categories.add}
                        </AddButton>
                    </SectionControls>
                </SectionHeader>

                {catLoading && (
                    <LoadingOverlay><Spinner /></LoadingOverlay>
                )}

                {catError && (
                    <div style={{ textAlign: 'center' }}>
                        <ErrorText>{t.statistics.categories.error}</ErrorText>
                        <RetryButton onClick={() => catRefetch()}>{t.common.retry}</RetryButton>
                    </div>
                )}

                {!catLoading && !catError && categories.length === 0 && (
                    <EmptyState
                        title={t.statistics.categories.empty.title}
                        description={t.statistics.categories.empty.description}
                    />
                )}

                {categories.length > 0 && (
                    <CategoriesGrid>
                        {categories.map(category => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                onEdit={handleEditCategory}
                                onDelete={handleDeleteCategory}
                            />
                        ))}
                    </CategoriesGrid>
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
