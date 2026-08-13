import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramApi, type ContentFilters } from '../api/instagramApi';
import type { WeeksOption } from '../types';

/**
 * Hooki analityki v2. Dane zmieniają się raz dziennie (sync), więc queries mają
 * długi staleTime – przełączanie zakładek nie generuje zbędnych żądań.
 */

export const ANALYTICS_KEYS = {
    overview: 'ig-overview',
    benchmark: 'ig-benchmark',
    content: 'ig-content',
    heatmap: 'ig-heatmap',
    hashtags: 'ig-hashtags',
    insights: 'ig-insights',
} as const;

const STALE_TIME = 5 * 60 * 1000;

export const invalidateAnalytics = (queryClient: ReturnType<typeof useQueryClient>) => {
    Object.values(ANALYTICS_KEYS).forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] })
    );
};

export const useOverview = (weeks: WeeksOption) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.overview, weeks],
        queryFn: () => instagramApi.getOverview(weeks),
        staleTime: STALE_TIME,
    });

export const useBenchmark = (weeks: WeeksOption, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.benchmark, weeks],
        queryFn: () => instagramApi.getBenchmark(weeks),
        staleTime: STALE_TIME,
        enabled,
    });

export const useContent = (filters: ContentFilters, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.content, filters],
        queryFn: () => instagramApi.getContent(filters),
        staleTime: STALE_TIME,
        enabled,
    });

export const useHeatmap = (weeks: WeeksOption, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.heatmap, weeks],
        queryFn: () => instagramApi.getHeatmap(weeks),
        staleTime: STALE_TIME,
        enabled,
    });

export const useHashtags = (weeks: WeeksOption, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.hashtags, weeks],
        queryFn: () => instagramApi.getHashtags(weeks),
        staleTime: STALE_TIME,
        enabled,
    });

export const useDismissInsight = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => instagramApi.dismissInsight(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEYS.overview] });
            queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEYS.insights] });
        },
    });
};

export const useReactToPost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ postId, reaction }: { postId: string; reaction: 'LIKED' | 'DISLIKED' | null }) =>
            instagramApi.reactToPost(postId, reaction),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEYS.content] });
        },
    });
};
