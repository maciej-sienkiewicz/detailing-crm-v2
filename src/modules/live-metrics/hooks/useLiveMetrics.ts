// src/modules/live-metrics/hooks/useLiveMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { liveMetricsApi } from '../api/liveMetricsApi';
import type { SeriesName } from '../types';

export const LIVE_METRICS_OVERVIEW_KEY = ['live-metrics', 'overview'] as const;

/**
 * Migawka wszystkich metryk studia.
 *
 * Odświeżanie co 60 s jest siatką bezpieczeństwa, nie głównym kanałem: żywy obraz robi
 * `useLiveMetricsSocket`, nanosząc pojedyncze zdarzenia na tę samą migawkę. Refetch
 * koryguje dryf i domyka to, co przepadło przy zerwanym połączeniu.
 */
export const useLiveMetricsOverview = () => {
    const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
        queryKey: LIVE_METRICS_OVERVIEW_KEY,
        queryFn: liveMetricsApi.getOverview,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
    });

    return { overview: data, isLoading, isFetching, isError, refetch, dataUpdatedAt };
};

/** Rozkład godzinowy poza zakresem z `/overview` (inna liczba dni niż domyślne 7). */
export const useHourProfile = (series: SeriesName, days: number, enabled = true) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['live-metrics', 'hour-profile', series, days],
        queryFn: () => liveMetricsApi.getHourProfile(series, days),
        enabled,
    });

    return { profile: data, isLoading, isError };
};
