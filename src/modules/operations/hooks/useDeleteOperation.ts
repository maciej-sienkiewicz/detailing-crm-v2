// src/modules/operations/hooks/useDeleteOperation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { operationApi } from '../api/operationApi';

export const useDeleteOperation = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (id: string) => operationApi.deleteOperation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operations'] });
        },
    });

    return {
        deleteOperation: mutation.mutate,
        isDeleting: mutation.isPending,
    };
};