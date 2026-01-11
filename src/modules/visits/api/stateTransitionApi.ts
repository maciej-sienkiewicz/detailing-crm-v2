import { apiClient } from '@/core';
import type {
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
} from '../types/stateTransitions';

const USE_MOCKS = true;
const BASE_PATH = '/api/visits';

export const stateTransitionApi = {
    transitionToReady: async (
        visitId: string,
        payload: TransitionToReadyPayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock: Transition to READY', { visitId, payload });
            return;
        }
        await apiClient.post(
            `${BASE_PATH}/${visitId}/transitions/ready`,
            payload
        );
    },

    transitionToCompleted: async (
        visitId: string,
        payload: TransitionToCompletedPayload
    ): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock: Transition to COMPLETED', { visitId, payload });
            return;
        }
        await apiClient.post(
            `${BASE_PATH}/${visitId}/transitions/completed`,
            payload
        );
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