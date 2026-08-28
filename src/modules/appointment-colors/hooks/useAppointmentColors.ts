// src/modules/appointment-colors/hooks/useAppointmentColors.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentColorApi } from '../api/appointmentColorApi';
import type {
    AppointmentColorFilters,
    AppointmentColorCreateRequest,
    AppointmentColorUpdateRequest,
} from '../types';

const QUERY_KEY = 'appointment-colors';

/**
 * Kolory są pobierane pod trzema kluczami: 'appointment-colors' (ustawienia i
 * QuickEventModal) oraz 'appointmentColors' (wizard check-inu). Zmiana koloru
 * domyślnego musi ruszyć oba, bo inaczej wizard trzyma poprzedni wybór aż do
 * odświeżenia strony.
 */
const invalidateEverywhere = (queryClient: ReturnType<typeof useQueryClient>) => () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['appointmentColors'] });
};

export const useAppointmentColors = (filters: AppointmentColorFilters) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [QUERY_KEY, filters],
        queryFn: () => appointmentColorApi.getColors(filters),
    });

    return {
        colors: data?.colors || [],
        pagination: data?.pagination,
        isLoading,
        isError,
        refetch,
    };
};

export const useCreateAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AppointmentColorCreateRequest) => appointmentColorApi.createColor(data),
        onSuccess: invalidateEverywhere(queryClient),
    });
};

export const useUpdateAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: AppointmentColorUpdateRequest }) =>
            appointmentColorApi.updateColor(id, data),
        onSuccess: invalidateEverywhere(queryClient),
    });
};

export const useSetDefaultAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => appointmentColorApi.setDefault(id),
        onSuccess: invalidateEverywhere(queryClient),
    });
};

export const useClearDefaultAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => appointmentColorApi.clearDefault(),
        onSuccess: invalidateEverywhere(queryClient),
    });
};

export const useSetAppointmentColorArchived = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
            appointmentColorApi.setArchived(id, archived),
        onSuccess: invalidateEverywhere(queryClient),
    });
};

export const useDeleteAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => appointmentColorApi.deleteColor(id),
        onSuccess: invalidateEverywhere(queryClient),
    });
};
