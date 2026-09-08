import { apiClient } from '@/core';
import type {
    VisitStatusChangeResponse,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    CompleteVisitResponse,
} from '../types/stateTransitions';

const USE_MOCKS = false;
const BASE_PATH = '/visits';

export const stateTransitionApi = {
    /**
     * `skipErrorToast`: komunikat pisze miejsce wywołania, które wie, o co użytkownik
     * prosił. Bez tego globalny interceptor dokładał drugi toast z surowym `message`
     * backendu — użytkownik widział dwa czerwone prostokąty naraz za jedno kliknięcie.
     */
    markReadyForPickup: async (
        visitId: string,
        payload: TransitionToReadyPayload
    ): Promise<VisitStatusChangeResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return { visitId, newStatus: 'ready_for_pickup', message: 'mock', alreadyInTargetState: false };
        }
        const response = await apiClient.post<VisitStatusChangeResponse>(
            `${BASE_PATH}/${visitId}/mark-ready-for-pickup`,
            payload,
            { skipErrorToast: true }
        );
        return response.data;
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
            payload,
            { skipErrorToast: true }
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
