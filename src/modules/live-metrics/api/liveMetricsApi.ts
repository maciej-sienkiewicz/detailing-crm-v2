// src/modules/live-metrics/api/liveMetricsApi.ts
import { apiClient } from '@/core';
import type {
    BucketSize,
    BusinessEventDto,
    HourProfileResponse,
    LiveMetricsOverview,
    SeriesName,
    SeriesResponse,
} from '../types';

const BASE_PATH = '/v1/live-metrics';

export const liveMetricsApi = {
    /**
     * Jeden strzał zasilający cały widok: KPI, trzy zakresy czasowe, profil godzinowy
     * i ostatnie zdarzenia. Backend składa to z liczników w Redisie, więc jedno żądanie
     * jest tańsze niż osiem osobnych.
     */
    getOverview: async (): Promise<LiveMetricsOverview> => {
        const response = await apiClient.get<LiveMetricsOverview>(`${BASE_PATH}/overview`);
        return response.data;
    },

    /** Pojedyncza seria w zadanym oknie — do drill-downu poza zakresy z `/overview`. */
    getSeries: async (
        series: SeriesName,
        bucket: BucketSize,
        from?: string,
        to?: string,
    ): Promise<SeriesResponse> => {
        const response = await apiClient.get<SeriesResponse>(`${BASE_PATH}/series`, {
            params: { series, bucket, from, to },
        });
        return response.data;
    },

    /** Rozkład 0–23 z ostatnich `days` dni w strefie studia. */
    getHourProfile: async (series: SeriesName, days = 7): Promise<HourProfileResponse> => {
        const response = await apiClient.get<HourProfileResponse>(`${BASE_PATH}/hour-profile`, {
            params: { series, days },
        });
        return response.data;
    },

    getRecentEvents: async (limit = 50): Promise<BusinessEventDto[]> => {
        const response = await apiClient.get<BusinessEventDto[]>(`${BASE_PATH}/events`, {
            params: { limit },
        });
        return response.data;
    },
};
