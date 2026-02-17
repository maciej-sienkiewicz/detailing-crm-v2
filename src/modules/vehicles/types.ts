// src/modules/vehicles/types.ts

export type OwnershipRole = 'PRIMARY' | 'CO_OWNER' | 'COMPANY';

export type EngineType = 'GASOLINE' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';

export type VehicleStatus = 'active' | 'sold' | 'archived';

export type DocumentCategory =
    | 'protocols'
    | 'invoices'
    | 'photos'
    | 'technical'
    | 'other';

export type ActivityType =
    | 'registration_changed'
    | 'owner_added'
    | 'owner_removed'
    | 'photo_added'
    | 'visit_completed'
    | 'notes_updated'
    | 'mileage_updated';


export interface VehicleOwner {
    customerId: string;
    customerName: string;
    role: OwnershipRole;
    assignedAt: string;
}

export interface VehicleFinancialStats {
    totalVisits: number;
    totalSpent: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    lastVisitDate: string | null;
    averageVisitCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
}

export interface Vehicle {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    color: string;
    paintType: string | null;
    engineType: EngineType;
    currentMileage: number | null;
    status: VehicleStatus;
    technicalNotes: string;
    owners: VehicleOwner[];
    stats: VehicleFinancialStats;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface VehicleListItem {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    engineType: EngineType;
    owners: VehicleOwner[];
    stats: VehicleFinancialStats;
    status: VehicleStatus;
}

export interface VehicleListResponse {
    data: VehicleListItem[];
    pagination: PaginationMeta;
}

export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export type VehicleSortField =
    | 'licensePlate'
    | 'brand'
    | 'lastVisitDate'
    | 'totalVisits'
    | 'totalSpent'
    | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface VehicleFilters {
    search: string;
    page: number;
    limit: number;
    sortBy?: VehicleSortField;
    sortDirection?: SortDirection;
    status?: VehicleStatus;
}

export interface CreateVehiclePayload {
    licensePlate: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    color: string;
    paintType?: string;
    engineType: EngineType;
    currentMileage?: number;
    technicalNotes?: string;
    ownerIds: string[];
}

export interface UpdateVehiclePayload {
    licensePlate?: string;
    color?: string;
    paintType?: string;
    engineType?: EngineType;
    currentMileage?: number;
    technicalNotes?: string;
    status?: VehicleStatus;
}

export interface AssignOwnerPayload {
    customerId: string;
    role: OwnershipRole;
}

export type DocumentSource = 'VEHICLE' | 'VISIT';

export interface VehicleDocument {
    id: string;
    name: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    uploadedByName: string;
    source: DocumentSource;
}

export interface VehicleDocumentsResponse {
    documents: VehicleDocument[];
}

export interface UploadVehicleDocumentPayload {
    file: File;
    vehicleId: string;
    name?: string;
}

export interface VehicleDocumentUploadResponse {
    documentId: string;
    uploadUrl: string;
}

export type PhotoSource = 'VEHICLE' | 'VISIT';

export interface VehiclePhoto {
    id: string;
    vehicleId?: string;
    source: PhotoSource;
    sourceId: string;
    fileName: string;
    photoUrl: string;
    thumbnailUrl: string;
    fullSizeUrl: string;
    description: string;
    capturedAt?: string;
    uploadedAt: string;
    visitId?: string | null;
    visitNumber?: string;
}

export interface VehicleActivity {
    id: string;
    vehicleId: string;
    type: ActivityType;
    description: string;
    performedBy: string;
    performedAt: string;
    metadata: Record<string, any>;
}

export interface VehicleVisitSummary {
    id: string;
    date: string;
    description: string;
    status: string;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    createdBy: string;
}

export interface VehicleVisit {
    id: string;
    date: string;
    customerId: string;
    customerName: string;
    description: string;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    status: string;
    createdBy: string;
    notes: string;
}

export interface VehicleVisitsResponse {
    visits: VehicleVisit[];
    pagination: PaginationMeta;
}

export type VehicleAppointmentStatus = 'scheduled' | 'CREATED' | 'ABANDONED' | 'CANCELLED' | 'CONVERTED' | 'completed' | 'cancelled';

export interface VehicleAppointment {
    id: string;
    title: string;
    customerId: string;
    customerName: string;
    startDateTime: string;
    endDateTime: string;
    isAllDay: boolean;
    status: VehicleAppointmentStatus;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    note: string;
    createdAt: string;
}

export interface VehicleAppointmentsResponse {
    appointments: VehicleAppointment[];
    pagination: PaginationMeta;
}

export interface VehicleDetailResponse {
    vehicle: Vehicle;
    recentVisits: VehicleVisitSummary[];
    activities: VehicleActivity[];
    photos: VehiclePhoto[];
}


export interface UploadPhotoPayload {
    file: File;
    description: string;
    visitId?: string;
}

export interface VehiclePhotoGalleryResponse {
    photos: VehiclePhoto[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

export interface UploadVehiclePhotoPayload {
    fileName: string;
    description: string;
}

export interface UploadVehiclePhotoResponse {
    photoId: string;
    uploadUrl: string;
}
