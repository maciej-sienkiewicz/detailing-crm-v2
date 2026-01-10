import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import { customerDetailQueryKey } from './useCustomerDetail';
import { customersQueryKey } from './useCustomers';
import type { UpdateCustomerPayload } from '../types';

interface UseUpdateCustomerOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useUpdateCustomer = (options: UseUpdateCustomerOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateCustomerPayload) =>
            customerEditApi.updateCustomer(options.customerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customerDetailQueryKey, options.customerId] });
            queryClient.invalidateQueries({ queryKey: [customersQueryKey] });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        updateCustomer: mutation.mutate,
        isUpdating: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
};