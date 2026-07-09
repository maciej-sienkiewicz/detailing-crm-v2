import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../api/subscriptionApi';

export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'status'] as const;

export const useSubscriptionStatus = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEY,
        queryFn: subscriptionApi.getStatus,
    });

    return { status: data, isLoading, isError, refetch };
};
