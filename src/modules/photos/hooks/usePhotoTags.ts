// src/modules/photos/hooks/usePhotoTags.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { photoTagsApi } from '../api/photoTagsApi';

export const useTagSuggestions = () => {
    return useQuery({
        queryKey: ['photo-tags', 'suggestions'],
        queryFn: () => photoTagsApi.getTagSuggestions(),
        staleTime: STALE_TIME.catalog,
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
            // New tags may have become suggestions, so refresh
            queryClient.invalidateQueries({ queryKey: ['photo-tags', 'suggestions'] });
            // Galeria filtruje po tagach i trzyma odpowiedź 5 minut: bez tego nowy tag nie
            // pojawiał się w filtrze, a zdjęcie nie wpadało pod już wybrany.
            queryClient.invalidateQueries({ queryKey: ['gallery'] });
            options?.onSuccess?.(variables.photoId, data.tags);
        },
    });
};
