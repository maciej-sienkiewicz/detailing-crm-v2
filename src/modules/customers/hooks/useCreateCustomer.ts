import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { customersQueryKey } from './useCustomers';
import type { CreateCustomerPayload } from '../types';

interface UseCreateCustomerOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useCreateCustomer = (options: UseCreateCustomerOptions = {}) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: CreateCustomerPayload) =>
            customerApi.createCustomer(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customersQueryKey] });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        createCustomer: mutation.mutate,
        isCreating: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
        reset: mutation.reset,
    };
};