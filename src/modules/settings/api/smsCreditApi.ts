import { apiClient } from '@/core';
import type {
    SmsCreditBalance,
    SmsCreditPackage,
    SmsCreditTransactionPage,
    PurchaseCreditsResponse,
} from '../types';

const BASE_PATH = '/v1/sms-credits';

export const smsCreditApi = {
    getBalance: async (): Promise<SmsCreditBalance> => {
        const res = await apiClient.get<SmsCreditBalance>(`${BASE_PATH}/balance`);
        return res.data;
    },

    getPackages: async (): Promise<SmsCreditPackage[]> => {
        const res = await apiClient.get<SmsCreditPackage[]>(`${BASE_PATH}/packages`);
        return res.data;
    },

    purchaseCredits: async (packageId: string): Promise<PurchaseCreditsResponse> => {
        const res = await apiClient.post<PurchaseCreditsResponse>(`${BASE_PATH}/purchase`, { packageId });
        return res.data;
    },

    getTransactions: async (page = 0, size = 20): Promise<SmsCreditTransactionPage> => {
        const res = await apiClient.get<SmsCreditTransactionPage>(`${BASE_PATH}/transactions`, {
            params: { page, size },
        });
        return res.data;
    },
};
