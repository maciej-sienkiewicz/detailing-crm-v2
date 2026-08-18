// src/modules/comms/api/commsApi.ts
import { apiClient } from '@/core/apiClient';
import type {
    CommLabel,
    CommThreadDetail,
    CommThreadPage,
    ConnectMailAccountRequest,
    ContactInsights,
    MailAccountState,
    ProviderDetectResult,
    SendMailRequest,
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

    setThreadLabel: async (threadId: string, labelId: string | null): Promise<void> => {
        await apiClient.put(`/v1/comms/threads/${threadId}/label`, { labelId });
    },

    // ── Wysyłka ──────────────────────────────────────────────────────────────

    send: async (request: SendMailRequest): Promise<{ messageId: string; threadId: string }> => {
        const { data } = await apiClient.post('/v1/comms/send', request, { skipErrorToast: true });
        return data;
    },

    // ── Foldery lokalne (etykiety) ───────────────────────────────────────────

    getLabels: async (): Promise<CommLabel[]> => {
        const { data } = await apiClient.get('/v1/comms/labels');
        return data;
    },

    createLabel: async (name: string, color?: string): Promise<CommLabel> => {
        const { data } = await apiClient.post('/v1/comms/labels', { name, color: color ?? null });
        return data;
    },

    deleteLabel: async (labelId: string): Promise<void> => {
        await apiClient.delete(`/v1/comms/labels/${labelId}`);
    },

    // ── Insights ─────────────────────────────────────────────────────────────

    getInsights: async (email: string, threadId?: string): Promise<ContactInsights> => {
        const params = new URLSearchParams({ email });
        if (threadId) params.set('threadId', threadId);
        const { data } = await apiClient.get(`/v1/comms/insights?${params}`);
        return data;
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
