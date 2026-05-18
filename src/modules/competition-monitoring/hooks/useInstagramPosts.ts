import { useQuery } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';

export const instagramPostsKey = (profileId: string) => ['instagram-posts', profileId];

export const useInstagramPosts = (profileId: string | null) => {
    const query = useQuery({
        queryKey: instagramPostsKey(profileId ?? ''),
        queryFn: () => instagramApi.getPosts(profileId!),
        enabled: profileId !== null,
    });

    return {
        posts: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
    };
};
