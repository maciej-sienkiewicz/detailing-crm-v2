import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import { customerDocumentsQueryKey } from './useCustomerDocuments';

interface UseDeleteDocumentOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useDeleteDocument = (options: UseDeleteDocumentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (documentId: string) => customerEditApi.deleteDocument(documentId),
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
        deleteDocument: mutation.mutate,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
};