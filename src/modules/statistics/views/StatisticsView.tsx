// src/modules/statistics/views/StatisticsView.tsx
import { useState } from 'react';
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
import { useCategories, useDeleteCategory } from '../hooks/useCategories';
import { useOverviewStats, useCategoriesBreakdown } from '../hooks/useStats';
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

const PageSubtitle = styled.p`
    margin: ${props => props.theme.spacing.xs} 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
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

const WarningBanner = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.warningLight};
    border: 1px solid ${props => props.theme.colors.warning};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
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

    const { stats, isLoading: statsLoading, isError: statsError, refetch: statsRefetch } = useOverviewStats(granularity, startDate, endDate);
    const { categories, isLoading: catLoading, isError: catError, refetch: catRefetch } = useCategories(showInactive);
    const deleteMutation = useDeleteCategory();

    const activeCategoryIds = categories.filter(c => c.isActive).map(c => c.id);
    const { categoriesStats, isLoading: catBreakdownLoading } = useCategoriesBreakdown(
        activeCategoryIds,
        granularity,
        startDate,
        endDate
    );

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
                    <PageSubtitle>{t.statistics.subtitle}</PageSubtitle>
                </TitleSection>
            </PageHeader>

            <Section>
                <SectionTitle>{t.statistics.overview.title}</SectionTitle>

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
                        {stats.unassignedServiceCount > 0 && (
                            <WarningBanner>
                                ⚠️ {t.statistics.overview.unassignedWarning.replace(
                                    '{count}',
                                    String(stats.unassignedServiceCount)
                                )}
                            </WarningBanner>
                        )}
                        <StatsTotalsBar totals={stats.totals} />
                        <StatsChart data={stats.data} />
                    </>
                )}

                {(categoriesStats.length > 0 || catBreakdownLoading) && (
                    <>
                        <SectionTitle style={{ marginTop: 0 }}>
                            {t.statistics.breakdown.categoriesTitle}
                        </SectionTitle>
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
