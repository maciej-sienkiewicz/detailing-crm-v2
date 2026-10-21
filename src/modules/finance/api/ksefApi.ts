import { apiClient } from '@/core';
import type {
  KsefCredentials,
  KsefInvoicingStatus,
  KsefInvoicingSettings,
  KsefTokenVerification,
  SaveKsefCredentialsRequest,
  KsefSyncStatus,
  KsefSyncRangeRequest,
  KsefSyncRangeResult,
  KsefExpense,
  KsefExpenseDetail,
  KsefExpenseTransfer,
  KsefExpenseListResponse,
  KsefExpenseListFilters,
  CreateExpenseRequest,
  UpdateExpensePaymentStatusRequest,
  UpdateExpenseNoteRequest,
  KsefStatistics,
  BulkPaymentStatusResult,
  BulkPaymentStatusTarget,
} from '../types';

const BASE = '/v1/ksef';

export const ksefApi = {
  // ── Credentials ────────────────────────────────────────────────────────────

  /**
   * Zwraca null, gdy studio nie ma zapisanych poświadczeń - backend odpowiada wtedy 204
   * (dawniej 404, czerwone w Network przy każdym wejściu w finanse i wydanie pojazdu).
   *
   * `skipErrorToast`: call sites (np. modal wydania pojazdu) renderują własną informację
   * o braku automatycznej wysyłki, więc globalny toast przy prawdziwym błędzie byłby drugi.
   */
  getCredentials: async (): Promise<KsefCredentials | null> => {
    const response = await apiClient.get<KsefCredentials>(`${BASE}/credentials`, { skipErrorToast: true });
    return response.status === 204 ? null : response.data;
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

  /** Pole pominięte = bez zmiany: każdy przełącznik zapisuje się osobno. */
  updateInvoicingSettings: async (
    settings: Partial<KsefInvoicingSettings>,
  ): Promise<KsefInvoicingSettings> => {
    const response = await apiClient.patch(`${BASE}/invoicing-settings`, settings);
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
    if (filters.documentKind)    params.append('documentKind',    filters.documentKind);
    if (filters.dateFrom)        params.append('dateFrom',        filters.dateFrom);
    if (filters.dateTo)          params.append('dateTo',          filters.dateTo);
    if (filters.includeExcluded) params.append('includeExcluded', 'true');
    if (filters.onlyExcluded)    params.append('onlyExcluded',    'true');
    if (filters.search)          params.append('search',          filters.search);
    const response = await apiClient.get(`${BASE}/expenses?${params}`);
    return response.data;
  },

  getExpenseDetail: async (id: string): Promise<KsefExpenseDetail> => {
    const response = await apiClient.get(`${BASE}/expenses/${id}`);
    return response.data;
  },

  getExpenseTransfer: async (id: string): Promise<KsefExpenseTransfer> => {
    const response = await apiClient.get(`${BASE}/expenses/${id}/transfer`);
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

  /**
   * Status płatności wielu dokumentów kosztowych naraz - jedno żądanie zamiast N
   * PATCH-y z paska zaznaczenia.
   */
  updateExpensesPaymentStatus: async (
    ids: string[],
    paymentStatus: BulkPaymentStatusTarget,
  ): Promise<BulkPaymentStatusResult> => {
    const response = await apiClient.patch(`${BASE}/expenses/payment-status`, { ids, paymentStatus });
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
