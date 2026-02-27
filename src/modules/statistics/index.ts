// src/modules/statistics/index.ts
export { StatisticsView } from './views/StatisticsView';
export { CategoryDetailView } from './views/CategoryDetailView';

export {
    useCategories,
    useCategoryDetail,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
    useAssignServices,
} from './hooks/useCategories';

export { useCategoryStats, useOverviewStats, useUnassignedServices } from './hooks/useStats';

export type {
    Category,
    CategoryDetail,
    CategoryService,
    StatsDataPoint,
    StatsTotals,
    CategoryStats,
    OverviewStats,
    UnassignedService,
    Granularity,
} from './types';
