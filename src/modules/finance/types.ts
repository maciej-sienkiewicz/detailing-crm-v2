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

export interface UpdateDocumentRequest {
  documentType:        string;
  paymentMethod:       string;
  totalNet:            number;
  totalVat:            number;
  totalGross:          number;
  issueDate:           string;
  dueDate?:            string | null;
  description?:        string | null;
  counterpartyName?:   string | null;
  counterpartyNip?:    string | null;
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

export interface KsefTokenVerification {
  /** Czy KSeF w ogóle zaakceptował token podczas uwierzytelnienia. */
  tokenValid: boolean;
  /** false = token poprawny, ale nie udało się odczytać listy uprawnień. */
  permissionsKnown: boolean;
  canIssueInvoices: boolean;
  canReadInvoices: boolean;
  /** UPO nie ma osobnego uprawnienia w KSeF, wynika z InvoiceWrite. */
  canGenerateUpo: boolean;
  /** Surowe nazwy uprawnień KSeF, np. ["InvoiceRead", "InvoiceWrite"]. */
  permissions: string[];
  checkedAt: string | null;
  errorMessage: string | null;
}

export interface KsefCredentials {
  nip:          string;
  tokenMasked:  string;
  createdAt:    string;
  updatedAt:    string;
  /** Wynik ostatniej weryfikacji tokenu; null = nigdy nie weryfikowano. */
  verification: KsefTokenVerification | null;
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

/** Strona faktury (sprzedawca / nabywca) z danymi adresowymi. */
export interface KsefExpenseParty {
  name:         string | null;
  nip:          string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  countryCode:  string | null;
}

/** Szczegóły płatności dokumentu kosztowego. */
export interface KsefExpensePayment {
  method:      string | null;
  methodLabel: string | null;
  status:      ExpensePaymentStatus;
  dueDate:     string | null;
  bankAccount: string | null;
}

/** Pozycja faktury (wiersz FaWiersz z KSeF). */
export interface KsefExpenseItem {
  lineNumber:   number;
  name:         string | null;
  unit:         string | null;
  quantity:     number | null;
  unitPriceNet: number | null;
  netValue:     number | null;
  grossValue:   number | null;
  vatRate:      string | null;
}

/** Pełne dane dokumentu kosztowego, podstawa wizualizacji faktury. */
export interface KsefExpenseDetail {
  id:                 string;
  source:             ExpenseSource;
  ksefNumber:         string | null;
  documentNumber:     string | null;
  saleDate:           string | null;
  issueDate:          string | null;
  invoiceType:        string | null;
  seller:             KsefExpenseParty;
  buyer:              KsefExpenseParty;
  netAmount:          number | null;
  grossAmount:        number | null;
  vatAmount:          number | null;
  currency:           string;
  payment:            KsefExpensePayment;
  items:              KsefExpenseItem[];
  status:             ExpenseStatus;
  isCorrection:       boolean;
  originalKsefNumber: string | null;
  fetchedAt:          string;
  note:               string | null;
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

// ─── Zunifikowana lista dokumentów przychodowych ──────────────────────────────

/** KSEF = faktura z ledgera KSeF, FINANCE = dokument modułu finansowego. */
export type IncomeSourceKind = 'KSEF' | 'FINANCE';

export type IncomeDocumentType = 'INVOICE' | 'CORRECTION' | 'RECEIPT' | 'OTHER';

export interface IncomeDocument {
  id:               string;
  sourceKind:       IncomeSourceKind;
  documentType:     IncomeDocumentType;
  documentNumber:   string;
  issueDate:        string;
  counterpartyName: string | null;
  counterpartyNip:  string | null;
  totalNet:         number;   // grosze
  totalVat:         number;   // grosze
  totalGross:       number;   // grosze
  currency:         string;
  paymentStatus:    'PAID' | 'PENDING' | 'OVERDUE';
  paymentLabel:     string | null;
  ksefStatus:       KsefRevenueStatus | null;
  ksefNumber:       string | null;
  origin:           string | null;   // CRM | EXTERNAL | VISIT | MANUAL
  duplicateStatus:  DuplicateStatus;
  visitId:          string | null;
  createdAt:        string;
  /** Ukryty ze statystyk — pozycja widoczna dopiero po włączeniu „Pokaż ukryte". */
  excluded:         boolean;
}

export interface IncomeDocumentListResponse {
  documents: IncomeDocument[];
  total:     number;
  page:      number;
  pageSize:  number;
}

export interface IncomeDocumentFilters {
  page:           number;
  pageSize:       number;
  documentType?:  IncomeDocumentType;
  paymentStatus?: 'PAID' | 'PENDING' | 'OVERDUE';
  dateFrom?:      string;
  dateTo?:        string;
  onlyKsef?:      boolean;
  includeExcluded?: boolean;
}

// ─── KSeF: Faktury przychodowe ────────────────────────────────────────────────

export type RevenueSource = 'CRM' | 'EXTERNAL';

export type KsefRevenueStatus =
  | 'PENDING'
  | 'SENDING'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'QUEUED_RETRY';

export type RevenueInvoiceType = 'VAT' | 'KOR';

export type DuplicateStatus = 'NONE' | 'SUSPECTED' | 'CONFIRMED_DUPLICATE' | 'DISMISSED';

/** Kod stawki VAT wg FA(3). */
export type RevenueVatRate = '23' | '8' | '5' | '0' | 'zw';

export interface RevenueParty {
  nip:          string | null;
  name:         string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  countryCode:  string | null;
  /** Rachunek do przelewu — wypełniany wyłącznie po stronie sprzedawcy. */
  bankAccount?: string | null;
}

export interface RevenueInvoiceItem {
  lineNumber:   number;
  name:         string;
  unit:         string | null;
  quantity:     number;
  unitPriceNet: number;  // grosze
  netValue:     number;  // grosze
  vatValue:     number;  // grosze
  grossValue:   number;  // grosze
  vatRate:      string;
}

export interface RevenueInvoice {
  id:                 string;
  source:             RevenueSource;
  ksefStatus:         KsefRevenueStatus;
  invoiceNumber:      string;
  ksefNumber:         string | null;
  invoiceType:        RevenueInvoiceType;
  originalInvoiceId:  string | null;
  originalKsefNumber: string | null;
  correctionReason:   string | null;
  issueDate:          string;
  saleDate:           string | null;
  seller:             RevenueParty;
  buyer:              RevenueParty;
  totalNet:           number;  // grosze
  totalVat:           number;  // grosze
  totalGross:         number;  // grosze
  currency:           string;
  paymentForm:        string | null;
  paymentFormLabel:   string | null;
  paymentStatus:      'PAID' | 'PENDING';
  paymentDueDate:     string | null;
  duplicateStatus:    DuplicateStatus;
  duplicateOfId:      string | null;
  hasUpo:             boolean;
  hasXml:             boolean;
  sendAttempts:       number;
  lastSendError:      string | null;
  sentAt:             string | null;
  acceptedAt:         string | null;
  visitId:            string | null;
  customerId:         string | null;
  description:        string | null;
  note:               string | null;
  /** Ukryta ze statystyk i z domyślnej listy dokumentów przychodowych. */
  excluded:           boolean;
  excludedAt:         string | null;
  /**
   * Czy faktura ma pobrane szczegóły z XML (pozycje, adresy, płatność). false tylko
   * dla faktur pobranych z KSeF, którym XML dołoży synchronizacja wsteczna.
   */
  detailsSynced:      boolean;
  /**
   * Adres weryfikacyjny KSeF („KOD I") — to on trafia do kodu QR na wizualizacji
   * faktury. null, gdy faktura nie ma jeszcze skrótu dokumentu (np. przed wysyłką).
   */
  ksefVerificationUrl: string | null;
  createdAt:          string;
  items:              RevenueInvoiceItem[] | null;
}

export interface RevenueInvoiceListResponse {
  invoices: RevenueInvoice[];
  total:    number;
  page:     number;
  pageSize: number;
}

export interface RevenueInvoiceListFilters {
  page:             number;
  pageSize:         number;
  source?:          RevenueSource;
  ksefStatus?:      KsefRevenueStatus;
  duplicateStatus?: DuplicateStatus;
  dateFrom?:        string;
  dateTo?:          string;
  includeExcluded?: boolean;
}

export interface IssueInvoiceItemRequest {
  name:         string;
  unit?:        string;
  quantity?:    number;
  unitPriceNet: number;  // grosze
  vatRate:      RevenueVatRate;
}

export interface IssueInvoiceBuyerRequest {
  nip?:          string;
  name?:         string;
  addressLine1?: string;
  addressLine2?: string;
  countryCode?:  string;
  email?:        string;
}

export interface IssueInvoiceRequest {
  buyer:                IssueInvoiceBuyerRequest;
  items:                IssueInvoiceItemRequest[];
  issueDate?:           string;
  saleDate?:            string;
  paymentForm?:         string;
  isPaid?:              boolean;
  paymentDueDate?:      string;
  exemptionLegalBasis?: string;
  visitId?:             string;
  customerId?:          string;
  description?:         string;
}

export interface IssueCorrectionRequest {
  reason:               string;
  items?:               IssueInvoiceItemRequest[];
  issueDate?:           string;
  exemptionLegalBasis?: string;
}

export interface RevenueMonthlyStats {
  month:           string;
  gross:           number;  // grosze
  net:             number;  // grosze
  vat:             number;  // grosze
  invoiceCount:    number;
  correctionCount: number;
  externalCount:   number;
}

export interface RevenueTotals {
  gross:           number;  // grosze
  net:             number;  // grosze
  vat:             number;  // grosze
  invoiceCount:    number;
  correctionCount: number;
  externalCount:   number;
}

export interface RevenueStatistics {
  year:             number;
  totals:           RevenueTotals;
  monthly:          RevenueMonthlyStats[];
  pendingKsefCount: number;
}
