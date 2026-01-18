import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import { visitCommentApi } from '../api/visitCommentApi';
import type {
    UpdateVisitPayload,
    UploadDocumentPayload,
    AddCommentPayload,
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

// Comments hooks
export const visitCommentsQueryKey = (visitId: string) => ['visit', visitId, 'comments'];

export const useVisitComments = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitCommentsQueryKey(visitId),
        queryFn: () => visitCommentApi.getComments(visitId),
        enabled: !!visitId,
    });

    return {
        comments: data?.comments || [],
        isLoading,
        isError,
        refetch,
    };
};

export const useAddComment = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AddCommentPayload) =>
            visitCommentApi.addComment(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitCommentsQueryKey(visitId),
            });
        },
    });

    return {
        addComment: mutate,
        isAdding: isPending,
    };
};

export const useUpdateComment = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
            visitCommentApi.updateComment(visitId, commentId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitCommentsQueryKey(visitId),
            });
        },
    });

    return {
        updateComment: mutate,
        isUpdating: isPending,
    };
};

export const useDeleteComment = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (commentId: string) =>
            visitCommentApi.deleteComment(visitId, commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitCommentsQueryKey(visitId),
            });
        },
    });

    return {
        deleteComment: mutate,
        isDeleting: isPending,
    };
};
