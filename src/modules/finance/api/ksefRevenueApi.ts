import { apiClient } from '@/core';
import type {
  RevenueInvoice,
  RevenueInvoiceListResponse,
  RevenueInvoiceListFilters,
  IssueInvoiceRequest,
  IssueCorrectionRequest,
  RevenueStatistics,
} from '../types';

const BASE = '/v1/ksef/revenue';

/** Pobiera plik XML (faktura / UPO) i wymusza zapis po stronie przeglądarki. */
const downloadXml = async (url: string, filename: string): Promise<void> => {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

export const ksefRevenueApi = {
  // ── Wystawianie ────────────────────────────────────────────────────────────

  issueInvoice: async (data: IssueInvoiceRequest): Promise<RevenueInvoice> => {
    const response = await apiClient.post(`${BASE}/invoices`, data);
    return response.data;
  },

  issueCorrection: async (id: string, data: IssueCorrectionRequest): Promise<RevenueInvoice> => {
    const response = await apiClient.post(`${BASE}/invoices/${id}/corrections`, data);
    return response.data;
  },

  retryInvoice: async (id: string): Promise<RevenueInvoice> => {
    const response = await apiClient.post(`${BASE}/invoices/${id}/retry`, {});
    return response.data;
  },

  deleteRejected: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/invoices/${id}`);
  },

  // ── Listowanie / szczegóły ─────────────────────────────────────────────────

  getInvoices: async (filters: RevenueInvoiceListFilters): Promise<RevenueInvoiceListResponse> => {
    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.pageSize),
    });
    if (filters.source)          params.append('source',          filters.source);
    if (filters.ksefStatus)      params.append('ksefStatus',      filters.ksefStatus);
    if (filters.duplicateStatus) params.append('duplicateStatus', filters.duplicateStatus);
    if (filters.dateFrom)        params.append('dateFrom',        filters.dateFrom);
    if (filters.dateTo)          params.append('dateTo',          filters.dateTo);
    const response = await apiClient.get(`${BASE}/invoices?${params}`);
    return response.data;
  },

  getInvoiceDetail: async (id: string): Promise<RevenueInvoice> => {
    const response = await apiClient.get(`${BASE}/invoices/${id}`);
    return response.data;
  },

  downloadInvoiceXml: (id: string, invoiceNumber: string): Promise<void> =>
    downloadXml(`${BASE}/invoices/${id}/xml`, `faktura-${invoiceNumber.replace(/\//g, '-')}.xml`),

  downloadUpo: (id: string, invoiceNumber: string): Promise<void> =>
    downloadXml(`${BASE}/invoices/${id}/upo`, `upo-${invoiceNumber.replace(/\//g, '-')}.xml`),

  // ── Duplikaty / płatność / notatka ─────────────────────────────────────────

  resolveDuplicate: async (
    id: string,
    resolution: 'CONFIRMED_DUPLICATE' | 'DISMISSED',
  ): Promise<RevenueInvoice> => {
    const response = await apiClient.patch(`${BASE}/invoices/${id}/duplicate-resolution`, { resolution });
    return response.data;
  },

  updatePaymentStatus: async (id: string, paymentStatus: 'PAID' | 'PENDING'): Promise<RevenueInvoice> => {
    const response = await apiClient.patch(`${BASE}/invoices/${id}/payment-status`, { paymentStatus });
    return response.data;
  },

  updateNote: async (id: string, note: string | null): Promise<void> => {
    await apiClient.patch(`${BASE}/invoices/${id}/note`, { note });
  },

  // ── Statystyki ─────────────────────────────────────────────────────────────

  getStatistics: async (year: number): Promise<RevenueStatistics> => {
    const response = await apiClient.get(`${BASE}/statistics?year=${year}`);
    return response.data;
  },
};
