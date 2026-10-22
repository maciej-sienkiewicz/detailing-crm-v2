import { apiClient } from '@/core';
import type { VisitCommunicationResponse } from '../types';

export const communicationApi = {
    getVisitCommunication: async (visitId: string): Promise<VisitCommunicationResponse> => {
        const response = await apiClient.get(`/v1/visits/${visitId}/communication`);
        return response.data;
    },
};
