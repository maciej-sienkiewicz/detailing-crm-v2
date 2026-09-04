import { apiClient } from '@/core';
import type { AutoLeadConfig } from '../types';

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
};
