import { apiClient } from '@/core';

export interface IdleTimeoutResponse {
    idleTimeoutSeconds: number;
}

const BASE = '/v1/company/idle-timeout';

export const idleTimeoutApi = {
    get: async (): Promise<IdleTimeoutResponse> => {
        const res = await apiClient.get<IdleTimeoutResponse>(BASE);
        return res.data;
    },
    set: async (idleTimeoutSeconds: number): Promise<IdleTimeoutResponse> => {
        const res = await apiClient.patch<IdleTimeoutResponse>(BASE, { idleTimeoutSeconds });
        return res.data;
    },
};
