export type TransitionType = 'in_progress_to_ready' | 'ready_to_completed';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'BLIK_NA_NUMER' | 'BLIK_TERMINAL' | 'OTHER';
export type InvoiceType = 'INVOICE' | 'RECEIPT' | 'other';

export interface QualityCheckItem {
    id: string;
    label: string;
    checked: boolean;
}

export interface NotificationChannels {
    sms: boolean;
    email: boolean;
}

export interface PaymentDetails {
    method: PaymentMethod;
    invoiceType: InvoiceType;
    amount: number;
    /** Termin płatności (ISO date) — wymagany przy TRANSFER z fakturą KSeF. */
    dueDate?: string;
}

/**
 * Pozycja faktury KSeF — kwoty w groszach. Dokładnie jedno z pól
 * unitPriceNet/unitPriceGross: kwota wpisana przez użytkownika jest źródłem
 * prawdy i nie jest przeliczana wstecz (brutto 500,00 zostaje 500,00).
 */
export interface CompleteInvoiceItemPayload {
    name: string;
    quantity?: number;
    unitPriceNet?: number;
    unitPriceGross?: number;
    /** 23 | 8 | 5 | 0 | zw */
    vatRate?: string;
}

/**
 * Konfiguracja faktury KSeF przy zakończeniu wizyty (modal „Wprowadź zmiany").
 * Gdy suma pozycji jest niższa niż kwota wizyty, wymagane remainderPaymentMethod —
 * reszta zostaje udokumentowana paragonem (drugim dokumentem przychodowym).
 */
export interface CompleteInvoicePayload {
    items: CompleteInvoiceItemPayload[];
    buyerNip?: string;
    buyerName?: string;
    buyerAddressLine1?: string;
    buyerAddressLine2?: string;
    buyerEmail?: string;
    remainderPaymentMethod?: PaymentMethod;
    exemptionLegalBasis?: string;
}

export interface TransitionToReadyPayload {
    sms: boolean;
    email: boolean;
}

export interface TransitionToCompletedPayload {
    signatureObtained: boolean;
    payment: PaymentDetails;
    invoice?: CompleteInvoicePayload;
}

export interface CompleteVisitResponse {
    visitId: string;
    newStatus: string;
    message: string;
    financialDocumentId: string | null;
    financialDocumentNumber: string | null;
    ksefInvoiceId?: string | null;
    ksefInvoiceNumber?: string | null;
    ksefStatus?: string | null;
    remainderDocumentNumber?: string | null;
    /** Powód odrzucenia przez KSeF — obecny tylko przy ksefStatus === 'REJECTED'. */
    ksefError?: string | null;
}

export interface SendNotificationPayload {
    visitId: string;
    channels: {
        sms: boolean;
        email: boolean;
    };
}

export interface SendNotificationResponse {
    sent: {
        sms: boolean;
        email: boolean;
    };
    failed: string[];
}