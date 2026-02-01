import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import { visitCommentApi } from '../api/visitCommentApi';
import type {
    UpdateVisitPayload,
    UploadDocumentPayload,
    AddCommentPayload,
    AddServicePayload,
    UpdateServicePayload,
    DeleteServicePayload,
    UpdateServiceStatusPayload,
} from '../types';

export const visitDetailQueryKey = (visitId: string) => ['visit', visitId];
export const visitDocumentsQueryKey = (visitId: string) => ['visit', visitId, 'documents'];

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
            queryClient.invalidateQueries({
                queryKey: visitDocumentsQueryKey(visitId),
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
            queryClient.invalidateQueries({
                queryKey: visitDocumentsQueryKey(visitId),
            });
        },
    });

    return {
        deleteDocument: mutate,
        isDeleting: isPending,
    };
};

// Documents hooks
export const useVisitDocuments = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitDocumentsQueryKey(visitId),
        queryFn: () => visitApi.getVisitDocuments(visitId),
        enabled: !!visitId,
    });

    return {
        documents: data || [],
        isLoading,
        isError,
        refetch,
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

// Service management hooks
export const useAddService = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AddServicePayload) =>
            visitApi.addService(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        addService: mutate,
        isAdding: isPending,
    };
};

export const useUpdateService = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ serviceLineItemId, payload }: { serviceLineItemId: string; payload: UpdateServicePayload }) =>
            visitApi.updateService(visitId, serviceLineItemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        updateService: mutate,
        isUpdating: isPending,
    };
};

export const useDeleteService = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ serviceLineItemId, payload }: { serviceLineItemId: string; payload: DeleteServicePayload }) =>
            visitApi.deleteService(visitId, serviceLineItemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        deleteService: mutate,
        isDeleting: isPending,
    };
};

export const useUpdateServiceStatus = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ serviceLineItemId, payload }: { serviceLineItemId: string; payload: UpdateServiceStatusPayload }) =>
            visitApi.updateServiceStatus(visitId, serviceLineItemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        updateServiceStatus: mutate,
        isUpdating: isPending,
    };
};

export const useSaveServicesChanges = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: import('../types').ServicesChangesPayload) =>
            visitApi.saveServicesChanges(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        saveServicesChanges: mutate,
        isSaving: isPending,
    };
};

export const useApproveServiceChange = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (serviceLineItemId: string) =>
            visitApi.approveServiceChange(visitId, serviceLineItemId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        approveServiceChange: mutate,
        isApproving: isPending,
    };
};

export const useRejectServiceChange = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (serviceLineItemId: string) =>
            visitApi.rejectServiceChange(visitId, serviceLineItemId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
    });

    return {
        rejectServiceChange: mutate,
        isRejecting: isPending,
    };
};
