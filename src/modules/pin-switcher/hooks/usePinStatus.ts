import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pinApi } from '../api/pinApi';
import type { SetPinRequest } from '../types';

export const PIN_STATUS_KEY = ['pin', 'my-status'];
export const STUDIO_PROFILES_KEY = ['pin', 'studio-profiles'];

export function usePinStatus() {
    const { data, isLoading } = useQuery({
        queryKey: PIN_STATUS_KEY,
        queryFn: pinApi.getMyStatus,
        staleTime: 30_000,
    });
    return {
        hasPinConfigured: data?.hasPinConfigured ?? false,
        pinLocked: data?.pinLocked ?? false,
        isLoading,
    };
}

export function useStudioProfiles() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: STUDIO_PROFILES_KEY,
        queryFn: pinApi.getStudioProfiles,
        staleTime: 60_000,
    });
    return { profiles: data ?? [], isLoading, refetch };
}

export function useSetPin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SetPinRequest) => pinApi.setPin(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PIN_STATUS_KEY });
        },
    });
}

export function useResetPinLock() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => pinApi.resetPinLock(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDIO_PROFILES_KEY });
        },
    });
}
