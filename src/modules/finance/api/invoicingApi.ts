import { apiClient } from '@/core';
import type {
  InvoiceProviderInfo,
  InvoicingCredentials,
  SaveCredentialsRequest,
  ExternalInvoice,
  ExternalInvoiceListResponse,
  SyncResult,
  InvoicePortalUrl,
} from '../types';

const BASE = '/v1/invoicing';

export const invoicingApi = {
  // ── Providers ──────────────────────────────────────────────────────────────

  listProviders: async (): Promise<InvoiceProviderInfo[]> => {
    const response = await apiClient.get(`${BASE}/providers`);
    return response.data;
  },

  // ── Credentials ────────────────────────────────────────────────────────────

  getCredentials: async (): Promise<InvoicingCredentials | null> => {
    try {
      const response = await apiClient.get(`${BASE}/credentials`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  saveCredentials: async (data: SaveCredentialsRequest): Promise<InvoicingCredentials> => {
    const response = await apiClient.post(`${BASE}/credentials`, data);
    return response.data;
  },

  deleteCredentials: async (): Promise<void> => {
    await apiClient.delete(`${BASE}/credentials`);
  },

  // ── Invoices ───────────────────────────────────────────────────────────────

  listInvoices: async (page: number, pageSize: number): Promise<ExternalInvoiceListResponse> => {
    const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
    const response = await apiClient.get(`${BASE}/invoices?${params}`);
    return response.data;
  },

  syncAll: async (): Promise<SyncResult> => {
    const response = await apiClient.post(`${BASE}/invoices/sync`);
    return response.data;
  },

  syncSingle: async (id: string): Promise<ExternalInvoice> => {
    const response = await apiClient.post(`${BASE}/invoices/${id}/sync`);
    return response.data;
  },

  getPortalUrl: async (id: string): Promise<InvoicePortalUrl> => {
    const response = await apiClient.get(`${BASE}/invoices/${id}/portal-url`);
    return response.data;
  },
};
