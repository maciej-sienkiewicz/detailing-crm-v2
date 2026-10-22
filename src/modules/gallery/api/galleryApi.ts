// src/modules/gallery/api/galleryApi.ts

import { apiClient } from '@/core/apiClient';
import type { GalleryFilters, GalleryPage } from '../types';

// ─── api ───────────────────────────────────────────────────────────────────────

export const galleryApi = {
    getPhotos: async (filters: GalleryFilters): Promise<GalleryPage> => {
        const params = new URLSearchParams();
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));
        if (filters.brand) params.set('brand', filters.brand);
        if (filters.model) params.set('model', filters.model);
        if (filters.customerId) params.set('customerId', filters.customerId);
        if (filters.tags.length) params.set('tags', filters.tags.join(','));

        const response = await apiClient.get<GalleryPage>(`/v1/gallery?${params.toString()}`);
        return response.data;
    },
};
