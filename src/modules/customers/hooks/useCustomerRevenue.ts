import { useQuery } from '@tanstack/react-query';
import { customerDetailApi, type RevenueSummary } from '../api/customerDetailApi';

/** @param enabled false bez prawa do cen - serwer i tak odpowie 403. */
export const useCustomerRevenue = (customerId: string, months = 12, enabled = true) =>
    useQuery<RevenueSummary>({
        queryKey: ['customerRevenue', customerId, months],
        queryFn: () => customerDetailApi.getRevenueSummary(customerId, months),
        enabled: !!customerId && enabled,
    });
