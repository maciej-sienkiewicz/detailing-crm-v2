// src/modules/calendar/hooks/useStudioCalendarEvents.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarEventsApi } from '../api/calendarEventsApi';
import type { StudioCalendarEventPayload } from '../types';

const QUERY_KEY = 'studio-calendar-events';

const toIsoDate = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Wydarzenia widoczne w bieżącym zakresie kalendarza. */
export const useStudioCalendarEvents = (range: { start: Date; end: Date } | null) => {
    const from = range ? toIsoDate(range.start) : null;
    const to = range ? toIsoDate(range.end) : null;

    return useQuery({
        queryKey: [QUERY_KEY, from, to],
        queryFn: () => calendarEventsApi.list(from!, to!),
        enabled: !!from && !!to,
    });
};

export const useStudioCalendarEventMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

    const create = useMutation({
        mutationFn: (payload: StudioCalendarEventPayload) => calendarEventsApi.create(payload),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: StudioCalendarEventPayload }) =>
            calendarEventsApi.update(id, payload),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: string) => calendarEventsApi.remove(id),
        onSuccess: invalidate,
    });

    return { create, update, remove, isBusy: create.isPending || update.isPending || remove.isPending };
};

export { toIsoDate };
