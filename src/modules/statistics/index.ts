// src/modules/statistics/index.ts
export { StatisticsView } from './views/StatisticsView';
export { CategoryDetailView } from './views/CategoryDetailView';
export { CostsView } from './views/CostsView';

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
} from './types';
