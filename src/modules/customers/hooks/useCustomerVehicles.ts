import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';

const CUSTOMER_VEHICLES_QUERY_KEY = 'customerVehicles';

export const useCustomerVehicles = (customerId: string) => {
    const query = useQuery({
        queryKey: [CUSTOMER_VEHICLES_QUERY_KEY, customerId],
        queryFn: () => customerDetailApi.getCustomerVehicles(customerId),
        staleTime: 60_000,
        enabled: !!customerId,
    });

    return {
        vehicles: query.data?.vehicles ?? [],
        totalCount: query.data?.totalCount ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customerVehiclesQueryKey = CUSTOMER_VEHICLES_QUERY_KEY;