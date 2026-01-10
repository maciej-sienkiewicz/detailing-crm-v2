import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import { customerDetailQueryKey } from './useCustomerDetail';
import type { UpdateCompanyPayload } from '../types';

interface UseUpdateCompanyOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useUpdateCompany = (options: UseUpdateCompanyOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateCompanyPayload) =>
            customerEditApi.updateCompany(options.customerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customerDetailQueryKey, options.customerId] });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        updateCompany: mutation.mutate,
        isUpdating: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
};