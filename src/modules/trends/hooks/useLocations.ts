import { useQuery } from '@tanstack/react-query';
import { trendsApi } from '../api/trendsApi';

export const LOCATIONS_KEY = ['trends', 'locations'] as const;

export function useLocations() {
    const query = useQuery({
        queryKey: LOCATIONS_KEY,
        queryFn: () => trendsApi.getLocations(),
        staleTime: Infinity,
    });

    return {
        locations: query.data?.data ?? null,
        isLoading: query.isLoading,
    };
}
