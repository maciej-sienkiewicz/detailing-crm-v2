// src/modules/carddav/hooks/useCarddavSetup.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { carddavApi } from '../api/carddavApi';
import { describeThisDevice } from '@/modules/push/utils/webPush';

export const CARDDAV_ACCOUNTS_KEY = ['carddav', 'accounts'] as const;

/** Nazwa telefonu z kontaktami: ten iPhone, gdy profil pobiera się na nim, inaczej po prostu „iPhone". */
export function carddavDeviceName(userAgent: string = navigator.userAgent): string {
    return /iPhone|iPad|iPod/.test(userAgent) ? describeThisDevice() : 'iPhone';
}

export function useCreateProvisioning() {
    return useMutation({
        // Profil instaluje się tylko na iPhonie. Z komputera (kod QR) nazwa opisywała urządzenie,
        // które kliknęło - telefon z kontaktami stał na liście jako „Mac, Chrome".
        mutationFn: () => carddavApi.createProvisioning({ deviceName: carddavDeviceName() }),
    });
}

export function useRevokeCarddavAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (accountId: string) => carddavApi.revokeAccount(accountId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CARDDAV_ACCOUNTS_KEY }),
    });
}
