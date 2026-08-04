import { apiClient } from '@/core';
import type { StudioProfile, PinStatusResponse, SetPinRequest, SwitchUserRequest } from '../types';
import type { AuthResponse } from '@/modules/auth/types';

const BASE = '/v1/pin';

export const pinApi = {
    getMyStatus: async (): Promise<PinStatusResponse> => {
        const res = await apiClient.get<PinStatusResponse>(`${BASE}/my-status`);
        return res.data;
    },

    setPin: async (data: SetPinRequest): Promise<void> => {
        await apiClient.post(`${BASE}/set`, data);
    },

    getStudioProfiles: async (): Promise<StudioProfile[]> => {
        const res = await apiClient.get<StudioProfile[]>(`${BASE}/studio-profiles`);
        return res.data;
    },

    switchUser: async (data: SwitchUserRequest): Promise<AuthResponse> => {
        const res = await apiClient.post<AuthResponse>(`${BASE}/switch`, data);
        return res.data;
    },

    resetPinLock: async (userId: string): Promise<void> => {
        await apiClient.post(`${BASE}/reset-lock/${userId}`);
    },
};
