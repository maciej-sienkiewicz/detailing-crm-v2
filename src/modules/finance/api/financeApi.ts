import { apiClient } from '@/core';
import type {
  FinancialDocument,
  FinancialDocumentListResponse,
  CreateDocumentRequest,
  DocumentListFilters,
  CashRegister,
  CashOperation,
  CashHistoryResponse,
  CashAdjustRequest,
  FinanceSummary,
} from '../types';
import { DocumentDirection, DocumentStatus, DocumentType, PaymentMethod } from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/v1/finance';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const now = new Date();
const today = now.toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
const lastWeek = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
const lastMonth = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

const mockDocuments: FinancialDocument[] = [
  {
    id: '1',
    documentNumber: 'FV/2024/001',
    documentType: DocumentType.INVOICE,
    documentTypeLabel: 'Faktura',
    direction: DocumentDirection.INCOME,
    directionLabel: 'Przychód',
    status: DocumentStatus.PAID,
    statusLabel: 'Opłacona',
    paymentMethod: PaymentMethod.TRANSFER,
    paymentMethodLabel: 'Przelew',
    totalNet: 450000,
    totalVat: 103500,
    totalGross: 553500,
    currency: 'PLN',
    issueDate: lastMonth,
    dueDate: yesterday,
    paidAt: yesterday + 'T10:00:00Z',
    description: 'Detailing kompletny + powłoka ceramiczna',
    counterpartyName: 'Jan Kowalski',
    counterpartyNip: null,
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: lastMonth + 'T09:00:00Z',
    updatedAt: yesterday + 'T10:00:00Z',
  },
  {
    id: '2',
    documentNumber: 'FV/2024/002',
    documentType: DocumentType.INVOICE,
    documentTypeLabel: 'Faktura',
    direction: DocumentDirection.INCOME,
    directionLabel: 'Przychód',
    status: DocumentStatus.PENDING,
    statusLabel: 'Oczekująca',
    paymentMethod: PaymentMethod.TRANSFER,
    paymentMethodLabel: 'Przelew',
    totalNet: 280000,
    totalVat: 64400,
    totalGross: 344400,
    currency: 'PLN',
    issueDate: lastWeek,
    dueDate: today,
    paidAt: null,
    description: 'Folia PPF na maskę i błotniki',
    counterpartyName: 'Piotr Wiśniewski',
    counterpartyNip: '1234567890',
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: lastWeek + 'T14:00:00Z',
    updatedAt: lastWeek + 'T14:00:00Z',
  },
  {
    id: '3',
    documentNumber: 'PAR/2024/001',
    documentType: DocumentType.RECEIPT,
    documentTypeLabel: 'Paragon',
    direction: DocumentDirection.INCOME,
    directionLabel: 'Przychód',
    status: DocumentStatus.PAID,
    statusLabel: 'Opłacona',
    paymentMethod: PaymentMethod.CASH,
    paymentMethodLabel: 'Gotówka',
    totalNet: 120000,
    totalVat: 27600,
    totalGross: 147600,
    currency: 'PLN',
    issueDate: yesterday,
    dueDate: null,
    paidAt: yesterday + 'T15:30:00Z',
    description: 'Mycie + woskowanie',
    counterpartyName: 'Anna Nowak',
    counterpartyNip: null,
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: yesterday + 'T15:30:00Z',
    updatedAt: yesterday + 'T15:30:00Z',
  },
  {
    id: '4',
    documentNumber: 'PAR/2024/002',
    documentType: DocumentType.RECEIPT,
    documentTypeLabel: 'Paragon',
    direction: DocumentDirection.INCOME,
    directionLabel: 'Przychód',
    status: DocumentStatus.PAID,
    statusLabel: 'Opłacona',
    paymentMethod: PaymentMethod.CARD,
    paymentMethodLabel: 'Karta',
    totalNet: 85000,
    totalVat: 19550,
    totalGross: 104550,
    currency: 'PLN',
    issueDate: today,
    dueDate: null,
    paidAt: today + 'T11:00:00Z',
    description: 'Detailing wnętrza',
    counterpartyName: 'Maria Dąbrowska',
    counterpartyNip: null,
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: today + 'T11:00:00Z',
    updatedAt: today + 'T11:00:00Z',
  },
  {
    id: '5',
    documentNumber: 'FV/2024/003',
    documentType: DocumentType.INVOICE,
    documentTypeLabel: 'Faktura',
    direction: DocumentDirection.INCOME,
    directionLabel: 'Przychód',
    status: DocumentStatus.OVERDUE,
    statusLabel: 'Przeterminowana',
    paymentMethod: PaymentMethod.TRANSFER,
    paymentMethodLabel: 'Przelew',
    totalNet: 320000,
    totalVat: 73600,
    totalGross: 393600,
    currency: 'PLN',
    issueDate: lastMonth,
    dueDate: lastWeek,
    paidAt: null,
    description: 'Powłoka ceramiczna 5-letnia + korekta lakieru',
    counterpartyName: 'Tomasz Lewandowski',
    counterpartyNip: '9876543210',
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: lastMonth + 'T08:00:00Z',
    updatedAt: lastMonth + 'T08:00:00Z',
  },
  {
    id: '6',
    documentNumber: 'FV/2024/004',
    documentType: DocumentType.INVOICE,
    documentTypeLabel: 'Faktura',
    direction: DocumentDirection.EXPENSE,
    directionLabel: 'Koszt',
    status: DocumentStatus.PAID,
    statusLabel: 'Opłacona',
    paymentMethod: PaymentMethod.TRANSFER,
    paymentMethodLabel: 'Przelew',
    totalNet: 250000,
    totalVat: 57500,
    totalGross: 307500,
    currency: 'PLN',
    issueDate: lastWeek,
    dueDate: yesterday,
    paidAt: yesterday + 'T09:00:00Z',
    description: 'Zakup materiałów – chemia samochodowa',
    counterpartyName: 'AutoChemia Sp. z o.o.',
    counterpartyNip: '5544332211',
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: lastWeek + 'T10:00:00Z',
    updatedAt: yesterday + 'T09:00:00Z',
  },
  {
    id: '7',
    documentNumber: 'FV/2024/005',
    documentType: DocumentType.INVOICE,
    documentTypeLabel: 'Faktura',
    direction: DocumentDirection.EXPENSE,
    directionLabel: 'Koszt',
    status: DocumentStatus.PENDING,
    statusLabel: 'Oczekująca',
    paymentMethod: PaymentMethod.TRANSFER,
    paymentMethodLabel: 'Przelew',
    totalNet: 180000,
    totalVat: 41400,
    totalGross: 221400,
    currency: 'PLN',
    issueDate: yesterday,
    dueDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
    paidAt: null,
    description: 'Najem lokalu – marzec',
    counterpartyName: 'PropCo Nieruchomości',
    counterpartyNip: '1122334455',
    visitId: null,
    ksefInvoiceId: null,
    ksefNumber: null,
    createdBy: 'admin',
    createdAt: yesterday + 'T08:00:00Z',
    updatedAt: yesterday + 'T08:00:00Z',
  },
];

