// src/modules/photos/api/photoTagsApi.ts

import { apiClient } from '@/core';
import type { PhotoTagsResponse, TagSuggestionsResponse } from '../types';

export const photoTagsApi = {
    getTagSuggestions: async (): Promise<TagSuggestionsResponse> => {
        const response = await apiClient.get('/v1/photo-tags/suggestions');
        return response.data;
    },

    updatePhotoTags: async (
        photoId: string,
        tags: string[]
    ): Promise<PhotoTagsResponse> => {
        const response = await apiClient.put(`/v1/photos/${photoId}/tags`, { tags });
        return response.data;
    },
};
