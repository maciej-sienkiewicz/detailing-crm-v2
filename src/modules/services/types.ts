// src/modules/services/types.ts

export type VatRate = 0 | 5 | 8 | 23 | -1;

export interface PackageItemDto {
    serviceId: string;
    serviceName: string;
    position: number;
}

export interface AffectedPackage {
    packageId: string;
    packageName: string;
}

export interface Service {
    id: string;
    name: string;
    basePriceNet: number;
    /** Exact gross as entered by the user — NOT derivable from net (1-grosz rounding gaps). */
    basePriceGross: number;
    vatRate: VatRate;
    requireManualPrice: boolean;
    isActive: boolean;
    isPackage: boolean;
    packageItems: PackageItemDto[] | null;
    affectedPackages?: AffectedPackage[];
    createdAt: string;
    updatedAt: string;
    createdByFirstName: string;
    createdByLastName: string;
    updatedBy: string;
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
    /** Exact gross paired with basePriceNet, as shown to the user in the form. */
    basePriceGross: number;
    vatRate: VatRate;
    requireManualPrice: boolean;
}

export interface UpdateServiceRequest extends CreateServiceRequest {
    originalServiceId: string;
}

export interface CreatePackageRequest {
    name: string;
    basePriceNet: number;
    /** Exact gross paired with basePriceNet, as shown to the user in the form. */
    basePriceGross: number;
    vatRate: VatRate;
    requireManualPrice: boolean;
    serviceIds: string[];
}

export interface UpdatePackageRequest extends CreatePackageRequest {
    originalPackageId: string;
}

export interface SyncItemNameRequest {
    serviceId: string;
    newName: string;
}

export interface ServicePriceCalculation {
    priceNet: number;
    vatAmount: number;
    priceGross: number;
}
