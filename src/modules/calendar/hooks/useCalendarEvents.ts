// src/modules/calendar/hooks/useCalendarEvents.ts

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api/calendarApi';
import type { DateRange } from '../types';

/**
 * Hook to fetch calendar events for a given date range
 * Uses React Query for caching and automatic refetching
 */
export const useCalendarEvents = (dateRange: DateRange | null) => {
    const query = useQuery({
        queryKey: ['calendar-events', dateRange],
        queryFn: async () => {
            console.log('[useCalendarEvents] queryFn called with dateRange:', dateRange);
            if (!dateRange) {
                console.log('[useCalendarEvents] No date range, returning empty array');
                return Promise.resolve([]);
            }
            try {
                const events = await calendarApi.getCalendarEvents(dateRange);
                console.log('[useCalendarEvents] Returning events:', events.length, 'events');
                return events;
            } catch (error) {
                console.error('[useCalendarEvents] Error fetching events:', error);
                throw error;
            }
        },
        enabled: !!dateRange,
        staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
        gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    });

    // Log query state changes
    React.useEffect(() => {
        console.log('[useCalendarEvents] Query state:', {
            isLoading: query.isLoading,
            isError: query.isError,
            isSuccess: query.isSuccess,
            dataLength: query.data?.length,
            error: query.error
        });
    }, [query.isLoading, query.isError, query.isSuccess, query.data, query.error]);

    return query;
};
