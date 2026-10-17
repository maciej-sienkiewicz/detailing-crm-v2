// src/modules/comms/api/instagramDmApi.ts
// Rozmowa leada z Instagrama: odczyt, odpowiedź z CRM, odczytanie.
import { apiClient } from '@/core/apiClient';
import type { InstagramDmConversation } from '../types';

const BASE = '/v1/instagram/dm';

export const instagramDmApi = {
    /** Null, gdy lead nie ma rozmowy na Instagramie (serwer odpowiada 204). */
    getByLead: async (leadId: string): Promise<InstagramDmConversation | null> => {
        const response = await apiClient.get<InstagramDmConversation | ''>(`${BASE}/by-lead/${encodeURIComponent(leadId)}`);
        return response.status === 204 || !response.data ? null : response.data;
    },

    /**
     * Odpowiedź. Błąd pokazujemy przy polu odpowiedzi, nie w toaście: 409 niesie
     * konkretne zdanie („minęły 24 godziny", „konto nie jest połączone"), które ma
     * stać tam, gdzie ktoś właśnie pisze.
     */
    reply: async (threadId: string, text: string): Promise<InstagramDmConversation> => {
        const response = await apiClient.post<InstagramDmConversation>(
            `${BASE}/threads/${encodeURIComponent(threadId)}/reply`,
            { text },
            { skipErrorToast: true }
        );
        return response.data;
    },

    markRead: async (threadId: string): Promise<void> => {
        await apiClient.post(`${BASE}/threads/${encodeURIComponent(threadId)}/read`, null, { skipErrorToast: true });
    },
};
