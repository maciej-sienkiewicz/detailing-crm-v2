import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardRevenueSummary } from '../types';

export const useDashboardRevenue = (weeks = 13) =>
    useQuery<DashboardRevenueSummary>({
        queryKey: ['dashboard', 'revenue-summary', weeks],
        queryFn: () => dashboardApi.getRevenueSummary(weeks),
        staleTime: 0,
    });
