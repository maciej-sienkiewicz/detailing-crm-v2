import { LEGAL_VERSION } from '@/modules/legal/documents';
import { apiClient } from '@/core';
import type { Page } from '@/core/page';
import type { CheckoutResponse } from '@/modules/subscription/types';
import type {
    SmsCreditBalance,
    SmsCreditPackage,
    SmsCreditTransaction,
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

    // Zamówienie w Przelewy24, jak przy abonamencie: odpowiedź to adres strony płatności
    // albo (tryb mock, lokalnie) zamówienie już zrealizowane - rozstrzyga `checkoutNextStep`.
    // `skipErrorToast`: powód odmowy (płatności niedostępne, pakiet wycofany) pokazuje
    // sekcja kredytów toastem z tytułem - bez tego ten sam komunikat szedł dwa razy.
    purchaseCredits: async (packageId: string): Promise<CheckoutResponse> => {
        const res = await apiClient.post<CheckoutResponse>(
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
