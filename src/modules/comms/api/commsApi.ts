// src/modules/comms/api/commsApi.ts
import { apiClient } from '@/core/apiClient';
import type {
    CommThreadDetail,
    CommThreadPage,
    ConnectMailAccountRequest,
    ContactInsights,
    ContactNote,
    ContactNoteEvent,
    MailAccountState,
    MailSignature,
    ProviderDetectResult,
    SendMailRequest,
    ThreadContactBadges,
    ThreadListFilters,
} from '../types';

export const commsApi = {
    // ── Skrzynki (onboarding zostaje pod /mailbox, stan pod /comms) ──────────

    detectProvider: async (email: string): Promise<ProviderDetectResult> => {
        const { data } = await apiClient.post('/v1/mailbox/accounts/detect', { email });
        return data;
    },

    connectAccount: async (request: ConnectMailAccountRequest): Promise<MailAccountState> => {
        const { data } = await apiClient.post('/v1/mailbox/accounts', request, { skipErrorToast: true });
        return data;
    },

    disconnectAccount: async (accountId: string): Promise<void> => {
        await apiClient.delete(`/v1/mailbox/accounts/${accountId}`);
    },

    getAccounts: async (): Promise<MailAccountState[]> => {
        const { data } = await apiClient.get('/v1/comms/accounts');
        return data;
    },

    syncAccount: async (accountId: string): Promise<void> => {
        await apiClient.post(`/v1/comms/accounts/${accountId}/sync`);
    },

    // ── Wątki ────────────────────────────────────────────────────────────────

    getThreads: async (filters: ThreadListFilters): Promise<CommThreadPage> => {
        const params = new URLSearchParams();
        if (filters.accountId) params.set('accountId', filters.accountId);
        if (filters.archived !== undefined) params.set('archived', String(filters.archived));
        if (filters.labelId) params.set('labelId', filters.labelId);
        if (filters.onlyUnread) params.set('onlyUnread', 'true');
        if (filters.onlyLeads) params.set('onlyLeads', 'true');
        if (filters.query) params.set('query', filters.query);
        params.set('page', String(filters.page ?? 0));
        params.set('pageSize', String(filters.pageSize ?? 30));
        const { data } = await apiClient.get(`/v1/comms/threads?${params}`);
        return data;
    },

    /** Korekta językowa treści przed wysyłką (LLM po stronie serwera). */
    proofread: async (text: string): Promise<string> => {
        const { data } = await apiClient.post('/v1/comms/proofread', { text }, { skipErrorToast: true });
        return data.text;
    },

    // ── Stopka nadawcy ───────────────────────────────────────────────────────

    getSignature: async (): Promise<MailSignature> => {
        const { data } = await apiClient.get('/v1/comms/signature');
        return data;
    },

    saveSignature: async (bodyHtml: string, enabledByDefault: boolean): Promise<MailSignature> => {
        const { data } = await apiClient.put('/v1/comms/signature', { bodyHtml, enabledByDefault });
        return data;
    },

    deleteSignature: async (): Promise<void> => {
        await apiClient.delete('/v1/comms/signature');
    },

    getThread: async (threadId: string): Promise<CommThreadDetail> => {
        const { data } = await apiClient.get(`/v1/comms/threads/${threadId}`);
        return data;
    },

    markThreadRead: async (threadId: string): Promise<void> => {
        await apiClient.post(`/v1/comms/threads/${threadId}/read`);
    },

    setThreadArchived: async (threadId: string, archived: boolean): Promise<void> => {
        await apiClient.put(`/v1/comms/threads/${threadId}/archive`, { archived });
    },


    // ── Wysyłka ──────────────────────────────────────────────────────────────

    send: async (request: SendMailRequest): Promise<{ messageId: string; threadId: string }> => {
        const { data } = await apiClient.post('/v1/comms/send', request, { skipErrorToast: true });
        return data;
    },

    // ── Foldery lokalne (etykiety) ───────────────────────────────────────────




    // ── Insights ─────────────────────────────────────────────────────────────

    getInsights: async (email: string, threadId?: string): Promise<ContactInsights> => {
        const params = new URLSearchParams({ email });
        if (threadId) params.set('threadId', threadId);
        const { data } = await apiClient.get(`/v1/comms/insights?${params}`);
        return data;
    },

    // ── Plakietki nagłówka rozmowy ───────────────────────────────────────────

    getThreadContactBadges: async (threadId: string): Promise<ThreadContactBadges> => {
        const { data } = await apiClient.get(`/v1/comms/threads/${threadId}/contact-badges`);
        return data;
    },

    // ── Notatki o kontakcie ──────────────────────────────────────────────────

    getNotes: async (email: string): Promise<{ email: string; notes: ContactNote[] }> => {
        const { data } = await apiClient.get(`/v1/comms/notes?email=${encodeURIComponent(email)}`);
        return data;
    },

    getNoteHistory: async (email: string): Promise<ContactNoteEvent[]> => {
        const { data } = await apiClient.get(
            `/v1/comms/notes/history?email=${encodeURIComponent(email)}`
        );
        return data;
    },

    createNote: async (email: string, body: string): Promise<ContactNote> => {
        const { data } = await apiClient.post(
            `/v1/comms/notes?email=${encodeURIComponent(email)}`,
            { body },
            { skipErrorToast: true }
        );
        return data;
    },

    updateNote: async (noteId: string, body: string): Promise<ContactNote> => {
        const { data } = await apiClient.put(`/v1/comms/notes/${noteId}`, { body }, {
            skipErrorToast: true,
        });
        return data;
    },

    deleteNote: async (noteId: string): Promise<void> => {
        await apiClient.delete(`/v1/comms/notes/${noteId}`, { skipErrorToast: true });
    },

    // ── Załączniki ───────────────────────────────────────────────────────────

    /** Pobiera załącznik jako blob (autoryzacja przez cookies sesji). */
    downloadAttachment: async (attachmentId: string): Promise<Blob> => {
        const { data } = await apiClient.get(`/v1/comms/attachments/${attachmentId}`, {
            responseType: 'blob',
        });
        return data;
    },
};
