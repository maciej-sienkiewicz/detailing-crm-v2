/**
 * Dashboard Data Hook
 * Manages dashboard statistics fetching using TanStack Query
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardData } from '../types';

/**
 * Query key for dashboard stats
 */
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const;

/**
 * Hook for fetching dashboard data
 * Implements automatic refetching every 30 seconds (temporary fallback for WebSockets)
 */
export const useDashboard = () => {
  const { data, isLoading, isFetching, isError, refetch } = useQuery<DashboardData>({
    queryKey: DASHBOARD_STATS_KEY,
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 30_000, // 30 seconds - temporary fallback for WebSockets
  });

  return {
    stats: data?.stats,
    isLoading,
    isFetching,
    isError,
    refetch,
  };
};
