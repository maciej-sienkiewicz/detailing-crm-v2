// src/modules/activity/hooks/useActivityFeed.ts

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityEntityScope } from '../api/activityApi';
import type { ActivityFilters } from '../types';

export const activityKeys = {
    feed: (filters: ActivityFilters) => ['activity', 'feed', filters] as const,
    entityFeed: (scope: ActivityEntityScope) => ['activity', 'entity-feed', scope] as const,
    filterOptions: () => ['activity', 'filter-options'] as const,
};

/**
 * The feed, paged by cursor.
 *
 * The whole filter object is part of the query key, so changing any filter starts
 * a fresh page-one query instead of appending to the previous result, which is
 * what an accumulating infinite query would otherwise do.
 */
export function useActivityFeed(filters: ActivityFilters) {
    return useInfiniteQuery({
        queryKey: activityKeys.feed(filters),
        queryFn: ({ pageParam }) => activityApi.getFeed(filters, pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: page => (page.hasMore ? page.nextCursor : undefined),
        // The feed is append-only history: entries already on screen never change,
        // so there is nothing to gain from refetching them behind the user's back.
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    });
}

/**
 * Historia jednego obiektu - sekcja „Historia zmian" na karcie wizyty, klienta
 * albo pojazdu. Ten sam feed i te same wiersze co zakładka Aktywność, zawężone
 * do zdarzeń wokół obiektu.
 */
export function useEntityActivityFeed(scope: ActivityEntityScope) {
    return useInfiniteQuery({
        queryKey: activityKeys.entityFeed(scope),
        queryFn: ({ pageParam }) => activityApi.getEntityFeed(scope, pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: page => (page.hasMore ? page.nextCursor : undefined),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    });
}

/** Filter options are a static catalogue, fetched once per session. */
export function useActivityFilterOptions() {
    return useQuery({
        queryKey: activityKeys.filterOptions(),
        queryFn: activityApi.getFilterOptions,
        staleTime: Infinity,
    });
}
