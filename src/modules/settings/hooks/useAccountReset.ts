import { useMutation, useQuery } from '@tanstack/react-query';
import { accountResetApi, type StartAccountResetRequest } from '../api/accountResetApi';

const QUERY_KEY = ['settings', 'account-reset'] as const;

/** Poll co 2 s do stanu końcowego - wzorem sesji importu kontaktów (ImportContactsModal). */
const ACTIVE_POLL_INTERVAL_MS = 2000;

export const useStartAccountReset = () =>
    useMutation({
        mutationFn: (data: StartAccountResetRequest) => accountResetApi.startReset(data),
    });

export const useAccountResetStatus = (jobId: string | null) =>
    useQuery({
        queryKey: [...QUERY_KEY, jobId],
        queryFn: () => accountResetApi.getStatus(jobId as string),
        enabled: jobId !== null,
        refetchInterval: query => {
            const status = query.state.data?.status;
            return status === 'COMPLETED' || status === 'FAILED' ? false : ACTIVE_POLL_INTERVAL_MS;
        },
    });

/**
 * Ostatni job resetu - sprawdzany przy wejściu do strefy niebezpiecznej, żeby po
 * odświeżeniu strony w trakcie czyszczenia użytkownik wrócił do widoku postępu
 * zamiast do formularza, który pozwoliłby zlecić reset drugi raz.
 */
export const useLatestAccountReset = (enabled: boolean) =>
    useQuery({
        queryKey: [...QUERY_KEY, 'latest'],
        queryFn: accountResetApi.getLatest,
        enabled,
        staleTime: 0,
    });
