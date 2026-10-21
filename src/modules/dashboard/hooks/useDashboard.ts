/**
 * Kafelki stanu na pulpicie (w pracy, gotowe, dziś przyjeżdżają, porzucone).
 *
 * Bez pollingu: dawniej `refetchInterval: 30_000` w każdej otwartej karcie, także gdy nic
 * się nie działo. Zmiany wizyt i rezerwacji przychodzą pushem SCHEDULE_CHANGED
 * (useScheduleSocket), a zapis we własnej karcie unieważnia ten klucz sam.
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const;

export const useDashboard = (options?: { enabled?: boolean }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: DASHBOARD_STATS_KEY,
    queryFn: dashboardApi.getStats,
    enabled: options?.enabled ?? true,
  });

  return { stats: data?.stats, isLoading, isError, refetch };
};
