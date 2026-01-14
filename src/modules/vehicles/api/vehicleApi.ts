// src/modules/vehicles/api/vehicleApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    VehicleListResponse,
    VehicleDetailResponse,
    VehicleFilters,
    CreateVehiclePayload,
    UpdateVehiclePayload,
    AssignOwnerPayload,
    DocumentListResponse,
    UploadDocumentPayload,
    UploadPhotoPayload,
    Vehicle,
    VehicleListItem,
} from '../types';

const BASE_PATH = '/api/v1/vehicles';
const USE_MOCKS = true;

const mockVehicles: VehicleListItem[] = [
    {
        id: 'v1',
        licensePlate: 'WA 12345',
        brand: 'BMW',
        model: 'X5',
        yearOfProduction: 2021,
        status: 'active',
        owners: [
            {
                customerId: 'c1',
                customerName: 'Jan Kowalski',
                role: 'PRIMARY',
                assignedAt: '2023-01-15T10:00:00Z',
            },
        ],
        stats: {
            totalVisits: 8,
            lastVisitDate: '2024-12-10T14:30:00Z',
            totalSpent: {
                netAmount: 12500.00,
                grossAmount: 15375.00,
                currency: 'PLN',
            },
            averageVisitCost: {
                netAmount: 1562.50,
                grossAmount: 1921.88,
                currency: 'PLN',
            },
        },
    },
    {
        id: 'v2',
        licensePlate: 'KR 67890',
        brand: 'Audi',
        model: 'A4',
        yearOfProduction: 2020,
        status: 'active',
        owners: [
            {
                customerId: 'c2',
                customerName: 'Anna Nowak',
                role: 'PRIMARY',
                assignedAt: '2023-03-20T09:15:00Z',
            },
        ],
        stats: {
            totalVisits: 5,
            lastVisitDate: '2024-11-25T11:00:00Z',
            totalSpent: {
                netAmount: 8000.00,
                grossAmount: 9840.00,
                currency: 'PLN',
            },
            averageVisitCost: {
                netAmount: 1600.00,
                grossAmount: 1968.00,
                currency: 'PLN',
            },
        },
    },
    {
        id: 'v3',
        licensePlate: 'GD 11111',
        brand: 'Mercedes-Benz',
        model: 'C-Class',
        yearOfProduction: 2022,
        status: 'active',
        owners: [
            {
                customerId: 'c3',
                customerName: 'Piotr Wiśniewski',
                role: 'PRIMARY',
                assignedAt: '2023-05-10T13:45:00Z',
            },
            {
                customerId: 'c4',
                customerName: 'Firma Sp. z o.o.',
                role: 'COMPANY',
                assignedAt: '2023-05-10T13:45:00Z',
            },
        ],
        stats: {
            totalVisits: 12,
            lastVisitDate: '2025-01-05T16:20:00Z',
            totalSpent: {
                netAmount: 22000.00,
                grossAmount: 27060.00,
                currency: 'PLN',
            },
            averageVisitCost: {
                netAmount: 1833.33,
                grossAmount: 2255.00,
                currency: 'PLN',
            },
        },
    },
];

const mockVehicleDetail: Vehicle = {
    id: 'v1',
    licensePlate: 'WA 12345',
    brand: 'BMW',
    model: 'X5',
    vin: 'WBAFR9C50BC000001',
    yearOfProduction: 2021,
    color: 'Czarny metalik',
    paintType: 'Lakier bazowy + lakier',
    engineType: 'diesel',
    currentMileage: 45000,
    status: 'active',
    technicalNotes: 'Cienki lakier na dachu. Wymaga delikatnego mycia. Historia napraw blacharskich.',
    owners: [
        {
            customerId: 'c1',
            customerName: 'Jan Kowalski',
            role: 'PRIMARY',
            assignedAt: '2023-01-15T10:00:00Z',
        },
    ],
    stats: {
        totalVisits: 8,
        lastVisitDate: '2024-12-10T14:30:00Z',
        totalSpent: {
            netAmount: 12500.00,
            grossAmount: 15375.00,
            currency: 'PLN',
        },
        averageVisitCost: {
            netAmount: 1562.50,
            grossAmount: 1921.88,
            currency: 'PLN',
        },
    },
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2024-12-10T14:30:00Z',
    deletedAt: null,
};

const mockGetVehicles = async (filters: VehicleFilters): Promise<VehicleListResponse> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    let filtered = [...mockVehicles];

    if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(v =>
            v.licensePlate.toLowerCase().includes(search) ||
            v.brand.toLowerCase().includes(search) ||
            v.model.toLowerCase().includes(search) ||
            v.owners.some(o => o.customerName.toLowerCase().includes(search))
        );
    }

    if (filters.status) {
        filtered = filtered.filter(v => v.status === filters.status);
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / filters.limit);
    const start = (filters.page - 1) * filters.limit;
    const end = start + filters.limit;
    const paginatedData = filtered.slice(start, end);

    return {
        data: paginatedData,
        pagination: {
            currentPage: filters.page,
            totalPages,
            totalItems,
            itemsPerPage: filters.limit,
        },
    };
};

