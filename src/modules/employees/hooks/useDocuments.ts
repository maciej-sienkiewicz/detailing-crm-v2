import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { InitiateDocumentUploadPayload } from '../types';

const documentsKey = (employeeId: string) => ['employees', 'documents', employeeId];

export const useDocuments = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: documentsKey(employeeId),
        queryFn: () => employeeApi.listDocuments(employeeId),
        enabled: !!employeeId,
    });
    return { documents: data ?? [], isLoading, isError, refetch };
};

export const useUploadDocument = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ payload, file }: { payload: InitiateDocumentUploadPayload; file: File }) => {
            const { uploadUrl } = await employeeApi.initiateDocumentUpload(employeeId, payload);
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey(employeeId) }),
    });
};

export const useDeleteDocument = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (documentId: string) => employeeApi.deleteDocument(employeeId, documentId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey(employeeId) }),
    });
};
