// src/modules/badges/badgesQuery.ts
// Bez zależności od modułów: importują go komunikacja, leady i kadry, a one importują siebie nawzajem.
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/apiClient';

/** Pole jest `null`, gdy rola nie widzi modułu - serwer go wtedy nie liczy. */
export interface Badges {
    leadsAttention: number | null;
    unreadMail: number | null;
    pendingLeaveRequests: number | null;
    pendingWorkTimeCards: number | null;
    pendingAttendanceSheets: number | null;
}

export const BADGES_KEY = ['me', 'badges'] as const;

/**
 * Liczniki menu jednym zapytaniem (GET /v1/me/badges). Dawniej Sidebar wysyłał pięć:
 * leady, stronę wątków `pageSize=1` dla samego `totalUnread`, wnioski urlopowe, karty
 * czasu pracy i sto list obecności, żeby je policzyć.
 */
export const badgesQuery = () => queryOptions({
    queryKey: BADGES_KEY,
    queryFn: async ({ signal }) =>
        (await apiClient.get<Badges>('/v1/me/badges', { signal, skipAuthRedirect: true })).data,
    staleTime: 60_000,
    // Leady i poczta przychodzą gniazdem; wnioski i karty czasu pracy nie mają pusha, stąd
    // odświeżenie co 5 minut - tylko w widocznej karcie (React Query nie odpytuje w tle).
    refetchInterval: 5 * 60_000,
});

/** Po każdej zmianie, która może przesunąć licznik: lead, wątek, wniosek, karta, lista obecności. */
export const invalidateBadges = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: BADGES_KEY }, { cancelRefetch: false });

/** Korekta o znaną różnicę (np. przeczytany wątek) - bez czekania na serwer. */
export const adjustBadge = (queryClient: QueryClient, field: keyof Badges, delta: number) =>
    queryClient.setQueryData<Badges>(BADGES_KEY, badges => {
        const current = badges?.[field];
        if (!badges || current === null || current === undefined) return badges;
        return { ...badges, [field]: Math.max(0, current + delta) };
    });
