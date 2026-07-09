import { apiClient } from '@/core';

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'NO_PLAN' | 'PAST_DUE';

export interface SubscriptionStatusResponse {
    status: SubscriptionStatus;
    isAccessible: boolean;
    daysRemaining: number | null;
    subscriptionEndsAt: string | null;
    trialEndsAt: string | null;
    trialUsed: boolean;
}

const BASE = '/v1/subscription';

// Billing status only. Purchases, renewals and module sales live in
// @/modules/subscription (checkout → Przelewy24).
export const subscriptionApi = {
    getStatus: async (): Promise<SubscriptionStatusResponse> => {
        const res = await apiClient.get<SubscriptionStatusResponse>(`${BASE}/status`);
        return res.data;
    },
};
