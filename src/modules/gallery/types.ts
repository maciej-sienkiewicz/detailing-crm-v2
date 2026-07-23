// src/modules/gallery/types.ts

export type GalleryPhotoSource = 'VEHICLE' | 'VISIT' | 'BATCH_ORDER';

export interface GalleryPhoto {
    id: string;
    fileName: string;
    thumbnailUrl: string;
    fullSizeUrl: string;
    description?: string;
    tags: string[];
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    source: GalleryPhotoSource;
    vehicleId?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleLicensePlate?: string;
    vehicleYear?: number;
    visitId?: string;
    visitNumber?: string;
    customerId?: string;
    customerName?: string;
    batchOrderEntryId?: string;
    contractorName?: string;
}

export interface GalleryFilters {
    tags: string[];
    brand: string;
    model: string;
    page: number;
    pageSize: number;
}

export interface GalleryPagination {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface GalleryResponse {
    photos: GalleryPhoto[];
    pagination: GalleryPagination;
    availableTags: string[];
}
