/* Punkt uszkodzenia jest wspólnym typem przyjęcia i wizyty: mapę rysuje ten sam
   edytor, więc drugi, „prawie taki sam" typ byłby tylko okazją do rozjechania się. */
// Import z pliku typów, nie z barrel-a: barrel checkinu ciągnie widoki, a te
// wizyty — import typu nie może zawiązać cyklu modułów.
import type { DamagePoint } from '@/modules/checkin/types';

export type { DamagePoint };

export type VisitStatus = 'DRAFT' | 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED';

export interface DoorToDoorAddress {
    city: string;
    street: string;
}

export interface DoorToDoorInfo {
    enabled: boolean;
    pickupAddress: DoorToDoorAddress;
    deliveryAddress: DoorToDoorAddress;
    notes: string;
    /** Kierowca; `driverName` to migawka nazwiska z chwili przypisania. */
    driverId?: string | null;
    driverName?: string | null;
    /**
     * Termin dostarczenia. Z API przychodzi jako instant UTC
     * (`2026-09-23T18:15:00Z`), w formularzu żyje jako czas ścienny
     * (`2026-09-23T20:15`) - konwersję robią `instantToLocalDateTime`
     * i `localDateTimeToInstant` na granicy okna i API.
     */
    scheduledAt?: string | null;
}

export type DocumentType = 'PHOTO' | 'PDF' | 'PROTOCOL' | 'INTAKE' | 'OUTTAKE' | 'DAMAGE_MAP' | 'OTHER';

export type CommentType = 'INTERNAL' | 'FOR_CUSTOMER';

export type ServiceStatus = 'CONFIRMED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CommentRevision {
    id: string;
    commentId: string;
    oldContent: string;
    newContent: string;
    changedBy: string;
    changedByName: string;
    changedAt: string;
}

export interface VisitComment {
    id: string;
    visitId: string;
    type: CommentType;
    content: string;
    isDeleted: boolean;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedBy?: string;
    updatedByName?: string;
    updatedAt?: string;
    deletedBy?: string;
    deletedByName?: string;
    deletedAt?: string;
    revisions: CommentRevision[];
}

export interface MoneyAmount {
    netAmount: number;
    grossAmount: number;
    currency: string;
}

export interface PackageItemSnapshot {
    serviceId: string;
    serviceName: string;
    position: number;
}

export interface ServiceLineItem {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: number | null;
    vatRate: number | null;
    requireManualPrice: boolean;
    adjustment: {
        type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
        value: number;
    } | null;
    note: string;
    finalPriceNet: number | null;
    finalPriceGross: number | null;
    status: ServiceStatus;
    isPackage?: boolean;
    packageItems?: PackageItemSnapshot[] | null;
    // New approval workflow fields (optional for backward compatibility)
    pendingOperation?: 'ADD' | 'EDIT' | 'DELETE' | null;
    hasPendingChange?: boolean;
    previousPriceNet?: number | null;
    previousPriceGross?: number | null;
    /**
     * Dokładne brutto ceny bazowej - wpisane od strony brutto albo z cennika; null = nikt
     * go nie ustalił (cena od netta, pozycje sprzed V151) i wolno je policzyć z netta.
     * Edytor ceny wypełnia pole brutto TĄ kwotą - netto × stawka dałoby 1900,01 zamiast 1900,00.
     */
    basePriceGross?: number | null;
}

export interface VehicleInfo {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    color: string;
    currentMileage?: number;
}

export interface CustomerCompanyAddress {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
}

export interface CustomerInfo {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyName?: string;
    /** NIP z kartoteki: wypełnia nabywcę faktury przy wydaniu pojazdu. */
    companyNip?: string | null;
    companyAddress?: CustomerCompanyAddress | null;
    stats: {
        totalVisits: number;
        totalSpent: MoneyAmount;
        vehiclesCount: number;
    };
}

export interface VisitDocument {
    id: string;
    visitId: string;
    customerId: string;
    type: DocumentType;
    name: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    category?: string;
}

