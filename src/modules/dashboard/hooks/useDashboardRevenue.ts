import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardRevenueSummary } from '../types';

export const useDashboardRevenue = (months = 12) =>
    useQuery<DashboardRevenueSummary>({
        queryKey: ['dashboard', 'revenue-summary', months],
        queryFn: () => dashboardApi.getRevenueSummary(months),
        // Zestawienie z 12 miesięcy - przy każdym powrocie na pulpit i przewinięciu
        // karuzeli KPI było liczone od nowa.
        staleTime: STALE_TIME.summary,
    });
