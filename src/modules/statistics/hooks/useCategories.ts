// src/modules/statistics/hooks/useCategories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categoriesApi';
import type { CreateCategoryRequest, UpdateCategoryRequest } from '../types';
import { BREAKDOWN_KEY } from './useStats';

export const CATEGORIES_KEY = 'statistics-categories';

export const useCategories = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [CATEGORIES_KEY],
        queryFn: () => categoriesApi.list(),
    });

    return {
        categories: data || [],
        isLoading,
        isError,
        refetch,
    };
};

export const useCategoryDetail = (categoryId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [CATEGORIES_KEY, 'detail', categoryId],
        queryFn: () => categoriesApi.get(categoryId),
        enabled: !!categoryId,
    });

    return {
        category: data,
        isLoading,
        isError,
        refetch,
    };
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCategoryRequest) => categoriesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
            queryClient.invalidateQueries({ queryKey: [BREAKDOWN_KEY] });
        },
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, data }: { categoryId: string; data: UpdateCategoryRequest }) =>
            categoriesApi.update(categoryId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
            queryClient.invalidateQueries({ queryKey: [BREAKDOWN_KEY] });
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (categoryId: string) => categoriesApi.delete(categoryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
            queryClient.invalidateQueries({ queryKey: [BREAKDOWN_KEY] });
        },
    });
};

export const useAssignService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, serviceId }: { categoryId: string; serviceId: string }) =>
            categoriesApi.assignService(categoryId, serviceId),
        onSuccess: (_data, { categoryId }) => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY, 'detail', categoryId] });
            queryClient.invalidateQueries({ queryKey: [BREAKDOWN_KEY] });
        },
    });
};

export const useUnassignService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, serviceId }: { categoryId: string; serviceId: string }) =>
            categoriesApi.unassignService(categoryId, serviceId),
        onSuccess: (_data, { categoryId }) => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY, 'detail', categoryId] });
            queryClient.invalidateQueries({ queryKey: [BREAKDOWN_KEY] });
        },
    });
};
