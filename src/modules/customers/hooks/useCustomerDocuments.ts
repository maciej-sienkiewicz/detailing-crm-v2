import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import type { UploadDocumentPayload } from '../types';

export const customerDocumentsQueryKey = (customerId: string) => ['customer', customerId, 'documents'];

export const useCustomerDocuments = (customerId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: customerDocumentsQueryKey(customerId),
        queryFn: () => customerEditApi.getDocuments(customerId),
        enabled: !!customerId,
    });

    return {
        documents: data || [],
        isLoading,
        isError,
        refetch,
    };
};

export const useUploadDocument = (customerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UploadDocumentPayload) => customerEditApi.uploadDocument(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerDocumentsQueryKey(customerId) });
        },
    });
};

export const useDeleteDocument = (customerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentId: string) => customerEditApi.deleteDocument(customerId, documentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerDocumentsQueryKey(customerId) });
        },
    });
};