import { apiClient } from '@/core/apiClient';

export interface SignatureStatus {
    hasSignature: boolean;
    url: string | null;
}

export interface SendLinkResult {
    expiresAt: string;
}

const BASE = '/v1/profile';

export const profileApi = {
    getSignature: async (): Promise<SignatureStatus> => {
        const res = await apiClient.get<SignatureStatus>(`${BASE}/signature`);
        return res.data;
    },

    saveSignature: async (signatureImageBase64: string): Promise<void> => {
        await apiClient.put(`${BASE}/signature`, { signatureImageBase64 });
    },

    deleteSignature: async (): Promise<void> => {
        await apiClient.delete(`${BASE}/signature`);
    },

    sendSignatureLink: async (phoneNumber: string): Promise<SendLinkResult> => {
        const res = await apiClient.post<SendLinkResult>(`${BASE}/signature/send-link`, { phoneNumber });
        return res.data;
    },
};
