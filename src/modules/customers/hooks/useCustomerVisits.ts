import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';

const CUSTOMER_VISITS_QUERY_KEY = 'customerVisits';

export const useCustomerVisits = (customerId: string, page: number = 1, limit: number = 10) => {
    const query = useQuery({
        queryKey: [CUSTOMER_VISITS_QUERY_KEY, customerId, page, limit],
        queryFn: () => customerDetailApi.getCustomerVisits(customerId, page, limit),
        staleTime: 60_000,
        enabled: !!customerId,
    });

    return {
        visits: query.data?.visits ?? [],
        communications: query.data?.communications ?? [],
        pagination: query.data?.pagination,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customerVisitsQueryKey = CUSTOMER_VISITS_QUERY_KEY;