export interface Visit {
    id: string;
    title: string;
    visitNumber: string;
    status: VisitStatus;
    scheduledDate: string;
    estimatedCompletionDate?: string;
    completedDate?: string;
    vehicle: VehicleInfo;
    customer: CustomerInfo;
    services: ServiceLineItem[];
    totalCost: MoneyAmount | null;
    mileageAtArrival?: number;
    keysHandedOver: boolean;
    documentsHandedOver: boolean;
    vehicleHandoff?: {
        isHandedOffByOtherPerson: boolean;
        contactPerson: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
        };
    };
    technicalNotes?: string;
    colorId: string;
    doorToDoor?: DoorToDoorInfo;
    /** Imię i nazwisko pracownika, który przyjął pojazd (utworzył wizytę) */
    acceptedByName?: string;
    /** Czym wizyta została rozliczona; brak = wizyta jeszcze nierozliczona. */
    settlement?: VisitSettlement | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Rozliczenie wizyty widziane od strony dokumentów.
 *
 * Pola są niezależne: dokument finansowy typu INVOICE może istnieć bez rekordu
 * KSeF (adnotacja bez wysyłki), więc podgląd faktury otwieramy wyłącznie wtedy,
 * gdy jest [revenueInvoiceId] - samo `documentType === 'INVOICE'` nie wystarcza.
 */
export interface VisitSettlement {
    documentType: 'INVOICE' | 'RECEIPT' | 'OTHER' | null;
    revenueInvoiceId: string | null;
}

export interface VisitDetailResponse {
    visit: Visit;
    documents?: VisitDocument[];
}

/** „Stan przy przyjęciu" — każde pole opcjonalne, pominięte zostaje bez zmian. */
export interface UpdateArrivalStatePayload {
    mileageAtArrival?: number;
    keysHandedOver?: boolean;
    documentsHandedOver?: boolean;
}

export interface UpdateVisitPayload {
    status?: VisitStatus;
    mileageAtArrival?: number;
    keysHandedOver?: boolean;
    documentsHandedOver?: boolean;
    technicalNotes?: string;
    doorToDoor?: DoorToDoorInfo;
}

export interface TechnicalNoteHistoryEntry {
    id: string;
    content: string | null;
    action: 'CREATED' | 'UPDATED' | 'CLEARED';
    changedById: string;
    changedByName: string;
    changedAt: string;
}

export interface TechnicalNoteHistoryResponse {
    entries: TechnicalNoteHistoryEntry[];
}

export interface UploadDocumentPayload {
    visitId: string;
    customerId?: string;
    file: File;
    type: DocumentType;
    category?: string;
}

export interface UploadPhotoPayload {
    visitId: string;
    file: File;
    description?: string;
}

export interface UploadPhotoResponse {
    photoId: string;
    uploadUrl: string;
    fileId: string;
}

export interface AddCommentPayload {
    type: CommentType;
    content: string;
}

export interface UpdateCommentPayload {
    content: string;
}

export interface GetCommentsResponse {
    comments: VisitComment[];
}

export interface AddCommentResponse {
    commentId: string;
}

export interface UpdateCommentResponse {
    commentId: string;
    wasChanged: boolean;
}

export interface DeleteCommentResponse {
    commentId: string;
    wasDeleted: boolean;
}

// Service management types
export interface AddServicePayload {
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustment?: {
        type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
        value: number;
    };
    note?: string;
    notifyCustomer?: boolean;
}

export interface UpdateServicePayload {
    basePriceNet?: number;
    vatRate?: number;
    adjustment?: {
        type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
        value: number;
    };
    note?: string;
    notifyCustomer?: boolean;
}

export interface DeleteServicePayload {
    notifyCustomer?: boolean;
}

export interface UpdateServiceStatusPayload {
    status: ServiceStatus;
}

