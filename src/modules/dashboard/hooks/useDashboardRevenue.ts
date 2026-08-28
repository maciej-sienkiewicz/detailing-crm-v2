import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardRevenueSummary } from '../types';

export const useDashboardRevenue = (months = 12) =>
    useQuery<DashboardRevenueSummary>({
        queryKey: ['dashboard', 'revenue-summary', months],
        queryFn: () => dashboardApi.getRevenueSummary(months),
    });
