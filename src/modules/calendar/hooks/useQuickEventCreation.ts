// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';

interface QuickEventPayload {
    customer: {
        mode: 'ALIAS';
        alias: string;
    };
    vehicle: {
        mode: 'NONE';
    };
    services: any[];
    schedule: {
        isAllDay: boolean;
        startDateTime: string;
        endDateTime: string;
    };
    appointmentTitle?: string;
    appointmentColorId: string;
}

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const createQuickEvent = useMutation({
        mutationFn: async (data: QuickEventFormData & { colorId: string }) => {
            // Format end datetime
            let endDateTime = data.endDateTime;
            if (data.isAllDay && !endDateTime.includes('T')) {
                endDateTime = `${endDateTime}T23:59:59`;
            } else if (!data.isAllDay && !endDateTime.includes('T')) {
                endDateTime = `${endDateTime}T23:59:59`;
            }

            const payload: QuickEventPayload = {
                customer: {
                    mode: 'ALIAS',
                    alias: data.title || 'Nowy event',
                },
                vehicle: {
                    mode: 'NONE',
                },
                services: [],
                schedule: {
                    isAllDay: data.isAllDay,
                    startDateTime: data.isAllDay ? data.startDateTime : data.startDateTime,
                    endDateTime,
                },
                appointmentTitle: data.title || undefined,
                appointmentColorId: data.colorId,
            };

            const response = await apiClient.post('/api/v1/appointments', payload);
            return response.data;
        },
        onSuccess: () => {
            // Invalidate calendar events to refetch
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        },
    });

    return {
        createQuickEvent: createQuickEvent.mutate,
        isCreating: createQuickEvent.isPending,
        isError: createQuickEvent.isError,
        error: createQuickEvent.error,
    };
};
