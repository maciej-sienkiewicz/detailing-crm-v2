import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';
import type { CommunicationEntry } from '@/common/types/communication';

export const useCustomerCommunication = (customerId: string): {
    entries: CommunicationEntry[];
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
