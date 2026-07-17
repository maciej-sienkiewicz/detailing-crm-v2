// src/modules/visit-card/api/visitCardApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    CreateUpsellSuggestionRequest,
    RequestUpsellResponse,
    UpsellSuggestion,
    VisitCard,
    VisitCardLinkResponse,
    VisitCardSendChannel,
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

    /** Employee endpoint: send the card link to the customer over the chosen channel. */
    sendCardLink: async (visitId: string, channel?: VisitCardSendChannel): Promise<VisitCardSendResponse> => {
        const response = await apiClient.post<VisitCardSendResponse>(
            `/visits/${visitId}/card-link/send`,
            channel ? { channel } : {},
        );
        return response.data;
    },

    // ── Reservation (appointment) variants — same card, issued before check-in ──

    /** Employee endpoint: stable shareable link for a reservation's card. */
    getAppointmentCardLink: async (appointmentId: string): Promise<VisitCardLinkResponse> => {
        const response = await apiClient.get<VisitCardLinkResponse>(`/appointments/${appointmentId}/card-link`);
        return response.data;
    },

    /** Employee endpoint: send the reservation card link to the customer over the chosen channel. */
    sendAppointmentCardLink: async (
        appointmentId: string,
        channel?: VisitCardSendChannel,
    ): Promise<VisitCardSendResponse> => {
        const response = await apiClient.post<VisitCardSendResponse>(
            `/appointments/${appointmentId}/card-link/send`,
            channel ? { channel } : {},
        );
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

    /** Employee endpoint: list upsell suggestions assigned to the visit/reservation. */
    getUpsellSuggestions: async (target: UpsellTarget): Promise<UpsellSuggestion[]> => {
        const response = await apiClient.get<UpsellSuggestion[]>(`${upsellBasePath(target)}`);
        return response.data;
    },

    /** Employee endpoint: attach a suggested service (with optional discount) to the visit/reservation. */
    createUpsellSuggestion: async (
        target: UpsellTarget,
        request: CreateUpsellSuggestionRequest,
    ): Promise<UpsellSuggestion> => {
        const response = await apiClient.post<UpsellSuggestion>(`${upsellBasePath(target)}`, request);
        return response.data;
    },

    /** Employee endpoint: remove a suggestion (only while it is still SUGGESTED). */
    deleteUpsellSuggestion: async (target: UpsellTarget, suggestionId: string): Promise<void> => {
        await apiClient.delete(`${upsellBasePath(target)}/${suggestionId}`);
    },
};

/** The card and its suggestions can hang off a visit or a reservation (appointment). */
export type UpsellTarget =
    | { kind: 'visit'; id: string }
    | { kind: 'appointment'; id: string };

const upsellBasePath = (target: UpsellTarget): string =>
    target.kind === 'visit'
        ? `/visits/${target.id}/upsell-suggestions`
        : `/appointments/${target.id}/upsell-suggestions`;
