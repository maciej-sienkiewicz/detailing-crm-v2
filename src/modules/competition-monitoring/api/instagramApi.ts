import { apiClient } from '@/core/apiClient';
import type {
    Benchmark,
    ProfileSuggestion,
    WeeklyDigest,
    CompetitorPulse,
    ContentPage,
    GenerateInstagramPostRequest,
    HashtagStat,
    Heatmap,
    InstagramPostResult,
    InstagramProfile,
    Overview,
    ResyncResult,
    WeekDetail,
    WeeksOption,
} from '../types';

const PROFILES_PATH = '/v1/instagram/profiles';
const ANALYTICS_PATH = '/v1/instagram';

export interface ContentFilters {
    weeks: WeeksOption;
    sort: 'engagement' | 'date' | 'likes';
    topic?: string;
    format?: string;
    profileId?: string;
    promoOnly?: boolean;
    page: number;
    pageSize: number;
}

export const instagramApi = {
    // ── Profile (zarządzanie) ────────────────────────────────────────────────

    listProfiles: async (): Promise<InstagramProfile[]> => {
        const response = await apiClient.get<InstagramProfile[]>(PROFILES_PATH);
        return response.data;
    },

    addProfile: async (username: string): Promise<InstagramProfile> => {
        const response = await apiClient.post<InstagramProfile>(PROFILES_PATH, { username });
        return response.data;
    },

    approveProfile: async (id: string): Promise<void> => {
        await apiClient.post(`${PROFILES_PATH}/${id}/approve`);
    },

    rejectProfile: async (id: string): Promise<void> => {
        await apiClient.post(`${PROFILES_PATH}/${id}/reject`);
    },

    removeProfile: async (id: string): Promise<void> => {
        await apiClient.delete(`${PROFILES_PATH}/${id}`);
    },

    /** Oznacza profil jako "Twoje studio" (punkt odniesienia benchmarku). */
    markSelf: async (id: string, isSelf: boolean): Promise<void> => {
        await apiClient.post(`${PROFILES_PATH}/${id}/mark-self`, { isSelf });
    },

    // ── Analityka v2 ─────────────────────────────────────────────────────────

    getOverview: async (weeks: WeeksOption): Promise<Overview> => {
        const response = await apiClient.get<Overview>(`${ANALYTICS_PATH}/overview`, { params: { weeks } });
        return response.data;
    },

    getBenchmark: async (weeks: WeeksOption): Promise<Benchmark> => {
        const response = await apiClient.get<Benchmark>(`${ANALYTICS_PATH}/benchmark`, { params: { weeks } });
        return response.data;
    },

    /**
     * Ponawia pobranie danych wyłącznie dla profili z etykietą "problem z pobraniem".
     * Backend ma cooldown per studio — 429 obsługujemy lokalnie własnym komunikatem.
     */
    resyncFailedProfiles: async (): Promise<ResyncResult> => {
        const response = await apiClient.post<ResyncResult>(`${PROFILES_PATH}/resync-failed`, null, {
            skipErrorToast: true,
        });
        return response.data;
    },

    /** Puls: co wydarzyło się u obserwowanych profili w ostatnich dniach. */
    getPulse: async (weeks = 1): Promise<CompetitorPulse> => {
        const response = await apiClient.get<CompetitorPulse>(`${ANALYTICS_PATH}/pulse`, {
            params: { weeks },
        });
        return response.data;
    },

    /** Wyjaśnienie tygodnia: publikacje i zdarzenia stojące za przyrostem obserwujących. */
    getWeekDetail: async (profileId: string, weekStart: string): Promise<WeekDetail> => {
        const response = await apiClient.get<WeekDetail>(`${ANALYTICS_PATH}/benchmark/week-detail`, {
            params: { profileId, weekStart },
        });
        return response.data;
    },

    getContent: async (filters: ContentFilters): Promise<ContentPage> => {
        const response = await apiClient.get<ContentPage>(`${ANALYTICS_PATH}/content`, { params: filters });
        return response.data;
    },

    getHeatmap: async (weeks: WeeksOption): Promise<Heatmap> => {
        const response = await apiClient.get<Heatmap>(`${ANALYTICS_PATH}/content/heatmap`, { params: { weeks } });
        return response.data;
    },

    getHashtags: async (weeks: WeeksOption): Promise<HashtagStat[]> => {
        const response = await apiClient.get<{ hashtags: HashtagStat[] }>(`${ANALYTICS_PATH}/hashtags`, {
            params: { weeks },
        });
        return response.data.hashtags;
    },

    getSuggestions: async (): Promise<ProfileSuggestion[]> => {
        const response = await apiClient.get<{ suggestions: ProfileSuggestion[] }>(`${ANALYTICS_PATH}/suggestions`);
        return response.data.suggestions;
    },

    /** Tydzień: jeden wiersz na obserwowany profil. Null, gdy studio nie obserwuje nikogo. */
    getDigest: async (): Promise<WeeklyDigest | null> => {
        const response = await apiClient.get<{ digest: WeeklyDigest | null }>(`${ANALYTICS_PATH}/digest`);
        return response.data.digest;
    },

    // ── Reakcje i generator AI ───────────────────────────────────────────────

    reactToPost: async (postId: string, reaction: 'LIKED' | 'DISLIKED' | null): Promise<void> => {
        await apiClient.post(`/v1/instagram/posts/${postId}/reaction`, { reaction });
    },

    generatePost: async (req: GenerateInstagramPostRequest): Promise<InstagramPostResult> => {
        const response = await apiClient.post<InstagramPostResult>('/v1/instagram/ai/generate', req);
        return response.data;
    },
};
