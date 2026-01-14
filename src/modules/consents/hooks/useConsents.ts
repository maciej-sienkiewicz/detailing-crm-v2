/**
 * Hooks for consent management using TanStack Query.
 * Provides queries and mutations for both admin and customer operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consentsApi } from '../api/consentsApi';
import type {
    CreateConsentDefinitionRequest,
    UploadTemplateRequest,
    SignConsentRequest,
} from '../types';

// Query keys
export const CONSENT_QUERY_KEYS = {
    definitions: ['consents', 'definitions'] as const,
    definition: (id: string) => ['consents', 'definition', id] as const,
    templates: (definitionId: string) => ['consents', 'templates', definitionId] as const,
    customerConsents: (customerId: string) => ['consents', 'customer', customerId] as const,
};

// ===== Admin Queries =====

/**
 * Hook to fetch all consent definitions with their active templates
 */
export const useConsentDefinitions = () => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.definitions,
        queryFn: consentsApi.getConsentDefinitions,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        definitions: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
};

/**
 * Hook to fetch a single consent definition
 */
export const useConsentDefinition = (definitionId: string) => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.definition(definitionId),
        queryFn: () => consentsApi.getConsentDefinition(definitionId),
        enabled: !!definitionId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        definition: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
    };
};

/**
 * Hook to fetch all templates for a definition
 */
export const useConsentTemplates = (definitionId: string) => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.templates(definitionId),
        queryFn: () => consentsApi.getConsentTemplates(definitionId),
        enabled: !!definitionId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        templates: query.data ?? [],
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

/**
 * Hook to create a new consent definition
 */
export const useCreateDefinition = (options?: UseCreateDefinitionOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (request: CreateConsentDefinitionRequest) =>
            consentsApi.createConsentDefinition(request),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.definitions,
            });
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

interface UseUploadTemplateOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Hook to upload a new consent template
 * This handles both getting the presigned URL and uploading to S3
 */
export const useUploadTemplate = (options?: UseUploadTemplateOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({
            request,
            file,
        }: {
            request: UploadTemplateRequest;
            file: File;
        }) => {
            // Step 1: Get presigned URL
            const uploadResponse = await consentsApi.uploadConsentTemplate(request);

            // Step 2: Upload file to S3
            await consentsApi.uploadFileToS3(uploadResponse.uploadUrl, file);

            return uploadResponse;
        },
        onSuccess: (data) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.definitions,
            });
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.templates(data.templateId),
            });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        uploadTemplate: mutation.mutate,
        isUploading: mutation.isPending,
        error: mutation.error,
        uploadedTemplate: mutation.data,
    };
};

interface UseSetTemplateActiveOptions {
    definitionId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Hook to set a template as active
 */
export const useSetTemplateActive = (options: UseSetTemplateActiveOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (templateId: string) =>
            consentsApi.setTemplateActive(templateId, options.definitionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.definitions,
            });
            queryClient.invalidateQueries({
                queryKey: CONSENT_QUERY_KEYS.templates(options.definitionId),
            });
            options?.onSuccess?.();
        },
        onError: (error: Error) => {
            options?.onError?.(error);
        },
    });

    return {
        setActive: mutation.mutate,
        isUpdating: mutation.isPending,
        error: mutation.error,
    };
};

// ===== Customer Queries =====

/**
 * Hook to fetch customer consents with their statuses
 */
export const useCustomerConsents = (customerId: string) => {
    const query = useQuery({
        queryKey: CONSENT_QUERY_KEYS.customerConsents(customerId),
        queryFn: () => consentsApi.getCustomerConsents(customerId),
        enabled: !!customerId,
        staleTime: 60 * 1000, // 1 minute
    });

    return {
        consents: query.data ?? [],
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

/**
 * Hook to sign a consent for a customer
 */
export const useSignConsent = (options: UseSignConsentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (request: Omit<SignConsentRequest, 'customerId'>) =>
            consentsApi.signConsent({
                ...request,
                customerId: options.customerId,
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
