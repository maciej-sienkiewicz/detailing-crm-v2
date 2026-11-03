import { apiClient } from '@/core';

export interface MarketingConsent {
    granted: boolean;
    /** Ostatnie udzielenie albo wycofanie; `null`, gdy zgody nigdy nie udzielono. */
    changedAt: string | null;
    /** Brzmienie zgody, które backend zapisuje przy każdej zmianie. */
    wording: string;
}

const PATH = '/v1/me/marketing-consent';

export const marketingConsentApi = {
    get: async (): Promise<MarketingConsent> => {
        const response = await apiClient.get<MarketingConsent>(PATH, { skipErrorToast: true });
        return response.data;
    },

    set: async (granted: boolean): Promise<MarketingConsent> => {
        const response = await apiClient.put<MarketingConsent>(PATH, { granted }, { skipErrorToast: true });
        return response.data;
    },
};
