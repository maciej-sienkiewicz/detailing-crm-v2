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

export type FinanceTab = 'income' | 'expense' | 'cash' | 'summary' | 'invoicing';

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
