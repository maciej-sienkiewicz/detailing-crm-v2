// src/modules/checkin/types.ts

export type AdjustmentType = 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';

export interface DoorToDoorAddress {
    city: string;
    street: string;
}

export interface DoorToDoorInfo {
    enabled: boolean;
    pickupAddress: DoorToDoorAddress;
    deliveryAddress: DoorToDoorAddress;
    notes: string;
}

export interface DepositItem {
    keys: boolean;
    registrationDocument: boolean;
    other: boolean;
}

export interface PhotoSlot {
    id: string; // Photo ID from backend
    fileName: string;
    fileSize?: number;
    uploadedAt: string;
    thumbnailUrl?: string; // Presigned URL from backend (valid for 10 min)
    previewUrl?: string; // Local preview URL for uploaded photos (client-side only)
    tags?: string[]; // User-assigned tags
}

export interface PriceAdjustment {
    type: AdjustmentType;
    value: number;
}

// ─── Damage photo annotations ─────────────────────────────────────────────────

export interface AnnotationPoint {
    x: number; // Percentage (0-100) of the photo width
    y: number; // Percentage (0-100) of the photo height
}

export interface AnnotationStroke {
    color: string; // Hex, e.g. #EF4444
    width: number; // Percentage of the photo width (e.g. 0.8)
    points: AnnotationPoint[];
}

export interface DamagePointPhoto {
    photoId: string;
    strokes: AnnotationStroke[];
    /** Presigned or local preview URL — display only, never persisted */
    thumbnailUrl?: string;
    /** Client-side upload state — never persisted */
    status?: 'uploading' | 'done' | 'failed';
    /**
     * Stable client-side identifier assigned at capture time — never persisted.
     * photoId changes from a local placeholder to the server id once the upload
     * finishes, so UI interactions (e.g. the annotation editor opened right after
     * taking the photo) target photos via localId.
     */
    localId?: string;
}

export interface DamagePoint {
    id: number;
    x: number; // Percentage (0-100)
    y: number; // Percentage (0-100)
    note: string;
    photos?: DamagePointPhoto[];
}

export interface PackageItemSnapshot {
    serviceId: string;
    serviceName: string;
    position: number;
}

export interface ServiceLineItem {
    id: string;
    serviceId: string | null;
    serviceName: string;
    basePriceNet: number;
    /** Exact stored gross from the catalog / user input; carried through to the backend
     *  so the visit's final gross matches what the user saw (no 1-grosz drift). */
    basePriceGross?: number;
    vatRate: number;
    adjustment: PriceAdjustment;
    note?: string;
    requireManualPrice?: boolean;
    isPackage?: boolean;
    packageItems?: PackageItemSnapshot[] | null;
}

export interface CheckInFormData {
    title?: string;
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
        yearOfProduction?: number;
        licensePlate?: string;
        vin?: string;
        color?: string;
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
        protocolNotes: string;
    };
    note: string;
    // Local UI input value (YYYY-MM-DDTHH:mm). Convert to Instant for backend using toInstant()
    visitStartAt?: string;
    // Local UI input value (YYYY-MM-DDTHH:mm). Convert to Instant for backend using toInstant()
    visitEndAt?: string;
    photos: PhotoSlot[];
    damagePoints: DamagePoint[];
    /** Vehicle body type the damage points were placed on (sedan, suv, ...) */
    damageVehicleType?: string;
    services: ServiceLineItem[];
    appointmentColorId: string;
    doorToDoor?: DoorToDoorInfo;
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
        protocolNotes: string;
    };
    title?: string;
    photoIds: string[];
    damagePoints: DamagePoint[];
    damageVehicleType?: string;
    services: ServiceLineItem[];
    appointmentColorId: string;
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        notes?: string;
    };
}

export interface WalkInVisitPayload {
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
        protocolNotes: string;
    };
    title?: string;
    photoIds: string[];
    damagePoints: DamagePoint[];
    damageVehicleType?: string;
    services: ServiceLineItem[];
    appointmentColorId: string;
    qrCheckinId?: string;
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        notes?: string;
    };
}

export interface MobileUploadSession {
    sessionId: string;
    token: string;
    expiresAt: string;
}

export interface UploadUrlRequest {
    fileName: string;
    contentType: string;
    fileSize: number;
    sessionToken: string;
}

export interface UploadUrlResponse {
    photoId: string;
    uploadUrl: string; // Presigned S3 URL
    expiresAt: string;
}

export interface SessionPhotosResponse {
    photos: PhotoSlot[];
}

// ─── QR Upload Token ──────────────────────────────────────────────────────────

export interface QRTokenResponse {
    token: string;
    checkinId: string;
    expiresAt: string;
    uploadEndpoint: string;
}

// ─── Mobile Checkin Context ───────────────────────────────────────────────────

export interface MobileCheckinContext {
    checkinId: string;
    tenantId: string;
}

// ─── Mobile Damage Points ─────────────────────────────────────────────────────

export interface MobileDamagePointsRequest {
    damagePoints: DamagePoint[];
    vehicleType?: string;
}

export interface MobileDamagePointsResponse {
    checkinId: string;
    vehicleType?: string | null;
    damagePoints: DamagePoint[];
    savedAt: string;
}

// ─── Checkin Damage Updated WebSocket event ───────────────────────────────────

export interface CheckinDamageUpdatedEvent {
    type: 'CHECKIN_DAMAGE_UPDATED';
    checkinId: string;
    damagePoints: DamagePoint[];
    vehicleType?: string | null;
    updatedAt: string;
}

// ─── Mobile Photo Upload Response ─────────────────────────────────────────────

export interface MobilePhotoUploadResponse {
    photoId: string;
    fileName: string;
    checkinId: string;
    uploadedAt: string;
}

// ─── WebSocket checkin photo event ────────────────────────────────────────────

export interface CheckinPhotoUploadedEvent {
    type: 'CHECKIN_PHOTO_UPLOADED';
    checkinId: string;
    photoId: string;
    fileName: string;
    timestamp: string;
    thumbnailUrl?: string;
}

// ─── Offline pending photo (IndexedDB) ────────────────────────────────────────

export interface PendingPhoto {
    id: string;
    token: string;
    fileName: string;
    mimeType: string;
    fileData: ArrayBuffer;
    queuedAt: number;
    status: 'pending' | 'uploading' | 'failed';
    error?: string;
    uploadedPhotoId?: string;
}

export interface ProtocolResponse {
    id: string;
    templateId: string | null;
    templateName: string;
    stage: 'CHECK_IN' | 'CHECK_OUT';
    status: 'READY_FOR_SIGNATURE' | 'PENDING';
    filledPdfUrl?: string; // Presigned URL (10 min)
}

export interface CreateVisitFromReservationResponse {
    visitId: string;
    protocols: ProtocolResponse[];
}

export type CheckInStep = 'verification' | 'photos';

export type MoneyAmount = number;
