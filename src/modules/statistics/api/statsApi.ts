// src/modules/statistics/api/statsApi.ts
import { apiClient } from '@/core';
import type { CategoryStats, BreakdownStats, Granularity } from '../types';

const BASE_PATH = '/v1/statistics';

export const statsApi = {
    getBreakdown: async (
        granularity: Granularity,
        startDate: string,
        endDate: string
    ): Promise<BreakdownStats> => {
        const response = await apiClient.get<BreakdownStats>(
            `${BASE_PATH}/breakdown`,
            { params: { granularity, startDate, endDate } }
        );
        return response.data;
    },

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
};
