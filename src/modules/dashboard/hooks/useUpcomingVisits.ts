import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { UpcomingVisit } from '../types';

const toLocalDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const tzOffset = (d: Date): string => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
  const min = String(Math.abs(off) % 60).padStart(2, '0');
  return `${sign}${h}:${min}`;
};

export const useUpcomingVisits = () => {
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    return {
      startDate: `${toLocalDateISO(now)}T00:00:00${tzOffset(now)}`,
      endDate: `${toLocalDateISO(tom)}T23:59:59${tzOffset(tom)}`,
    };
  }, []);

  return useQuery<UpcomingVisit[]>({
    queryKey: ['dashboard', 'upcoming-visits', startDate],
    queryFn: () => dashboardApi.getUpcomingEvents(startDate, endDate),
    staleTime: 2 * 60 * 1000,
  });
};
