// src/modules/checkin/types.ts

export type PhotoSlotType = 'front' | 'rear' | 'left_side' | 'right_side';

export type DamagePhotoType = 'damage_front' | 'damage_rear' | 'damage_left' | 'damage_right' | 'damage_other';

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface DepositItem {
    keys: boolean;
    registrationDocument: boolean;
}

export interface PhotoSlot {
    type: PhotoSlotType | DamagePhotoType;
    fileId?: string;
    fileName?: string;
    uploadedAt?: string;
    description?: string;
}

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

export interface ServiceLineItem {
    id: string;
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    note?: string;
}

export interface CheckInFormData {
    customerData: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    customerAlias?: string; // Jeśli klient to tylko alias
    hasFullCustomerData: boolean; // Określa czy mamy pełne dane klienta czy tylko alias
    isNewCustomer: boolean; // Czy klient został utworzony teraz podczas check-in
    vehicleData: {
        id: string;
        brand: string;
        model: string;
        yearOfProduction: number;
        licensePlate: string;
        vin: string;
        color?: string;
        paintType?: string;
    } | null;
    isNewVehicle: boolean; // Czy pojazd został utworzony teraz podczas check-in
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
    photos: PhotoSlot[];
    services: ServiceLineItem[];
}

export interface ReservationToVisitPayload {
    reservationId: string;
    customer?: {
        id?: string;
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
            regon: string;
            address: {
                street: string;
                city: string;
                postalCode: string;
                country: string;
            };
        };
        isNew: boolean; // Czy klient został utworzony teraz podczas check-in
    };
    customerAlias?: string; // Jeśli klient to tylko alias
    vehicle: {
        id?: string; // Opcjonalne - puste dla nowego pojazdu
        brand: string;
        model: string;
        yearOfProduction: number;
        licensePlate?: string;
        vin?: string;
        color?: string;
        paintType?: string;
        isNew: boolean; // Czy pojazd został utworzony teraz podczas check-in
    };
    technicalState: {
        mileage: number;
        deposit: DepositItem;
        inspectionNotes: string;
    };
    photoIds: string[];
    services: ServiceLineItem[];
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
    type: PhotoSlotType | DamagePhotoType;
    description?: string;
}

export interface PhotoUploadResponse {
    fileId: string;
    fileName: string;
    uploadedAt: string;
}

export type CheckInStep = 'verification' | 'technical' | 'photos' | 'summary';

export type MoneyAmount = number;