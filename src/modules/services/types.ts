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
    /**
     * Brutto pozycji cennika - ZAWSZE liczba, bo `servicesApi` normalizuje odpowiedź
     * (`toService`). Gdy serwer brutto zapisał, jest tu dokładnie ono (wpisane jako
     * 1900,00 zł zostaje 1900,00 zł - z netta wyszłoby 1900,01 zł, CLAUDE.md §1).
     * Gdy go nie przysłał (`null`, brak pola albo 0 przy netto > 0), jest tu
     * brutto policzone z netta - para jest wtedy „od strony netto" i tak ją czyta
     * `storedPriceSide`/`isTypedGross`.
     *
     * Typ surowej odpowiedzi, w której brutto może brakować, to {@link ServiceDto}.
     */
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

/**
 * Pozycja cennika tak, jak przychodzi z sieci (albo z atrap API). Brutto bywa puste:
 * kolumnę dodano później niż netto, a obiekty składane ręcznie po stronie klienta
 * potrafią je pominąć. Dalej w aplikacji krąży już tylko {@link Service} - brak
 * brutta rozstrzyga się raz, na granicy API, a nie w każdym czytelniku osobno
 * (każdy robił to inaczej: `?? policz`, co przepuszczało 0 zł).
 */
export type ServiceDto = Omit<Service, 'basePriceGross'> & {
    basePriceGross?: number | null;
};

export interface ServiceListFilters {
    search: string;
    page: number;
    limit: number;
    sortBy?: 'name' | 'basePriceNet';
    sortDirection?: 'asc' | 'desc';
    showInactive?: boolean;
    isPackage?: boolean;
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
