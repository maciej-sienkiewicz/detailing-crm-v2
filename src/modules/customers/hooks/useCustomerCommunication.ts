import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';
import type { CustomerCommunicationEntry } from '../types';

export const useCustomerCommunication = (customerId: string): {
    entries: CustomerCommunicationEntry[];
    isLoading: boolean;
    isError: boolean;
} => {
    const query = useQuery({
        queryKey: ['customerCommunication', customerId],
        queryFn: () => customerDetailApi.getCustomerCommunication(customerId),
        staleTime: 60_000,
        enabled: !!customerId,
    });

    return {
        entries: query.data?.entries ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
    };
};
