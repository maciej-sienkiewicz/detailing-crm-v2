import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardReservationSummary } from '../types';

export const useDashboardReservations = (months = 12) =>
  useQuery<DashboardReservationSummary>({
    queryKey: ['dashboard', 'reservation-summary', months],
    queryFn: () => dashboardApi.getReservationSummary(months),
    staleTime: STALE_TIME.summary,
  });