let mockDocumentsStore = [...mockDocuments];
let mockIdCounter = 8;

const mockGetDocuments = async (filters: DocumentListFilters): Promise<FinancialDocumentListResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...mockDocumentsStore];

      if (filters.direction) {
        filtered = filtered.filter((d) => d.direction === filters.direction);
      }
      if (filters.documentType) {
        filtered = filtered.filter((d) => d.documentType === filters.documentType);
      }
      if (filters.status) {
        filtered = filtered.filter((d) => d.status === filters.status);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter((d) => d.issueDate >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter((d) => d.issueDate <= filters.dateTo!);
      }

      filtered.sort((a, b) => b.issueDate.localeCompare(a.issueDate));

      const total = filtered.length;
      const start = (filters.page - 1) * filters.pageSize;
      const paginated = filtered.slice(start, start + filters.pageSize);

      resolve({ documents: paginated, invoices: [], total, invoiceTotal: 0, page: filters.page, pageSize: filters.pageSize });
    }, 250);
  });
};

const mockGetDocument = async (id: string): Promise<FinancialDocument> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const doc = mockDocumentsStore.find((d) => d.id === id);
      if (!doc) reject(new Error('Document not found'));
      else resolve(doc);
    }, 150);
  });
};

const mockCreateDocument = async (data: CreateDocumentRequest): Promise<FinancialDocument> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const id = String(mockIdCounter++);
      const doc: FinancialDocument = {
        id,
        documentNumber: `DOC/2024/${String(mockIdCounter).padStart(3, '0')}`,
        documentType: data.documentType,
        documentTypeLabel:
          data.documentType === 'INVOICE' ? 'Faktura' : data.documentType === 'RECEIPT' ? 'Paragon' : 'Inny',
        direction: data.direction,
        directionLabel: data.direction === 'INCOME' ? 'Przychód' : 'Koszt',
        status: data.paymentMethod === 'TRANSFER' ? DocumentStatus.PENDING : DocumentStatus.PAID,
        statusLabel: data.paymentMethod === 'TRANSFER' ? 'Oczekująca' : 'Opłacona',
        paymentMethod: data.paymentMethod,
        paymentMethodLabel:
          data.paymentMethod === 'CASH' ? 'Gotówka' : data.paymentMethod === 'CARD' ? 'Karta' : 'Przelew',
        totalNet: data.totalNet,
        totalVat: data.totalVat,
        totalGross: data.totalGross,
        currency: data.currency ?? 'PLN',
        issueDate: data.issueDate,
        dueDate: data.dueDate ?? null,
        paidAt: data.paymentMethod !== 'TRANSFER' ? new Date().toISOString() : null,
        description: data.description ?? null,
        counterpartyName: data.counterpartyName ?? null,
        counterpartyNip: data.counterpartyNip ?? null,
        visitId: data.visitId ?? null,
        ksefInvoiceId: null,
        ksefNumber: null,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockDocumentsStore.unshift(doc);
      resolve(doc);
    }, 400);
  });
};

