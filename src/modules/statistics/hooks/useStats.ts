// src/modules/statistics/hooks/useStats.ts
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/statsApi';
import type { Granularity } from '../types';

export const BREAKDOWN_KEY = 'statistics-breakdown';

export const useBreakdown = (
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: [BREAKDOWN_KEY, granularity, startDate, endDate],
        queryFn: () => statsApi.getBreakdown(granularity, startDate, endDate),
        enabled: !!startDate && !!endDate,
    });

    return { breakdown: data, isLoading, isFetching, isError, refetch };
};

export const useDocumentationSummary = (startDate: string, endDate: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['statistics-documentation', startDate, endDate],
        queryFn: () => statsApi.getDocumentation(startDate, endDate),
        enabled: !!startDate && !!endDate,
    });
    return { summary: data, isLoading, isError };
};

export const useCategoryStats = (
    categoryId: string,
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: ['statistics', 'category', categoryId, granularity, startDate, endDate],
        queryFn: () => statsApi.getCategoryStats(categoryId, granularity, startDate, endDate),
        enabled: !!categoryId && !!startDate && !!endDate,
    });

    return { stats: data, isLoading, isFetching, isError, refetch };
};
