import { apiClient } from '@/core';
import type {
    EntitlementsResponse,
    MyPlanResponse,
    FeaturePlan,
    AddOnDto,
    CalculatePriceRequest,
    CalculatePriceResponse,
    PlanChangePreview,
    AddOnPreview,
    AddOnKey,
    PlanKey,
    PaymentHistoryResponse,
} from '../types';

const BASE = '/v1/subscription';

export const newSubscriptionApi = {
    // ── Feature gating ──────────────────────────────────────────────────────────
    getEntitlements: async (): Promise<EntitlementsResponse> => {
        const res = await apiClient.get<EntitlementsResponse>('/v1/me/entitlements');
        return res.data;
    },

    // ── My plan ─────────────────────────────────────────────────────────────────
    getMyPlan: async (): Promise<MyPlanResponse> => {
        const res = await apiClient.get<MyPlanResponse>(`${BASE}/my-plan`);
        return res.data;
    },

    // ── Catalog ─────────────────────────────────────────────────────────────────
    getFeaturePlans: async (): Promise<FeaturePlan[]> => {
        const res = await apiClient.get<FeaturePlan[]>(`${BASE}/feature-plans`);
        return res.data;
    },

    getAddOns: async (): Promise<AddOnDto[]> => {
        const res = await apiClient.get<AddOnDto[]>(`${BASE}/add-ons`);
        return res.data;
    },

    // ── Price calculator ─────────────────────────────────────────────────────────
    calculatePrice: async (body: CalculatePriceRequest): Promise<CalculatePriceResponse> => {
        const res = await apiClient.post<CalculatePriceResponse>(`${BASE}/calculate-price`, body);
        return res.data;
    },

    // ── Previews ─────────────────────────────────────────────────────────────────
    previewPlanChange: async (newPlanKey: PlanKey): Promise<PlanChangePreview> => {
        const res = await apiClient.post<PlanChangePreview>(`${BASE}/preview-plan-change`, { newPlanKey });
        return res.data;
    },

    previewAddOn: async (addOnKey: AddOnKey): Promise<AddOnPreview> => {
        const res = await apiClient.post<AddOnPreview>(`${BASE}/preview-add-on`, { addOnKey });
        return res.data;
    },

    // ── Mutacje ──────────────────────────────────────────────────────────────────
    changePlan: async (planKey: PlanKey): Promise<EntitlementsResponse> => {
        const res = await apiClient.post<EntitlementsResponse>(`${BASE}/change-plan`, { planKey });
        return res.data;
    },

    activateAddOn: async (addOnKey: AddOnKey): Promise<EntitlementsResponse> => {
        const res = await apiClient.post<EntitlementsResponse>(`${BASE}/activate-add-on`, { addOnKey });
        return res.data;
    },

    deactivateAddOn: async (addOnKey: AddOnKey): Promise<EntitlementsResponse> => {
        const res = await apiClient.delete<EntitlementsResponse>(`${BASE}/add-ons/${addOnKey}`);
        return res.data;
    },

    startTrial: async (): Promise<void> => {
        await apiClient.post(`${BASE}/start-trial`);
    },

    cancelPendingPlanChange: async (): Promise<void> => {
        await apiClient.delete(`${BASE}/pending-plan-change`);
    },

    // ── Payment history ──────────────────────────────────────────────────────────
    getPaymentHistory: async (page = 0, pageSize = 20): Promise<PaymentHistoryResponse> => {
        const res = await apiClient.get<PaymentHistoryResponse>(`${BASE}/payment-history`, {
            params: { page, pageSize },
        });
        return res.data;
    },
};
