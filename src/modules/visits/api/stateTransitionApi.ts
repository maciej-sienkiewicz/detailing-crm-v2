import { apiClient } from '@/core';
import type {
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    CompleteVisitResponse,
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
    ): Promise<CompleteVisitResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return {
                visitId, newStatus: 'completed', message: 'mock',
                financialDocumentId: null, financialDocumentNumber: null,
            };
        }
        const response = await apiClient.post<CompleteVisitResponse>(
            `${BASE_PATH}/${visitId}/complete`,
            payload
        );
        return response.data;
    },

    reject: async (visitId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return;
        }
        await apiClient.post(`${BASE_PATH}/${visitId}/reject`);
    },

    archive: async (visitId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return;
        }
        await apiClient.post(`${BASE_PATH}/${visitId}/archive`);
    },
};
