import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerEditApi } from '../api/customerEditApi';

export const customerNotesQueryKey = (customerId: string) => ['customer', customerId, 'notes'];

export const useCustomerNotes = (customerId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: customerNotesQueryKey(customerId),
        queryFn: () => customerEditApi.getNotes(customerId),
        enabled: !!customerId,
        staleTime: 30_000,
    });
    return { notes: data ?? [], isLoading, isError };
};

export const useCreateNote = (customerId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (content: string) => customerEditApi.createNote(customerId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerNotesQueryKey(customerId) });
        },
    });
};

export const useUpdateNote = (customerId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
            customerEditApi.updateNote(customerId, noteId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerNotesQueryKey(customerId) });
        },
    });
};

export const useDeleteNote = (customerId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (noteId: string) => customerEditApi.deleteNote(customerId, noteId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerNotesQueryKey(customerId) });
        },
    });
};
