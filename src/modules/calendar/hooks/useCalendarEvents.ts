// src/modules/calendar/hooks/useCalendarEvents.ts

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendarApi';
import type { DateRange, VisitStatus, AppointmentStatus } from '../types';

/**
 * Hook to fetch calendar events for a given date range with status and color filters.
 * Color filtering is applied client-side as a blacklist (hiddenColorIds): events
 * whose color the user hid are dropped, everything else — including events with
 * no color or with a newly created color — stays visible.
 */
export const useCalendarEvents = (
    dateRange: DateRange | null,
    appointmentStatuses: AppointmentStatus[] = [],
    visitStatuses: VisitStatus[] = [],
    hiddenColorIds: string[] = [],
) => {
    const query = useQuery({
        queryKey: ['calendar-events', dateRange, appointmentStatuses, visitStatuses],
        queryFn: () => {
            if (!dateRange) {
                return Promise.resolve([]);
            }
            return calendarApi.getCalendarEvents(dateRange, appointmentStatuses, visitStatuses);
        },
        enabled: !!dateRange,
    });

    const filteredData = useMemo(() => {
        if (!hiddenColorIds.length) return query.data;
        return query.data?.filter(event => {
            const id = (event.extendedProps as { colorId?: string }).colorId;
            return id === undefined || !hiddenColorIds.includes(id);
        });
    }, [query.data, hiddenColorIds]);

    return { ...query, data: filteredData };
};
