import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import { customerDetailQueryKey } from './useCustomerDetail';
import type { UpdateNotesPayload } from '../types';

interface UseUpdateNotesOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useUpdateNotes = (options: UseUpdateNotesOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateNotesPayload) =>
            customerEditApi.updateNotes(options.customerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customerDetailQueryKey, options.customerId] });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        updateNotes: mutation.mutate,
        isUpdating: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
};