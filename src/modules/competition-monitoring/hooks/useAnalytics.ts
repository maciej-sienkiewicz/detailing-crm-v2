import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { instagramApi, type ContentFilters } from '../api/instagramApi';
import type { CompetitionDays } from '../types';

/**
 * Hooki analityki v2. Dane zmieniają się raz dziennie (sync), więc queries mają
 * długi staleTime, przełączanie zakładek nie generuje zbędnych żądań.
 */

export const ANALYTICS_KEYS = {
    content: 'ig-content',
    suggestions: 'ig-suggestions',
    digest: 'ig-digest',
    home: 'ig-home',
    competition: 'ig-competition',
} as const;

const STALE_TIME = 5 * 60 * 1000;

export const invalidateAnalytics = (queryClient: ReturnType<typeof useQueryClient>) => {
    Object.values(ANALYTICS_KEYS).forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] })
    );
};

export const useContent = (filters: ContentFilters, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.content, filters],
        queryFn: () => instagramApi.getContent(filters),
        staleTime: STALE_TIME,
        enabled,
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

export const useHome = (enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.home],
        queryFn: instagramApi.getHome,
        staleTime: STALE_TIME,
        enabled,
    });

export const useCompetition = (days: CompetitionDays, enabled = true) =>
    useQuery({
        queryKey: [ANALYTICS_KEYS.competition, days],
        queryFn: () => instagramApi.getCompetition(days),
        staleTime: STALE_TIME,
        placeholderData: keepPreviousData,
        enabled,
    });
