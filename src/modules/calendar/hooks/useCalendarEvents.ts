// src/modules/calendar/hooks/useCalendarEvents.ts

import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendarApi';
import type { DateRange, VisitStatus, AppointmentStatus } from '../types';

/**
 * Hook to fetch calendar events for a given date range with status filters
 * Uses React Query for caching and automatic refetching
 */
export const useCalendarEvents = (
    dateRange: DateRange | null,
    appointmentStatuses: AppointmentStatus[] = [],
    visitStatuses: VisitStatus[] = []
) => {
    return useQuery({
        queryKey: ['calendar-events', dateRange, appointmentStatuses, visitStatuses],
        queryFn: () => {
            if (!dateRange) {
                return Promise.resolve([]);
            }
            return calendarApi.getCalendarEvents(dateRange, appointmentStatuses, visitStatuses);
        },
        enabled: !!dateRange,
        staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
        gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    });
};
