import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramApi, type ContentFilters } from '../api/instagramApi';
import type { WeeksOption } from '../types';

/**
 * Hooki analityki v2. Dane zmieniają się raz dziennie (sync), więc queries mają
 * długi staleTime, przełączanie zakładek nie generuje zbędnych żądań.
 */

export const ANALYTICS_KEYS = {
    overview: 'ig-overview',
    benchmark: 'ig-benchmark',
    pulse: 'ig-pulse',
    content: 'ig-content',
    heatmap: 'ig-heatmap',
    hashtags: 'ig-hashtags',
    suggestions: 'ig-suggestions',
    digest: 'ig-digest',
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

/**
 * `placeholderData` trzyma poprzednie dane przy zmianie okresu, więc zakładka nie
 * odmontowuje się na czas pobierania. Bez tego komponent montował się od nowa i
 * resetował wybór profili na wykresach — a że backend sortuje profile wg aktywności
 * *w danym oknie*, po zmianie okresu na wykresie potrafiła wylądować inna czwórka
 * i wspólne okno porównania zmieniało się bez wyraźnego powodu.
 */
export const useBenchmark = (weeks: WeeksOption, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.benchmark, weeks],
        queryFn: () => instagramApi.getBenchmark(weeks),
        staleTime: STALE_TIME,
        placeholderData: keepPreviousData,
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

/** Puls konkurencji: liczony w kodzie, więc ładuje się razem z zakładką. */
export const usePulse = (enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.pulse],
        queryFn: () => instagramApi.getPulse(),
        staleTime: STALE_TIME,
        enabled,
    });

export const useWeekDetail = (profileId: string | null, weekStart: string | null) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.benchmark, 'week-detail', profileId, weekStart],
        queryFn: () => instagramApi.getWeekDetail(profileId!, weekStart!),
        staleTime: STALE_TIME,
        enabled: !!profileId && !!weekStart,
    });

export const useSuggestions = (enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.suggestions],
        queryFn: instagramApi.getSuggestions,
        staleTime: STALE_TIME,
        enabled,
    });

/**
 * Tydzień: digest jest po stronie backendu cache'owany na tydzień i przeliczany
 * dopiero po synchronizacji, więc długi staleTime nie ukrywa tu świeżych danych.
 */
export const useDigest = (enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.digest],
        queryFn: instagramApi.getDigest,
        staleTime: STALE_TIME,
        enabled,
    });

/**
 * Ręczne ponowienie dla profili z błędem pobrania. Po sukcesie odświeżamy całą
 * analitykę, bo odzyskany profil zmienia tabelę, wykresy i puls naraz.
 */
export const useResyncFailedProfiles = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: instagramApi.resyncFailedProfiles,
        onSuccess: () => invalidateAnalytics(queryClient),
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
