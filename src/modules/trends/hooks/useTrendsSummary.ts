import { useQuery } from '@tanstack/react-query';
import { trendsApi } from '../api/trendsApi';

export const TRENDS_SUMMARY_KEY = ['trends', 'summary'] as const;

export function useTrendsSummary() {
    const query = useQuery({
        queryKey: TRENDS_SUMMARY_KEY,
        queryFn: () => trendsApi.getSummary(),
        staleTime: 5 * 60_000,
    });

    return {
        summary: query.data?.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
