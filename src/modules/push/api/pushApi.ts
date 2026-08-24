import { apiClient } from '@/core/apiClient';
import type { PushDeviceDto, RequestCallResponse } from '../types';

const BASE_PATH = '/v1/push';

/**
 * Click-to-Call API. Session-cookie authenticated like everything else —
 * the phone and the desktop are just two sessions of the same user; the
 * backend tells them apart by WHICH endpoint each one calls (the phone
 * registers a subscription, the desktop requests calls).
 */
export const pushApi = {
    /** applicationServerKey for pushManager.subscribe(), base64url. */
    getVapidPublicKey: async (): Promise<string> => {
        const { data } = await apiClient.get<{ publicKey: string }>(`${BASE_PATH}/vapid-public-key`);
        return data.publicKey;
    },

    registerDevice: async (params: {
        endpoint: string;
        p256dh: string;
        auth: string;
        deviceName: string;
        userAgent?: string;
    }): Promise<PushDeviceDto> => {
        const { data } = await apiClient.post<PushDeviceDto>(`${BASE_PATH}/devices`, params);
        return data;
    },

    listDevices: async (): Promise<PushDeviceDto[]> => {
        const { data } = await apiClient.get<PushDeviceDto[]>(`${BASE_PATH}/devices`);
        return data;
    },

    revokeDevice: async (deviceId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/devices/${deviceId}`);
    },

    /**
     * The desktop trigger: "ring this number on my phone".
     * 422 = no paired phone; the hook surfaces a dedicated message for it.
     */
    requestCall: async (params: {
        phoneNumber: string;
        displayName?: string;
        deviceId?: string;
    }): Promise<RequestCallResponse> => {
        const { data } = await apiClient.post<RequestCallResponse>(
            `${BASE_PATH}/call-requests`,
            params,
            { skipErrorToast: true },
        );
        return data;
    },
};
