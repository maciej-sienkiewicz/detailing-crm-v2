import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';
import { customerDetailQueryKey } from './useCustomerDetail';
import type { UpdateConsentPayload } from '../types';

interface UseUpdateConsentOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useUpdateConsent = (options: UseUpdateConsentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UpdateConsentPayload) =>
            customerDetailApi.updateConsent(options.customerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [customerDetailQueryKey, options.customerId],
            });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        updateConsent: mutation.mutate,
        isUpdating: mutation.isPending,
        error: mutation.error,
    };
};