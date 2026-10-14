import { apiClient } from '@/core';
import type { AutoLeadConfig, EscalationPolicy, EscalationPolicyResponse, LeadAlertConfig } from '../types';

const BASE_PATH = '/v1/company';

export const leadsSettingsApi = {
    getAutoLeadConfig: async (): Promise<AutoLeadConfig> => {
        const response = await apiClient.get<AutoLeadConfig>(`${BASE_PATH}/auto-lead-config`);
        return response.data;
    },

    updateAutoLeadConfig: async (enabled: boolean): Promise<AutoLeadConfig> => {
        const response = await apiClient.patch<AutoLeadConfig>(`${BASE_PATH}/auto-lead-config`, { enabled });
        return response.data;
    },

    /**
     * Progi stygnięcia. Endpoint istniał od dawna, ale nie miał ekranu - a odkąd
     * kolejka dzieli się na sekcje według tych liczb, „48/72 bo tak wyszło" jest
     * decyzją produktową podjętą przez przypadek.
     */
    getAlertConfig: async (): Promise<LeadAlertConfig> => {
        const response = await apiClient.get<LeadAlertConfig>(`${BASE_PATH}/lead-alert-config`);
        return response.data;
    },

    updateAlertConfig: async (config: LeadAlertConfig): Promise<LeadAlertConfig> => {
        const response = await apiClient.patch<LeadAlertConfig>(`${BASE_PATH}/lead-alert-config`, config);
        return response.data;
    },

    getEscalationPolicy: async (): Promise<EscalationPolicyResponse> => {
        const response = await apiClient.get<EscalationPolicyResponse>('/v1/leads/escalation-policy');
        return response.data;
    },

    /** `null` przywraca politykę domyślną. */
    updateEscalationPolicy: async (policy: EscalationPolicy | null): Promise<EscalationPolicyResponse> => {
        const response = await apiClient.put<EscalationPolicyResponse>('/v1/leads/escalation-policy', { policy });
        return response.data;
    },
};
