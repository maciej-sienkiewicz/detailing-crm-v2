// src/modules/activity/api/activityApi.ts

import { apiClient } from '@/core';
import type { ActivityFeedPage, ActivityFilterOptions, ActivityFilters } from '../types';

const BASE = '/v1/audit';

/**
 * Builds the query string for a feed page.
 *
 * Multi-value filters go over the wire comma-separated; an empty selection is
 * omitted entirely, because the backend reads a missing parameter as "no
 * restriction" and an unknown value as a client error.
 */
const buildParams = (filters: ActivityFilters, cursor: string | null, limit: number) => {
    const params: Record<string, string | number> = { limit };

    if (cursor) params.cursor = cursor;
    if (filters.modules.length) params.modules = filters.modules.join(',');
    if (filters.actorTypes.length) params.actorTypes = filters.actorTypes.join(',');
    if (filters.severities.length) params.severities = filters.severities.join(',');
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;

    return params;
};

export const activityApi = {
    getFeed: async (
        filters: ActivityFilters,
        cursor: string | null,
        limit = 30,
    ): Promise<ActivityFeedPage> => {
        const res = await apiClient.get<ActivityFeedPage>(`${BASE}/feed`, {
            params: buildParams(filters, cursor, limit),
        });
        return res.data;
    },

    /** Filter options with their labels; the UI ships no translation table of its own. */
    getFilterOptions: async (): Promise<ActivityFilterOptions> => {
        const res = await apiClient.get<ActivityFilterOptions>(`${BASE}/filters`);
        return res.data;
    },

    /**
     * Historia wokół jednego obiektu - sekcje „Historia zmian" na kartach wizyty,
     * klienta i pojazdu. Ten sam feed co zakładka Aktywność, zawężony parametrami
     * customerId/vehicleId/visitId, które backend czyta jako „wszystko wokół tego
     * obiektu" (nie tylko wpisy jego własnego modułu).
     */
    getEntityFeed: async (
        scope: ActivityEntityScope,
        cursor: string | null,
        limit = 20,
    ): Promise<ActivityFeedPage> => {
        const params: Record<string, string | number> = { limit, ...scope };
        if (cursor) params.cursor = cursor;
        const res = await apiClient.get<ActivityFeedPage>(`${BASE}/feed`, { params });
        return res.data;
    },
};

/** Dokładnie jeden z trzech - karta zna swój obiekt. */
export type ActivityEntityScope =
    | { customerId: string }
    | { vehicleId: string }
    | { visitId: string };
