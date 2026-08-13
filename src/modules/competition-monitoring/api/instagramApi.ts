import { apiClient } from '@/core/apiClient';
import type {
    Benchmark,
    ContentPage,
    GenerateInstagramPostRequest,
    HashtagStat,
    Heatmap,
    Insight,
    InstagramPostResult,
    InstagramProfile,
    Overview,
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

    getInsights: async (status?: string, limit = 30): Promise<Insight[]> => {
        const response = await apiClient.get<{ insights: Insight[] }>(`${ANALYTICS_PATH}/insights`, {
            params: { status, limit },
        });
        return response.data.insights;
    },

    dismissInsight: async (id: string): Promise<void> => {
        await apiClient.post(`${ANALYTICS_PATH}/insights/${id}/dismiss`);
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
