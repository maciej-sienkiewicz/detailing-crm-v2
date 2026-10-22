import { LEGAL_VERSION } from '@/modules/legal/documents';
import { apiClient } from '@/core';
import type { Page } from '@/core/page';
import type {
    SmsCreditBalance,
    SmsCreditPackage,
    SmsCreditTransaction,
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

    // `skipErrorToast`: powód odmowy (płatność odrzucona, pakiet wycofany) pokazuje
    // sekcja kredytów toastem z tytułem - bez tego ten sam komunikat szedł dwa razy.
    purchaseCredits: async (packageId: string): Promise<PurchaseCreditsResponse> => {
        const res = await apiClient.post<PurchaseCreditsResponse>(
            `${BASE_PATH}/purchase`,
            // Okno zakupu przepuszcza tylko z zaznaczoną zgodą (CheckoutConsent).
            { packageId, acceptTerms: true, legalVersion: LEGAL_VERSION },
            { skipErrorToast: true },
        );
        return res.data;
    },

    /** [page] od 1. */
    getTransactions: async (page = 1, pageSize = 20): Promise<Page<SmsCreditTransaction>> => {
        const res = await apiClient.get<Page<SmsCreditTransaction>>(`${BASE_PATH}/transactions`, {
            params: { page, pageSize },
        });
        return res.data;
    },
};