const mockUpdateStatus = async (id: string, status: string): Promise<FinancialDocument> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockDocumentsStore.findIndex((d) => d.id === id);
      if (index === -1) {
        reject(new Error('Document not found'));
        return;
      }
      const statusLabels: Record<string, string> = {
        PAID: 'Opłacona',
        PENDING: 'Oczekująca',
        OVERDUE: 'Przeterminowana',
      };
      mockDocumentsStore[index] = {
        ...mockDocumentsStore[index],
        status,
        statusLabel: statusLabels[status] ?? status,
        paidAt: status === 'PAID' ? new Date().toISOString() : mockDocumentsStore[index].paidAt,
        updatedAt: new Date().toISOString(),
      };
      resolve(mockDocumentsStore[index]);
    }, 200);
  });
};

const mockDeleteDocument = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockDocumentsStore.findIndex((d) => d.id === id);
      if (index === -1) {
        reject(new Error('Document not found'));
        return;
      }
      mockDocumentsStore.splice(index, 1);
      resolve();
    }, 200);
  });
};

// Cash register mock
let mockCashBalance = 230000; // 2300.00 PLN

const mockGetCash = async (): Promise<CashRegister> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'cash-1',
        balance: mockCashBalance,
        currency: 'PLN',
        updatedAt: new Date().toISOString(),
      });
    }, 150);
  });
};

const mockCashHistory: CashOperation[] = [
  {
    id: 'op-1',
    amount: 50000,
    balanceBefore: 180000,
    balanceAfter: 230000,
    operationType: 'DOCUMENT_PAYMENT',
    operationTypeLabel: 'Płatność gotówkowa',
    comment: 'Paragon PAR/2024/002',
    financialDocumentId: '3',
    createdBy: 'admin',
    createdAt: yesterday + 'T15:30:00Z',
  },
  {
    id: 'op-2',
    amount: -30000,
    balanceBefore: 210000,
    balanceAfter: 180000,
    operationType: 'WITHDRAWAL',
    operationTypeLabel: 'Wypłata',
    comment: 'Wypłata do banku',
    financialDocumentId: null,
    createdBy: 'admin',
    createdAt: lastWeek + 'T16:00:00Z',
  },
  {
    id: 'op-3',
    amount: 200000,
    balanceBefore: 10000,
    balanceAfter: 210000,
    operationType: 'OPENING_BALANCE',
    operationTypeLabel: 'Stan początkowy',
    comment: 'Otwarcie kasy – stan początkowy 2000 PLN',
    financialDocumentId: null,
    createdBy: 'admin',
    createdAt: lastMonth + 'T08:00:00Z',
  },
];

const mockGetCashHistory = async (page: number, pageSize: number): Promise<CashHistoryResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = (page - 1) * pageSize;
      const paginated = mockCashHistory.slice(start, start + pageSize);
      resolve({ operations: paginated, total: mockCashHistory.length, page, pageSize });
    }, 200);
  });
};

