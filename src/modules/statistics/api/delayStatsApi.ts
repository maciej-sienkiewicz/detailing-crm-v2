// src/modules/statistics/api/delayStatsApi.ts
import { apiClient } from '@/core';
import type { DelayStats, Granularity } from '../types';

const BASE_PATH = '/v1/statistics';

export const delayStatsApi = {
    getDelayStats: async (
        granularity: Granularity,
        startDate: string,
        endDate: string
    ): Promise<DelayStats> => {
        const response = await apiClient.get<DelayStats>(
            `${BASE_PATH}/delays`,
            { params: { granularity, startDate, endDate } }
        );
        return response.data;
    },
};
