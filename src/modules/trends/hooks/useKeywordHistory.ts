import { useQuery } from '@tanstack/react-query';
import { trendsApi } from '../api/trendsApi';

export const KEYWORD_HISTORY_KEY = ['trends', 'keyword-history'] as const;

export function useKeywordHistory(keyword: string | null, locationCode = 2616) {
    const query = useQuery({
        queryKey: [...KEYWORD_HISTORY_KEY, keyword, locationCode],
        queryFn: () => trendsApi.getKeywordHistory(keyword!, { locationCode }),
        enabled: keyword !== null,
        staleTime: 10 * 60_000,
    });

    return {
        history: query.data?.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
    };
}
