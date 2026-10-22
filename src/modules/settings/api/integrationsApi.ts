import { apiClient } from '@/core';

const BASE_PATH = '/v1/integrations';

export type IntegrationKind = 'instagram' | 'google';

export type IntegrationStatus = 'NOT_CONNECTED' | 'PENDING_SELECTION' | 'CONNECTED' | 'ERROR';

export interface Integration {
    status: IntegrationStatus;
    /** Profil na Instagramie (bez „@") albo nazwa wizytówki Google. */
    account: string | null;
    /** Strona na Facebooku albo adres wizytówki. */
    detail: string | null;
    connectedAt: string | null;
}

export type Integrations = Record<IntegrationKind, Integration>;

/**
 * Konta studia u dostawców, poza modułem Instagram. Odłączenie stąd działa także w studiu
 * bez modułu - to droga do usunięcia danych opisana na stronie /usuwanie-danych.
 */
export const integrationsApi = {
    list: async (): Promise<Integrations> => {
        const response = await apiClient.get<Integrations>(BASE_PATH);
        return response.data;
    },

    disconnect: async (kind: IntegrationKind): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${kind}`);
    },
};
