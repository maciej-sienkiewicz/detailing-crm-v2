// src/modules/checkin/types.ts

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface DepositItem {
    keys: boolean;
    registrationDocument: boolean;
    other: boolean;
}

export interface PhotoSlot {
    id?: string; // Unique identifier for the photo
    fileId?: string;
    fileName?: string;
    uploadedAt?: string;
    description?: string;
}

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

export interface DamagePoint {
    id: number;
    x: number; // Percentage (0-100)
    y: number; // Percentage (0-100)
    note: string;
}

export interface ServiceLineItem {
    id: string;
    serviceId: string | null;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    note?: string;
    requireManualPrice?: boolean;
}

export interface CheckInFormData {
    customerData: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    hasFullCustomerData: boolean; // Określa czy mamy pełne dane klienta
    isNewCustomer: boolean; // Czy klient został utworzony teraz podczas check-in
    vehicleData: {
        id: string;
        brand: string;
        model: string;
        yearOfProduction: number;
        licensePlate: string;
        vin?: string;
        color?: string;
        paintType?: string;
    } | null;
    isNewVehicle: boolean; // Czy pojazd został utworzony teraz podczas check-in
    vehicleHandoff: {
        isHandedOffByOtherPerson: boolean;
        contactPerson: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
        };
    };
    homeAddress: {
        street: string;
        city: string;
        postalCode: string;
        country: string;
    } | null;
    company: {
        name: string;
        nip: string;
        regon: string;
        address: {
            street: string;
            city: string;
            postalCode: string;
            country: string;
        };
    } | null;
    technicalState: {
        mileage: number;
        deposit: DepositItem;
        inspectionNotes: string;
    };
    note: string;
    // Local UI input value (YYYY-MM-DDTHH:mm). Convert to Instant for backend using toInstant()
    visitStartAt?: string;
    // Local UI input value (YYYY-MM-DDTHH:mm). Convert to Instant for backend using toInstant()
    visitEndAt?: string;
    photos: PhotoSlot[];
    damagePoints: DamagePoint[];
    services: ServiceLineItem[];
    appointmentColorId: string;
}

export type CheckInCustomerIdentity =
    | {
        mode: 'EXISTING';
        id: string;
    }
    | {
        mode: 'NEW';
        newData: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
            homeAddress?: {
                street: string;
                city: string;
                postalCode: string;
                country: string;
            };
            company?: {
                name: string;
                nip: string;
                regon?: string;
                address: {
                    street: string;
                    city: string;
                    postalCode: string;
                    country: string;
                };
            };
        };
    }
    | {
        mode: 'UPDATE';
        id: string;
        updateData: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
            homeAddress?: {
                street: string;
                city: string;
                postalCode: string;
                country: string;
            };
            company?: {
                name: string;
                nip: string;
                regon?: string;
                address: {
                    street: string;
                    city: string;
                    postalCode: string;
                    country: string;
                };
            };
        };
    };

export type CheckInVehicleIdentity =
    | {
        mode: 'EXISTING';
        id: string;
    }
    | {
        mode: 'NEW';
        newData: {
            brand: string;
            model: string;
            yearOfProduction?: number;
            licensePlate?: string;
            vin?: string;
            color?: string;
            paintType?: string;
        };
    }
    | {
        mode: 'UPDATE';
        id: string;
        updateData: {
            brand: string;
            model: string;
            yearOfProduction?: number;
            licensePlate?: string;
            vin?: string;
            color?: string;
            paintType?: string;
        };
    };

export interface ReservationToVisitPayload {
    reservationId: string;
    /** Instant (UTC ISO-8601 with 'Z') */
    startDateTime?: string;
    /** Instant (UTC ISO-8601 with 'Z') */
    endDateTime?: string;
    customer?: CheckInCustomerIdentity;
    vehicle: CheckInVehicleIdentity;
    vehicleHandoff?: {
        contactPerson: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
        };
    };
    technicalState: {
        mileage: number;
        deposit: DepositItem;
        inspectionNotes: string;
    };
    photoIds: string[];
    damagePoints: DamagePoint[];
    services: ServiceLineItem[];
    appointmentColorId: string;
}

export interface MobileUploadSession {
    sessionId: string;
    token: string;
    expiresAt: string;
    uploadedPhotos: PhotoSlot[];
}

export interface UploadPhotoPayload {
    sessionId: string;
    token: string;
    photo: File;
    description?: string;
}

export interface PhotoUploadResponse {
    fileId: string;
    fileName: string;
    uploadedAt: string;
}

export interface ProtocolResponse {
    id: string;
    templateId: string;
    templateName: string;
    stage: 'CHECK_IN' | 'CHECK_OUT';
    isMandatory: boolean;
    status: 'READY_FOR_SIGNATURE' | 'PENDING';
    filledPdfUrl?: string; // Presigned URL (10 min)
}

export interface CreateVisitFromReservationResponse {
    visitId: string;
    protocols: ProtocolResponse[];
}

export type CheckInStep = 'verification' | 'photos';

export type MoneyAmount = number;
