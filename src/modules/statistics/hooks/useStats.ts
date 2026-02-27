// src/modules/statistics/hooks/useStats.ts
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/statsApi';
import type { Granularity } from '../types';

export const useCategoryStats = (
    categoryId: string,
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['statistics', 'category', categoryId, granularity, startDate, endDate],
        queryFn: () => statsApi.getCategoryStats(categoryId, granularity, startDate, endDate),
        enabled: !!categoryId && !!startDate && !!endDate,
    });

    return { stats: data, isLoading, isError, refetch };
};

export const useOverviewStats = (
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['statistics', 'overview', granularity, startDate, endDate],
        queryFn: () => statsApi.getOverview(granularity, startDate, endDate),
        enabled: !!startDate && !!endDate,
    });

    return { stats: data, isLoading, isError, refetch };
};

export const useUnassignedServices = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['statistics', 'unassigned-services'],
        queryFn: () => statsApi.getUnassignedServices(),
    });

    return { services: data || [], isLoading, isError };
};
