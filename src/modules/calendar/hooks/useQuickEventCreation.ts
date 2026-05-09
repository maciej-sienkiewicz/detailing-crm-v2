// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const createQuickEvent = useMutation({
        mutationFn: async (data: QuickEventFormData) => {
            const payload = await buildAppointmentPayload(data);
            const response = await apiClient.post('/v1/appointments', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        },
    });

    return {
        createQuickEvent: createQuickEvent.mutate,
        createQuickEventAsync: createQuickEvent.mutateAsync,
        isCreating: createQuickEvent.isPending,
        isError: createQuickEvent.isError,
        error: createQuickEvent.error,
    };
};
