// src/modules/services/api/servicesApi.ts
import { apiClient } from '@/core';
import type {
    Service,
    ServiceListFilters,
    ServiceListResponse,
    CreateServiceRequest,
    UpdateServiceRequest,
} from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/api/v1/services';

const mockServices: Service[] = [
    {
        id: '1',
        name: 'Mycie ręczne premium',
        basePriceNet: 15000,
        vatRate: 23,
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        replacesServiceId: null,
    },
    {
        id: '2',
        name: 'Polerowanie lakieru',
        basePriceNet: 50000,
        vatRate: 23,
        isActive: true,
        createdAt: '2024-01-16T11:00:00Z',
        updatedAt: '2024-01-16T11:00:00Z',
        replacesServiceId: null,
    },
    {
        id: '3',
        name: 'Powłoka ceramiczna',
        basePriceNet: 120000,
        vatRate: 23,
        isActive: true,
        createdAt: '2024-01-17T09:00:00Z',
        updatedAt: '2024-01-17T09:00:00Z',
        replacesServiceId: null,
    },
    {
        id: '4',
        name: 'Folia ochronna PPF',
        basePriceNet: 350000,
        vatRate: 23,
        isActive: true,
        createdAt: '2024-01-18T14:00:00Z',
        updatedAt: '2024-01-18T14:00:00Z',
        replacesServiceId: null,
    },
    {
        id: '5',
        name: 'Czyszczenie wnętrza',
        basePriceNet: 8000,
        vatRate: 23,
        isActive: true,
        createdAt: '2024-01-19T10:30:00Z',
        updatedAt: '2024-01-19T10:30:00Z',
        replacesServiceId: null,
    },
];

let mockServicesStore = [...mockServices];
let mockIdCounter = 6;

const mockGetServices = async (filters: ServiceListFilters): Promise<ServiceListResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let filteredServices = [...mockServicesStore];

            if (!filters.showInactive) {
                filteredServices = filteredServices.filter(s => s.isActive);
            }

            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filteredServices = filteredServices.filter(s =>
                    s.name.toLowerCase().includes(searchLower)
                );
            }

            if (filters.sortBy) {
                filteredServices.sort((a, b) => {
                    const aVal = a[filters.sortBy!];
                    const bVal = b[filters.sortBy!];
                    const direction = filters.sortDirection === 'asc' ? 1 : -1;
                    return aVal > bVal ? direction : -direction;
                });
            }

            const start = (filters.page - 1) * filters.limit;
            const end = start + filters.limit;
            const paginatedServices = filteredServices.slice(start, end);

            resolve({
                services: paginatedServices,
                pagination: {
                    currentPage: filters.page,
                    totalPages: Math.ceil(filteredServices.length / filters.limit),
                    totalItems: filteredServices.length,
                    itemsPerPage: filters.limit,
                },
            });
        }, 500);
    });
};

const mockCreateService = async (data: CreateServiceRequest): Promise<Service> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newService: Service = {
                id: String(mockIdCounter++),
                name: data.name,
                basePriceNet: data.basePriceNet,
                vatRate: data.vatRate,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replacesServiceId: null,
            };
            mockServicesStore.push(newService);
            resolve(newService);
        }, 800);
    });
};

const mockUpdateService = async (data: UpdateServiceRequest): Promise<Service> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const oldServiceIndex = mockServicesStore.findIndex(s => s.id === data.originalServiceId);
            if (oldServiceIndex !== -1) {
                mockServicesStore[oldServiceIndex].isActive = false;
            }

            const newService: Service = {
                id: String(mockIdCounter++),
                name: data.name,
                basePriceNet: data.basePriceNet,
                vatRate: data.vatRate,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replacesServiceId: data.originalServiceId,
            };
            mockServicesStore.push(newService);
            resolve(newService);
        }, 800);
    });
};

export const servicesApi = {
    getServices: async (filters: ServiceListFilters): Promise<ServiceListResponse> => {
        if (USE_MOCKS) {
            return mockGetServices(filters);
        }
        const params = new URLSearchParams({
            search: filters.search,
            page: String(filters.page),
            limit: String(filters.limit),
            showInactive: String(filters.showInactive || false),
        });
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);

        const response = await apiClient.get(`${BASE_PATH}?${params}`);
        return response.data;
    },

    createService: async (data: CreateServiceRequest): Promise<Service> => {
        if (USE_MOCKS) {
            return mockCreateService(data);
        }
        const response = await apiClient.post(BASE_PATH, data);
        return response.data;
    },

    updateService: async (data: UpdateServiceRequest): Promise<Service> => {
        if (USE_MOCKS) {
            return mockUpdateService(data);
        }
        const response = await apiClient.post(`${BASE_PATH}/update`, data);
        return response.data;
    },
};