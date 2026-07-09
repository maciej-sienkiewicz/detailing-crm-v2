import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newSubscriptionApi } from './subscriptionApi';
import type { AddOnKey, PlanKey, CheckoutRequest, CheckoutResponse } from '../types';

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

// Key used by the SubscriptionGate — must be invalidated so the gate re-evaluates
const STATUS_KEY = ['subscription', 'status'] as const;

export const invalidateSubscriptionData = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: MY_PLAN_KEY });
    queryClient.invalidateQueries({ queryKey: PAYMENT_HISTORY_KEY });
    queryClient.invalidateQueries({ queryKey: STATUS_KEY });
};

/**
 * Creates a payment order. When the response carries a paymentUrl the caller
 * must redirect the browser to Przelewy24 (`window.location.assign(paymentUrl)`);
 * when paymentUrl is null the order was fulfilled instantly (zero amount) and
 * subscription data is refreshed here.
 */
export const useCheckout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CheckoutRequest) => newSubscriptionApi.checkout(body),
        onSuccess: (response: CheckoutResponse) => {
            if (!response.paymentUrl) invalidateSubscriptionData(queryClient);
        },
    });
};

export const useStartTrial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => newSubscriptionApi.startTrial(),
        onSuccess: () => invalidateSubscriptionData(queryClient),
    });
};

/** Downgrade only — upgrades go through useCheckout (PLAN_UPGRADE). */
export const useChangePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planKey: PlanKey) => newSubscriptionApi.changePlan(planKey),
        onSuccess: () => invalidateSubscriptionData(queryClient),
    });
};

export const useDeactivateAddOn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (addOnKey: AddOnKey) => newSubscriptionApi.deactivateAddOn(addOnKey),
        onSuccess: () => invalidateSubscriptionData(queryClient),
    });
};

export const useCancelPendingPlanChange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => newSubscriptionApi.cancelPendingPlanChange(),
        onSuccess: () => invalidateSubscriptionData(queryClient),
    });
};
