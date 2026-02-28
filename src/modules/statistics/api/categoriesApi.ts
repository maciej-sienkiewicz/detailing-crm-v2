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
    list: async (): Promise<Category[]> => {
        const response = await apiClient.get<{ categories: Category[] }>(BASE_PATH);
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

    assignService: async (categoryId: string, serviceId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${categoryId}/services/${serviceId}`);
    },

    unassignService: async (categoryId: string, serviceId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${categoryId}/services/${serviceId}`);
    },
};
