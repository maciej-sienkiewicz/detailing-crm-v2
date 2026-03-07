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
  createdAt: string;
  updatedAt: string;
}

export interface SaveCredentialsRequest {
  provider: string;
  apiKey: string;
}

export interface ExternalInvoice {
  id: string;
  provider: string;
  providerLabel: string;
  externalId: string;
  externalNumber: string | null;
  status: string;
  statusLabel: string;
  isCorrection: boolean;
  hasCorrection: boolean;
  correctionExternalId: string | null;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  buyerName: string | null;
  buyerNip: string | null;
  description: string | null;
  externalUrl: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalInvoiceListResponse {
  invoices: ExternalInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface InvoicePortalUrl {
  url: string;
}
