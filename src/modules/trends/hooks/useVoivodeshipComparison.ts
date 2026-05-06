import { useQuery } from '@tanstack/react-query';
import { trendsApi } from '../api/trendsApi';

export const VOIVODESHIP_KEY = ['trends', 'voivodeships'] as const;

export function useVoivodeshipComparison(keyword: string | null) {
    const query = useQuery({
        queryKey: [...VOIVODESHIP_KEY, keyword],
        queryFn: () => trendsApi.getVoivodeshipComparison(keyword!),
        enabled: keyword !== null,
        staleTime: 10 * 60_000,
    });

    return {
        data: query.data?.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
    };
}
