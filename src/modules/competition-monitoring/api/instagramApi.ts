import { apiClient } from '@/core/apiClient';
import type { InstagramProfile, InstagramPost, ProfileSummary, WeeklyStat } from '../types';

const BASE_PATH = '/v1/instagram/profiles';
const USE_MOCKS = true;

// ─── Mock data ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let mockProfiles: InstagramProfile[] = [
    {
        id: 'sp-1',
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-11-10T09:00:00Z',
    },
    {
        id: 'sp-2',
        profileId: 'p-102',
        username: 'detailing_masters',
        status: 'PENDING_APPROVAL',
        apiError: false,
        addedAt: '2025-01-14T11:30:00Z',
    },
    {
        id: 'sp-5',
        profileId: 'p-105',
        username: 'detailpro_pl',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-09-15T10:00:00Z',
    },
];

const mockPostsMap: Record<string, InstagramPost[]> = {
    'sp-1': [
        {
            id: 'post-1',
            postPk: '12345678901',
            postCode: 'ABC123xyz',
            likeCount: 142,
            commentCount: 18,
            viewCount: 3400,
            caption: 'Kompleksowe detailing BMW M3 – efekty mówią same za siebie 🚗✨ #detailing #bmw',
            takenAt: '2025-01-08T10:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
        {
            id: 'post-2',
            postPk: '12345678902',
            postCode: 'DEF456uvw',
            likeCount: 89,
            commentCount: 7,
            viewCount: null,
            caption: 'Korekta lakieru Porsche 911 – piękne efekty po obróbce!',
            takenAt: '2025-01-05T14:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
        {
            id: 'post-3',
            postPk: '12345678903',
            postCode: 'GHI789rst',
            likeCount: 220,
            commentCount: 31,
            viewCount: 8100,
            caption: 'Folia PPF na Lamborghini – ochrona klasy premium 🏎️',
            takenAt: '2024-12-28T09:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
        {
            id: 'post-4',
            postPk: '12345678904',
            postCode: 'JKL012mno',
            likeCount: 67,
            commentCount: 4,
            viewCount: 1200,
            caption: null,
            takenAt: '2024-12-20T12:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
    ],
    'sp-4': [
        {
            id: 'post-5',
            postPk: '98765432101',
            postCode: 'MNO345pqr',
            likeCount: 55,
            commentCount: 3,
            viewCount: 980,
            caption: 'Pranie tapicerki na czas – zapisz się już dziś!',
            takenAt: '2025-01-10T08:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
    ],
};

// Weekly stat helpers for mock data
// Generates up to 52 weeks (≈ 1 year) so the date-range picker has data to work with.
const makeWeeks = (base: number, variance: number, count = 52): WeeklyStat[] => {
    const weeks: WeeklyStat[] = [];
    const now = new Date('2025-01-13');
    // Seed-like deterministic-ish values so rerenders don't reshuffle the chart
    let seed = base;
    const rng = () => {
        seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
        return base + ((seed / 0x7fffffff) - 0.5) * variance;
    };
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        // Normalise to Monday of that week
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        weeks.push({
            weekStart: d.toISOString().slice(0, 10),
            avgLikes: Math.max(0, Math.round(rng())),
            avgComments: Math.max(0, Math.round(Math.abs(rng()) * 0.12)),
            postCount: Math.max(0, Math.floor(1 + Math.abs(rng()) / base * 1.5)),
        });
    }
    return weeks;
};

const mockSummaries: ProfileSummary[] = [
    {
        id: 'sp-1',
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-11-10T09:00:00Z',
        postCount: 48,
        avgLikes: 131,
        avgComments: 15,
        avgViews: 3925,
        avgEngagement: 146,
        postsPerWeek: 2.1,
        lastPostAt: '2025-01-08T10:00:00Z',
        weeklyStats: makeWeeks(131, 60),
    },
    {
        id: 'sp-4',
        profileId: 'p-104',
        username: 'carcare_studio',
        status: 'ACTIVE',
        apiError: true,
        addedAt: '2024-10-20T14:00:00Z',
        postCount: 22,
        avgLikes: 55,
        avgComments: 3,
        avgViews: 980,
        avgEngagement: 58,
        postsPerWeek: 0.9,
        lastPostAt: '2025-01-10T08:00:00Z',
        weeklyStats: makeWeeks(55, 30),
    },
    {
        id: 'sp-5',
        profileId: 'p-105',
        username: 'detailpro_pl',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-09-15T10:00:00Z',
        postCount: 67,
        avgLikes: 198,
        avgComments: 27,
        avgViews: 6400,
        avgEngagement: 225,
        postsPerWeek: 3.4,
        lastPostAt: '2025-01-11T15:00:00Z',
        weeklyStats: makeWeeks(198, 80),
    },
];

// ─── Mock handlers ────────────────────────────────────────────────────────────

const mockListProfiles = async (): Promise<InstagramProfile[]> => {
    await delay(500);
    return [...mockProfiles];
};

const mockAddProfile = async (username: string): Promise<InstagramProfile> => {
    await delay(700);
    const newProfile: InstagramProfile = {
        id: `sp-${Date.now()}`,
        profileId: `p-${Date.now()}`,
        username,
        status: 'PENDING_APPROVAL',
        apiError: false,
        addedAt: new Date().toISOString(),
    };
    mockProfiles.unshift(newProfile);
    return newProfile;
};

const mockApproveProfile = async (id: string): Promise<void> => {
    await delay(400);
    const profile = mockProfiles.find(p => p.id === id);
    if (profile) profile.status = 'ACTIVE';
};

const mockRejectProfile = async (id: string): Promise<void> => {
    await delay(400);
    const profile = mockProfiles.find(p => p.id === id);
    if (profile) profile.status = 'REJECTED';
};

const mockRemoveProfile = async (id: string): Promise<void> => {
    await delay(400);
    mockProfiles = mockProfiles.filter(p => p.id !== id);
};

const mockGetPosts = async (id: string): Promise<InstagramPost[]> => {
    await delay(600);
    return mockPostsMap[id] ?? [];
};

const mockGetSummary = async (): Promise<ProfileSummary[]> => {
    await delay(650);
    return mockSummaries;
};

// ─── API object ───────────────────────────────────────────────────────────────

export const instagramApi = {
    listProfiles: async (): Promise<InstagramProfile[]> => {
        if (USE_MOCKS) return mockListProfiles();
        const response = await apiClient.get<InstagramProfile[]>(BASE_PATH);
        return response.data;
    },

    addProfile: async (username: string): Promise<InstagramProfile> => {
        if (USE_MOCKS) return mockAddProfile(username);
        const response = await apiClient.post<InstagramProfile>(BASE_PATH, { username });
        return response.data;
    },

    approveProfile: async (id: string): Promise<void> => {
        if (USE_MOCKS) return mockApproveProfile(id);
        await apiClient.post(`${BASE_PATH}/${id}/approve`);
    },

    rejectProfile: async (id: string): Promise<void> => {
        if (USE_MOCKS) return mockRejectProfile(id);
        await apiClient.post(`${BASE_PATH}/${id}/reject`);
    },

    removeProfile: async (id: string): Promise<void> => {
        if (USE_MOCKS) return mockRemoveProfile(id);
        await apiClient.delete(`${BASE_PATH}/${id}`);
    },

    getPosts: async (id: string): Promise<InstagramPost[]> => {
        if (USE_MOCKS) return mockGetPosts(id);
        const response = await apiClient.get<InstagramPost[]>(`${BASE_PATH}/${id}/posts`);
        return response.data;
    },

    /**
     * Fetch aggregated statistics for all active profiles.
     *
     * Backend endpoint: GET /api/v1/instagram/profiles/summary
     *   Optional query param: ?weeks=N  (default: 52)
     *   Returns up to N weeks of weeklyStats per profile, sorted ascending by weekStart.
     *
     * The backend computes avgLikes, avgComments, avgViews, postsPerWeek and
     * weeklyStats from scraped posts, grouped by studioProfileId.
     * Only ACTIVE profiles are included.
     *
     * Date-range filtering is done client-side from the full dataset so that
     * switching ranges requires no additional network requests.
     */
    getCompetitionSummary: async (): Promise<ProfileSummary[]> => {
        if (USE_MOCKS) return mockGetSummary();
        const response = await apiClient.get<ProfileSummary[]>(`${BASE_PATH}/summary`, {
            params: { weeks: 52 },
        });
        return response.data;
    },
};
