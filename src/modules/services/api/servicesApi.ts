// src/modules/services/api/servicesApi.ts
import { apiClient } from '@/core';
import { mapPage, type Page } from '@/core/page';
import { isCatalogServiceId } from '@/common/utils/catalogServiceId';
import { catalogGross } from '../utils/priceCalculator';
import type {
    Service,
    ServiceDto,
    ServiceListFilters,
    CreateServiceRequest,
    UpdateServiceRequest,
    CreatePackageRequest,
    UpdatePackageRequest,
    SyncItemNameRequest,
} from '../types';

const BASE_PATH = '/v1/services';

/**
 * Surowa pozycja cennika → {@link Service} z brutto zawsze ustalonym.
 *
 * Brutto zapisane przechodzi co do grosza (CLAUDE.md §1). Brak brutta - `null`,
 * brak pola albo 0 zł przy netto > 0 - to „nikt go nie ustalił", więc dopiero wtedy
 * liczy się z netta. Wcześniej każdy czytelnik łatał to sam przez
 * `basePriceGross ?? policz(netto)`, co przepuszczało 0 zł: formularz edycji
 * pokazywał brutto 0,00, a zapis bez dotykania ceny wysyłał parę, którą backend
 * odrzuca.
 */
export const toService = (dto: ServiceDto): Service => ({
    ...dto,
    basePriceGross: catalogGross(dto),
});

export const servicesApi = {
    getServices: async (filters: ServiceListFilters, signal?: AbortSignal): Promise<Page<Service>> => {
        const params = new URLSearchParams({
            search: filters.search,
            page: String(filters.page),
            pageSize: String(filters.pageSize),
            showInactive: String(filters.showInactive || false),
        });
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
        if (filters.isPackage !== undefined) params.append('isPackage', String(filters.isPackage));

        const response = await apiClient.get<Page<ServiceDto>>(`${BASE_PATH}?${params}`, { signal });
        return mapPage(response.data, toService);
    },

    createService: async (data: CreateServiceRequest): Promise<Service> => {
        const response = await apiClient.post<ServiceDto>(BASE_PATH, data);
        return toService(response.data);
    },

    updateService: async (data: UpdateServiceRequest): Promise<Service> => {
        // Pozycja spoza cennika (`temp-…`) nie ma czego aktualizować w bazie. Backend
        // i tak ją odrzuci - tu kończy się wcześniej i z nazwą winnego, zamiast
        // anonimowego 400 „Żądanie zawiera nieprawidłowe dane".
        if (!isCatalogServiceId(data.originalServiceId)) {
            throw new Error(`Usługa ${data.originalServiceId} nie jest zapisana w cenniku - nie można jej zaktualizować`);
        }
        const { originalServiceId, ...version } = data;
        const response = await apiClient.post<ServiceDto>(`${BASE_PATH}/${originalServiceId}/versions`, version);
        return toService(response.data);
    },

    archiveService: async (serviceId: string): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/${serviceId}/archive`);
    },

    createPackage: async (data: CreatePackageRequest): Promise<Service> => {
        const response = await apiClient.post<ServiceDto>(`${BASE_PATH}/packages`, data);
        return toService(response.data);
    },

    updatePackage: async (data: UpdatePackageRequest): Promise<Service> => {
        const { originalPackageId, ...version } = data;
        const response = await apiClient.post<ServiceDto>(`${BASE_PATH}/packages/${originalPackageId}/versions`, version);
        return toService(response.data);
    },

    syncItemName: async (packageId: string, data: SyncItemNameRequest): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/packages/${packageId}/sync-item-name`, data);
    },
};
