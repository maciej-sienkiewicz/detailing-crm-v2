// src/modules/vehicles/hooks/useVehicleNotes.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const vehicleNotesQueryKey = vehicleKeys.notes;

export const useVehicleNotes = (vehicleId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: vehicleNotesQueryKey(vehicleId),
        queryFn: () => vehicleApi.getNotes(vehicleId),
        enabled: !!vehicleId,
    });
    return { notes: data ?? [], isLoading, isError };
};

export const useCreateVehicleNote = (vehicleId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (content: string) => vehicleApi.createNote(vehicleId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleNotesQueryKey(vehicleId) });
        },
    });
};

export const useUpdateVehicleNote = (vehicleId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
            vehicleApi.updateNote(vehicleId, noteId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleNotesQueryKey(vehicleId) });
        },
    });
};

export const useDeleteVehicleNote = (vehicleId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (noteId: string) => vehicleApi.deleteNote(vehicleId, noteId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleNotesQueryKey(vehicleId) });
        },
    });
};
