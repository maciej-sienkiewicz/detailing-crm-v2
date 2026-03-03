import { apiClient } from '@/core/apiClient';
import type { InstagramProfile, InstagramPost } from '../types';

const BASE_PATH = '/v1/instagram/profiles';
const USE_MOCKS = false;

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
        id: 'sp-3',
        profileId: 'p-103',
        username: 'premium_detailing_pl',
        status: 'REJECTED',
        apiError: false,
        addedAt: '2024-12-05T08:15:00Z',
    },
    {
        id: 'sp-4',
        profileId: 'p-104',
        username: 'carcare_studio',
        status: 'ACTIVE',
        apiError: true,
        addedAt: '2024-10-20T14:00:00Z',
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
};
