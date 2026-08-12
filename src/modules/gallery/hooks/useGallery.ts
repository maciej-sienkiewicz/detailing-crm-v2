// src/modules/gallery/hooks/useGallery.ts

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { galleryApi } from '../api/galleryApi';
import type { GalleryFilters, GalleryPhoto } from '../types';

// Presigned image URLs stay valid for ~30 min server-side. Serving the cached
// response (with its unchanged URLs) for a few minutes lets the browser reuse
// already-downloaded images instead of re-fetching everything on each visit.
const GALLERY_STALE_TIME = 5 * 60 * 1000;
const GALLERY_GC_TIME = 30 * 60 * 1000;

const EMPTY_PHOTOS: GalleryPhoto[] = [];
const EMPTY_TAGS: string[] = [];

export const useGallery = (filters: GalleryFilters) => {
    const queryClient = useQueryClient();

    const { data, isLoading, isFetching, error, isPlaceholderData } = useQuery({
        queryKey: ['gallery', filters],
        queryFn: () => galleryApi.getPhotos(filters),
        staleTime: GALLERY_STALE_TIME,
        gcTime: GALLERY_GC_TIME,
        // Keep the previous page on screen while the next one loads instead of
        // collapsing the whole grid into skeletons.
        placeholderData: (prev) => prev,
    });

    // Warm the next page in the background so paging forward is instant.
    const totalPages = data?.pagination?.totalPages ?? 0;
    useEffect(() => {
        if (isPlaceholderData || filters.page >= totalPages) return;
        const nextFilters = { ...filters, page: filters.page + 1 };
        queryClient.prefetchQuery({
            queryKey: ['gallery', nextFilters],
            queryFn: () => galleryApi.getPhotos(nextFilters),
            staleTime: GALLERY_STALE_TIME,
        });
    }, [queryClient, isPlaceholderData, totalPages, filters]);

    return {
        photos: data?.photos ?? EMPTY_PHOTOS,
        pagination: data?.pagination,
        availableTags: data?.availableTags ?? EMPTY_TAGS,
        isLoading,
        isFetching,
        error,
    };
};
