// src/modules/statistics/api/costsApi.ts
import { apiClient } from '@/core';
import type {
    CostCategory,
    CostExpenseItem,
    CostBreakdown,
    CreateCostCategoryRequest,
    UpdateCostCategoryRequest,
    SupplierAutoRule,
    CreateAutoRuleRequest,
    UpdateAutoRuleRequest,
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

    // ── Auto-rules ────────────────────────────────────────────────────────────

    listAutoRules: async (): Promise<SupplierAutoRule[]> => {
        const res = await apiClient.get<{ rules: SupplierAutoRule[] }>(`${BASE}/auto-rules`);
        return res.data.rules;
    },

    createAutoRule: async (data: CreateAutoRuleRequest): Promise<{ id: string; assignedItemCount: number }> => {
        const res = await apiClient.post<{ id: string; assignedItemCount: number }>(`${BASE}/auto-rules`, data);
        return res.data;
    },

    updateAutoRule: async (ruleId: string, data: UpdateAutoRuleRequest): Promise<void> => {
        await apiClient.put(`${BASE}/auto-rules/${ruleId}`, data);
    },

    deleteAutoRule: async (ruleId: string): Promise<void> => {
        await apiClient.delete(`${BASE}/auto-rules/${ruleId}`);
    },

    applyAutoRules: async (): Promise<{ assignedItemCount: number }> => {
        const res = await apiClient.post<{ assignedItemCount: number }>(`${BASE}/auto-rules/apply`, {});
        return res.data;
    },
};
