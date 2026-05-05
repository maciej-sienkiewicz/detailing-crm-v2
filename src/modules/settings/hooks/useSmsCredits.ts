import { useQuery } from '@tanstack/react-query';
import { smsCreditsApi } from '../api/smsCreditsApi';

export const useSmsCredits = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['settings', 'sms-credits'],
        queryFn: smsCreditsApi.getBalance,
        staleTime: 2 * 60_000,
        retry: false,
    });

    return { balance: data, isLoading };
};
