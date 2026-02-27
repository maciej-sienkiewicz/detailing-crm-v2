// src/modules/statistics/hooks/useStats.ts
import { useQuery, useQueries } from '@tanstack/react-query';
import { statsApi } from '../api/statsApi';
import type { CategoryStats, ServiceStats, Granularity } from '../types';

export const useCategoryStats = (
    categoryId: string,
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['statistics', 'category', categoryId, granularity, startDate, endDate],
        queryFn: () => statsApi.getCategoryStats(categoryId, granularity, startDate, endDate),
        enabled: !!categoryId && !!startDate && !!endDate,
    });

    return { stats: data, isLoading, isError, refetch };
};

export const useOverviewStats = (
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['statistics', 'overview', granularity, startDate, endDate],
        queryFn: () => statsApi.getOverview(granularity, startDate, endDate),
        enabled: !!startDate && !!endDate,
    });

    return { stats: data, isLoading, isError, refetch };
};

export const useUnassignedServices = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['statistics', 'unassigned-services'],
        queryFn: () => statsApi.getUnassignedServices(),
    });

    return { services: data || [], isLoading, isError };
};

export const useServicesBreakdown = (
    serviceIds: string[],
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const results = useQueries({
        queries: serviceIds.map(serviceId => ({
            queryKey: ['statistics', 'service', serviceId, granularity, startDate, endDate],
            queryFn: () => statsApi.getServiceStats(serviceId, granularity, startDate, endDate),
            enabled: serviceIds.length > 0 && !!startDate && !!endDate,
        })),
    });

    const isLoading = results.some(r => r.isLoading);
    const servicesStats = results
        .map(r => r.data)
        .filter((d): d is ServiceStats => !!d);

    return { servicesStats, isLoading };
};

export const useCategoriesBreakdown = (
    categoryIds: string[],
    granularity: Granularity,
    startDate: string,
    endDate: string
) => {
    const results = useQueries({
        queries: categoryIds.map(categoryId => ({
            queryKey: ['statistics', 'category', categoryId, granularity, startDate, endDate],
            queryFn: () => statsApi.getCategoryStats(categoryId, granularity, startDate, endDate),
            enabled: categoryIds.length > 0 && !!startDate && !!endDate,
        })),
    });

    const isLoading = results.some(r => r.isLoading);
    const categoriesStats = results
        .map(r => r.data)
        .filter((d): d is CategoryStats => !!d);

    return { categoriesStats, isLoading };
};
