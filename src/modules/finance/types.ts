// ─── Shared ────────────────────────────────────────────────────────────────────

export type FinancialDocumentId = string;

// ─── Finance: Dokumenty Przychodowe ───────────────────────────────────────────

export enum DocumentType {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  OTHER   = 'OTHER',
}

export enum DocumentDirection {
  INCOME  = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PAID    = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentMethod {
  CASH     = 'CASH',
  CARD     = 'CARD',
  TRANSFER = 'TRANSFER',
  OTHER    = 'OTHER',
}

export enum DocumentSource {
  VISIT  = 'VISIT',
  MANUAL = 'MANUAL',
}

export interface FinancialDocument {
  id:                  string;
  documentNumber:      string;
  source:              string;
  sourceLabel:         string;
  documentType:        string;
  documentTypeLabel:   string;
  direction:           string;
  directionLabel:      string;
  status:              string;
  statusLabel:         string;
  paymentMethod:       string;
  paymentMethodLabel:  string;
  totalNet:            number;
  totalVat:            number;
  totalGross:          number;
  currency:            string;
  issueDate:           string;
  dueDate:             string | null;
  paidAt:              string | null;
  description:         string | null;
  counterpartyName:    string | null;
  counterpartyNip:     string | null;
  visitId:             string | null;
  vehicleBrand:        string | null;
  vehicleModel:        string | null;
  customerFirstName:   string | null;
  customerLastName:    string | null;
  createdBy:           string;
  createdAt:           string;
  updatedAt:           string;
  deletedAt:           string | null;
}

export interface FinancialDocumentListResponse {
  documents: FinancialDocument[];
  total:     number;
  page:      number;
  pageSize:  number;
}

export interface CreateDocumentRequest {
  documentType:        string;
  direction:           string;
  paymentMethod:       string;
  totalNet:            number;
  totalVat:            number;
  totalGross:          number;
  currency?:           string;
  issueDate:           string;
  dueDate?:            string | null;
  description?:        string | null;
  counterpartyName?:   string | null;
  counterpartyNip?:    string | null;
  visitId?:            string | null;
  vehicleBrand?:       string | null;
  vehicleModel?:       string | null;
  customerFirstName?:  string | null;
  customerLastName?:   string | null;
}

export interface UpdateDocumentNumberRequest {
  documentNumber: string;
}

export interface UpdateDocumentStatusRequest {
  status: string;
}

export interface DocumentListFilters {
  documentType?:   string;
  direction?:      string;
  status?:         string;
  visitId?:        string;
  dateFrom?:       string;
  dateTo?:         string;
  includeDeleted?: boolean;
  page:            number;
  pageSize:        number;
}

// ─── Finance: Kasa ────────────────────────────────────────────────────────────

export interface CashRegister {
  id:        string;
  balance:   number;
  currency:  string;
  updatedAt: string;
}

export interface CashOperation {
  id:                    string;
  amount:                number;
  balanceBefore:         number;
  balanceAfter:          number;
  operationType:         string;
  operationTypeLabel:    string;
  comment:               string | null;
  financialDocumentId:   string | null;
  createdBy:             string;
  createdAt:             string;
}

export interface CashHistoryResponse {
  operations: CashOperation[];
  total:      number;
  page:       number;
  pageSize:   number;
}

export interface CashAdjustRequest {
  amount:  number;
  comment: string;
}

// ─── Finance: Raporty ─────────────────────────────────────────────────────────

export interface FinanceSummary {
  dateFrom:            string | null;
  dateTo:              string | null;
  totalRevenue:        number;
  totalCosts:          number;
  profit:              number;
  pendingReceivables:  number;
  pendingPayables:     number;
  overdueReceivables:  number;
  overduePayables:     number;
}

export type ReportGranularity = 'MONTHLY' | 'WEEKLY' | 'DAILY';

export interface PaymentMethodEntry {
  count:      number;
  totalNet:   number;
  totalGross: number;
}

export interface PaymentMethodPeriod {
  periodLabel: string;
  dateFrom:    string;
  dateTo:      string;
  cash:        PaymentMethodEntry;
  card:        PaymentMethodEntry;
  transfer:    PaymentMethodEntry;
}

export interface PaymentMethodReport {
  granularity:  ReportGranularity;
  dateFrom:     string;
  dateTo:       string;
  documentType: string | null;
  periods:      PaymentMethodPeriod[];
  totals: {
    cash:     PaymentMethodEntry;
    card:     PaymentMethodEntry;
    transfer: PaymentMethodEntry;
  };
}

export interface PaymentMethodReportParams {
  granularity:   ReportGranularity;
  dateFrom?:     string;
  dateTo?:       string;
  documentType?: string;
}

// ─── KSeF: Dane dostępowe ─────────────────────────────────────────────────────

export interface KsefCredentials {
  nip:          string;
  tokenMasked:  string;
  createdAt:    string;
  updatedAt:    string;
}

export interface SaveKsefCredentialsRequest {
  nip:       string;
  ksefToken: string;
}

// ─── KSeF: Synchronizacja ─────────────────────────────────────────────────────

export type KsefSyncStatusValue = 'NEVER_SYNCED' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface KsefSyncStatus {
  syncStatus:       KsefSyncStatusValue;
  lastExpenseSync:  string | null;
  lastError:        string | null;
  updatedAt:        string;
}

export interface KsefSyncRangeRequest {
  dateFrom: string;
  dateTo:   string;
}

export interface KsefSyncRangeResult {
  fetched: number;
  skipped: number;
}

// ─── KSeF: Dokumenty Kosztowe ─────────────────────────────────────────────────

export type ExpenseSource = 'KSEF' | 'MANUAL';
export type ExpenseStatus = 'ACTIVE' | 'CORRECTED' | 'CANCELLED' | 'EXCLUDED';
export type ExpensePaymentStatus = 'PAID' | 'PENDING';

export interface KsefExpense {
  id:                string;
  source:            ExpenseSource;
  ksefNumber:        string | null;
  documentNumber:    string | null;
  saleDate:          string | null;
  sellerName:        string | null;
  sellerNip:         string | null;
  netAmount:         number | null;
  grossAmount:       number | null;
  vatAmount:         number | null;
  currency:          string;
  paymentMethod:     string | null;
  paymentMethodLabel: string | null;
  paymentStatus:     ExpensePaymentStatus;
  status:            ExpenseStatus;
  isCorrection:      boolean;
  fetchedAt:         string;
  note:              string | null;
}

export interface KsefExpenseListResponse {
  expenses: KsefExpense[];
  total:    number;
  page:     number;
  pageSize: number;
}

export interface KsefExpenseListFilters {
  page:             number;
  pageSize:         number;
  source?:          ExpenseSource;
  paymentStatus?:   ExpensePaymentStatus;
  dateFrom?:        string;
  dateTo?:          string;
  includeExcluded?: boolean;
}

export interface CreateExpenseRequest {
  saleDate?:      string;
  documentNumber?: string;
  sellerName?:    string;
  sellerNip?:     string;
  netAmount?:     number;
  grossAmount?:   number;
  paymentMethod?: string;
}

export interface UpdateExpensePaymentStatusRequest {
  paymentStatus: ExpensePaymentStatus;
}

export interface UpdateExpenseNoteRequest {
  note: string;
}

// ─── KSeF: Statystyki kosztowe ────────────────────────────────────────────────

export interface KsefMonthlyStats {
  month:            string;
  costsGross:       number;
  costsNet:         number;
  costsVat:         number;
  expenseCount:     number;
  correctionCount:  number;
}

export interface KsefYearlyTotals {
  costsGross:      number;
  costsNet:        number;
  costsVat:        number;
  expenseCount:    number;
  correctionCount: number;
}

export interface KsefStatistics {
  year:       number;
  totals:     KsefYearlyTotals;
  monthly:    KsefMonthlyStats[];
  dataAsOf:   string;
  syncStatus: KsefSyncStatusValue;
}

// ─── View state ───────────────────────────────────────────────────────────────

export type FinanceTab = 'income' | 'expenses' | 'cash' | 'payment-summary';
