// src/modules/photos/hooks/usePhotoTags.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { photoTagsApi } from '../api/photoTagsApi';

export const useTagSuggestions = () => {
    return useQuery({
        queryKey: ['photo-tags', 'suggestions'],
        queryFn: () => photoTagsApi.getTagSuggestions(),
        staleTime: 5 * 60 * 1000,
        select: (data) => data.suggestions,
    });
};

export const useUpdatePhotoTags = (options?: {
    onSuccess?: (photoId: string, tags: string[]) => void;
}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ photoId, tags }: { photoId: string; tags: string[] }) =>
            photoTagsApi.updatePhotoTags(photoId, tags),
        onSuccess: (data, variables) => {
            // New tags may have become suggestions — refresh
            queryClient.invalidateQueries({ queryKey: ['photo-tags', 'suggestions'] });
            options?.onSuccess?.(variables.photoId, data.tags);
        },
    });
};
