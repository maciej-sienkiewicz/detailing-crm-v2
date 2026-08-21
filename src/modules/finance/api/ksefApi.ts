import { apiClient } from '@/core';
import type {
  KsefCredentials,
  KsefInvoicingStatus,
  KsefTokenVerification,
  SaveKsefCredentialsRequest,
  KsefSyncStatus,
  KsefSyncRangeRequest,
  KsefSyncRangeResult,
  KsefExpense,
  KsefExpenseDetail,
  KsefExpenseListResponse,
  KsefExpenseListFilters,
  CreateExpenseRequest,
  UpdateExpensePaymentStatusRequest,
  UpdateExpenseNoteRequest,
  KsefStatistics,
} from '../types';

const BASE = '/v1/ksef';

export const ksefApi = {
  // ── Credentials ────────────────────────────────────────────────────────────

  /**
   * Zwraca null, gdy studio nie ma zapisanych poświadczeń (backend odpowiada 404).
   *
   * `skipErrorToast`: brak tokenu to normalny stan, nie błąd. Call sites (np. modal
   * wydania pojazdu) renderują własną informację o braku automatycznej wysyłki,
   * więc globalny toast "Wystąpił nieoczekiwany błąd" byłby mylący.
   */
  getCredentials: async (): Promise<KsefCredentials | null> => {
    try {
      const response = await apiClient.get(`${BASE}/credentials`, { skipErrorToast: true });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  saveCredentials: async (data: SaveKsefCredentialsRequest): Promise<KsefCredentials> => {
    const response = await apiClient.post(`${BASE}/credentials`, data);
    return response.data;
  },

  deleteCredentials: async (): Promise<void> => {
    await apiClient.delete(`${BASE}/credentials`);
  },

  /**
   * Weryfikuje zapisany token w KSeF (świeże uwierzytelnienie + odczyt uprawnień).
   * Wywołanie trwa kilka sekund: KSeF przetwarza uwierzytelnienie asynchronicznie.
   */
  verifyCredentials: async (): Promise<KsefTokenVerification> => {
    const response = await apiClient.post(`${BASE}/credentials/verify`, {});
    return response.data;
  },

  // ── Gotowość do fakturowania ───────────────────────────────────────────────

  /**
   * Stan integracji w zakresie, jakiego potrzebuje ekran wydania pojazdu: czy token
   * jest zapisany, czy ma uprawnienie do wystawiania faktur i jaka jest domyślna
   * odpowiedź na pytanie o wysyłkę. Endpoint nie jest właścicielski, więc widzi go
   * też pracownik wydający pojazd (w przeciwieństwie do `getCredentials`).
   */
  getInvoicingStatus: async (): Promise<KsefInvoicingStatus> => {
    const response = await apiClient.get(`${BASE}/invoicing-status`, { skipErrorToast: true });
    return response.data;
  },

  updateInvoicingSettings: async (autoSendDefault: boolean): Promise<{ autoSendDefault: boolean }> => {
    const response = await apiClient.patch(`${BASE}/invoicing-settings`, { autoSendDefault });
    return response.data;
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

  getExpenseDetail: async (id: string): Promise<KsefExpenseDetail> => {
    const response = await apiClient.get(`${BASE}/expenses/${id}`);
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

  updateExpenseNote: async (
    id: string,
    data: UpdateExpenseNoteRequest,
  ): Promise<KsefExpense> => {
    const response = await apiClient.patch(`${BASE}/expenses/${id}/note`, data);
    return response.data;
  },

  deleteExpenseNote: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/expenses/${id}/note`);
  },

  // ── Statistics ─────────────────────────────────────────────────────────────

  getStatistics: async (year: number): Promise<KsefStatistics> => {
    const response = await apiClient.get(`${BASE}/statistics?year=${year}`);
    return response.data;
  },
};
