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
    /** Usługi wizyty, które obejmuje pozycja (scalenie = kilka usług tej samej stawki). */
    sourceServiceItemIds?: string[];
}

/**
 * Zmiana ceny przy wydaniu: nowa cena i stawka usługi, które osoba wydająca auto zmieniła
 * na końcu. Trafia do wizyty, więc widzą ją statystyki.
 */
/** Pozycja dopisana na fakturze przy wydaniu - backend zakłada z niej usługę wizyty. */
export interface HandoverAddedServicePayload {
    /** Identyfikator nowej usługi; wskazują na niego pozycje faktury (sourceServiceItemIds). */
    id: string;
    name: string;
    netCents: number;
    /** Brutto tylko przy cenie ustalonej od strony brutto (CLAUDE.md §1). */
    grossCents: number | null;
    vatRate: number;
}

export interface HandoverPriceChangePayload {
    serviceItemId: string;
    /** Netto w groszach. */
    netCents: number;
    /** Brutto w groszach - tylko przy cenie ustalonej od brutto (CLAUDE.md §1). */
    grossCents: number | null;
    /** 23 | 8 | 5 | 0 | -1 (zw.) */
    vatRate: number;
}

/**
 * Faktura KSeF przy wydaniu pojazdu. Pozycje wskazują usługi, które obejmują
 * (sourceServiceItemIds). Przy podziale „faktura + inny dokument” reszta kwoty idzie
 * zapisem bez paragonu i bez VAT, gotówką (remainderWithoutReceipt + CASH).
 */
export interface CompleteInvoicePayload {
    items: CompleteInvoiceItemPayload[];
    buyerNip?: string;
    buyerName?: string;
    buyerAddressLine1?: string;
    buyerAddressLine2?: string;
    buyerEmail?: string;
    remainderPaymentMethod?: PaymentMethod;
    /** Reszta bez paragonu i bez VAT (zapis „inny”, VAT 0). Pominięte = paragon. */
    remainderWithoutReceipt?: boolean;
    /** Kwota zapisu bez paragonu pokazana na ekranie (grosze); backend sprawdza ją z cenami wizyty. */
    remainderAmount?: number;
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
    /** Zmienione ceny usług (podwyżka, rabat, stawka VAT); pusta lista = bez zmian. */
    priceChanges?: HandoverPriceChangePayload[];
    /** Pozycje dopisane na fakturze przy wydaniu. */
    addedServices?: HandoverAddedServicePayload[];
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
    /**
     * „Faktury wystawia księgowość": faktury w CRM nie ma, wystawi ją księgowość.
     */
    invoicedExternally?: boolean;
    /** Kwota wizyty po wydaniu (po zmianach cen przy wydaniu), w groszach. */
    totalGross?: number | null;
    /** Kwota wizyty przed zmianami cen przy wydaniu. */
    totalGrossBeforeHandover?: number | null;
    /** Brutto faktury, gdy wydanie wystawiło fakturę z pozycjami. */
    invoiceGross?: number | null;
    /** Forma płatności głównego dokumentu. */
    paymentMethod?: PaymentMethod | null;
    /** Brutto drugiego dokumentu (reszta poza fakturą); null bez podziału. */
    remainderGross?: number | null;
    remainderPaymentMethod?: PaymentMethod | null;
    remainderWithoutReceipt?: boolean;
}