const mockGetVehicleDetail = async (vehicleId: string): Promise<VehicleDetailResponse> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
        vehicle: mockVehicleDetail,
        recentVisits: [
            {
                id: 'visit1',
                date: '2024-12-10T14:30:00Z',
                type: 'service',
                description: 'Oklejanie PPF - przednia maska',
                status: 'completed',
                totalCost: {
                    netAmount: 2000.00,
                    grossAmount: 2460.00,
                    currency: 'PLN',
                },
                technician: 'Marek Techniczny',
            },
            {
                id: 'visit2',
                date: '2024-10-15T10:00:00Z',
                type: 'repair',
                description: 'Naprawa wgnieceń',
                status: 'completed',
                totalCost: {
                    netAmount: 1500.00,
                    grossAmount: 1845.00,
                    currency: 'PLN',
                },
                technician: 'Jan Blacharz',
            },
        ],
        activities: [
            {
                id: 'act1',
                vehicleId: 'v1',
                type: 'visit_completed',
                description: 'Zakończono wizytę: Oklejanie PPF - przednia maska',
                performedBy: 'Marek Techniczny',
                performedAt: '2024-12-10T16:00:00Z',
                metadata: { visitId: 'visit1' },
            },
            {
                id: 'act2',
                vehicleId: 'v1',
                type: 'mileage_updated',
                description: 'Zaktualizowano przebieg: 45000 km',
                performedBy: 'System',
                performedAt: '2024-12-10T14:35:00Z',
                metadata: { oldMileage: 43000, newMileage: 45000 },
            },
            {
                id: 'act3',
                vehicleId: 'v1',
                type: 'notes_updated',
                description: 'Zaktualizowano notatki techniczne',
                performedBy: 'Admin Systemowy',
                performedAt: '2024-11-20T09:15:00Z',
                metadata: {},
            },
        ],
        photos: [
            {
                id: 'photo1',
                vehicleId: 'v1',
                photoUrl: 'https://via.placeholder.com/800x600',
                thumbnailUrl: 'https://via.placeholder.com/200x150',
                description: 'Stan lakieru przed pracami',
                capturedAt: '2024-12-10T14:00:00Z',
                uploadedAt: '2024-12-10T14:05:00Z',
                visitId: 'visit1',
            },
        ],
    };
};

const mockCreateVehicle = async (payload: CreateVehiclePayload): Promise<Vehicle> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        id: `v${Date.now()}`,
        ...payload,
        vin: payload.vin || null,
        paintType: payload.paintType || null,
        currentMileage: payload.currentMileage || null,
        technicalNotes: payload.technicalNotes || '',
        status: 'active',
        owners: payload.ownerIds.map((id, idx) => ({
            customerId: id,
            customerName: `Owner ${idx + 1}`,
            role: idx === 0 ? 'PRIMARY' : 'CO_OWNER',
            assignedAt: new Date().toISOString(),
        })),
        stats: {
            totalVisits: 0,
            lastVisitDate: null,
            totalSpent: { netAmount: 0, grossAmount: 0, currency: 'PLN' },
            averageVisitCost: { netAmount: 0, grossAmount: 0, currency: 'PLN' },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
    };
};

export const vehicleApi = {
    getVehicles: async (filters: VehicleFilters): Promise<VehicleListResponse> => {
        if (USE_MOCKS) {
            return mockGetVehicles(filters);
        }
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
            ...(filters.search && { search: filters.search }),
            ...(filters.sortBy && { sortBy: filters.sortBy }),
            ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
            ...(filters.status && { status: filters.status }),
        });
        const response = await apiClient.get(`${BASE_PATH}?${params}`);
        return response.data;
    },

    getVehicleDetail: async (vehicleId: string): Promise<VehicleDetailResponse> => {
        if (USE_MOCKS) {
            return mockGetVehicleDetail(vehicleId);
        }
        const response = await apiClient.get(`${BASE_PATH}/${vehicleId}`);
        return response.data;
    },

    createVehicle: async (payload: CreateVehiclePayload): Promise<Vehicle> => {
        if (USE_MOCKS) {
            return mockCreateVehicle(payload);
        }
        const response = await apiClient.post(BASE_PATH, payload);
        return response.data.data;
    },

    updateVehicle: async (vehicleId: string, payload: UpdateVehiclePayload): Promise<Vehicle> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return { ...mockVehicleDetail, ...payload, updatedAt: new Date().toISOString() };
        }
        const response = await apiClient.patch(`${BASE_PATH}/${vehicleId}`, payload);
        return response.data.data;
    },

    deleteVehicle: async (vehicleId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return;
        }
        await apiClient.delete(`${BASE_PATH}/${vehicleId}`);
    },

    assignOwner: async (vehicleId: string, payload: AssignOwnerPayload): Promise<Vehicle> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return mockVehicleDetail;
        }
        const response = await apiClient.post(`${BASE_PATH}/${vehicleId}/owners`, payload);
        return response.data.data;
    },

    removeOwner: async (vehicleId: string, customerId: string): Promise<Vehicle> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return mockVehicleDetail;
        }
        const response = await apiClient.delete(`${BASE_PATH}/${vehicleId}/owners/${customerId}`);
        return response.data.data;
    },

    getDocuments: async (vehicleId: string, page: number, limit: number): Promise<DocumentListResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 400));
            return {
                data: [],
                pagination: { currentPage: page, totalPages: 0, totalItems: 0, itemsPerPage: limit },
            };
        }
        const response = await apiClient.get(`${BASE_PATH}/${vehicleId}/documents`, {
            params: { page, limit },
        });
        return response.data;
    },

    uploadDocument: async (vehicleId: string, payload: UploadDocumentPayload): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return;
        }
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('category', payload.category);
        formData.append('description', payload.description);
        await apiClient.post(`${BASE_PATH}/${vehicleId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadPhoto: async (vehicleId: string, payload: UploadPhotoPayload): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return;
        }
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('description', payload.description);
        if (payload.visitId) formData.append('visitId', payload.visitId);
        await apiClient.post(`${BASE_PATH}/${vehicleId}/photos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};