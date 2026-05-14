import { apiClient } from '@/core';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'NONE' | 'NO_PLAN';
export type SubscriptionPlanType = 'MONTHLY' | 'YEARLY';

export interface SubscriptionStatusResponse {
    status: SubscriptionStatus;
    isAccessible: boolean;
    daysRemaining: number | null;
    subscriptionEndsAt: string | null;
    trialEndsAt: string | null;
    trialUsed: boolean;
}

export interface SubscriptionPlanDto {
    type: SubscriptionPlanType;
    name: string;
    durationDays: number;
    priceGross: number;
    currency: string;
    pricePerMonth: number;
}

const BASE = '/v1/subscription';

export const subscriptionApi = {
    getStatus: async (): Promise<SubscriptionStatusResponse> => {
        const res = await apiClient.get<SubscriptionStatusResponse>(`${BASE}/status`);
        return res.data;
    },

    getPlans: async (): Promise<SubscriptionPlanDto[]> => {
        const res = await apiClient.get<SubscriptionPlanDto[]>(`${BASE}/plans`);
        return res.data;
    },

    purchase: async (planType: SubscriptionPlanType): Promise<SubscriptionStatusResponse> => {
        const res = await apiClient.post<SubscriptionStatusResponse>(`${BASE}/purchase`, { planType });
        return res.data;
    },
};
