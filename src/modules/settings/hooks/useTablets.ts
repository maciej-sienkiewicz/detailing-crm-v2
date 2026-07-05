import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabletsApi } from '../api/tabletsApi';

export const TABLETS_KEY = ['settings', 'tablets'] as const;

export function useTablets() {
    const { data, isLoading } = useQuery({
        queryKey: [...TABLETS_KEY, 'list'],
        queryFn: tabletsApi.listTablets,
    });
    return { tablets: data ?? [], isLoading };
}

export function useGeneratePairingCode() {
    return useMutation({
        mutationFn: tabletsApi.generatePairingCode,
    });
}

export function useDeleteTablet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tabletId: string) => tabletsApi.deleteTablet(tabletId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: TABLETS_KEY }),
    });
}
