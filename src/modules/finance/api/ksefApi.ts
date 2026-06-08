import { apiClient } from '@/core';
import type {
  KsefCredentials,
  SaveKsefCredentialsRequest,
  KsefSyncStatus,
  KsefSyncRangeRequest,
  KsefSyncRangeResult,
  KsefExpense,
  KsefExpenseListResponse,
  KsefExpenseListFilters,
  CreateExpenseRequest,
  UpdateExpensePaymentStatusRequest,
  KsefStatistics,
} from '../types';

const BASE = '/v1/ksef';

export const ksefApi = {
  // ── Credentials ────────────────────────────────────────────────────────────

  getCredentials: async (): Promise<KsefCredentials | null> => {
    return null
  },

  saveCredentials: async (data: SaveKsefCredentialsRequest): Promise<KsefCredentials> => {
    const response = await apiClient.post(`${BASE}/credentials`, data);
    return response.data;
  },

  deleteCredentials: async (): Promise<void> => {
    await apiClient.delete(`${BASE}/credentials`);
  },

  // ── Sync ───────────────────────────────────────────────────────────────────

  getSyncStatus: async (): Promise<KsefSyncStatus> => {
    const response = await apiClient.get(`${BASE}/sync/status`);
    return response.data;
  },

  triggerSync: async (): Promise<KsefSyncStatus> => {
    const response = await apiClient.post(`${BASE}/sync/trigger`, {});
    return response.data;
  },

  // ── Expenses ───────────────────────────────────────────────────────────────

  getExpenses: async (filters: KsefExpenseListFilters): Promise<KsefExpenseListResponse> => {
    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.pageSize),
    });
    if (filters.source)          params.append('source',          filters.source);
    if (filters.paymentStatus)   params.append('paymentStatus',   filters.paymentStatus);
    if (filters.dateFrom)        params.append('dateFrom',        filters.dateFrom);
    if (filters.dateTo)          params.append('dateTo',          filters.dateTo);
    if (filters.includeExcluded) params.append('includeExcluded', 'true');
    const response = await apiClient.get(`${BASE}/expenses?${params}`);
    return response.data;
  },

  createExpense: async (data: CreateExpenseRequest): Promise<KsefExpense> => {
    const response = await apiClient.post(`${BASE}/expenses`, data);
    return response.data;
  },

  syncExpensesByRange: async (data: KsefSyncRangeRequest): Promise<KsefSyncRangeResult> => {
    const response = await apiClient.post(`${BASE}/expenses/sync`, data);
    return response.data;
  },

  excludeExpense: async (id: string): Promise<void> => {
    await apiClient.patch(`${BASE}/expenses/${id}/exclude`);
  },

  restoreExpense: async (id: string): Promise<void> => {
    await apiClient.patch(`${BASE}/expenses/${id}/restore`);
  },

  updateExpensePaymentStatus: async (
    id: string,
    data: UpdateExpensePaymentStatusRequest,
  ): Promise<KsefExpense> => {
    const response = await apiClient.patch(`${BASE}/expenses/${id}/payment-status`, data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/expenses/${id}`);
  },

  // ── Statistics ─────────────────────────────────────────────────────────────

  getStatistics: async (year: number): Promise<KsefStatistics> => {
    const response = await apiClient.get(`${BASE}/statistics?year=${year}`);
    return response.data;
  },
};
