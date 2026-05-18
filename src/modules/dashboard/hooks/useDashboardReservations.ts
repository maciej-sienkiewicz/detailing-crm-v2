import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardReservationSummary } from '../types';

export const useDashboardReservations = (weeks = 13) =>
  useQuery<DashboardReservationSummary>({
    queryKey: ['dashboard', 'reservation-summary', weeks],
    queryFn: () => dashboardApi.getReservationSummary(weeks),
  });
