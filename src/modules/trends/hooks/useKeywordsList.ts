import { useQuery } from '@tanstack/react-query';
import { trendsApi } from '../api/trendsApi';
import type { SortField } from '../types';

export const KEYWORDS_LIST_KEY = ['trends', 'keywords'] as const;

export function useKeywordsList(params: { locationCode?: number; sort?: SortField } = {}) {
    const query = useQuery({
        queryKey: [...KEYWORDS_LIST_KEY, params],
        queryFn: () => trendsApi.getKeywords({ status: 'ACTIVE', ...params }),
        staleTime: 5 * 60_000,
        placeholderData: prev => prev,
    });

    return {
        data: query.data?.data ?? null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        refetch: query.refetch,
    };
}
