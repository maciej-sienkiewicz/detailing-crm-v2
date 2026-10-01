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

/** `enabled: false` dla pracownika: my-plan jest tylko dla właściciela (403). */
export const useMyPlan = (options: { enabled?: boolean } = {}) => {
    return useQuery({
        queryKey: MY_PLAN_KEY,
        queryFn: newSubscriptionApi.getMyPlan,
        enabled: options.enabled ?? true,
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

// Key used by the SubscriptionGate; must be invalidated so the gate re-evaluates
const STATUS_KEY = ['subscription', 'status'] as const;

export const invalidateSubscriptionData = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: MY_PLAN_KEY });
    queryClient.invalidateQueries({ queryKey: PAYMENT_HISTORY_KEY });
    queryClient.invalidateQueries({ queryKey: STATUS_KEY });
};

/**
 * Creates a payment order. When the response carries a paymentUrl the caller
 * must redirect the browser to Przelewy24 (`window.location.assign(paymentUrl)`).
 * Only status FULFILLED means the purchase is already in place - subscription
 * data is refreshed here then. A missing paymentUrl with any other status is an
 * error (see utils/checkout `checkoutOutcome`), not a free success.
 */
export const useCheckout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CheckoutRequest) => newSubscriptionApi.checkout(body),
        onSuccess: (response: CheckoutResponse) => {
            if (response.status === 'FULFILLED') invalidateSubscriptionData(queryClient);
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

/** Downgrade only, upgrades go through useCheckout (PLAN_UPGRADE). */
export const useChangePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planKey: PlanKey) => newSubscriptionApi.changePlan(planKey),
        // Także po 409 DOWNGRADE_ALREADY_PAID: zamrożone obniżenie ma się pokazać
        // takim, jakie jest, a nie takim, jakie było przed kliknięciem.
        onSettled: () => invalidateSubscriptionData(queryClient),
    });
};

/** Schedules the add-on to switch off at the end of the paid period (see the api). */
export const useDeactivateAddOn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (addOnKey: AddOnKey) => newSubscriptionApi.deactivateAddOn(addOnKey),
        onSuccess: () => invalidateSubscriptionData(queryClient),
    });
};

/** Clears a scheduled add-on cancellation; my-plan then shows `cancelAt: null`. */
export const useResumeAddOn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (addOnKey: AddOnKey) => newSubscriptionApi.resumeAddOn(addOnKey),
        // Także po błędzie: 404 znaczy, że moduł już zniknął - wiersz z „Przywróć"
        // nie może zostać na ekranie i kłamać.
        onSettled: () => invalidateSubscriptionData(queryClient),
    });
};

export const useCancelPendingPlanChange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => newSubscriptionApi.cancelPendingPlanChange(),
        // onSettled, nie onSuccess: po 404 (zmiana już weszła) i 409 (kolejny okres
        // opłacony po niższej cenie) baner zostawał z nieaktualnym stanem, a jego
        // przycisk kończył się błędem przy każdym kliknięciu.
        onSettled: () => invalidateSubscriptionData(queryClient),
    });
};