const mockAdjustCash = async (data: CashAdjustRequest): Promise<CashRegister> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const before = mockCashBalance;
      mockCashBalance += data.amount;
      mockCashHistory.unshift({
        id: `op-${Date.now()}`,
        amount: data.amount,
        balanceBefore: before,
        balanceAfter: mockCashBalance,
        operationType: data.amount >= 0 ? 'MANUAL_DEPOSIT' : 'WITHDRAWAL',
        operationTypeLabel: data.amount >= 0 ? 'Wpłata ręczna' : 'Wypłata ręczna',
        comment: data.comment,
        financialDocumentId: null,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
      });
      resolve({ id: 'cash-1', balance: mockCashBalance, currency: 'PLN', updatedAt: new Date().toISOString() });
    }, 300);
  });
};

const mockGetSummary = async (dateFrom?: string, dateTo?: string): Promise<FinanceSummary> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let docs = [...mockDocumentsStore];
      if (dateFrom) docs = docs.filter((d) => d.issueDate >= dateFrom);
      if (dateTo) docs = docs.filter((d) => d.issueDate <= dateTo);

      const income = docs.filter((d) => d.direction === 'INCOME');
      const expense = docs.filter((d) => d.direction === 'EXPENSE');

      const totalRevenue = income.filter((d) => d.status === 'PAID').reduce((s, d) => s + d.totalGross, 0);
      const totalCosts = expense.filter((d) => d.status === 'PAID').reduce((s, d) => s + d.totalGross, 0);
      const pendingReceivables = income.filter((d) => d.status === 'PENDING').reduce((s, d) => s + d.totalGross, 0);
      const pendingPayables = expense.filter((d) => d.status === 'PENDING').reduce((s, d) => s + d.totalGross, 0);
      const overdueReceivables = income.filter((d) => d.status === 'OVERDUE').length;
      const overduePayables = expense.filter((d) => d.status === 'OVERDUE').length;

      resolve({
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        totalRevenue,
        totalCosts,
        profit: totalRevenue - totalCosts,
        pendingReceivables,
        pendingPayables,
        overdueReceivables,
        overduePayables,
      });
    }, 200);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export const financeApi = {
  getDocuments: async (filters: DocumentListFilters): Promise<FinancialDocumentListResponse> => {
    if (USE_MOCKS) return mockGetDocuments(filters);

    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.pageSize),
    });
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.documentType) params.append('documentType', filters.documentType);
    if (filters.status) params.append('status', filters.status);
    if (filters.visitId) params.append('visitId', filters.visitId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await apiClient.get(`${BASE_PATH}/documents?${params}`);
    return response.data;
  },

  getDocument: async (id: string): Promise<FinancialDocument> => {
    if (USE_MOCKS) return mockGetDocument(id);

    const response = await apiClient.get(`${BASE_PATH}/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateDocumentRequest): Promise<FinancialDocument> => {
    if (USE_MOCKS) return mockCreateDocument(data);

    const response = await apiClient.post(`${BASE_PATH}/documents`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<FinancialDocument> => {
    if (USE_MOCKS) return mockUpdateStatus(id, status);

    const response = await apiClient.patch(`${BASE_PATH}/documents/${id}/status`, { status });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    if (USE_MOCKS) return mockDeleteDocument(id);

    await apiClient.delete(`${BASE_PATH}/documents/${id}`);
  },

  getCashRegister: async (): Promise<CashRegister> => {
    if (USE_MOCKS) return mockGetCash();

    const response = await apiClient.get(`${BASE_PATH}/cash`);
    return response.data;
  },

  getCashHistory: async (page: number, pageSize: number): Promise<CashHistoryResponse> => {
    if (USE_MOCKS) return mockGetCashHistory(page, pageSize);

    const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
    const response = await apiClient.get(`${BASE_PATH}/cash/history?${params}`);
    return response.data;
  },

  adjustCash: async (data: CashAdjustRequest): Promise<CashRegister> => {
    if (USE_MOCKS) return mockAdjustCash(data);

    const response = await apiClient.post(`${BASE_PATH}/cash/adjust`, data);
    return response.data;
  },

  getSummary: async (dateFrom?: string, dateTo?: string): Promise<FinanceSummary> => {
    if (USE_MOCKS) return mockGetSummary(dateFrom, dateTo);

    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const qs = params.toString();
    const response = await apiClient.get(`${BASE_PATH}/summary${qs ? '?' + qs : ''}`);
    return response.data;
  },
};
