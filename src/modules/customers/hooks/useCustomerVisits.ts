import { useQuery } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';

export const useCustomerActiveData = (customerId: string) => {
    const query = useQuery({
        queryKey: ['customerActiveData', customerId],
        queryFn: () => customerDetailApi.getCustomerActiveData(customerId),
        enabled: !!customerId,
    });

    return {
        visits: query.data?.visits.visits ?? [],
        reservations: query.data?.reservations.reservations ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
    };
};

export const useCustomerDeletedVisits = (customerId: string, enabled: boolean) => {
    const query = useQuery({
        queryKey: ['customerDeletedVisits', customerId],
        queryFn: () => customerDetailApi.getCustomerDeletedVisits(customerId),
        enabled: !!customerId && enabled,
    });

    return {
        visits: query.data?.visits ?? [],
        isLoading: query.isLoading,
    };
};
