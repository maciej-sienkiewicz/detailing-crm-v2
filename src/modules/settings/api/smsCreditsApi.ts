import { apiClient } from '@/core';

export interface SmsCreditsBalance {
    smsCredits: number;
    aiCredits: number;
}

export const smsCreditsApi = {
    getBalance: async (): Promise<SmsCreditsBalance> => {
        const res = await apiClient.get<SmsCreditsBalance>('/v1/credits/balance');
        return res.data;
    },
};
