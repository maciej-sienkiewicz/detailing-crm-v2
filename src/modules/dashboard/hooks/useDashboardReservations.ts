import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardReservationSummary } from '../types';

export const useDashboardReservations = (months = 12) =>
  useQuery<DashboardReservationSummary>({
    queryKey: ['dashboard', 'reservation-summary', months],
    queryFn: () => dashboardApi.getReservationSummary(months),
  });
