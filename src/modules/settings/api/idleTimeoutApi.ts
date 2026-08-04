import { apiClient } from '@/core';

export interface IdleTimeoutResponse {
    idleTimeoutMinutes: number;
}

const BASE = '/v1/company/idle-timeout';

export const idleTimeoutApi = {
    get: async (): Promise<IdleTimeoutResponse> => {
        const res = await apiClient.get<IdleTimeoutResponse>(BASE);
        return res.data;
    },
    set: async (idleTimeoutMinutes: number): Promise<IdleTimeoutResponse> => {
        const res = await apiClient.patch<IdleTimeoutResponse>(BASE, { idleTimeoutMinutes });
        return res.data;
    },
};
