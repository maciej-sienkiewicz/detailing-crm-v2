// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';
import { buildAppointmentPayload } from '@/modules/appointments/utils/buildAppointmentPayload';

interface CreateBookingArgs {
    data: QuickEventFormData;
    /**
     * Lead, z którego zakładamy rezerwację. Podany kieruje zapis na endpoint
     * wiążący - rezerwacja zostaje przypięta do leada, a lead przechodzi
     * w „Rezerwacja" w tej samej transakcji co zapis.
     */
    leadId?: string;
}

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['operations'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
    };

    const createBooking = useMutation({
        mutationFn: async ({ data, leadId }: CreateBookingArgs) => {
            const payload = await buildAppointmentPayload(data);

            if (leadId) {
                const response = await apiClient.post(`/v1/appointments/from-lead/${leadId}`, payload);
                return response.data;
            }

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
        createQuickEvent: (data: QuickEventFormData) => createBooking.mutate({ data }),
        createQuickEventAsync: (data: QuickEventFormData) => createBooking.mutateAsync({ data }),
        /** Wariant z powiązaniem: rezerwacja zakładana z leada. */
        createBookingAsync: createBooking.mutateAsync,
        isCreating: createBooking.isPending,
        isError: createBooking.isError,
        error: createBooking.error,
    };
};
