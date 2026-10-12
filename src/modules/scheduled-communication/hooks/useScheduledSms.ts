import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduledSmsApi } from '../api/scheduledSmsApi';
import type { ScheduledSmsItem, UpdateScheduledSmsPayload } from '../types';

const KEY = ['scheduled-sms'] as const;

/** Domyślnie miesiąc w przód - tyle sięga lista wyliczanych przypomnień automatu. */
export const DEFAULT_HORIZON_DAYS = 30;

export function useScheduledSms(days: number = DEFAULT_HORIZON_DAYS) {
    return useQuery({
        queryKey: [...KEY, days],
        queryFn: () => scheduledSmsApi.list(days),
        // Lista żyje: dispatchery wysyłają co minutę, a pracownik zostawia ją otwartą.
        refetchInterval: 60_000,
    });
}

/**
 * Zakładka „Wysłane": strony od najnowszych, kolejna („Pokaż starsze") kursorem z poprzedniej.
 * Pobierana dopiero po otwarciu zakładki - kto patrzy na kolejkę, nie potrzebuje historii.
 */
export function useSentSms(enabled: boolean) {
    return useInfiniteQuery({
        queryKey: [...KEY, 'sent'],
        queryFn: ({ pageParam }) => scheduledSmsApi.sent(pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: last => last.nextBefore,
        enabled,
    });
}

/**
 * Po każdej akcji lista jest pobierana od nowa, a nie łatana lokalnie: termin dociąga
 * do okna wysyłki serwer, a SMS automatu po pierwszej decyzji zmienia źródło danych.
 */
function useScheduledSmsMutation<TArgs>(fn: (args: TArgs) => Promise<void>) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: fn,
        onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export const useUpdateScheduledSms = () =>
    useScheduledSmsMutation(({ item, payload }: { item: ScheduledSmsItem; payload: UpdateScheduledSmsPayload }) =>
        scheduledSmsApi.update(item, payload));

export const useCancelScheduledSms = () =>
    useScheduledSmsMutation((item: ScheduledSmsItem) => scheduledSmsApi.cancel(item));

export const useResumeScheduledSms = () =>
    useScheduledSmsMutation((item: ScheduledSmsItem) => scheduledSmsApi.resume(item));
