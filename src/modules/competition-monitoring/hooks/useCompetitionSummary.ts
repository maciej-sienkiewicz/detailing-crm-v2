import { useQuery } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';
import type { WeeksOption } from '../types';

export const COMPETITION_SUMMARY_KEY = 'instagram-competition-summary';

export const useCompetitionSummary = (weeks: WeeksOption = 52) => {
    const query = useQuery({
        queryKey: [COMPETITION_SUMMARY_KEY, weeks],
        queryFn: () => instagramApi.getCompetitionSummary(weeks),
    });

    return {
        summaries: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};
