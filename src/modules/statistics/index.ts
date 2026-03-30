// src/modules/statistics/index.ts
export { StatisticsView } from './views/StatisticsView';
export { CategoryDetailView } from './views/CategoryDetailView';
export { DelayStatisticsView } from './views/DelayStatisticsView';

export {
    useCategories,
    useCategoryDetail,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
    useAssignService,
    useUnassignService,
} from './hooks/useCategories';

export { useBreakdown, useCategoryStats } from './hooks/useStats';
export { useDelayStats } from './hooks/useDelayStats';

export type {
    Category,
    CategoryDetail,
    CategoryService,
    StatsDataPoint,
    StatsTotals,
    CategoryStats,
    ServiceBreakdownItem,
    CategoryBreakdownItem,
    BreakdownStats,
    Granularity,
    DelayStats,
    DelayOverview,
    DelayTrendPoint,
    ServiceDelayItem,
} from './types';
