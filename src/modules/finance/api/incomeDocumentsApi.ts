import { apiClient } from '@/core';
import type { IncomeDocumentFilters, IncomeDocumentListResponse, IncomeSourceKind } from '../types';

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
    if (filters.onlyKsef)        params.append('onlyKsef',        'true');
    if (filters.includeExcluded) params.append('includeExcluded', 'true');

    const response = await apiClient.get(`${BASE}?${params}`);
    return response.data;
  },

  /**
   * Ukrywa dokument ze statystyk i z domyślnej listy. Dokument zostaje w bazie —
   * o docelowym źródle decyduje `sourceKind` z wiersza listy, bo przychody łączą
   * ledger KSeF z dokumentami modułu finansowego.
   */
  exclude: async (sourceKind: IncomeSourceKind, id: string): Promise<void> => {
    await apiClient.patch(`${BASE}/${sourceKind}/${id}/exclude`);
  },

  /** Przywraca ukryty wcześniej dokument do statystyk i domyślnej listy. */
  restore: async (sourceKind: IncomeSourceKind, id: string): Promise<void> => {
    await apiClient.patch(`${BASE}/${sourceKind}/${id}/restore`);
  },
};
