// src/modules/statistics/api/categoriesApi.ts
import { apiClient } from '@/core';
import type {
    Category,
    CategoryDetail,
    CreateCategoryRequest,
    UpdateCategoryRequest,
} from '../types';

const BASE_PATH = '/v1/service-categories';

export const categoriesApi = {
    list: async (includeInactive = false): Promise<Category[]> => {
        const response = await apiClient.get<{ categories: Category[] }>(
            `${BASE_PATH}?includeInactive=${includeInactive}`
        );
        return response.data.categories;
    },

    get: async (categoryId: string): Promise<CategoryDetail> => {
        const response = await apiClient.get<CategoryDetail>(`${BASE_PATH}/${categoryId}`);
        return response.data;
    },

    create: async (data: CreateCategoryRequest): Promise<{ id: string; name: string; createdAt: string }> => {
        const response = await apiClient.post(BASE_PATH, data);
        return response.data;
    },

    update: async (categoryId: string, data: UpdateCategoryRequest): Promise<void> => {
        await apiClient.put(`${BASE_PATH}/${categoryId}`, data);
    },

    delete: async (categoryId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${categoryId}`);
    },

    assignServices: async (categoryId: string, serviceIds: string[]): Promise<void> => {
        await apiClient.put(`${BASE_PATH}/${categoryId}/services`, { serviceIds });
    },
};
