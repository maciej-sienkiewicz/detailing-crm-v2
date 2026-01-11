import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import type {
    UpdateVisitPayload,
    CreateJournalEntryPayload,
    UploadDocumentPayload,
} from '../types';

export const visitDetailQueryKey = (visitId: string) => ['visit', visitId];

export const useVisitDetail = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitDetailQueryKey(visitId),
        queryFn: () => visitApi.getVisitDetail(visitId),
        enabled: !!visitId,
    });

    return {
        visitDetail: data,
        isLoading,
        isError,
        refetch,
    };
};

export const useUpdateVisit = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: UpdateVisitPayload) =>
            visitApi.updateVisit(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        updateVisit: mutate,
        isUpdating: isPending,
    };
};

export const useCreateJournalEntry = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: CreateJournalEntryPayload) =>
            visitApi.createJournalEntry(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        createEntry: mutate,
        isCreating: isPending,
    };
};

export const useDeleteJournalEntry = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (entryId: string) =>
            visitApi.deleteJournalEntry(visitId, entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        deleteEntry: mutate,
        isDeleting: isPending,
    };
};

export const useUploadDocument = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: UploadDocumentPayload) =>
            visitApi.uploadDocument(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        uploadDocument: mutate,
        isUploading: isPending,
    };
};

export const useDeleteDocument = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (documentId: string) =>
            visitApi.deleteDocument(visitId, documentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        deleteDocument: mutate,
        isDeleting: isPending,
    };
};