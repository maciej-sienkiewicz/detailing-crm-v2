// src/modules/activity/api/activityApi.ts

import { apiClient } from '@/core';
import type {
    ActivityActorsResponse,
    ActivityFeedPage,
    ActivityFilterOptions,
    ActivityFilters,
} from '../types';
import { employeeOf } from '../types';

const BASE = '/v1/audit';

/**
 * Builds the query string for a feed page.
 *
 * An empty selection is omitted entirely, because the backend reads a missing parameter
 * as "no restriction" and an unknown value as a client error.
 *
 * „Kto" mapuje się na dwa różne parametry: pracownik to `actorId` (id użytkownika),
 * a „Klienci" i „Automaty" to typy aktora - klient nie ma id w przestrzeni użytkowników.
 */
export const buildFeedParams = (filters: ActivityFilters, cursor: string | null, limit: number) => {
    const params: Record<string, string | number | boolean> = { limit };

    if (cursor) params.cursor = cursor;
    if (filters.area) params.areas = filters.area;

    const employeeId = employeeOf(filters.who);
    if (employeeId) {
        params.actorId = employeeId;
        params.actorTypes = 'EMPLOYEE';
    } else if (filters.who === 'CUSTOMERS') {
        params.actorTypes = 'CUSTOMER';
    } else if (filters.who === 'AUTOMATIONS') {
        params.actorTypes = 'SYSTEM,INTEGRATION';
    }

    if (filters.hideAutomated) params.hideAutomated = true;
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
            params: buildFeedParams(filters, cursor, limit),
        });
        return res.data;
    },

    /** Filter options with their labels; the UI ships no translation table of its own. */
    getFilterOptions: async (): Promise<ActivityFilterOptions> => {
        const res = await apiClient.get<ActivityFilterOptions>(`${BASE}/filters`);
        return res.data;
    },

    /** Pracownicy, którzy w okresie coś zrobili, z liczbą zdarzeń. */
    getActors: async (from: string | null, to: string | null): Promise<ActivityActorsResponse> => {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const res = await apiClient.get<ActivityActorsResponse>(`${BASE}/actors`, { params });
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
