import { apiClient } from '@/core';
import type {
  FinancialDocument,
  FinancialDocumentListResponse,
  CreateDocumentRequest,
  DocumentListFilters,
  CashRegister,
  CashOperation,
  CashHistoryResponse,
  CashAdjustRequest,
  FinanceSummary,
  SyncInvoicesResult,
  ImportInvoicesResult,
} from '../types';

const BASE = '/v1/finance';

export const financeApi = {
  // ── Documents ──────────────────────────────────────────────────────────────

  getDocuments: async (filters: DocumentListFilters): Promise<FinancialDocumentListResponse> => {
    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.pageSize),
    });
    if (filters.direction)    params.append('direction',    filters.direction);
    if (filters.documentType) params.append('documentType', filters.documentType);
    if (filters.status)       params.append('status',       filters.status);
    if (filters.visitId)      params.append('visitId',      filters.visitId);
    if (filters.dateFrom)     params.append('dateFrom',     filters.dateFrom);
    if (filters.dateTo)       params.append('dateTo',       filters.dateTo);
    const response = await apiClient.get(`${BASE}/documents?${params}`);
    return response.data;
  },

  getDocument: async (id: string): Promise<FinancialDocument> => {
    const response = await apiClient.get(`${BASE}/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateDocumentRequest): Promise<FinancialDocument> => {
    const response = await apiClient.post(`${BASE}/documents`, data);
    return response.data;
  },

  updateDocumentNumber: async (id: string, documentNumber: string): Promise<FinancialDocument> => {
    const response = await apiClient.patch(`${BASE}/documents/${id}`, { documentNumber });
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<FinancialDocument> => {
    const response = await apiClient.patch(`${BASE}/documents/${id}/status`, { status });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/documents/${id}`);
  },

  // ── Cash register ──────────────────────────────────────────────────────────

  getCashRegister: async (): Promise<CashRegister> => {
    const response = await apiClient.get(`${BASE}/cash`);
    return response.data;
  },

  getCashHistory: async (page: number, pageSize: number): Promise<CashHistoryResponse> => {
    const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
    const response = await apiClient.get(`${BASE}/cash/history?${params}`);
    return response.data;
  },

  adjustCash: async (data: CashAdjustRequest): Promise<CashRegister> => {
    const response = await apiClient.post(`${BASE}/cash/adjust`, data);
    return response.data;
  },

  // ── Summary ────────────────────────────────────────────────────────────────

  getSummary: async (dateFrom?: string, dateTo?: string): Promise<FinanceSummary> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo)   params.append('dateTo',   dateTo);
    const qs = params.toString();
    const response = await apiClient.get(`${BASE}/summary${qs ? '?' + qs : ''}`);
    return response.data;
  },

  // ── Invoice provider integration ───────────────────────────────────────────

  syncAllInvoices: async (): Promise<SyncInvoicesResult> => {
    const response = await apiClient.post(`${BASE}/invoices/sync`);
    return response.data;
  },

  syncSingleInvoice: async (id: string): Promise<FinancialDocument> => {
    const response = await apiClient.post(`${BASE}/invoices/${id}/sync`);
    return response.data;
  },

  importInvoices: async (): Promise<ImportInvoicesResult> => {
    const response = await apiClient.post(`${BASE}/invoices/import`);
    return response.data;
  },

  retrySyncInvoice: async (id: string): Promise<FinancialDocument> => {
    const response = await apiClient.post(`${BASE}/invoices/${id}/retry-sync`);
    return response.data;
  },

  getInvoicePortalUrl: async (id: string): Promise<string> => {
    const response = await apiClient.get(`${BASE}/invoices/${id}/portal-url`);
    return response.data.url;
  },
};
