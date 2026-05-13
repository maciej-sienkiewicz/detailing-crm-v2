import { apiClient } from '@/core';
import type {
  KsefCredentials,
  SaveKsefCredentialsRequest,
  KsefSessionResponse,
  FetchKsefInvoicesRequest,
  FetchKsefInvoicesResult,
  KsefInvoiceListResponse,
  KsefSyncStatusResponse,
  KsefStatisticsResponse,
} from '../types';

const BASE = '/v1/ksef';

export const ksefApi = {
  // ── Credentials ────────────────────────────────────────────────────────────

  saveCredentials: async (data: SaveKsefCredentialsRequest): Promise<KsefCredentials> => {
    const response = await apiClient.post(`${BASE}/credentials`, data);
    return response.data;
  },

  getCredentials: async (): Promise<KsefCredentials | null> => {
    try {
      const response = await apiClient.get(`${BASE}/credentials`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  deleteCredentials: async (): Promise<void> => {
    await apiClient.delete(`${BASE}/credentials`);
  },

  // ── Session ────────────────────────────────────────────────────────────────

  openSession: async (): Promise<KsefSessionResponse> => {
    const response = await apiClient.post(`${BASE}/session`);
    return response.data;
  },

  // ── Invoices ───────────────────────────────────────────────────────────────

  fetchInvoices: async (data: FetchKsefInvoicesRequest): Promise<FetchKsefInvoicesResult> => {
    const response = await apiClient.post(`${BASE}/invoices/fetch`, data);
    return response.data;
  },

  listInvoices: async (page: number, size: number): Promise<KsefInvoiceListResponse> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await apiClient.get(`${BASE}/invoices?${params}`);
    return response.data;
  },

  excludeInvoice: async (ksefNumber: string): Promise<void> => {
    await apiClient.patch(`${BASE}/invoices/${encodeURIComponent(ksefNumber)}/exclude`);
  },

  restoreInvoice: async (ksefNumber: string): Promise<void> => {
    await apiClient.patch(`${BASE}/invoices/${encodeURIComponent(ksefNumber)}/restore`);
  },

  // ── Sync status ────────────────────────────────────────────────────────────

  getSyncStatus: async (): Promise<KsefSyncStatusResponse> => {
    const response = await apiClient.get(`${BASE}/sync/status`);
    return response.data;
  },

  // ── Statistics ─────────────────────────────────────────────────────────────

  getStatistics: async (year: number): Promise<KsefStatisticsResponse> => {
    const response = await apiClient.get(`${BASE}/statistics?year=${year}`);
    return response.data;
  },
};
