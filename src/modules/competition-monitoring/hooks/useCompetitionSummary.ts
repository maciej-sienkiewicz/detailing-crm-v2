import { useQuery } from '@tanstack/react-query';
import { instagramApi } from '../api/instagramApi';

export const COMPETITION_SUMMARY_KEY = 'instagram-competition-summary';

export const useCompetitionSummary = () => {
    const query = useQuery({
        queryKey: [COMPETITION_SUMMARY_KEY],
        queryFn: instagramApi.getCompetitionSummary,
    });

    return {
        summaries: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};
