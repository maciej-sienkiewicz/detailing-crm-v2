/**
 * Hooks for consent management using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consentsApi } from '../api/consentsApi';
import type {
    CreateConsentRequest,
    AddVersionRequest,
} from '../types';

// Query keys
export const CONSENT_QUERY_KEYS = {
    definitions: ['consents', 'definitions'] as const,
    definition: (id: string) => ['consents', 'definition', id] as const,
    customerConsents: (customerId: string) => ['consents', 'customer', customerId] as const,
};

// ===== Admin Queries =====

export const useConsentDefinitions = () => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.definitions,
        queryFn: consentsApi.getConsentDefinitions,
    });

    return {
        definitions: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

export const useConsentDefinition = (id: string) => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.definition(id),
        queryFn: () => consentsApi.getConsentDefinition(id),
        enabled: !!id,
    });

    return {
        definition: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
    };
};

// ===== Admin Mutations =====

interface UseCreateDefinitionOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useCreateDefinition = (options?: UseCreateDefinitionOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (request: CreateConsentRequest) =>
            consentsApi.createConsentDefinition(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CONSENT_QUERY_KEYS.definitions });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        createDefinition: mutation.mutate,
        isCreating: mutation.isPending,
        error: mutation.error,
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

interface UseAddVersionOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Adds a new PDF version to a consent definition.
 * Workflow: POST /{id}/versions → get presigned pdfUrl → upload file to S3.
 */
export const useAddVersion = (options?: UseAddVersionOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({
            definitionId,
            request,
            file,
        }: {
            definitionId: string;
            request: AddVersionRequest;
            file: File;
        }) => {
            const versionResponse = await consentsApi.addConsentVersion(definitionId, request);
            if (versionResponse.pdfUrl) {
                await consentsApi.uploadFileToS3(versionResponse.pdfUrl, file);
            }
            return versionResponse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CONSENT_QUERY_KEYS.definitions });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        addVersion: mutation.mutate,
        isUploading: mutation.isPending,
        error: mutation.error,
        uploadedVersion: mutation.data,
    };
};

// ===== Customer Queries =====

export const useCustomerConsents = (customerId: string) => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.customerConsents(customerId),
        queryFn: () => consentsApi.getCustomerConsentStatus(customerId),
        enabled: !!customerId,
    });

    return {
        consentStatus: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

// ===== Customer Mutations =====

interface UseSignConsentOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useSignConsent = (options: UseSignConsentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({
            templateId,
            requestAttachmentUpload,
        }: {
            templateId: string;
            requestAttachmentUpload?: boolean;
        }) =>
            consentsApi.signCustomerConsent(options.customerId, templateId, {
                requestAttachmentUpload,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.customerConsents(options.customerId),
            });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        signConsent: mutation.mutate,
        isSigning: mutation.isPending,
        error: mutation.error,
    };
};

interface UseRevokeConsentOptions {
    customerId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useRevokeConsent = (options: UseRevokeConsentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (consentId: string) =>
            consentsApi.revokeCustomerConsent(options.customerId, consentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.customerConsents(options.customerId),
            });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        revokeConsent: mutation.mutate,
        isRevoking: mutation.isPending,
        error: mutation.error,
    };
};
