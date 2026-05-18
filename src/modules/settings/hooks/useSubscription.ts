import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, SubscriptionPlanType } from '../api/subscriptionApi';

export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'status'] as const;
const PLANS_QUERY_KEY = ['subscription', 'plans'] as const;

export const useSubscriptionStatus = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEY,
        queryFn: subscriptionApi.getStatus,
    });

    return { status: data, isLoading, isError, refetch };
};

export const useSubscriptionPlans = () => {
    const { data, isLoading } = useQuery({
        queryKey: PLANS_QUERY_KEY,
        queryFn: subscriptionApi.getPlans,
    });

    return { plans: data ?? [], isLoading };
};

export const usePurchaseSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (planType: SubscriptionPlanType) => subscriptionApi.purchase(planType),
        onSuccess: (updated) => {
            queryClient.setQueryData(SUBSCRIPTION_QUERY_KEY, updated);
        },
    });
};
