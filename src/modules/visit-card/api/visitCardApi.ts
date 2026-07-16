// src/modules/visit-card/api/visitCardApi.ts

import { apiClient } from '@/core/apiClient';
import type { VisitCard, VisitCardLinkResponse, VisitCardSendResponse } from '../types';

export const visitCardApi = {
    /** Public, tokenized endpoint — no session required (permitAll on the backend). */
    getPublicCard: async (token: string): Promise<VisitCard> => {
        const response = await apiClient.get<VisitCard>(`/public/visit-card/${encodeURIComponent(token)}`);
        return response.data;
    },

    /** Employee endpoint: stable shareable link for the visit's card. */
    getCardLink: async (visitId: string): Promise<VisitCardLinkResponse> => {
        const response = await apiClient.get<VisitCardLinkResponse>(`/visits/${visitId}/card-link`);
        return response.data;
    },

    /** Employee endpoint: send the card link to the customer (e-mail/SMS per studio config). */
    sendCardLink: async (visitId: string): Promise<VisitCardSendResponse> => {
        const response = await apiClient.post<VisitCardSendResponse>(`/visits/${visitId}/card-link/send`);
        return response.data;
    },
};
