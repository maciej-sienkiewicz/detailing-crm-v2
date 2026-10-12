import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduledEmailApi } from '../api/scheduledEmailApi';
import type { ScheduledEmailItem, UpdateScheduledEmailPayload } from '../types';

const KEY = ['scheduled-email'] as const;

/** Zakładka „E-maile" - lista żyje tak samo jak SMS-owa: dispatcher kolejki chodzi co minutę. */
export function useScheduledEmail() {
    return useQuery({
        queryKey: KEY,
        queryFn: () => scheduledEmailApi.list(),
        refetchInterval: 60_000,
    });
}

/** Historia wysłanych e-maili - dopiero po otwarciu jej zakładki. */
export function useSentEmail(enabled: boolean) {
    return useInfiniteQuery({
        queryKey: [...KEY, 'sent'],
        queryFn: ({ pageParam }) => scheduledEmailApi.sent(pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: last => last.nextBefore,
        enabled,
    });
}

/** Po akcji lista jest pobierana od nowa - termin dociąga do okna wysyłki serwer. */
function useScheduledEmailMutation<TArgs>(fn: (args: TArgs) => Promise<void>) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: fn,
        onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export const useUpdateScheduledEmail = () =>
    useScheduledEmailMutation(({ item, payload }: { item: ScheduledEmailItem; payload: UpdateScheduledEmailPayload }) =>
        scheduledEmailApi.update(item, payload));

export const useCancelScheduledEmail = () =>
    useScheduledEmailMutation((item: ScheduledEmailItem) => scheduledEmailApi.cancel(item));

export const useResumeScheduledEmail = () =>
    useScheduledEmailMutation((item: ScheduledEmailItem) => scheduledEmailApi.resume(item));
