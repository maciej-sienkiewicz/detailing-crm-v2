// src/modules/visits/api/settlementApi.ts
//
// Poprawka rozliczenia wizyty wydanej: stan, podgląd skutków (bez zmian w danych)
// i wykonanie. Kwoty w groszach.

import { apiClient } from '@/core';
import type { PaymentMethod } from '../types/stateTransitions';

export type SettlementDocumentType = 'RECEIPT' | 'INVOICE' | 'OTHER';

export interface SettlementService {
    id: string;
    name: string;
    /** 23 | 8 | 5 | 0 | -1 (zw.) */
    vatRate: number;
    netCents: number;
    grossCents: number;
    /** Brutto ustalone przez człowieka — w formularzu jest stroną wpisaną. */
    grossTyped: boolean;
}

export interface SettlementDocument {
    id: string;
    number: string;
    type: string;
    typeLabel: string;
    paymentMethod: string;
    paymentMethodLabel: string;
    totalGross: number;
    status: string;
    issueDate: string;
    active: boolean;
    superseded: boolean;
    ksefInvoiceId: string | null;
    /** Fakturę do tego dokumentu wystawia księgowość; sam dokument jest zapisem płatności. */
    invoicedExternally?: boolean;
}

export interface SettlementInvoice {
    id: string;
    number: string;
    ksefNumber: string | null;
    type: 'VAT' | 'KOR';
    status: string;
    invoiceToReceipt: boolean;
    totalGross: number;
    active: boolean;
    buyerNip: string | null;
    buyerName: string | null;
}

export interface SettlementBuyer {
    nip?: string | null;
    name?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    email?: string | null;
}

export interface SettlementHistoryEntry {
    id: string;
    createdAt: string;
    createdByName: string | null;
    reason: string | null;
    totalGrossBefore: number;
    totalGrossAfter: number;
    paymentMethodBefore: string | null;
    paymentMethodAfter: string;
    documentTypeBefore: string | null;
    documentTypeAfter: string;
    ksefAction: string;
    ksefError: string | null;
    steps: string[];
}

export interface SettlementView {
    visitId: string;
    visitStatus: string;
    totalNet: number;
    totalGross: number;
    documentType: SettlementDocumentType | null;
    paymentMethod: PaymentMethod | null;
    buyer: SettlementBuyer | null;
    services: SettlementService[];
    documents: SettlementDocument[];
    invoices: SettlementInvoice[];
    /** Tryb studia: faktura w poprawce trafia do księgowości, CRM jej nie wystawia. */
    invoicesIssuedExternally?: boolean;
    history: SettlementHistoryEntry[];
}

export interface SettlementServiceLine {
    serviceLineItemId: string;
    netCents: number;
    /** Tylko gdy cenę wpisano od strony brutto (CLAUDE.md §1). */
    grossCents: number | null;
    vatRate: number;
}

export interface SettlementCorrectionRequest {
    services: SettlementServiceLine[];
    documentType: SettlementDocumentType;
    paymentMethod: PaymentMethod;
    dueDate?: string | null;
    buyer?: SettlementBuyer | null;
    exemptionLegalBasis?: string | null;
    reason?: string | null;
}

export interface SettlementPreview {
    steps: string[];
    blockReason: string | null;
    totalGrossBefore: number;
    totalGrossAfter: number;
    /** + klient dopłaca, − zwrot. */
    customerDifference: number;
    cashDelta: number;
}

export interface SettlementCorrectionResult {
    correctionId: string;
    steps: string[];
    ksefError: string | null;
}

const base = (visitId: string) => `/visits/${visitId}/settlement`;

export const settlementApi = {
    get: async (visitId: string): Promise<SettlementView> =>
        (await apiClient.get<SettlementView>(base(visitId))).data,

    preview: async (visitId: string, request: SettlementCorrectionRequest): Promise<SettlementPreview> =>
        (await apiClient.post<SettlementPreview>(`${base(visitId)}/preview`, request)).data,

    correct: async (visitId: string, request: SettlementCorrectionRequest): Promise<SettlementCorrectionResult> =>
        (await apiClient.post<SettlementCorrectionResult>(`${base(visitId)}/corrections`, request)).data,
};
