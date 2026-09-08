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
    /** Termin płatności (ISO date), wymagany przy TRANSFER z fakturą KSeF. */
    dueDate?: string;
}

/**
 * Pozycja faktury KSeF: kwoty w groszach. Dokładnie jedno z pól
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
 * Gdy suma pozycji jest niższa niż kwota wizyty, wymagane remainderPaymentMethod:
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
    /**
     * Czy fakturę wysłać do KSeF od razu po wystawieniu. Pominięcie pola oznacza
     * „użyj domyślnej odpowiedzi studia" (Ustawienia → Faktury), nie „wyślij".
     */
    sendToKsef?: boolean;
}

export interface TransitionToReadyPayload {
    sms: boolean;
    email: boolean;
}

/**
 * Decyzja z pola „Wyślij SMS-a z podziękowaniem".
 *
 * Pominięcie całego obiektu znaczy „nie było takiego wyboru" (studio ma wyłączony
 * szablon podziękowania), a nie „nie wysyłaj": o wysyłce decyduje wtedy wyłącznie
 * automatyka z ustawień. `send: false` to już świadoma odmowa i ona automat wycisza.
 */
export interface ThankYouSmsPayload {
    send: boolean;
    /** ISO 8601 (UTC). Backend dociąga termin do dozwolonych godzin wysyłki. */
    scheduledAt?: string;
}

export interface TransitionToCompletedPayload {
    signatureObtained: boolean;
    payment: PaymentDetails;
    invoice?: CompleteInvoicePayload;
    thankYouSms?: ThankYouSmsPayload;
}

/**
 * Odpowiedź endpointów zmiany statusu wizyty.
 *
 * `alreadyInTargetState` = wizyta była już w tym stanie i żądanie niczego nie zmieniło.
 * To NIE jest błąd (kod 200): cel został osiągnięty, tylko wcześniej i przez kogoś
 * innego. Backend pomija wtedy efekty uboczne — klient nie dostaje drugiego SMS-a,
 * a księgowość drugiego dokumentu.
 */
export interface VisitStatusChangeResponse {
    visitId: string;
    newStatus: string;
    message: string;
    alreadyInTargetState?: boolean;
}

export interface CompleteVisitResponse {
    visitId: string;
    newStatus: string;
    message: string;
    alreadyInTargetState?: boolean;
    financialDocumentId: string | null;
    financialDocumentNumber: string | null;
    ksefInvoiceId?: string | null;
    ksefInvoiceNumber?: string | null;
    ksefStatus?: string | null;
    remainderDocumentNumber?: string | null;
    /** Powód odrzucenia przez KSeF, obecny tylko przy ksefStatus === 'REJECTED'. */
    ksefError?: string | null;
}
