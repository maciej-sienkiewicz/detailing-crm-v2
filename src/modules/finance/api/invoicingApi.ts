import { apiClient } from '@/core';
import type {
  InvoiceProviderInfo,
  InvoicingCredentials,
  SaveCredentialsRequest,
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
};
