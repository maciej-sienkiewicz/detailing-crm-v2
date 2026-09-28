import { apiClient } from '@/core';
import type { ExternalInvoiceFilter, ExternalInvoiceListResponse } from '../types';

const BASE = '/v1/finance/external-invoices';

/**
 * Lista „Do zafakturowania": sprzedaże, do których fakturę wystawia księgowość.
 * Odhacza je człowiek - nic nie łączy się samo z fakturą pobraną z KSeF.
 */
export const externalInvoicesApi = {
  list: async (status: ExternalInvoiceFilter, page: number, size: number): Promise<ExternalInvoiceListResponse> => {
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    const response = await apiClient.get(`${BASE}?${params}`);
    return response.data;
  },

  pendingCount: async (): Promise<number> => {
    const response = await apiClient.get(`${BASE}/pending-count`, { skipErrorToast: true });
    return response.data.pending;
  },

  /** „Faktura wystawiona" - numer opcjonalny, służy tylko do odszukania faktury. */
  markIssued: async (id: string, invoiceNumber: string | null): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/issued`, { invoiceNumber });
  },

  unmarkIssued: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}/issued`);
  },
};
