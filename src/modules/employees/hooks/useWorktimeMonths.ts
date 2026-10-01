// src/modules/employees/hooks/useWorktimeMonths.ts
//
// Cache list miesięcznych. Wszystko żyje pod ['worktime', 'team'] - tym samym korzeniem co
// okresy na karcie pracownika (useWorkTime.ts) - bo każda decyzja zmienia naraz: przegląd
// miesiąca, kartę, licznik przy zakładce i w panelu oraz listę okresów pracownika.
// Jedno unieważnienie korzenia zamiast pilnowania pięciu kluczy.

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { worktimeMonthsApi } from '../api/worktimeMonthsApi';

export const WORKTIME_TEAM_KEY = ['worktime', 'team'] as const;
const monthKey = (period: string) => [...WORKTIME_TEAM_KEY, 'months', period] as const;
const cardKey = (period: string, userId: string) => [...WORKTIME_TEAM_KEY, 'months', period, 'cards', userId] as const;
const pendingKey = [...WORKTIME_TEAM_KEY, 'pending-count'] as const;
/** Podpowiedź WORKTIME_CARDS_PENDING na Tablicy liczy te same karty. */
const DASHBOARD_HINTS_KEY = ['dashboard', 'hints'] as const;

/** Po decyzji, przypomnieniu albo podpisie: odśwież wszystko, co liczy karty i listy. */
export function invalidateWorktimeTeam(queryClient: QueryClient) {
    void queryClient.invalidateQueries({ queryKey: WORKTIME_TEAM_KEY });
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_HINTS_KEY });
}

const useInvalidate = () => {
    const queryClient = useQueryClient();
    return () => invalidateWorktimeTeam(queryClient);
};

export const useMonthOverview = (period: string | null) => useQuery({
    queryKey: monthKey(period ?? ''),
    queryFn: () => worktimeMonthsApi.getMonth(period as string),
    enabled: !!period,
});

export const useCardDetail = (period: string, userId: string | null) => useQuery({
    queryKey: cardKey(period, userId ?? ''),
    queryFn: () => worktimeMonthsApi.getCard(period, userId as string),
    enabled: !!userId,
});

/**
 * Licznik przy „Listach miesięcznych" i przy „Pracownicy" w panelu: karty czekające na
 * decyzję wywołującego plus miesiące z listą do podpisu. Tylko dla EMPLOYEES_MANAGE.
 */
export const usePendingWorkTimeCount = (enabled: boolean) => {
    const { data } = useQuery({
        queryKey: pendingKey,
        queryFn: worktimeMonthsApi.pendingCount,
        enabled,
        staleTime: 60_000,
        refetchInterval: enabled ? 5 * 60_000 : false,
    });
    return data ? data.submittedCards + data.sheetsToSign : 0;
};

// Po błędzie też odświeżamy: najczęstszy błąd to „ktoś zdecydował przed chwilą", a wtedy
// widok ma od razu pokazać stan po jego ruchu, a nie stary.

export const useApproveCard = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ userId, period }: { userId: string; period: string }) =>
            worktimeMonthsApi.approveCard(userId, period),
        onSettled: () => invalidate(),
    });
};

export const useReturnCard = () => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: ({ userId, period, note }: { userId: string; period: string; note: string }) =>
            worktimeMonthsApi.returnCard(userId, period, note),
        onSettled: () => invalidate(),
    });
};

export const useRemind = (period: string) => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: (userIds: string[]) => worktimeMonthsApi.remind(period, userIds),
        onSettled: () => invalidate(),
    });
};

export const useCreateSheet = (period: string) => {
    const invalidate = useInvalidate();
    return useMutation({
        mutationFn: (allowIncomplete: boolean) => worktimeMonthsApi.createSheet(period, allowIncomplete),
        onSettled: () => invalidate(),
    });
};
