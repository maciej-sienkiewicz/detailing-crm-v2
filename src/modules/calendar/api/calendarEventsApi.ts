// src/modules/calendar/api/calendarEventsApi.ts
//
// Wydarzenia studia w kalendarzu: urlop, szkolenie, dostawa, remont — wpisy,
// które zajmują dni w grafiku, ale nie są ani wizytą, ani rezerwacją.

import { apiClient } from '@/core';
import type { StudioCalendarEvent, StudioCalendarEventPayload } from '../types';

const BASE_PATH = '/v1/calendar/events-custom';

export const calendarEventsApi = {
    /** Wydarzenia zahaczające o zakres — także te zaczęte przed jego początkiem. */
    list: async (from: string, to: string): Promise<StudioCalendarEvent[]> => {
        const { data } = await apiClient.get<StudioCalendarEvent[]>(BASE_PATH, { params: { from, to } });
        return data;
    },

    create: async (payload: StudioCalendarEventPayload): Promise<StudioCalendarEvent> => {
        const { data } = await apiClient.post<StudioCalendarEvent>(BASE_PATH, payload);
        return data;
    },

    update: async (eventId: string, payload: StudioCalendarEventPayload): Promise<StudioCalendarEvent> => {
        const { data } = await apiClient.put<StudioCalendarEvent>(`${BASE_PATH}/${eventId}`, payload);
        return data;
    },

    remove: async (eventId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${eventId}`);
    },
};
