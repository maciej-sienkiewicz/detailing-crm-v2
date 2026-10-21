import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePiiAccess } from '@/common/pii';
import { customerEditApi } from '../api/customerEditApi';

export const customerDocumentsQueryKey = (customerId: string) => ['customer', customerId, 'documents'];

export const useCustomerDocuments = (customerId: string) => {
    // Dokumenty klienta to dane osobowe: bez dostępu do nich serwer odpowiada 403,
    // więc nawet nie pytamy (dostęp zna nagłówek X-Pii-Access z odpowiedzi karty klienta).
    const hasPiiAccess = usePiiAccess();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: customerDocumentsQueryKey(customerId),
        queryFn: async () => {
            try {
                return await customerEditApi.getDocuments(customerId);
            } catch (err: any) {
                if (err?.response?.status === 403) return [];
                throw err;
            }
        },
        enabled: !!customerId && hasPiiAccess,
        retry: false,
    });

    return {
        documents: data || [],
        isLoading,
        isError,
        refetch,
    };
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