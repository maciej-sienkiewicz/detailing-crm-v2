export type FinancialDocumentId = string;

export enum DocumentType {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  OTHER = 'OTHER',
}

export enum DocumentDirection {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export interface FinancialDocument {
  id: string;
  documentNumber: string;
  source: string;
  sourceLabel: string;
  documentType: string;
  documentTypeLabel: string;
  direction: string;
  directionLabel: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  description: string | null;
  counterpartyName: string | null;
  counterpartyNip: string | null;
  visitId: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;

  // External provider fields
  provider: string | null;
  providerLabel: string | null;
  externalId: string | null;
  externalNumber: string | null;
  externalStatus: string | null;
  externalStatusLabel: string | null;
  isCorrection: boolean;
  hasCorrection: boolean;
  correctionExternalId: string | null;
  providerSyncStatus: string | null;
  providerSyncStatusLabel: string | null;
  providerSyncError: string | null;
  syncedAt: string | null;
  externalUrl: string | null;

  // KSeF
  ksefInvoiceId: string | null;
  ksefNumber: string | null;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FinancialDocumentListResponse {
  documents: FinancialDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDocumentRequest {
  documentType: string;
  direction: string;
  paymentMethod: string;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency?: string;
  issueDate: string;
  dueDate?: string | null;
  description?: string | null;
  counterpartyName?: string | null;
  counterpartyNip?: string | null;
  visitId?: string | null;
}

export interface UpdateStatusRequest {
  status: string;
}

export interface DocumentListFilters {
  documentType?: string;
  direction?: string;
  status?: string;
  visitId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeDeleted?: boolean;
  page: number;
  pageSize: number;
}

export interface CashRegister {
  id: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface CashOperation {
  id: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  operationType: string;
  operationTypeLabel: string;
  comment: string | null;
  financialDocumentId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CashHistoryResponse {
  operations: CashOperation[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CashAdjustRequest {
  amount: number;
  comment: string;
}

export interface FinanceSummary {
  dateFrom: string | null;
  dateTo: string | null;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  pendingReceivables: number;
  pendingPayables: number;
  overdueReceivables: number;
  overduePayables: number;
}

export type FinanceTab = 'income' | 'expense' | 'cash' | 'invoicing' | 'payment-summary';

export interface SyncInvoicesResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface ImportInvoicesResult {
  imported: number;
  updated: number;
  merged: number;
  failed: number;
  errors: string[];
}

// ─── External Invoicing Integration ───────────────────────────────────────────

export interface InvoiceProviderInfo {
  type: string;
  displayName: string;
  supported: boolean;
}

export interface InvoicingCredentials {
  provider: string;
  providerLabel: string;
  apiKeyMasked: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicingValidationError {
  error: string;
  message: string;
  providerErrors: string[];
  timestamp: string;
}

export interface SaveCredentialsRequest {
  provider: string;
  apiKey: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

// ─── KSeF Integration ─────────────────────────────────────────────────────────

export type KsefInvoiceStatus = 'ACTIVE' | 'CORRECTED' | 'CANCELLED' | 'EXCLUDED';
export type KsefInvoiceDirection = 'INCOME' | 'EXPENSE';
export type KsefSyncStatus = 'IDLE' | 'RUNNING' | 'ERROR' | 'NEVER_SYNCED';
export type KsefPaymentFormKey = 'GOTOWKA' | 'KARTA' | 'CZEK' | 'BON' | 'KREDYT' | 'PRZELEW' | 'MOBILNA';

export interface KsefInvoice {
  id: string;
  ksefNumber: string;
  invoiceNumber: string | null;
  invoicingDate: string | null;
  issueDate: string | null;
  sellerNip: string | null;
  sellerName: string | null;
  buyerNip: string | null;
  buyerName: string | null;
  netAmount: number | null;
  grossAmount: number | null;
  vatAmount: number | null;
  currency: string | null;
  invoiceType: 'FA' | 'FA_KOR' | string | null;
  fetchedAt: string;
  direction: KsefInvoiceDirection;
  isCorrection: boolean;
  status: KsefInvoiceStatus;
  paymentForm: KsefPaymentFormKey | null;
  paymentFormLabel: string | null;
}

export interface KsefInvoiceListResponse {
  invoices: KsefInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KsefSyncStatusResponse {
  syncStatus: KsefSyncStatus;
  lastIncomeSync: string | null;
  lastExpenseSync: string | null;
  lastError: string | null;
  updatedAt: string | null;
}

export interface KsefStatsTotals {
  revenueGross: number;
  revenueNet: number;
  revenueVat: number;
  costsGross: number;
  costsNet: number;
  costsVat: number;
  profitGross: number;
  profitNet: number;
  incomeCount: number;
  expenseCount: number;
  correctionCount: number;
}

export interface KsefMonthlyBreakdown extends KsefStatsTotals {
  monthLabel: string;
}

export interface KsefStatisticsResponse {
  year: number;
  syncStatus: KsefSyncStatus;
  dataAsOf: string | null;
  totals: KsefStatsTotals;
  monthly: KsefMonthlyBreakdown[];
}

export interface KsefCredentials {
  nip: string;
  tokenMasked: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveKsefCredentialsRequest {
  nip: string;
  ksefToken: string;
}

export interface KsefSessionResponse {
  authenticated: boolean;
  accessTokenValidUntil: string;
}

export interface FetchKsefInvoicesRequest {
  dateFrom: string;
  dateTo: string;
  dateType?: 'INVOICING' | 'ISSUE' | 'PERMANENTSTORAGE';
  subjectType?: 'SUBJECT1' | 'SUBJECT2';
  pageSize?: number;
}

export interface FetchKsefInvoicesResult {
  fetched: number;
  skipped: number;
  total: number;
}

// ─── Payment Method Report ─────────────────────────────────────────────────────

export type ReportGranularity = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface PaymentMethodEntry {
  count: number;
  /** Amount in PLN */
  totalNet: number;
  /** Amount in PLN */
  totalGross: number;
}

export interface PaymentMethodPeriod {
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  cash: PaymentMethodEntry;
  card: PaymentMethodEntry;
  transfer: PaymentMethodEntry;
}

export interface PaymentMethodReport {
  granularity: ReportGranularity;
  dateFrom: string;
  dateTo: string;
  documentType: string | null;
  periods: PaymentMethodPeriod[];
  totals: {
    cash: PaymentMethodEntry;
    card: PaymentMethodEntry;
    transfer: PaymentMethodEntry;
  };
}

export interface PaymentMethodReportParams {
  granularity: ReportGranularity;
  dateFrom?: string;
  dateTo?: string;
  documentType?: string;
}
