import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
