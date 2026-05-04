import { apiClient } from '@/core';
import type { PeriodDetail, Granularity } from '../types';

const BASE_PATH = '/v1/statistics';

/**
 * Pobiera szczegółowe dane o wizytach w danym okresie.
 * Odpowiada endpointowi: GET /api/v1/statistics/periods/{period}/visits
 */
export async function fetchPeriodDetail(
    period: string,
    granularity: Granularity,
    options?: {
        categoryId?: string | null;
        categoryName?: string | null;
    }
): Promise<PeriodDetail> {
    // Przygotowanie parametrów zapytania (query params)
    const params = {
        granularity,
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    };

    const response = await apiClient.get<PeriodDetail>(
        `${BASE_PATH}/periods/${period}/visits`,
        { params }
    );

    return response.data;
}

/**
 * Pobiera pełny breakdown statystyk (wykorzystywany w głównym widoku).
 * Odpowiada endpointowi: GET /api/v1/statistics/breakdown
 */
export async function fetchStatsBreakdown(
    granularity: Granularity,
    startDate: string,
    endDate: string
) {
    const response = await apiClient.get(`${BASE_PATH}/breakdown`, {
        params: { granularity, startDate, endDate }
    });
    return response.data;
}

/**
 * Pobiera listę usług nieprzypisanych do żadnej kategorii.
 * Odpowiada endpointowi: GET /api/v1/statistics/unassigned-services
 */
export async function fetchUnassignedServices() {
    const response = await apiClient.get(`${BASE_PATH}/unassigned-services`);
    return response.data;
}