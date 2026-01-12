// src/modules/services/hooks/useServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/servicesApi';
import type { ServiceListFilters, CreateServiceRequest, UpdateServiceRequest } from '../types';

export const useServices = (filters: ServiceListFilters) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['services', filters],
        queryFn: () => servicesApi.getServices(filters),
    });

    return {
        services: data?.services || [],
        pagination: data?.pagination,
        isLoading,
        isError,
        refetch,
    };
};

export const useCreateService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateServiceRequest) => servicesApi.createService(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    });
};

export const useUpdateService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateServiceRequest) => servicesApi.updateService(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    });
};