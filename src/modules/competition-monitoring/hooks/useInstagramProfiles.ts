import { useQuery } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';

export const INSTAGRAM_PROFILES_KEY = 'instagram-profiles';

export const useInstagramProfiles = () => {
    const query = useQuery({
        queryKey: [INSTAGRAM_PROFILES_KEY],
        queryFn: instagramApi.listProfiles,
    });

    return {
        profiles: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};
