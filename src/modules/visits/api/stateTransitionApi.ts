import { apiClient } from '@/core';
import type {
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
} from '../types/stateTransitions';

const USE_MOCKS = false;
const BASE_PATH = '/visits';

export const stateTransitionApi = {
    markReadyForPickup: async (
        visitId: string,
        payload: TransitionToReadyPayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock: Transition to READY_FOR_PICKUP', { visitId, payload });
            return;
        }
        await apiClient.post(
            `${BASE_PATH}/${visitId}/mark-ready-for-pickup`,
            payload
        );
    },

    complete: async (
        visitId: string,
        payload: TransitionToCompletedPayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock: Transition to COMPLETED', { visitId, payload });
            return;
        }
        await apiClient.post(
            `${BASE_PATH}/${visitId}/complete`,
            payload
        );
    },

    reject: async (visitId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock: Transition to REJECTED', { visitId });
            return;
        }
        await apiClient.post(`${BASE_PATH}/${visitId}/reject`);
    },

    archive: async (visitId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock: Transition to ARCHIVED', { visitId });
            return;
        }
        await apiClient.post(`${BASE_PATH}/${visitId}/archive`);
    },

    sendNotifications: async (
        payload: SendNotificationPayload
    ): Promise<SendNotificationResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            const result: SendNotificationResponse = {
                sent: {
                    sms: payload.channels.sms,
                    email: payload.channels.email,
                },
                failed: [],
            };
            console.log('Mock: Notifications sent', result);
            return result;
        }
        const response = await apiClient.post(
            `${BASE_PATH}/${payload.visitId}/notifications`,
            payload.channels
        );
        return response.data;
    },
};