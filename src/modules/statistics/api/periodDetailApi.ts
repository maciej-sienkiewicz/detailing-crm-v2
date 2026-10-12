// src/modules/statistics/api/periodDetailApi.ts
//
// Wizyty jednego okresu wykresu (panel „Szczegóły okresu"). Plik nazywał się kiedyś
// periodDetailMockApi, choć od dawna woła prawdziwy endpoint - nazwa sugerowała makietę.
import { apiClient } from '@/core';
import type { PeriodDetail, Granularity } from '../types';

/**
 * GET /api/v1/statistics/periods/{period}/visits
 *
 * `from`/`to` to zakres dat widoku (włącznie): okres na brzegu zakresu serwer przycina do
 * niego, tak jak przycina go słupek wykresu - inaczej panel pokazywał pełny tydzień,
 * a słupek tylko jego część.
 */
export async function fetchPeriodDetail(
    period: string,
    granularity: Granularity,
    options: { categoryId?: string | null; from?: string; to?: string } = {},
): Promise<PeriodDetail> {
    const response = await apiClient.get<PeriodDetail>(`/v1/statistics/periods/${period}/visits`, {
        params: {
            granularity,
            ...(options.categoryId ? { categoryId: options.categoryId } : {}),
            ...(options.from ? { from: options.from } : {}),
            ...(options.to ? { to: options.to } : {}),
        },
    });
    return response.data;
}