// Batch services changes
export interface ServicesChangesPayload {
    notifyCustomer: boolean;
    requireConfirmation: boolean;
    added: Array<{
        serviceId: string | null;
        serviceName: string;
        basePriceNet: number;
        vatRate: number;
        adjustment?: {
            type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
            value: number;
        };
        note?: string;
        /**
         * Dokładne brutto ceny bazowej, gdy użytkownik wpisał ją od strony brutto. Bez niego
         * serwer liczy brutto z netta (1900,00 → 1900,01) - chyba że to usługa z cennika po
         * cenie z cennika: wtedy bierze brutto z katalogu sam. Serwer odrzuca (400) brutto
         * różniące się od netto × stawka o więcej niż 1 gr.
         */
        basePriceGross?: number;
    }>;
    updated: Array<{
        serviceLineItemId: string;
        basePriceNet: number;
        vatRate: number;
        adjustment: {
            type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
            value: number;
        };
        /**
         * Dokładne brutto nowej ceny bazowej - jak przy `added`. Bez niego serwer zachowuje
         * zapisane brutto tylko wtedy, gdy ani cena bazowa, ani stawka się nie zmieniły.
         */
        basePriceGross?: number;
    }>;
    deleted: Array<{
        serviceLineItemId: string;
    }>;
    /**
     * Treść SMS-a zatwierdzona przez użytkownika w modalu przed zapisem.
     * Fraza z prośbą o odpowiedź „TAK" jest doklejana przez backend i nie jest częścią tego pola.
     */
    smsMessage?: string;
    /** true = SMS z polskimi znakami (UCS-2, drożej). Domyślnie transliterujemy na ASCII. */
    smsUsePolishCharacters?: boolean;
}

// Visit Photos (from check-in)
export interface VisitPhoto {
    id: string;
    fileName: string;
    description?: string;
    uploadedAt: string;
    thumbnailUrl: string;  // Presigned URL (valid for 10 min)
    fullSizeUrl: string;   // Presigned URL (valid for 10 min)
    tags?: string[];       // User-assigned tags
}

export interface VisitPhotosResponse {
    photos: VisitPhoto[];
}

export interface ConfirmVisitEmailOptions {
    attachProtocol?: boolean;
    attachPhotos?: boolean;
    photoIds?: string[];
    attachDamageMap?: boolean;
}

export interface ConfirmVisitOptions {
    sendSms?: boolean;
    sendEmail?: boolean;
    emailOptions?: ConfirmVisitEmailOptions;
    /** „Wyślij Kartę Wizyty" z okna Dokumentacja i Podpisy. Backend wysyła kartę tylko, gdy true. */
    sendVisitCard?: boolean;
}

/** Wynik wysyłki Karty Wizyty zleconej razem z potwierdzeniem; null, gdy nie zlecono. */
export interface ConfirmVisitCardResult {
    emailSent: boolean;
    smsSent: boolean;
    message: string;
}

export interface ConfirmVisitResponse {
    visitId: string;
    message: string;
    visitCard: ConfirmVisitCardResult | null;
}

// ─── Mapa uszkodzeń ───────────────────────────────────────────────────────────

/**
 * Co zrobić z dotychczasowym PDF-em mapy, gdy w trakcie wizyty dorysowano punkty.
 *
 * To nie jest wybór wizualny, tylko decyzja o dowodzie: mapa z przyjęcia bywa
 * podpisana przez klienta i wysłana mailem.
 */
export type DamageMapUpdateMode =
    /** Nowy plik obok dotychczasowego. Mapa z przyjęcia zostaje nietknięta. */
    | 'NEW_FILE'
    /** Nadpisanie aktualnego pliku. W galerii zostaje jedna, aktualna mapa. */
    | 'REPLACE_EXISTING';

export interface VisitDamageMapResponse {
    damagePoints: DamagePoint[];
    vehicleType: string | null;
    /** 0 = mapy nigdy nie zapisano w postaci punktów. */
    revision: number;
    /** Czy wizyta ma w ogóle wygenerowany PDF mapy. */
    hasDocument: boolean;
    /**
     * false = punktów nie da się odtworzyć (wizyta sprzed wprowadzenia zapisu
     * punktów — został tylko PDF). UI musi wtedy ostrzec, że edycja startuje z
     * pustej mapy, zanim ktokolwiek zacznie klikać.
     */
    pointsRecoverable: boolean;
    updatedAt: string | null;
    updatedByName: string | null;
}

