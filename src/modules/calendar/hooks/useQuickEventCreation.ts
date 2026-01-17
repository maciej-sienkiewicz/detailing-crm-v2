// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const createQuickEvent = useMutation({
        mutationFn: async (data: QuickEventFormData) => {
            // Format end datetime
            let endDateTime = data.endDateTime;
            if (data.isAllDay && !endDateTime.includes('T')) {
                endDateTime = `${endDateTime}T23:59:59`;
            } else if (!data.isAllDay && !endDateTime.includes('T')) {
                endDateTime = `${endDateTime}T23:59:59`;
            }

            // Build customer payload
            let customerPayload;
            if (data.customerId) {
                customerPayload = {
                    mode: 'EXISTING' as const,
                    id: data.customerId,
                };
            } else if (data.customerName) {
                customerPayload = {
                    mode: 'ALIAS' as const,
                    alias: data.customerName,
                };
            } else {
                customerPayload = {
                    mode: 'ALIAS' as const,
                    alias: data.title || 'Nowa wizyta',
                };
            }

            // Build vehicle payload
            let vehiclePayload;
            if (data.vehicleId) {
                vehiclePayload = {
                    mode: 'EXISTING' as const,
                    id: data.vehicleId,
                };
            } else {
                vehiclePayload = {
                    mode: 'NONE' as const,
                };
            }

            // Build services payload
            const servicesPayload = data.serviceIds.map(serviceId => ({
                serviceId,
                adjustment: {
                    type: 'FIXED_NET' as const,
                    value: 0,
                },
                note: '',
            }));

            const payload = {
                customer: customerPayload,
                vehicle: vehiclePayload,
                services: servicesPayload,
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
