/**
 * Dashboard Data Hook
 * Manages dashboard statistics fetching and call action handlers using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardData } from '../types';

/**
 * Query key for dashboard stats
 */
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const;

/**
 * Hook for fetching and managing dashboard data
 * Implements automatic refetching every 30 seconds (temporary fallback for WebSockets)
 */
export const useDashboard = () => {
  const queryClient = useQueryClient();

  // Fetch dashboard statistics
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: DASHBOARD_STATS_KEY,
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 30_000, // 30 seconds - temporary fallback for WebSockets
    staleTime: 25_000, // Consider data stale after 25 seconds
  });

  // Mutation for accepting a call
  const acceptCallMutation = useMutation({
    mutationFn: (callId: string) => dashboardApi.acceptCall(callId),
    onSuccess: () => {
      // Invalidate dashboard stats to refetch updated call list
      queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
    },
  });

  // Mutation for rejecting a call
  const rejectCallMutation = useMutation({
    mutationFn: (callId: string) => dashboardApi.rejectCall(callId),
    onSuccess: () => {
      // Invalidate dashboard stats to refetch updated call list
      queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
    },
  });

  // Mutation for updating call information
  const updateCallMutation = useMutation({
    mutationFn: ({
      callId,
      data: updateData,
    }: {
      callId: string;
      data: Parameters<typeof dashboardApi.updateCall>[1];
    }) => dashboardApi.updateCall(callId, updateData),
    onSuccess: () => {
      // Invalidate dashboard stats to refetch updated call list
      queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
    },
  });

  return {
    // Data
    stats: data?.stats,
    revenue: data?.revenue,
    callActivity: data?.callActivity,
    recentCalls: data?.recentCalls || [],

    // Loading states
    isLoading,
    isError,

    // Actions
    refetch,
    onAccept: (callId: string) => acceptCallMutation.mutate(callId),
    onReject: (callId: string) => rejectCallMutation.mutate(callId),
    onEdit: (callId: string, data: Parameters<typeof dashboardApi.updateCall>[1]) =>
      updateCallMutation.mutate({ callId, data }),

    // Mutation states
    isAccepting: acceptCallMutation.isPending,
    isRejecting: rejectCallMutation.isPending,
    isUpdating: updateCallMutation.isPending,
  };
};
