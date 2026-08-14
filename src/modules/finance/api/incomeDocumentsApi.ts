import { apiClient } from '@/core';
import type { IncomeDocumentFilters, IncomeDocumentListResponse } from '../types';

const BASE = '/v1/finance/income-documents';

/**
 * Zunifikowana lista dokumentów przychodowych: faktury i korekty z ledgera KSeF
 * razem z paragonami i dokumentami „inne" z modułu finansowego.
 */
export const incomeDocumentsApi = {
  getDocuments: async (filters: IncomeDocumentFilters): Promise<IncomeDocumentListResponse> => {
    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.pageSize),
    });
    if (filters.documentType)  params.append('documentType',  filters.documentType);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.dateFrom)      params.append('dateFrom',      filters.dateFrom);
    if (filters.dateTo)        params.append('dateTo',        filters.dateTo);
    if (filters.onlyKsef)      params.append('onlyKsef',      'true');

    const response = await apiClient.get(`${BASE}?${params}`);
    return response.data;
  },
};
