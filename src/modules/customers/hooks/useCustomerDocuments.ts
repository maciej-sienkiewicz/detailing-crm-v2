import { useQuery } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';
import type { DocumentFilters } from '../types';

const CUSTOMER_DOCUMENTS_QUERY_KEY = 'customerDocuments';

export const useCustomerDocuments = (customerId: string, filters: DocumentFilters) => {
    const query = useQuery({
        queryKey: [CUSTOMER_DOCUMENTS_QUERY_KEY, customerId, filters],
        queryFn: () => customerEditApi.getDocuments(customerId, filters),
        staleTime: 30_000,
        enabled: !!customerId,
    });

    return {
        documents: query.data?.data ?? [],
        pagination: query.data?.pagination ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customerDocumentsQueryKey = CUSTOMER_DOCUMENTS_QUERY_KEY;