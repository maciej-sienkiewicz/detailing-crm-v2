// src/modules/carddav/hooks/useCarddavSetup.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { carddavApi } from '../api/carddavApi';
import { describeThisDevice } from '@/modules/push/utils/webPush';

export const CARDDAV_ACCOUNTS_KEY = ['carddav', 'accounts'] as const;

export function useCarddavAccounts() {
    const { data, isLoading } = useQuery({
        queryKey: CARDDAV_ACCOUNTS_KEY,
        queryFn: carddavApi.listAccounts,
        staleTime: 30_000,
    });
    return { accounts: data ?? [], isLoading };
}

export function useCreateProvisioning() {
    return useMutation({
        mutationFn: () => carddavApi.createProvisioning({ deviceName: describeThisDevice() }),
    });
}

export function useRevokeCarddavAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (accountId: string) => carddavApi.revokeAccount(accountId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CARDDAV_ACCOUNTS_KEY }),
    });
}
