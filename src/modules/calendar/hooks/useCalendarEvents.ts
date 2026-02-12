// src/modules/calendar/hooks/useCalendarEvents.ts

import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendarApi';
import type { DateRange, VisitStatus } from '../types';

/**
 * Hook to fetch calendar events for a given date range
 * Uses React Query for caching and automatic refetching
 */
export const useCalendarEvents = (dateRange: DateRange | null, visitStatuses: VisitStatus[] = []) => {
    return useQuery({
        queryKey: ['calendar-events', dateRange, visitStatuses],
        queryFn: () => {
            if (!dateRange) {
                return Promise.resolve([]);
            }
            return calendarApi.getCalendarEvents(dateRange, visitStatuses);
        },
        enabled: !!dateRange,
        staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
        gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    });
};
