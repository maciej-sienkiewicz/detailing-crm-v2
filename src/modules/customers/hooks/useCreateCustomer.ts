import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { customersQueryKey } from './useCustomers';
import type { CreateCustomerPayload, Customer } from '../types';

interface UseCreateCustomerOptions {
    onSuccess?: (customer: Customer) => void;
    onError?: (error: Error) => void;
}

export const useCreateCustomer = (options: UseCreateCustomerOptions = {}) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: CreateCustomerPayload) =>
            customerApi.createCustomer(payload),
        onSuccess: (data: Customer) => {
            queryClient.invalidateQueries({ queryKey: [customersQueryKey] });
            options.onSuccess?.(data);
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        createCustomer: mutation.mutate,
        isCreating: mutation.isPending,
        isSuccess: mutation.isSuccess,
        data: mutation.data as Customer | undefined,
        error: mutation.error,
        reset: mutation.reset,
    };
};