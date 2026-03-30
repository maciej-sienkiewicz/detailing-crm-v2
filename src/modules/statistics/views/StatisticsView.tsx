// src/modules/statistics/views/StatisticsView.tsx
import { useState, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { StatsFilters } from '../components/StatsFilters';
import { StatsTotalsBar } from '../components/StatsTotalsBar';
import { StatsChart } from '../components/StatsChart';
import { BreakdownTable } from '../components/BreakdownTable';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { StatsNav } from '../components/StatsNav';
import { useCategories, useDeleteCategory, useAssignService, useUnassignService } from '../hooks/useCategories';
import { useBreakdown, useCategoryStats } from '../hooks/useStats';
import type { Category, Granularity } from '../types';
import { st } from '../components/StatisticsTheme';

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

const PageHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: 4px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
    }
`;

const PageTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
`;

const PageSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
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

// ─── Component ────────────────────────────────────────────────────────────────

export const StatisticsView = () => {
    const [granularity, setGranularity] = useState<Granularity>('MONTHLY');
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate, setEndDate] = useState(today());
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | undefined>();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

    const handleAssignServiceToCategory = async (serviceId: string, categoryId: string) => {
        await assignMutation.mutateAsync({ categoryId, serviceId });
    };

    const handleUnpinService = async (serviceId: string, categoryId: string) => {
        await unassignMutation.mutateAsync({ categoryId, serviceId });
    };

    return (
        <ViewContainer>
            {/* ── Page header ──────────────────────────────── */}
            <PageHeader>
                <PageTitleGroup>
                    <PageTitle>{t.statistics.title}</PageTitle>
                    <PageSubtitle>Analiza przychodów i struktury usług</PageSubtitle>
                </PageTitleGroup>
                <StatsNav />
            </PageHeader>

            {/* ── Filters ──────────────────────────────────── */}
            <Section>
                <StatsFilters
                    granularity={granularity}
                    startDate={startDate}
                    endDate={endDate}
                    onGranularityChange={setGranularity}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
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
                        <StatsChart data={displayData.data} />
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
