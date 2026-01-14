import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';
import {customerApi} from "@/modules/customers";

const CUSTOMER_DETAIL_QUERY_KEY = 'customerDetail';

export const useCustomerDetail = (customerId: string) => {
    const query = useQuery({
        queryKey: [CUSTOMER_DETAIL_QUERY_KEY, customerId],
        queryFn: () => customerApi.getCustomerById(customerId),
        staleTime: 60_000,
        enabled: !!customerId,
    });

    return {
        customerDetail: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const customerDetailQueryKey = CUSTOMER_DETAIL_QUERY_KEY;