// src/modules/services/types.ts

export type VatRate = 0 | 5 | 8 | 23 | -1;

export interface Service {
    id: string;
    name: string;
    basePriceNet: number;
    vatRate: VatRate;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    replacesServiceId: string | null;
}

export interface ServiceListFilters {
    search: string;
    page: number;
    limit: number;
    sortBy?: 'name' | 'basePriceNet';
    sortDirection?: 'asc' | 'desc';
    showInactive?: boolean;
}

export interface ServicePagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface ServiceListResponse {
    services: Service[];
    pagination: ServicePagination;
}

export interface CreateServiceRequest {
    name: string;
    basePriceNet: number;
    vatRate: VatRate;
}

export interface UpdateServiceRequest extends CreateServiceRequest {
    originalServiceId: string;
}

export interface ServicePriceCalculation {
    priceNet: number;
    vatAmount: number;
    priceGross: number;
}