import { apiClient } from '@/core';
import type {
    VisitStatusChangeResponse,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    CompleteVisitResponse,
} from '../types/stateTransitions';

const BASE_PATH = '/v1/visits';

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
        const response = await apiClient.post<CompleteVisitResponse>(
            `${BASE_PATH}/${visitId}/complete`,
            payload,
            { skipErrorToast: true }
        );
        return response.data;
    },

    reject: async (visitId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${visitId}/reject`);
    },

    archive: async (visitId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${visitId}/archive`);
    },
};
