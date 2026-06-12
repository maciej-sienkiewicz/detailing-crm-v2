// src/modules/services/api/servicesApi.ts
import { apiClient } from '@/core';
import type {
    Service,
    ServiceListFilters,
    ServiceListResponse,
    CreateServiceRequest,
    UpdateServiceRequest,
    CreatePackageRequest,
    UpdatePackageRequest,
    SyncItemNameRequest,
} from '../types';

const USE_MOCKS = false;
const BASE_PATH = '/v1/services';

const mockServices: Service[] = [
    {
        id: '1',
        name: 'Mycie ręczne premium',
        basePriceNet: 15000,
        vatRate: 23,
        requireManualPrice: false,
        isActive: true,
        isPackage: false,
        packageItems: null,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        replacesServiceId: null,
        createdByFirstName: 'System',
        createdByLastName: 'Admin',
        updatedBy: 'System Admin',
    },
    {
        id: '2',
        name: 'Polerowanie lakieru',
        basePriceNet: 50000,
        vatRate: 23,
        requireManualPrice: false,
        isActive: true,
        isPackage: false,
        packageItems: null,
        createdAt: '2024-01-16T11:00:00Z',
        updatedAt: '2024-01-16T11:00:00Z',
        replacesServiceId: null,
        createdByFirstName: 'System',
        createdByLastName: 'Admin',
        updatedBy: 'System Admin',
    },
    {
        id: '3',
        name: 'Powłoka ceramiczna',
        basePriceNet: 120000,
        vatRate: 23,
        requireManualPrice: false,
        isActive: true,
        isPackage: false,
        packageItems: null,
        createdAt: '2024-01-17T09:00:00Z',
        updatedAt: '2024-01-17T09:00:00Z',
        replacesServiceId: null,
        createdByFirstName: 'System',
        createdByLastName: 'Admin',
        updatedBy: 'System Admin',
    },
    {
        id: '4',
        name: 'Folia ochronna PPF',
        basePriceNet: 350000,
        vatRate: 23,
        requireManualPrice: false,
        isActive: true,
        isPackage: false,
        packageItems: null,
        createdAt: '2024-01-18T14:00:00Z',
        updatedAt: '2024-01-18T14:00:00Z',
        replacesServiceId: null,
        createdByFirstName: 'System',
        createdByLastName: 'Admin',
        updatedBy: 'System Admin',
    },
    {
        id: '5',
        name: 'Czyszczenie wnętrza',
        basePriceNet: 8000,
        vatRate: 23,
        requireManualPrice: false,
        isActive: true,
        isPackage: false,
        packageItems: null,
        createdAt: '2024-01-19T10:30:00Z',
        updatedAt: '2024-01-19T10:30:00Z',
        replacesServiceId: null,
        createdByFirstName: 'System',
        createdByLastName: 'Admin',
        updatedBy: 'System Admin',
    },
    {
        id: 'pkg-1',
        name: 'Pakiet Kompleksowy',
        basePriceNet: 60000,
        vatRate: 23,
        requireManualPrice: false,
        isActive: true,
        isPackage: true,
        packageItems: [
            { serviceId: '1', serviceName: 'Mycie ręczne premium', position: 0 },
            { serviceId: '5', serviceName: 'Czyszczenie wnętrza', position: 1 },
        ],
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-01T10:00:00Z',
        replacesServiceId: null,
        createdByFirstName: 'System',
        createdByLastName: 'Admin',
        updatedBy: 'System Admin',
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
                requireManualPrice: data.requireManualPrice,
                isActive: true,
                isPackage: false,
                packageItems: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replacesServiceId: null,
                createdByFirstName: 'System',
                createdByLastName: 'Admin',
                updatedBy: 'System Admin',
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
            const oldService = oldServiceIndex !== -1 ? mockServicesStore[oldServiceIndex] : null;

            // Detect which packages contain this service
            const affectedPackages = mockServicesStore
                .filter(s => s.isPackage && s.packageItems?.some(item => item.serviceId === data.originalServiceId))
                .map(s => ({ packageId: s.id, packageName: s.name }));

            const newService: Service = {
                id: String(mockIdCounter++),
                name: data.name,
                basePriceNet: data.basePriceNet,
                vatRate: data.vatRate,
                requireManualPrice: data.requireManualPrice,
                isActive: true,
                isPackage: false,
                packageItems: null,
                affectedPackages,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replacesServiceId: data.originalServiceId,
                createdByFirstName: oldService?.createdByFirstName || 'System',
                createdByLastName: oldService?.createdByLastName || 'Admin',
                updatedBy: 'System Admin',
            };
            mockServicesStore.push(newService);
            resolve(newService);
        }, 800);
    });
};

const mockCreatePackage = async (data: CreatePackageRequest): Promise<Service> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const packageItems = data.serviceIds.map((id, index) => {
                const svc = mockServicesStore.find(s => s.id === id);
                return { serviceId: id, serviceName: svc?.name || id, position: index };
            });
            const newPkg: Service = {
                id: `pkg-${mockIdCounter++}`,
                name: data.name,
                basePriceNet: data.basePriceNet,
                vatRate: data.vatRate,
                requireManualPrice: data.requireManualPrice,
                isActive: true,
                isPackage: true,
                packageItems,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replacesServiceId: null,
                createdByFirstName: 'System',
                createdByLastName: 'Admin',
                updatedBy: 'System Admin',
            };
            mockServicesStore.push(newPkg);
            resolve(newPkg);
        }, 800);
    });
};

const mockUpdatePackage = async (data: UpdatePackageRequest): Promise<Service> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const oldIdx = mockServicesStore.findIndex(s => s.id === data.originalPackageId);
            if (oldIdx !== -1) mockServicesStore[oldIdx].isActive = false;
            const packageItems = data.serviceIds.map((id, index) => {
                const svc = mockServicesStore.find(s => s.id === id);
                return { serviceId: id, serviceName: svc?.name || id, position: index };
            });
            const newPkg: Service = {
                id: `pkg-${mockIdCounter++}`,
                name: data.name,
                basePriceNet: data.basePriceNet,
                vatRate: data.vatRate,
                requireManualPrice: data.requireManualPrice,
                isActive: true,
                isPackage: true,
                packageItems,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replacesServiceId: data.originalPackageId,
                createdByFirstName: 'System',
                createdByLastName: 'Admin',
                updatedBy: 'System Admin',
            };
            mockServicesStore.push(newPkg);
            resolve(newPkg);
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

    archiveService: async (serviceId: string): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${serviceId}/archive`);
    },

    createPackage: async (data: CreatePackageRequest): Promise<Service> => {
        if (USE_MOCKS) {
            return mockCreatePackage(data);
        }
        const response = await apiClient.post(`${BASE_PATH}/packages`, data);
        return response.data;
    },

    updatePackage: async (data: UpdatePackageRequest): Promise<Service> => {
        if (USE_MOCKS) {
            return mockUpdatePackage(data);
        }
        const response = await apiClient.post(`${BASE_PATH}/packages/update`, data);
        return response.data;
    },

    syncItemName: async (packageId: string, data: SyncItemNameRequest): Promise<void> => {
        if (USE_MOCKS) {
            const pkg = mockServicesStore.find(s => s.id === packageId);
            if (pkg?.packageItems) {
                const item = pkg.packageItems.find(i => i.serviceId === data.serviceId);
                if (item) item.serviceName = data.newName;
            }
            return;
        }
        await apiClient.post(`${BASE_PATH}/packages/${packageId}/sync-item-name`, data);
    },
};
