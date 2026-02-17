import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';

const CUSTOMER_RESERVATIONS_QUERY_KEY = 'customerReservations';

export const useCustomerReservations = (customerId: string) => {
    const query = useQuery({
        queryKey: [CUSTOMER_RESERVATIONS_QUERY_KEY, customerId],
        queryFn: () => customerDetailApi.getCustomerReservations(customerId),
        staleTime: 60_000,
        enabled: !!customerId,
    });

    return {
        reservations: query.data?.reservations ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
    };
};
