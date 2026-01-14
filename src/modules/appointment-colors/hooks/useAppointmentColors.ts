// src/modules/appointment-colors/hooks/useAppointmentColors.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentColorApi } from '../api/appointmentColorApi';
import type {
    AppointmentColorFilters,
    AppointmentColorCreateRequest,
    AppointmentColorUpdateRequest,
} from '../types';

const QUERY_KEY = 'appointment-colors';

export const useAppointmentColors = (filters: AppointmentColorFilters) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [QUERY_KEY, filters],
        queryFn: () => appointmentColorApi.getColors(filters),
        staleTime: 300_000, // 5 minutes
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });
};

export const useUpdateAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: AppointmentColorUpdateRequest }) =>
            appointmentColorApi.updateColor(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });
};

export const useDeleteAppointmentColor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => appointmentColorApi.deleteColor(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });
};
