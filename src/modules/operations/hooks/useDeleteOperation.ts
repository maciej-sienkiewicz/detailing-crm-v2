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

    const mutation = useMutation({
        mutationFn: (id: string) => operationApi.deleteOperation(id),
        onSuccess: invalidate,
    });

    const scopeMutation = useMutation({
        mutationFn: ({ id, scope }: { id: string; scope: RecurrenceEditScope }) =>
            operationApi.deleteAppointmentWithScope(id, scope),
        onSuccess: invalidate,
    });

    return {
        deleteOperation: mutation.mutate,
        deleteWithScope: (
            id: string,
            scope: RecurrenceEditScope,
            options?: Parameters<typeof scopeMutation.mutate>[1]
        ) => scopeMutation.mutate({ id, scope }, options),
        isDeleting: mutation.isPending || scopeMutation.isPending,
    };
};