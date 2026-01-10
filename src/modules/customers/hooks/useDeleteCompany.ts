import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import { customerDetailQueryKey } from './useCustomerDetail';

interface UseDeleteCompanyOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useDeleteCompany = (options: UseDeleteCompanyOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => customerEditApi.deleteCompany(options.customerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [customerDetailQueryKey, options.customerId] });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        deleteCompany: mutation.mutate,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
};