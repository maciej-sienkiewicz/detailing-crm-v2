// src/modules/calendar/hooks/useCalendarEvents.ts

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendarApi';
import type { DateRange, VisitStatus, AppointmentStatus } from '../types';

/**
 * Hook to fetch calendar events for a given date range with status and color filters.
 * colorIds filtering is applied client-side (backend support via colorIds param is proposed).
 */
export const useCalendarEvents = (
    dateRange: DateRange | null,
    appointmentStatuses: AppointmentStatus[] = [],
    visitStatuses: VisitStatus[] = [],
    colorIds: string[] = [],
) => {
    const query = useQuery({
        queryKey: ['calendar-events', dateRange, appointmentStatuses, visitStatuses, colorIds],
        queryFn: () => {
            if (!dateRange) {
                return Promise.resolve([]);
            }
            return calendarApi.getCalendarEvents(dateRange, appointmentStatuses, visitStatuses, colorIds);
        },
        enabled: !!dateRange,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const filteredData = useMemo(() => {
        if (!colorIds.length) return query.data;
        return query.data?.filter(event => {
            const id = (event.extendedProps as { colorId?: string }).colorId;
            return id !== undefined && colorIds.includes(id);
        });
    }, [query.data, colorIds]);

    return { ...query, data: filteredData };
};
