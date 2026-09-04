// src/modules/comms/api/commsApi.ts
import { apiClient } from '@/core/apiClient';
import type {
    CommThread,
    CommThreadDetail,
    CommThreadPage,
    ConnectMailAccountRequest,
    ContactCard,
    ContactInsights,
    ContactNote,
    ContactNoteEvent,
    FormMailSource,
    MailAccountState,
    MarkFormLeadResult,
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
        if (filters.folder) params.set('folder', filters.folder);
        if (filters.query) params.set('query', filters.query);
        params.set('page', String(filters.page ?? 0));
        params.set('pageSize', String(filters.pageSize ?? 30));
        const { data } = await apiClient.get(`/v1/comms/threads?${params}`);
        return data;
    },

    /**
     * Korekta językowa treści przed wysyłką (LLM po stronie serwera).
     * W trybie `html` korektor zostawia znaczniki z edytora na miejscu.
     */
    proofread: async (text: string, format: 'text' | 'html' = 'text'): Promise<string> => {
        const { data } = await apiClient.post('/v1/comms/proofread', { text, format }, { skipErrorToast: true });
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

    /**
     * Bez plików - JSON. Z plikami - multipart: część `request` (JSON) + `attachments`.
     * [onUploadProgress] dostaje ułamek 0–1; przy kilkunastu megabajtach na łączu
     * komórkowym przycisk „Wyślij" bez postępu wygląda jak zawieszony.
     */
    send: async (
        request: SendMailRequest,
        onUploadProgress?: (fraction: number) => void
    ): Promise<{ messageId: string; threadId: string }> => {
        const { attachments = [], ...body } = request;
        if (attachments.length === 0) {
            const { data } = await apiClient.post('/v1/comms/send', body, { skipErrorToast: true });
            return data;
        }
        const form = new FormData();
        form.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));
        attachments.forEach((file) => form.append('attachments', file, file.name));
        const { data } = await apiClient.post('/v1/comms/send', form, {
            skipErrorToast: true,
            onUploadProgress: (event) => {
                if (onUploadProgress && event.total) onUploadProgress(Math.min(1, event.loaded / event.total));
            },
        });
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

    // ── Lead z formularza ────────────────────────────────────────────────────

    /**
     * Oznacza mail jako lead z formularza: rejestruje nadawcę i od razu przepuszcza
     * tę wiadomość przez odczyt LLM-em. Odpowiedź potrafi zająć parę sekund -
     * wraca gotowy lead, nie obietnica.
     */
    markMessageAsFormLead: async (messageId: string): Promise<MarkFormLeadResult> => {
        const { data } = await apiClient.post(
            `/v1/comms/messages/${messageId}/mark-form-lead`,
            undefined,
            { skipErrorToast: true }
        );
        return data;
    },

    getFormSources: async (): Promise<FormMailSource[]> => {
        const { data } = await apiClient.get('/v1/comms/form-sources');
        return data;
    },

    /** Wyłącza automat dla nadawcy; ponowne oznaczenie dowolnego maila włącza go z powrotem. */
    deactivateFormSource: async (sourceId: string): Promise<void> => {
        await apiClient.delete(`/v1/comms/form-sources/${sourceId}`);
    },

    /** Pozostałe rozmowy z tym adresem - panel historii korespondencji. */
    getRelatedThreads: async (threadId: string): Promise<CommThread[]> => {
        const { data } = await apiClient.get(`/v1/comms/threads/${threadId}/related`);
        return data;
    },

    /** Wizytówka kontaktu spod avatara - kto to jest, kiedy był, czym jeździ. */
    getContactCard: async (email: string): Promise<ContactCard> => {
        const { data } = await apiClient.get(
            `/v1/comms/contact-card?email=${encodeURIComponent(email)}`
        );
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
