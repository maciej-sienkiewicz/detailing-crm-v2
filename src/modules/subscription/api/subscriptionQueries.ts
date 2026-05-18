import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newSubscriptionApi } from './subscriptionApi';
import type { ActivatePackageRequest } from './subscriptionApi';
import type { AddOnKey, PlanKey } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const ENTITLEMENTS_KEY = ['subscription', 'entitlements'] as const;
export const MY_PLAN_KEY = ['subscription', 'my-plan'] as const;
export const FEATURE_PLANS_KEY = ['subscription', 'feature-plans'] as const;
export const ADD_ONS_KEY = ['subscription', 'add-ons'] as const;
export const PAYMENT_HISTORY_KEY = ['subscription', 'payment-history'] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useEntitlements = () => {
    return useQuery({
        queryKey: ENTITLEMENTS_KEY,
        queryFn: newSubscriptionApi.getEntitlements,
        retry: false,
    });
};

export const useMyPlan = () => {
    return useQuery({
        queryKey: MY_PLAN_KEY,
        queryFn: newSubscriptionApi.getMyPlan,
    });
};

export const useFeaturePlans = () => {
    return useQuery({
        queryKey: FEATURE_PLANS_KEY,
        queryFn: newSubscriptionApi.getFeaturePlans,
    });
};

export const useAddOns = () => {
    return useQuery({
        queryKey: ADD_ONS_KEY,
        queryFn: newSubscriptionApi.getAddOns,
    });
};

export const usePaymentHistory = (page = 0) => {
    return useQuery({
        queryKey: [...PAYMENT_HISTORY_KEY, page],
        queryFn: () => newSubscriptionApi.getPaymentHistory(page),
    });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

// Key used by the old SubscriptionGate — must be invalidated so the gate re-evaluates
const OLD_STATUS_KEY = ['subscription', 'status'] as const;

const invalidateAfterMutation = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: MY_PLAN_KEY });
    queryClient.invalidateQueries({ queryKey: PAYMENT_HISTORY_KEY });
    queryClient.invalidateQueries({ queryKey: OLD_STATUS_KEY });
};

export const useActivatePackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: ActivatePackageRequest) => newSubscriptionApi.activatePackage(body),
        onSuccess: () => invalidateAfterMutation(queryClient),
    });
};

export const useStartTrial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => newSubscriptionApi.startTrial(),
        onSuccess: () => invalidateAfterMutation(queryClient),
    });
};

export const useChangePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planKey: PlanKey) => newSubscriptionApi.changePlan(planKey),
        onSuccess: () => invalidateAfterMutation(queryClient),
    });
};

export const useActivateAddOn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (addOnKey: AddOnKey) => newSubscriptionApi.activateAddOn(addOnKey),
        onSuccess: () => invalidateAfterMutation(queryClient),
    });
};

export const useDeactivateAddOn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (addOnKey: AddOnKey) => newSubscriptionApi.deactivateAddOn(addOnKey),
        onSuccess: () => invalidateAfterMutation(queryClient),
    });
};

export const useCancelPendingPlanChange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => newSubscriptionApi.cancelPendingPlanChange(),
        onSuccess: () => invalidateAfterMutation(queryClient),
    });
};
