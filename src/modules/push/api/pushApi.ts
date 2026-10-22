import { apiClient } from '@/core/apiClient';
import { problemStatus } from '@/core/problem';
import type {
    CurrentPushDevice,
    NativePushTransport,
    PushDeviceDto,
    PushDeviceNotifications,
    PushNotificationCategory,
    PushNotificationSettings,
    RequestCallResponse,
} from '../types';

const BASE_PATH = '/v1/push';

/**
 * Click-to-Call API. Session-cookie authenticated like everything else -
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

    /**
     * One real notification to THIS device, through the production path
     * (VAPID → push service → Service Worker). 422 carries the reason in words.
     */
    sendTestPush: async (endpoint: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/devices/test`, { endpoint }, { skipErrorToast: true });
    },

    /**
     * Czy serwer uznaje subskrypcję tej przeglądarki za aktywne urządzenie zalogowanej
     * osoby. Adres subskrypcji w treści, nie w adresie URL. null = backend sprzed tego
     * pytania (404/405) - wtedy ekran zostaje przy tym, co wie przeglądarka.
     */
    getCurrentDevice: async (endpoint: string): Promise<CurrentPushDevice | null> => {
        try {
            const { data } = await apiClient.post<CurrentPushDevice>(
                `${BASE_PATH}/devices/current`,
                { endpoint },
                { skipErrorToast: true },
            );
            return data;
        } catch (error) {
            const status = problemStatus(error);
            if (status === 404 || status === 405) return null;
            throw error;
        }
    },

    /** Telefon z aplikacją ze sklepu: token APNs (iPhone) albo FCM (Android). */
    registerNativeDevice: async (params: {
        transport: NativePushTransport;
        token: string;
        deviceName: string;
    }): Promise<PushDeviceDto> => {
        const { data } = await apiClient.post<PushDeviceDto>(`${BASE_PATH}/native-devices`, params);
        return data;
    },

    /** Wylogowanie w aplikacji - musi pójść PRZED końcem sesji, bo to ona wskazuje właściciela. */
    unregisterNativeDevice: async (params: { transport: NativePushTransport; token: string }): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/native-devices/unregister`, params, { skipErrorToast: true });
    },

    /** Próbne powiadomienie do telefonu z aplikacją - tą samą drogą co prawdziwe. */
    sendNativeTestPush: async (params: { transport: NativePushTransport; token: string }): Promise<void> => {
        await apiClient.post(
            `${BASE_PATH}/devices/test`,
            { endpoint: params.token, transport: params.transport },
            { skipErrorToast: true },
        );
    },

    listDevices: async (): Promise<PushDeviceDto[]> => {
        const { data } = await apiClient.get<PushDeviceDto[]>(`${BASE_PATH}/devices`);
        return data;
    },

    revokeDevice: async (deviceId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/devices/${deviceId}`);
    },

    /** Które urządzenie dostaje które powiadomienia: właściciel - całe studio, reszta - swoje. */
    getNotificationSettings: async (): Promise<PushNotificationSettings> => {
        const { data } = await apiClient.get<PushNotificationSettings>(`${BASE_PATH}/notification-settings`);
        return data;
    },

    /** Pełna lista WŁĄCZONYCH kategorii jednego urządzenia. */
    updateDeviceNotifications: async (
        deviceId: string,
        enabled: PushNotificationCategory[],
    ): Promise<PushDeviceNotifications> => {
        const { data } = await apiClient.put<PushDeviceNotifications>(
            `${BASE_PATH}/devices/${deviceId}/notifications`,
            { enabled },
        );
        return data;
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
