import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import { customerDocumentsQueryKey } from './useCustomerDocuments';
import type { UploadDocumentPayload } from '../types';

interface UseUploadDocumentOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useUploadDocument = (options: UseUploadDocumentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UploadDocumentPayload) =>
            customerEditApi.uploadDocument(options.customerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [customerDocumentsQueryKey, options.customerId]
            });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        uploadDocument: mutation.mutate,
        isUploading: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
};