// src/modules/photos/api/photoTagsApi.ts

import { apiClient } from '@/core';
import type { PhotoTagsResponse, TagSuggestionsResponse } from '../types';

const USE_MOCKS = false;

const MOCK_SUGGESTIONS: string[] = [
    'przód', 'tył', 'lewy bok', 'prawy bok',
    'dach', 'maska', 'zderzak', 'szyba',
    'uszkodzenie', 'zarysowanie', 'wgniecenie',
    'PPF', 'folia', 'ceramika', 'lakier',
    'felga', 'opona', 'wnętrze', 'bagażnik',
    'przed', 'po', 'detailing', 'korekta lakieru',
    'koło zapasowe', 'progowa', 'słupek', 'lusterko',
];

export const photoTagsApi = {
    getTagSuggestions: async (): Promise<TagSuggestionsResponse> => {
        if (USE_MOCKS) {
            await new Promise(r => setTimeout(r, 150));
            return { suggestions: MOCK_SUGGESTIONS };
        }
        const response = await apiClient.get('/photo-tags/suggestions');
        return response.data;
    },

    updatePhotoTags: async (
        photoId: string,
        tags: string[]
    ): Promise<PhotoTagsResponse> => {
        if (USE_MOCKS) {
            await new Promise(r => setTimeout(r, 200));
            return { tags };
        }
        const response = await apiClient.put(`/photos/${photoId}/tags`, { tags });
        return response.data;
    },
};
