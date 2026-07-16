// src/modules/visit-card/types.ts
// Types mirroring backend pl.detailing.crm.visitcard.VisitCardDtos

export type VisitCardStatus =
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

export interface VisitCard {
    visitNumber: string;
    title: string | null;
    status: VisitCardStatus;
    reservation: VisitCardReservation;
    vehicle: VisitCardVehicle;
    customer: VisitCardCustomer;
    company: VisitCardCompany;
    services: VisitCardServiceLine[];
    totals: VisitCardTotals;
    inProgress: VisitCardInProgress | null;
    completion: VisitCardCompletion | null;
}

// Employee-side (authenticated) endpoints

export interface VisitCardLinkResponse {
    token: string;
    path: string;
    url: string;
}

export interface VisitCardSendResponse {
    emailSent: boolean;
    smsSent: boolean;
    message: string;
}
