// src/modules/vehicles/types.ts

export type OwnershipRole = 'PRIMARY' | 'CO_OWNER' | 'COMPANY';

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
    currentMileage?: number;
    technicalNotes?: string;
    ownerIds: string[];
}

export interface UpdateVehiclePayload {
    licensePlate?: string;
    color?: string;
    paintType?: string;
    currentMileage?: number;
    technicalNotes?: string;
    status?: VehicleStatus;
}

export interface AssignOwnerPayload {
    customerId: string;
    role: OwnershipRole;
}

export interface VehicleDocument {
    id: string;
    vehicleId: string;
    category: DocumentCategory;
    fileName: string;
    description: string;
    fileSize: number;
    mimeType: string;
    documentUrl: string;
    thumbnailUrl: string | null;
    uploadedAt: string;
    uploadedBy: string;
}

export interface VehiclePhoto {
    id: string;
    vehicleId: string;
    photoUrl: string;
    thumbnailUrl: string;
    description: string;
    capturedAt: string;
    uploadedAt: string;
    visitId: string | null;
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
    type: string;
    description: string;
    status: string;
    totalCost: {
        netAmount: number;
        grossAmount: number;
        currency: string;
    };
    technician: string;
}

export interface VehicleDetailResponse {
    vehicle: Vehicle;
    recentVisits: VehicleVisitSummary[];
    activities: VehicleActivity[];
    photos: VehiclePhoto[];
}

export interface DocumentListResponse {
    data: VehicleDocument[];
    pagination: PaginationMeta;
}

export interface UploadDocumentPayload {
    file: File;
    category: DocumentCategory;
    description: string;
}

export interface UploadPhotoPayload {
    file: File;
    description: string;
    visitId?: string;
}
