import { apiClient } from '@/core';
import type { Tablet, PairingCodeResponse } from '../tabletTypes';

const BASE = '/v1/tablets';

export const tabletsApi = {
    generatePairingCode: async (): Promise<PairingCodeResponse> => {
        const res = await apiClient.post<PairingCodeResponse>(`${BASE}/pairing-codes`);
        return res.data;
    },
    listTablets: async (): Promise<Tablet[]> => {
        const res = await apiClient.get<Tablet[]>(BASE);
        return res.data;
    },
    deleteTablet: async (tabletId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${tabletId}`);
    },
};
