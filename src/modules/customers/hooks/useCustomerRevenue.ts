import { useQuery } from '@tanstack/react-query';
import { customerDetailApi, type RevenueSummary } from '../api/customerDetailApi';

export const useCustomerRevenue = (customerId: string, months = 12) =>
    useQuery<RevenueSummary>({
        queryKey: ['customerRevenue', customerId, months],
        queryFn: () => customerDetailApi.getRevenueSummary(customerId, months),
        staleTime: 5 * 60_000,
        enabled: !!customerId,
    });
