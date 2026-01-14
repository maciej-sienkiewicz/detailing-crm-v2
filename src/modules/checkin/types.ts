// src/modules/checkin/types.ts

export type FuelLevel = 0 | 25 | 50 | 75 | 100;

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
    vehicleData: {
        id: string;
        brand: string;
        model: string;
        licensePlate: string;
        vin: string;
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
        fuelLevel: FuelLevel;
        deposit: DepositItem;
        inspectionNotes: string;
        isVeryDirty: boolean;
    };
    photos: PhotoSlot[];
    services: ServiceLineItem[];
}

export interface ReservationToVisitPayload {
    reservationId: string;
    customer: {
        id: string;
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
    };
    vehicle: {
        id: string;
        vin?: string; // VIN jest opcjonalny
    };
    technicalState: {
        mileage: number;
        fuelLevel: FuelLevel;
        deposit: DepositItem;
        inspectionNotes: string;
        isVeryDirty: boolean;
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