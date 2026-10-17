import { apiClient } from '@/core/apiClient';
import type {
    DmThread,
    GoogleBusiness,
    GoogleReview,
    InstagramConnection,
    InstagramStudioSettings,
    MyInstagram,
    PublishRequest,
    PublishResult,
    PublishVisit,
} from '../accountsTypes';

const IG = '/v1/instagram';
const GOOGLE = '/v1/google-business';

/**
 * Własne konta studia: Instagram (połączenie, statystyki, wiadomości, publikacja)
 * i wizytówka Google.
 *
 * Akcje, których wynik pokazujemy przy przycisku (odświeżenie z limitem 429,
 * publikacja z odmową Meta jako 409), idą z `skipErrorToast` - inaczej ten sam
 * komunikat pojawiłby się dwa razy: w dymku i w oknie.
 */
export const accountsApi = {
    // ── Instagram: połączenie ────────────────────────────────────────────────

    getConnection: async (): Promise<InstagramConnection> => {
        const response = await apiClient.get<InstagramConnection>(`${IG}/connection`);
        return response.data;
    },

    /** Adres logowania Facebookiem - przeglądarka idzie tam od razu. */
    startConnection: async (): Promise<string> => {
        const response = await apiClient.post<{ authorizeUrl: string }>(`${IG}/connection/start`);
        return response.data.authorizeUrl;
    },

    selectConnection: async (pageId: string): Promise<InstagramConnection> => {
        const response = await apiClient.post<InstagramConnection>(`${IG}/connection/select`, { pageId });
        return response.data;
    },

    disconnect: async (): Promise<void> => {
        await apiClient.delete(`${IG}/connection`);
    },

    // ── Instagram: statystyki ────────────────────────────────────────────────

    getMine: async (): Promise<MyInstagram> => {
        const response = await apiClient.get<MyInstagram>(`${IG}/me`);
        return response.data;
    },

    syncMine: async (): Promise<MyInstagram> => {
        const response = await apiClient.post<MyInstagram>(`${IG}/me/sync`, null, { skipErrorToast: true });
        return response.data;
    },

    // ── Instagram: wiadomości ────────────────────────────────────────────────

    listThreads: async (): Promise<DmThread[]> => {
        const response = await apiClient.get<DmThread[]>(`${IG}/dm/threads`);
        return response.data;
    },

    // ── Instagram: publikacja ────────────────────────────────────────────────

    listPublishVisits: async (): Promise<PublishVisit[]> => {
        const response = await apiClient.get<PublishVisit[]>(`${IG}/publish/visits`);
        return response.data;
    },

    publish: async (request: PublishRequest): Promise<PublishResult> => {
        // Meta przetwarza zdjęcia przy tworzeniu posta - serwer czeka na nią do pół minuty.
        const response = await apiClient.post<PublishResult>(`${IG}/publish`, request, {
            skipErrorToast: true,
            timeout: 90_000,
        });
        return response.data;
    },

    // ── Plan publikacji ──────────────────────────────────────────────────────

    getSettings: async (): Promise<InstagramStudioSettings> => {
        const response = await apiClient.get<InstagramStudioSettings>(`${IG}/settings`);
        return response.data;
    },

    saveSettings: async (settings: InstagramStudioSettings): Promise<InstagramStudioSettings> => {
        const response = await apiClient.put<InstagramStudioSettings>(`${IG}/settings`, settings);
        return response.data;
    },

    // ── Wizytówka Google ─────────────────────────────────────────────────────

    getGoogle: async (): Promise<GoogleBusiness> => {
        const response = await apiClient.get<GoogleBusiness>(GOOGLE);
        return response.data;
    },

    startGoogle: async (): Promise<string> => {
        const response = await apiClient.post<{ authorizeUrl: string }>(`${GOOGLE}/connection/start`);
        return response.data.authorizeUrl;
    },

    selectGoogle: async (locationName: string): Promise<GoogleBusiness> => {
        const response = await apiClient.post<GoogleBusiness>(`${GOOGLE}/connection/select`, { locationName });
        return response.data;
    },

    disconnectGoogle: async (): Promise<void> => {
        await apiClient.delete(`${GOOGLE}/connection`);
    },

    syncGoogle: async (): Promise<GoogleBusiness> => {
        const response = await apiClient.post<GoogleBusiness>(`${GOOGLE}/sync`, null, { skipErrorToast: true });
        return response.data;
    },

    replyToReview: async (reviewId: string, comment: string): Promise<GoogleReview> => {
        const response = await apiClient.post<GoogleReview>(
            `${GOOGLE}/reviews/${encodeURIComponent(reviewId)}/reply`,
            { comment },
            { skipErrorToast: true },
        );
        return response.data;
    },
};

/** Komunikat z odpowiedzi backendu (409/400 niosą polskie zdanie dla właściciela). */
export const apiErrorMessage = (error: unknown, fallback: string): string =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const apiErrorStatus = (error: unknown): number | undefined =>
    (error as { response?: { status?: number } })?.response?.status;
