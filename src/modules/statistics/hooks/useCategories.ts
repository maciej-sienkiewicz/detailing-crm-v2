// src/modules/statistics/hooks/useCategories.ts
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categoriesApi';
import type { CategoryDetail, CreateCategoryRequest, UpdateCategoryRequest } from '../types';

export const CATEGORIES_KEY = 'statistics-categories';

export const useCategories = (includeInactive = false) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [CATEGORIES_KEY, includeInactive],
        queryFn: () => categoriesApi.list(includeInactive),
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
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (categoryId: string) => categoriesApi.delete(categoryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
            // Services that were in this category become unassigned
            queryClient.invalidateQueries({ queryKey: ['statistics', 'unassigned-services'] });
        },
    });
};

export const useCategoriesDetails = (categoryIds: string[]) => {
    const results = useQueries({
        queries: categoryIds.map(categoryId => ({
            queryKey: [CATEGORIES_KEY, 'detail', categoryId],
            queryFn: () => categoriesApi.get(categoryId),
            enabled: categoryIds.length > 0,
        })),
    });

    const isLoading = results.some(r => r.isLoading);
    const categoriesDetails = results
        .map(r => r.data)
        .filter((d): d is CategoryDetail => !!d);

    return { categoriesDetails, isLoading };
};

export const useAssignServices = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, serviceIds }: { categoryId: string; serviceIds: string[] }) =>
            categoriesApi.assignServices(categoryId, serviceIds),
        onSuccess: (_data, { categoryId }: { categoryId: string; serviceIds: string[] }) => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY, 'detail', categoryId] });
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
            queryClient.invalidateQueries({ queryKey: ['statistics', 'unassigned-services'] });
        },
    });
};
