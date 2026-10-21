// src/modules/activity/hooks/useActivityFeed.ts

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityEntityScope } from '../api/activityApi';
import type { ActivityFilters } from '../types';
import { backgroundRequest } from '@/core/backgroundRequest';

export const activityKeys = {
    feed: (filters: ActivityFilters) => ['activity', 'feed', filters] as const,
    newer: (filters: ActivityFilters, since: string | null) => ['activity', 'newer', filters, since] as const,
    entityFeed: (scope: ActivityEntityScope) => ['activity', 'entity-feed', scope] as const,
    actors: (from: string | null, to: string | null) => ['activity', 'actors', from, to] as const,
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
        // New entries are announced by useNewerActivityCount instead.
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    });
}

/** Ile nowych wpisów - limit jednej strony; więcej i tak pokazujemy jako „30+". */
export const NEWER_PROBE_LIMIT = 30;

/** Co ile sprawdzamy, czy doszło coś nowego. Feed to historia, nie czat - minuta wystarczy. */
const NEWER_POLL_MS = 60_000;

/**
 * Liczba wpisów nowszych niż najnowszy na ekranie, przy tych samych filtrach.
 *
 * Pytamy tym samym feedem z `from` tuż po najnowszym wpisie, zamiast przeładowywać
 * listę w tle: przewinięta historia nie skacze pod palcem, a użytkownik sam decyduje,
 * kiedy wczytać nowe („3 nowe zdarzenia, pokaż"). Pusty ekran mówił wcześniej, że
 * „zdarzenia pojawią się same", choć nic go nie odświeżało.
 */
export function useNewerActivityCount(filters: ActivityFilters, newestOccurredAt: string | null) {
    const since = newestOccurredAt
        ? new Date(new Date(newestOccurredAt).getTime() + 1).toISOString()
        : null;

    return useQuery({
        queryKey: activityKeys.newer(filters, since),
        queryFn: async (context) => {
            // Ten sam zakres „od" co lista - ale nigdy wcześniej niż najnowszy wpis.
            const page = await activityApi.getFeed({ ...filters, from: since, to: null }, null, NEWER_PROBE_LIMIT, backgroundRequest(context));
            return { count: page.items.length, more: page.hasMore };
        },
        enabled: since !== null && filters.to === null,
        refetchInterval: NEWER_POLL_MS,
        refetchIntervalInBackground: false,
        staleTime: NEWER_POLL_MS,
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

/** Pracownicy aktywni w okresie - lista „Kto dziś działał" i pozycje filtra „Kto". */
export function useActivityActors(from: string | null, to: string | null) {
    return useQuery({
        queryKey: activityKeys.actors(from, to),
        queryFn: () => activityApi.getActors(from, to),
        staleTime: 60_000,
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
