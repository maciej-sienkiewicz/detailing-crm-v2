// src/modules/statistics/hooks/useCostCategories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costsApi } from '../api/costsApi';
import type {
    CreateCostCategoryRequest,
    UpdateCostCategoryRequest,
    CreateAutoRuleRequest,
    UpdateAutoRuleRequest,
} from '../costTypes';

export const COST_CATEGORIES_KEY  = 'cost-categories';
export const COST_ITEMS_KEY       = 'cost-expense-items';
export const COST_BREAKDOWN_KEY   = 'cost-breakdown';
export const COST_AUTO_RULES_KEY  = 'cost-auto-rules';

export const useCostCategories = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [COST_CATEGORIES_KEY],
        queryFn:  () => costsApi.listCategories(),
    });
    return { categories: data ?? [], isLoading, isError, refetch };
};

export const useCreateCostCategory = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCostCategoryRequest) => costsApi.createCategory(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: [COST_CATEGORIES_KEY] }),
    });
};

export const useUpdateCostCategory = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, data }: { categoryId: string; data: UpdateCostCategoryRequest }) =>
            costsApi.updateCategory(categoryId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: [COST_CATEGORIES_KEY] }),
    });
};

export const useDeleteCostCategory = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (categoryId: string) => costsApi.deleteCategory(categoryId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [COST_CATEGORIES_KEY] });
            qc.invalidateQueries({ queryKey: [COST_ITEMS_KEY] });
            qc.invalidateQueries({ queryKey: [COST_BREAKDOWN_KEY] });
        },
    });
};

export const useAssignCostItems = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, itemIds }: { categoryId: string; itemIds: string[] }) =>
            costsApi.assignItems(categoryId, itemIds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [COST_ITEMS_KEY] });
            qc.invalidateQueries({ queryKey: [COST_BREAKDOWN_KEY] });
        },
    });
};

export const useUnassignCostItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ categoryId, itemId }: { categoryId: string; itemId: string }) =>
            costsApi.unassignItem(categoryId, itemId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [COST_ITEMS_KEY] });
            qc.invalidateQueries({ queryKey: [COST_BREAKDOWN_KEY] });
        },
    });
};

export const useCostExpenseItems = (dateFrom: string, dateTo: string) => {
    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: [COST_ITEMS_KEY, dateFrom, dateTo],
        queryFn:  () => costsApi.listExpenseItems(dateFrom, dateTo),
    });
    return { items: data ?? [], isLoading, isFetching, isError, refetch };
};

export const useCostBreakdown = (granularity: string, startDate: string, endDate: string) => {
    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: [COST_BREAKDOWN_KEY, granularity, startDate, endDate],
        queryFn:  () => costsApi.getBreakdown(granularity, startDate, endDate),
    });
    return { breakdown: data, isLoading, isFetching, isError, refetch };
};

export const useAutoRules = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [COST_AUTO_RULES_KEY],
        queryFn:  () => costsApi.listAutoRules(),
    });
    return { rules: data ?? [], isLoading, isError, refetch };
};

export const useCreateAutoRule = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateAutoRuleRequest) => costsApi.createAutoRule(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [COST_AUTO_RULES_KEY] });
            qc.invalidateQueries({ queryKey: [COST_ITEMS_KEY] });
            qc.invalidateQueries({ queryKey: [COST_BREAKDOWN_KEY] });
        },
    });
};

export const useUpdateAutoRule = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ ruleId, data }: { ruleId: string; data: UpdateAutoRuleRequest }) =>
            costsApi.updateAutoRule(ruleId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: [COST_AUTO_RULES_KEY] }),
    });
};

export const useDeleteAutoRule = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ruleId: string) => costsApi.deleteAutoRule(ruleId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [COST_AUTO_RULES_KEY] });
        },
    });
};

export const useApplyAutoRules = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => costsApi.applyAutoRules(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [COST_ITEMS_KEY] });
            qc.invalidateQueries({ queryKey: [COST_BREAKDOWN_KEY] });
        },
    });
};
