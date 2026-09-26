import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabletsApi } from '../api/tabletsApi';

export const TABLETS_KEY = ['settings', 'tablets'] as const;

export function useTablets(options: { enabled?: boolean } = {}) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [...TABLETS_KEY, 'list'],
        queryFn: tabletsApi.listTablets,
        enabled: options.enabled ?? true,
    });
    // `isError` i `refetch`: błąd wczytania listy wyglądał dotąd jak „Brak sparowanych
    // tabletów" - zachęta do parowania tabletu, który może być sparowany.
    return { tablets: data ?? [], isLoading, isError, refetch, loaded: data !== undefined };
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
