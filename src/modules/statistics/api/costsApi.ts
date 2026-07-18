// src/modules/statistics/api/costsApi.ts
import { apiClient } from '@/core';
import type {
    CostCategory,
    CostExpenseItem,
    CostBreakdown,
    CreateCostCategoryRequest,
    UpdateCostCategoryRequest,
} from '../costTypes';

const BASE = '/v1/cost-categories';

export const costsApi = {
    // ── Categories ──────────────────────────────────────────────────────────

    listCategories: async (): Promise<CostCategory[]> => {
        const res = await apiClient.get<{ categories: CostCategory[] }>(BASE);
        return res.data.categories;
    },

    createCategory: async (data: CreateCostCategoryRequest): Promise<{ id: string; name: string; createdAt: string }> => {
        const res = await apiClient.post(BASE, data);
        return res.data;
    },

    updateCategory: async (categoryId: string, data: UpdateCostCategoryRequest): Promise<void> => {
        await apiClient.put(`${BASE}/${categoryId}`, data);
    },

    deleteCategory: async (categoryId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${categoryId}`);
    },

    // ── Item assignments ─────────────────────────────────────────────────────

    assignItems: async (categoryId: string, itemIds: string[]): Promise<void> => {
        await apiClient.post(`${BASE}/${categoryId}/items`, { itemIds });
    },

    unassignItem: async (categoryId: string, itemId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/${categoryId}/items/${itemId}`);
    },

    // ── Data endpoints ────────────────────────────────────────────────────────

    listExpenseItems: async (dateFrom?: string, dateTo?: string): Promise<CostExpenseItem[]> => {
        const params: Record<string, string> = { pageSize: '2000' };
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo)   params.dateTo   = dateTo;
        const res = await apiClient.get<{ items: CostExpenseItem[] }>(`${BASE}/expense-items`, { params });
        return res.data.items;
    },

    getBreakdown: async (granularity: string, startDate: string, endDate: string): Promise<CostBreakdown> => {
        const res = await apiClient.get<CostBreakdown>(`${BASE}/breakdown`, {
            params: { granularity, startDate, endDate },
        });
        return res.data;
    },
};
