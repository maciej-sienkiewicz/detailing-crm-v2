import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';

const CUSTOMER_VISITS_QUERY_KEY = 'customerVisits';

export const useCustomerVisits = (customerId: string) => {
    const query = useQuery({
        queryKey: [CUSTOMER_VISITS_QUERY_KEY, customerId],
        queryFn: () => customerDetailApi.getCustomerVisits(customerId),
        staleTime: 60_000,
        enabled: !!customerId,
    });

    return {
        visits: query.data?.visits ?? [],
        communications: query.data?.communications ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customerVisitsQueryKey = CUSTOMER_VISITS_QUERY_KEY;