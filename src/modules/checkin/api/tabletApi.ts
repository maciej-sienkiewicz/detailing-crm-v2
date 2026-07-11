import { apiClient } from '@/core';

export interface TabletInfo {
    tabletId: string;
    deviceName: string;
    pairedAt: string;
    tokenExpiresAt: string | null;
}

export interface SignatureRequestResponse {
    id: string;
    visitId: string;
    protocolId: string;
    tabletId: string | null;
    status: string;
    failureReason?: string | null;
}

export const tabletApi = {
    listTablets: async (): Promise<TabletInfo[]> => {
        const response = await apiClient.get('/v1/tablets');
        return response.data;
    },

    requestTabletSignature: async (
        visitId: string,
        protocolId: string,
        signerName: string,
        tabletId?: string,
    ): Promise<SignatureRequestResponse> => {
        const response = await apiClient.post(
            `/v1/visits/${visitId}/protocols/${protocolId}/signature-requests`,
            { tabletId: tabletId ?? null, signerName },
        );
        return response.data;
    },

    /** Polling fallback — used to re-sync after a lost WebSocket connection. */
    getSignatureRequest: async (requestId: string): Promise<SignatureRequestResponse> => {
        const response = await apiClient.get(`/v1/signature-requests/${requestId}`);
        return response.data;
    },
};
