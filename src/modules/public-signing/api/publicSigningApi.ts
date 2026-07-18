// src/modules/public-signing/api/publicSigningApi.ts
//
// Public, tokenized endpoints for signing a document on the customer's own
// phone (route /sign/:token — no login). The link token from the SMS is the
// sole credential; the backend enforces TTL and single-use challenges.

import { apiClient } from '@/core/apiClient';

export type PublicSigningStatus =
    | 'PENDING_DISPLAY'
    | 'DISPLAYED'
    | 'COMPLETED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'FAILED';

export interface PublicSigningSession {
    status: PublicSigningStatus;
    documentName: string;
    signerName: string;
    declarationText: string;
    /** Expected SHA-256 of the PDF — must match what we compute over the downloaded bytes. */
    documentSha256: string;
    /** Single-use anti-replay nonce; null once the session is terminal. */
    challenge: string | null;
    expiresAt: string;
    failureReason: string | null;
}

export interface PublicSubmitSignaturePayload {
    /** SHA-256 (hex) computed client-side over the PDF bytes that were displayed. */
    documentSha256: string;
    challenge: string;
    declarationAccepted: boolean;
    declarationAcceptedAt: string;
    /** PNG with alpha channel (transparent background), base64 without the data: prefix. */
    signatureImageBase64: string;
}

export const publicSigningApi = {
    getSession: async (token: string): Promise<PublicSigningSession> => {
        const response = await apiClient.get<PublicSigningSession>(
            `/public/signing/${encodeURIComponent(token)}`,
        );
        return response.data;
    },

    /** The EXACT PDF bytes awaiting signature (WYSIWYS — hash them client-side). */
    getDocument: async (token: string): Promise<ArrayBuffer> => {
        const response = await apiClient.get<ArrayBuffer>(
            `/public/signing/${encodeURIComponent(token)}/document`,
            { responseType: 'arraybuffer' },
        );
        return response.data;
    },

    submit: async (token: string, payload: PublicSubmitSignaturePayload): Promise<{ status: string }> => {
        const response = await apiClient.post<{ status: string }>(
            `/public/signing/${encodeURIComponent(token)}/submit`,
            payload,
        );
        return response.data;
    },

    decline: async (token: string, reason?: string): Promise<{ status: string }> => {
        const response = await apiClient.post<{ status: string }>(
            `/public/signing/${encodeURIComponent(token)}/decline`,
            { reason: reason ?? null },
        );
        return response.data;
    },
};
