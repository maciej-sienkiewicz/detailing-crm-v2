import { apiClient } from '@/core';
import type { PeriodDetail, PeriodSummary, WorkTimeEntry, UpsertEntryRequest } from '../types';

const BASE = '/v1/my/worktime';

export const workTimeApi = {
    listPeriods: async (): Promise<PeriodSummary[]> => {
        const res = await apiClient.get<PeriodSummary[]>(`${BASE}/periods`);
        return res.data;
    },

    getPeriod: async (period: string): Promise<PeriodDetail> => {
        const res = await apiClient.get<PeriodDetail>(`${BASE}/periods/${period}`);
        return res.data;
    },

    upsertEntry: async (date: string, payload: UpsertEntryRequest): Promise<WorkTimeEntry> => {
        const res = await apiClient.put<WorkTimeEntry>(`${BASE}/entries/${date}`, payload);
        return res.data;
    },

    deleteEntry: async (date: string): Promise<void> => {
        await apiClient.delete(`${BASE}/entries/${date}`);
    },

    fillMonth: async (period: string): Promise<PeriodDetail> => {
        const res = await apiClient.post<PeriodDetail>(`${BASE}/periods/${period}/fill-month`);
        return res.data;
    },

    standardToday: async (): Promise<WorkTimeEntry> => {
        const res = await apiClient.post<WorkTimeEntry>(`${BASE}/today`);
        return res.data;
    },

    submitPeriod: async (period: string): Promise<PeriodSummary> => {
        const res = await apiClient.post<PeriodSummary>(`${BASE}/periods/${period}/submit`);
        return res.data;
    },
};
