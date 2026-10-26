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
    /** Reszta przy „Faktura + inny dokument”: bez VAT, kwota to netto (typeLabel „Inny dokument”). */
    withoutReceipt?: boolean;
    /** Usługi rozliczone tym dokumentem (alokacja usługa × dokument). */
    services?: Array<{ serviceLineItemId: string; name: string; grossCents: number }>;
}

export interface SettlementInvoice {
    id: string;
    number: string;
    ksefNumber: string | null;
    type: 'VAT' | 'KOR';
    status: string;
    /** Korekta: id faktury, którą koryguje. Starszy serwer go nie podaje. */
    originalInvoiceId?: string | null;
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
    /** Podstawa zwolnienia z VAT z obowiązującej faktury - poprawka ją powtarza. */
    exemptionLegalBasis?: string | null;
    /** Termin płatności obowiązującej faktury (YYYY-MM-DD). */
    paymentDueDate?: string | null;
    /**
     * Faktura + drugi dokument z zapisanym podziałem: poprawka działa per dokument -
     * zmiana ceny usługi koryguje dokument tej usługi, każdy dokument ma swoją formę płatności.
     */
    perDocument?: boolean;
    /**
     * Zlecenie zbiorcze: wizyta jest na liście kontrahenta i nie ma dokumentów. Poprawka
     * zmienia wtedy tylko ceny - w wizycie i na aucie z listy; null = rozliczenie przy wydaniu.
     */
    batch?: SettlementBatch | null;
}

export interface SettlementBatch {
    entryId: string;
    contractorId: string;
    contractorName: string | null;
    /** Auto jest już w zestawieniu - poprawka zrobi z niego korektę do następnego. */
    settled: boolean;
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
    /** Wizyta z podziałem: forma płatności każdego dokumentu (id dokumentu → forma). */
    documentPaymentMethods?: Record<string, PaymentMethod>;
}

/** Co poprawka zrobi z fakturą w KSeF (SettlementKsefAction w backendzie). */
export type SettlementKsefAction =
    | 'NONE' | 'KEEP' | 'CANCEL_AND_REISSUE' | 'CANCEL' | 'CORRECT_AND_REISSUE' | 'CORRECT' | 'CORRECT_DIFFERENCE'
    | 'ISSUE' | 'INVOICE_TO_RECEIPT' | 'EXTERNAL_INVOICE' | 'EXTERNAL_INVOICE_TO_RECEIPT';

export interface SettlementPreview {
    steps: string[];
    blockReason: string | null;
    totalGrossBefore: number;
    totalGrossAfter: number;
    /** + klient dopłaca, − zwrot. */
    customerDifference: number;
    cashDelta: number;
    /** Starszy serwer go nie podaje - wtedy okno nie pokazuje wiersza o fakturze. */
    ksefAction?: SettlementKsefAction;
}

export interface SettlementCorrectionResult {
    correctionId: string;
    steps: string[];
    ksefError: string | null;
}

const base = (visitId: string) => `/v1/visits/${visitId}/settlement`;

export const settlementApi = {
    get: async (visitId: string): Promise<SettlementView> =>
        (await apiClient.get<SettlementView>(base(visitId))).data,

    preview: async (visitId: string, request: SettlementCorrectionRequest): Promise<SettlementPreview> =>
        (await apiClient.post<SettlementPreview>(`${base(visitId)}/preview`, request)).data,

    correct: async (visitId: string, request: SettlementCorrectionRequest): Promise<SettlementCorrectionResult> =>
        (await apiClient.post<SettlementCorrectionResult>(`${base(visitId)}/corrections`, request)).data,
};