// ─── Telefon jako narzędzie do mapy uszkodzeń ─────────────────────────────────

export interface StartDamageMapMobileSessionPayload {
    /** Punkty z otwartego edytora — telefon startuje od nich, nie od pustej mapy. */
    damagePoints: DamagePoint[];
    vehicleType?: string;
    /** true unieważnia poprzedni kod QR. */
    rotate?: boolean;
}

export interface DamageMapMobileTokenResponse {
    token: string;
    /** Identyfikator sesji mobilnej — dla wizyty jest nim jej własne id. */
    checkinId: string;
    expiresAt: string;
    uploadEndpoint: string;
}

export interface DamageMapMobileSessionResponse {
    /** false = nie ma sesji ani zapisanych punktów; to nie błąd. */
    active: boolean;
    /**
     * Punkty gotowe do wstawienia w edytor: identyfikatory zdjęć są już
     * identyfikatorami zdjęć WIZYTY, a miniatury mają podpisane adresy. Tłumaczeniem
     * zajmuje się serwer — po stronie okna nie ma żadnej tablicy mapowań.
     */
    damagePoints: DamagePoint[];
    vehicleType: string | null;
    savedAt: string | null;
}

export interface UpdateDamageMapPayload {
    damagePoints: DamagePoint[];
    vehicleType?: string;
    mode: DamageMapUpdateMode;
    /** „Poinformuj klienta o zmianach" — TAK/NIE z ostatniego kroku. */
    notifyCustomer: boolean;
    /** Treść wpisana przez operatora; pominięta = tekst domyślny z backendu. */
    notifyMessage?: string;
}

export interface DamageMapNotificationResult {
    emailSent: boolean;
    smsSent: boolean;
    message: string;
}

export interface UpdateDamageMapResponse {
    revision: number;
    pointsCount: number;
    documentId: string | null;
    fileName: string | null;
    documentGenerated: boolean;
    /** null, gdy operator wybrał „nie informuj". */
    notification: DamageMapNotificationResult | null;
}

// ─── Communication History ────────────────────────────────────────────────────

export type { CommunicationChannel, CommunicationStatus, CommunicationEntry } from '@/common/types/communication';

export interface VisitCommunicationResponse {
    visitId: string;
    entries: CommunicationEntry[];
}

// ─── Nieukończone przyjęcia (wizyty w statusie DRAFT) ─────────────────────────

/**
 * Przyjęcie pojazdu, które zostało zapisane, ale nie zostało dokończone: wizyta
 * istnieje w bazie, lecz się nie rozpoczęła.
 *
 * To NIE jest wizyta, którą można otworzyć - szczegóły wizyty odpowiadają na taki
 * rekord 404 (`VISIT_NOT_STARTED`). Jedyne, co można z nim zrobić, to dokończyć
 * przyjęcie albo je anulować, i po to jest ten typ.
 */
export interface OpenDraftVisit {
    visitId: string;
    visitNumber: string;
    title: string | null;
    appointmentId: string;
    customerId: string;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    vehicleId: string;
    vehicleName: string;
    licensePlate: string | null;
    createdAt: string;
    createdByName: string | null;
    /** Ile minut wisi otwarte. */
    ageMinutes: number;
    /** Wisi na tyle długo, że w kolejce ma być wyróżnione. */
    stale: boolean;
    /** Kiedy wygaśnie automatycznie; null, gdy sprzątanie jest wyłączone. */
    expiresAt: string | null;
    /** Domyślne załączniki wiadomości do klienta przy dokończeniu przyjęcia. */
    hasPhotos: boolean;
    hasDamageMap: boolean;
}

export interface OpenDraftVisitListResponse {
    drafts: OpenDraftVisit[];
    total: number;
}
