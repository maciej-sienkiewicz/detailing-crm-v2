// src/modules/gallery/hooks/useGallery.ts

import { useQuery } from '@tanstack/react-query';
import { galleryApi } from '../api/galleryApi';
import type { GalleryFilters } from '../types';

export const useGallery = (filters: GalleryFilters) => {
    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: ['gallery', filters],
        queryFn: () => galleryApi.getPhotos(filters),
        placeholderData: prev => prev,
        staleTime: 30_000,
    });

    return {
        photos: data?.photos ?? [],
        pagination: data?.pagination,
        availableTags: data?.availableTags ?? [],
        availableBrands: data?.availableBrands ?? [],
        isLoading,
        isFetching,
        error,
    };
};
