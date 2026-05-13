import { apiClient } from '@/core';
import type {
  FinancialDocument,
  FinancialDocumentListResponse,
  CreateDocumentRequest,
  DocumentListFilters,
  CashRegister,
  CashHistoryResponse,
  CashAdjustRequest,
  FinanceSummary,
  PaymentMethodReport,
  PaymentMethodReportParams,
} from '../types';

const BASE = '/v1/finance';

export const financeApi = {
  // ── Documents ──────────────────────────────────────────────────────────────

  getDocuments: async (filters: DocumentListFilters): Promise<FinancialDocumentListResponse> => {
    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.pageSize),
    });
    if (filters.direction)    params.append('direction',      filters.direction);
    if (filters.documentType) params.append('documentType',   filters.documentType);
    if (filters.status)       params.append('status',         filters.status);
    if (filters.visitId)      params.append('visitId',        filters.visitId);
    if (filters.dateFrom)     params.append('dateFrom',       filters.dateFrom);
    if (filters.dateTo)       params.append('dateTo',         filters.dateTo);
    if (filters.includeDeleted) params.append('includeDeleted', 'true');
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

  restoreDocument: async (id: string): Promise<FinancialDocument> => {
    const response = await apiClient.post(`${BASE}/documents/${id}/restore`);
    return response.data;
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

  // ── Payment method report ──────────────────────────────────────────────────

  getPaymentMethodReport: async (params: PaymentMethodReportParams): Promise<PaymentMethodReport> => {
    const p = new URLSearchParams({ granularity: params.granularity });
    if (params.dateFrom)     p.append('dateFrom',     params.dateFrom);
    if (params.dateTo)       p.append('dateTo',       params.dateTo);
    if (params.documentType) p.append('documentType', params.documentType);
    const response = await apiClient.get(`${BASE}/payment-method-report?${p}`);
    return response.data;
  },
};
