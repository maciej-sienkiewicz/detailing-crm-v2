// src/modules/visit-card/types.ts
// Types mirroring backend pl.detailing.crm.visitcard.VisitCardDtos

export type VisitCardStatus =
    | 'RESERVATION'
    | 'DRAFT'
    | 'IN_PROGRESS'
    | 'READY_FOR_PICKUP'
    | 'COMPLETED'
    | 'REJECTED'
    | 'ARCHIVED';

export interface VisitCardReservation {
    scheduledDate: string;
    estimatedCompletionDate: string | null;
}

export interface VisitCardVehicle {
    brand: string;
    model: string;
    licensePlate: string | null;
    yearOfProduction: number | null;
    color: string | null;
}

export interface VisitCardCustomer {
    firstName: string | null;
    lastName: string | null;
}

export interface VisitCardCompany {
    name: string;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
}

export interface VisitCardServiceLine {
    name: string;
    note: string | null;
    priceGross: number; // grosz
    priceNet: number;   // grosz
}

export interface VisitCardTotals {
    totalNet: number;
    totalGross: number;
    /** Total discount applied across all service lines; 0 when no discounts were given. */
    totalDiscountGross: number;
    currency: string;
}

export interface VisitCardSignedDocument {
    name: string;
    signedAt: string | null;
    downloadUrl: string | null;
}

export interface VisitCardPhoto {
    url: string;
    description: string | null;
    uploadedAt: string;
}

export interface VisitCardInProgress {
    admissionDate: string;
    signedConsents: VisitCardSignedDocument[];
    photos: VisitCardPhoto[];
    damageMapUrl: string | null;
}

export interface VisitCardDocument {
    name: string;
    fileName: string;
    downloadUrl: string | null;
    uploadedAt: string;
}

export type VisitCardPaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface VisitCardCompletion {
    readyForPickupDate: string | null;
    pickupDate: string | null;
    documents: VisitCardDocument[];
    paymentStatus: VisitCardPaymentStatus | null;
}

// ── Upselling (suggested additional services) ──

export type UpsellSuggestionStatus = 'SUGGESTED' | 'REQUESTED' | 'CONFIRMED';

export interface UpsellPackageItemDto {
    name: string;
}

/** Customer-facing suggestion shown on the public card. */
export interface VisitCardUpsellSuggestion {
    id: string;
    name: string;
    note: string | null;
    priceNet: number;   // grosz
    priceGross: number; // grosz
    /** Gross price before the discount; null when no discount. */
    originalPriceGross: number | null;
    status: UpsellSuggestionStatus;
    isPackage: boolean;
    packageItems: UpsellPackageItemDto[] | null;
}

export interface RequestUpsellResponse {
    smsSent: boolean;
    message: string;
    suggestions: VisitCardUpsellSuggestion[];
}

export interface VisitCard {
    visitNumber: string;
    title: string | null;
    status: VisitCardStatus;
    reservation: VisitCardReservation;
    /** Null for reservations without an assigned vehicle. */
    vehicle: VisitCardVehicle | null;
    customer: VisitCardCustomer;
    company: VisitCardCompany;
    services: VisitCardServiceLine[];
    totals: VisitCardTotals;
    inProgress: VisitCardInProgress | null;
    completion: VisitCardCompletion | null;
    upsellSuggestions: VisitCardUpsellSuggestion[];
}

// Employee-side (authenticated) endpoints

export interface VisitCardLinkResponse {
    token: string;
    path: string;
    url: string;
    /** Last successful delivery per channel — null when never sent that way. */
    lastEmailSentAt: string | null;
    lastSmsSentAt: string | null;
}

/** Channel the employee explicitly picks when sending the card. */
export type VisitCardSendChannel = 'EMAIL' | 'SMS';

/** Studio-level Visit Card configuration (settings → Karta Wizyty). */
export interface VisitCardSettings {
    /** "Czy korzystać z Karty Wizyty?" — master switch. */
    enabled: boolean;
    /** "Czy domyślnie wysyłać Kartę Wizyty?" — default for the send checkbox. */
    sendByDefault: boolean;
    /** Whether the studio's subscription currently includes the SMS module. */
    smsModuleActive: boolean;
}

export interface UpdateVisitCardSettingsPayload {
    enabled?: boolean;
    sendByDefault?: boolean;
}

export interface VisitCardSendResponse {
    emailSent: boolean;
    smsSent: boolean;
    message: string;
}

// Employee-side upsell suggestion management

export type UpsellAdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface UpsellSuggestion {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustmentType: UpsellAdjustmentType;
    /** PERCENT: basis points (negative = discount); other types: grosz. */
    adjustmentValue: number;
    finalPriceNet: number;
    finalPriceGross: number;
    originalPriceGross: number;
    note: string | null;
    status: UpsellSuggestionStatus;
    createdAt: string;
    requestedAt: string | null;
    confirmedAt: string | null;
}

export interface CreateUpsellSuggestionRequest {
    serviceId: string;
    adjustment?: {
        type: UpsellAdjustmentType;
        /** PERCENT: human percentage (e.g. -10.5); other types: grosz. */
        value: number;
    };
    note?: string;
}
