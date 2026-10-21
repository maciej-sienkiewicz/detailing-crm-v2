/**
 * Hooki definicji dokumentów zgód (Ustawienia → Dokumenty).
 * Dodawanie dokumentu i wersji robi AddConsentDocumentModal wprost przez consentsApi.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { consentsApi } from '../api/consentsApi';

// Query keys
export const CONSENT_QUERY_KEYS = {
    definitions: ['consents', 'definitions'] as const,
};

export const useConsentDefinitions = () => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.definitions,
        queryFn: consentsApi.getConsentDefinitions,
        staleTime: STALE_TIME.config,
    });

    return {
        definitions: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

interface UseDeleteDefinitionOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useDeleteDefinition = (options?: UseDeleteDefinitionOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (id: string) => consentsApi.deleteConsentDefinition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CONSENT_QUERY_KEYS.definitions });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        deleteDefinition: mutation.mutate,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
};
