// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['operations'] });
    };

    const createQuickEvent = useMutation({
        mutationFn: async (data: QuickEventFormData) => {
            const payload = await buildAppointmentPayload(data);

            if (data.recurrence) {
                const recurringPayload = { ...payload, recurrence: data.recurrence };
                const response = await apiClient.post('/v1/appointments/recurring', recurringPayload);
                return response.data;
            }

            const response = await apiClient.post('/v1/appointments', payload);
            return response.data;
        },
        onSuccess: invalidate,
    });

    return {
        createQuickEvent: createQuickEvent.mutate,
        createQuickEventAsync: createQuickEvent.mutateAsync,
        isCreating: createQuickEvent.isPending,
        isError: createQuickEvent.isError,
        error: createQuickEvent.error,
    };
};
