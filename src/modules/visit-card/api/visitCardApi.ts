// src/modules/visit-card/api/visitCardApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    CreateUpsellSuggestionRequest,
    RequestUpsellResponse,
    UpsellSuggestion,
    VisitCard,
    VisitCardLinkResponse,
    VisitCardSendResponse,
} from '../types';

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

    // ── Upselling ──

    /** Public endpoint: customer requests adding selected suggested services (triggers consent SMS). */
    requestUpsellServices: async (token: string, suggestionIds: string[]): Promise<RequestUpsellResponse> => {
        const response = await apiClient.post<RequestUpsellResponse>(
            `/public/visit-card/${encodeURIComponent(token)}/upsell/request`,
            { suggestionIds },
        );
        return response.data;
    },

    /** Employee endpoint: list upsell suggestions assigned to the visit. */
    getUpsellSuggestions: async (visitId: string): Promise<UpsellSuggestion[]> => {
        const response = await apiClient.get<UpsellSuggestion[]>(`/visits/${visitId}/upsell-suggestions`);
        return response.data;
    },

    /** Employee endpoint: attach a suggested service (with optional discount) to the visit. */
    createUpsellSuggestion: async (
        visitId: string,
        request: CreateUpsellSuggestionRequest,
    ): Promise<UpsellSuggestion> => {
        const response = await apiClient.post<UpsellSuggestion>(`/visits/${visitId}/upsell-suggestions`, request);
        return response.data;
    },

    /** Employee endpoint: remove a suggestion (only while it is still SUGGESTED). */
    deleteUpsellSuggestion: async (visitId: string, suggestionId: string): Promise<void> => {
        await apiClient.delete(`/visits/${visitId}/upsell-suggestions/${suggestionId}`);
    },
};
