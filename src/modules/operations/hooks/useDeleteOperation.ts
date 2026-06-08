// src/modules/operations/hooks/useDeleteOperation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';
import type { RecurrenceEditScope } from '@/modules/appointments/types';

export const useDeleteOperation = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['operations'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    };

    const visitMutation = useMutation({
        mutationFn: (id: string) => operationApi.deleteVisit(id),
        onSuccess: invalidate,
    });

    const reservationMutation = useMutation({
        mutationFn: (id: string) => operationApi.deleteAppointment(id),
        onSuccess: invalidate,
    });

    const scopeMutation = useMutation({
        mutationFn: ({ id, scope }: { id: string; scope: RecurrenceEditScope }) =>
            operationApi.deleteAppointmentWithScope(id, scope),
        onSuccess: invalidate,
    });

    return {
        deleteVisit: visitMutation.mutate,
        deleteReservation: reservationMutation.mutate,
        deleteWithScope: (
            id: string,
            scope: RecurrenceEditScope,
            options?: Parameters<typeof scopeMutation.mutate>[1]
        ) => scopeMutation.mutate({ id, scope }, options),
        isDeleting: visitMutation.isPending || reservationMutation.isPending || scopeMutation.isPending,
    };
};
