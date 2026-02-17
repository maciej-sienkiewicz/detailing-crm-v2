// src/modules/vehicles/hooks/useVehicleDocuments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { UploadVehicleDocumentPayload } from '../types';

export const vehicleDocumentsQueryKey = (vehicleId: string) =>
    ['vehicle', vehicleId, 'documents'] as const;

export const useVehicleDocuments = (vehicleId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: vehicleDocumentsQueryKey(vehicleId),
        queryFn: () => vehicleApi.getDocuments(vehicleId),
        enabled: !!vehicleId,
    });

    return {
        documents: data ?? [],
        isLoading,
        isError,
        refetch,
    };
};

interface UseUploadVehicleDocumentOptions {
    vehicleId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useUploadVehicleDocument = (options: UseUploadVehicleDocumentOptions) => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (payload: UploadVehicleDocumentPayload) =>
            vehicleApi.uploadDocument(options.vehicleId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleDocumentsQueryKey(options.vehicleId) });
            options.onSuccess?.();
        },
        onError: (error: Error) => {
            options.onError?.(error);
        },
    });

    return {
        uploadDocument: mutation.mutate,
        isUploading: mutation.isPending,
        error: mutation.error,
    };
};

export const useDeleteVehicleDocument = (vehicleId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentId: string) => vehicleApi.deleteDocument(vehicleId, documentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleDocumentsQueryKey(vehicleId) });
        },
    });
};
