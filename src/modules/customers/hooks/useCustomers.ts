import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import type { CustomerFilters } from '../types';

const CUSTOMERS_QUERY_KEY = 'customers';

export const useCustomers = (filters: CustomerFilters) => {
    const queryKey = [CUSTOMERS_QUERY_KEY, filters] as const;

    const query = useQuery({
        queryKey,
        queryFn: ({ signal }) => customerApi.getCustomers(filters, signal),
    });

    return {
        customers: query.data?.items ?? [],
        pageMeta: query.data?.page ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customersQueryKey = CUSTOMERS_QUERY_KEY;