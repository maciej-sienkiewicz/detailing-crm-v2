// src/modules/statistics/hooks/useDelayStats.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { delayStatsApi } from '../api/delayStatsApi';
import type { Granularity } from '../types';

export const DELAY_STATS_KEY = 'statistics-delays';

export const useDelayStats = (
    granularity: Granularity,
    startDate: string,
    endDate: string,
    excludedServiceIds: string[] = []
) => {
    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: [DELAY_STATS_KEY, granularity, startDate, endDate, excludedServiceIds],
        queryFn: () => delayStatsApi.getDelayStats(granularity, startDate, endDate, excludedServiceIds),
        enabled: !!startDate && !!endDate,
        placeholderData: keepPreviousData,
    });

    return { delayStats: data, isLoading, isFetching, isError, refetch };
};
