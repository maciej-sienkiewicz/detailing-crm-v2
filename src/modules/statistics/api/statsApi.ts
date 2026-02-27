// src/modules/statistics/api/statsApi.ts
import { apiClient } from '@/core';
import type {
    CategoryStats,
    ServiceStats,
    OverviewStats,
    UnassignedService,
    Granularity,
} from '../types';

const BASE_PATH = '/v1/statistics';

export const statsApi = {
    getCategoryStats: async (
        categoryId: string,
        granularity: Granularity,
        startDate: string,
        endDate: string
    ): Promise<CategoryStats> => {
        const response = await apiClient.get<CategoryStats>(
            `${BASE_PATH}/categories/${categoryId}`,
            { params: { granularity, startDate, endDate } }
        );
        return response.data;
    },

    getServiceStats: async (
        serviceId: string,
        granularity: Granularity,
        startDate: string,
        endDate: string
    ): Promise<ServiceStats> => {
        const response = await apiClient.get<ServiceStats>(
            `${BASE_PATH}/services/${serviceId}`,
            { params: { granularity, startDate, endDate } }
        );
        return response.data;
    },

    getOverview: async (
        granularity: Granularity,
        startDate: string,
        endDate: string
    ): Promise<OverviewStats> => {
        const response = await apiClient.get<OverviewStats>(
            `${BASE_PATH}/overview`,
            { params: { granularity, startDate, endDate } }
        );
        return response.data;
    },

    getUnassignedServices: async (): Promise<UnassignedService[]> => {
        const response = await apiClient.get<{ services: UnassignedService[] }>(
            `${BASE_PATH}/unassigned-services`
        );
        return response.data.services;
    },
};
