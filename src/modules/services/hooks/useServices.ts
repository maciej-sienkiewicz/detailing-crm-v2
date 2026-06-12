// src/modules/services/hooks/useServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/servicesApi';
import type {
    ServiceListFilters,
    CreateServiceRequest,
    UpdateServiceRequest,
    CreatePackageRequest,
    UpdatePackageRequest,
    SyncItemNameRequest,
} from '../types';

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

export const useArchiveService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (serviceId: string) => servicesApi.archiveService(serviceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    });
};

export const useCreatePackage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePackageRequest) => servicesApi.createPackage(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    });
};

export const useUpdatePackage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdatePackageRequest) => servicesApi.updatePackage(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    });
};

export const useSyncItemName = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ packageId, data }: { packageId: string; data: SyncItemNameRequest }) =>
            servicesApi.syncItemName(packageId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    });
};
