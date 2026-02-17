// src/modules/vehicles/api/vehicleApi.ts

import { apiClient } from '@/core/apiClient';
import type {
    VehicleListResponse,
    VehicleDetailResponse,
    VehicleFilters,
    CreateVehiclePayload,
    UpdateVehiclePayload,
    AssignOwnerPayload,
    UploadPhotoPayload,
    VehiclePhotoGalleryResponse,
    UploadVehiclePhotoPayload,
    UploadVehiclePhotoResponse,
    Vehicle,
    VehicleListItem,
    VehicleVisitsResponse,
    VehicleAppointmentsResponse,
    VehicleDocument,
    VehicleDocumentUploadResponse,
    UploadVehicleDocumentPayload,
} from '../types';

const BASE_PATH = '/v1/vehicles';
const USE_MOCKS = false;

const mockVehicles: VehicleListItem[] = [
    {
        id: 'v1',
        licensePlate: 'WA 12345',
        brand: 'BMW',
        model: 'X5',
        yearOfProduction: 2021,
        status: 'active',
        engineType: 'GASOLINE',
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
        engineType: 'DIESEL',
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
        engineType: 'DIESEL',
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
    yearOfProduction: 2021,
    color: 'Czarny metalik',
    paintType: 'Lakier bazowy + lakier',
    engineType: 'GASOLINE',
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

const mockGetVehicleDetail = async (_vehicleId: string): Promise<VehicleDetailResponse> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
        vehicle: mockVehicleDetail,
        recentVisits: [
            {
                id: 'visit1',
                date: '2024-12-10T14:30:00Z',
                description: 'Oklejanie PPF - przednia maska',
                status: 'completed',
                totalCost: {
                    netAmount: 2000.00,
                    grossAmount: 2460.00,
                    currency: 'PLN',
                },
                createdBy: 'Marek Techniczny',
            },
            {
                id: 'visit2',
                date: '2024-10-15T10:00:00Z',
                description: 'Naprawa wgnieceń',
                status: 'completed',
                totalCost: {
                    netAmount: 1500.00,
                    grossAmount: 1845.00,
                    currency: 'PLN',
                },
                createdBy: 'Jan Blacharz',
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

    getDocuments: async (vehicleId: string): Promise<VehicleDocument[]> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 400));
            return [];
        }
        const response = await apiClient.get<{ documents: VehicleDocument[] }>(
            `${BASE_PATH}/${vehicleId}/documents`
        );
        return response.data.documents;
    },

    uploadDocument: async (vehicleId: string, payload: UploadVehicleDocumentPayload): Promise<VehicleDocument> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                id: `doc_${Date.now()}`,
                name: payload.name || payload.file.name,
                fileName: payload.file.name,
                fileUrl: `https://s3.example.com/${payload.file.name}`,
                uploadedAt: new Date().toISOString(),
                uploadedByName: 'Current User',
                source: 'VEHICLE',
            };
        }

        // Step 1: Initiate upload — backend returns presigned S3 URL
        const initiateResponse = await apiClient.post<VehicleDocumentUploadResponse>(
            `${BASE_PATH}/${vehicleId}/documents`,
            {
                name: payload.name || payload.file.name,
                fileName: payload.file.name,
                contentType: payload.file.type || 'application/octet-stream',
            }
        );
        const { documentId, uploadUrl } = initiateResponse.data;

        // Step 2: Upload file binary directly to S3 (no auth headers)
        const s3Response = await fetch(uploadUrl, {
            method: 'PUT',
            body: payload.file,
            headers: { 'Content-Type': payload.file.type || 'application/octet-stream' },
        });

        if (!s3Response.ok) {
            throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}`);
        }

        return {
            id: documentId,
            name: payload.name || payload.file.name,
            fileName: payload.file.name,
            fileUrl: '',
            uploadedAt: new Date().toISOString(),
            uploadedByName: '',
            source: 'VEHICLE',
        };
    },

    deleteDocument: async (vehicleId: string, documentId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return;
        }
        await apiClient.delete(`${BASE_PATH}/${vehicleId}/documents/${documentId}`);
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

    // New photo gallery endpoints
    getPhotoGallery: async (vehicleId: string, page: number = 1, pageSize: number = 20): Promise<VehiclePhotoGalleryResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockPhotos = [
                {
                    id: 'photo1',
                    source: 'VEHICLE' as const,
                    sourceId: vehicleId,
                    fileName: 'vehicle-front.jpg',
                    photoUrl: 'https://via.placeholder.com/800x600/0ea5e9/ffffff?text=Front+View',
                    thumbnailUrl: 'https://via.placeholder.com/200x150/0ea5e9/ffffff?text=Front',
                    fullSizeUrl: 'https://via.placeholder.com/1920x1080/0ea5e9/ffffff?text=Front+View+HD',
                    description: 'Widok z przodu pojazdu',
                    uploadedAt: '2024-12-10T14:00:00Z',
                },
                {
                    id: 'photo2',
                    source: 'VISIT' as const,
                    sourceId: 'visit1',
                    fileName: 'before-work.jpg',
                    photoUrl: 'https://via.placeholder.com/800x600/10b981/ffffff?text=Before+Work',
                    thumbnailUrl: 'https://via.placeholder.com/200x150/10b981/ffffff?text=Before',
                    fullSizeUrl: 'https://via.placeholder.com/1920x1080/10b981/ffffff?text=Before+Work+HD',
                    description: 'Stan przed rozpoczęciem prac - wizyta PPF',
                    uploadedAt: '2024-12-10T14:30:00Z',
                    visitNumber: 'VIS-2024-00123',
                },
                {
                    id: 'photo3',
                    source: 'VISIT' as const,
                    sourceId: 'visit1',
                    fileName: 'after-work.jpg',
                    photoUrl: 'https://via.placeholder.com/800x600/f59e0b/ffffff?text=After+Work',
                    thumbnailUrl: 'https://via.placeholder.com/200x150/f59e0b/ffffff?text=After',
                    fullSizeUrl: 'https://via.placeholder.com/1920x1080/f59e0b/ffffff?text=After+Work+HD',
                    description: 'Stan po zakończeniu prac - wizyta PPF',
                    uploadedAt: '2024-12-10T16:00:00Z',
                    visitNumber: 'VIS-2024-00123',
                },
                {
                    id: 'photo4',
                    source: 'VEHICLE' as const,
                    sourceId: vehicleId,
                    fileName: 'vehicle-side.jpg',
                    photoUrl: 'https://via.placeholder.com/800x600/8b5cf6/ffffff?text=Side+View',
                    thumbnailUrl: 'https://via.placeholder.com/200x150/8b5cf6/ffffff?text=Side',
                    fullSizeUrl: 'https://via.placeholder.com/1920x1080/8b5cf6/ffffff?text=Side+View+HD',
                    description: 'Widok z boku',
                    uploadedAt: '2024-11-20T10:00:00Z',
                },
            ];

            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const paginatedPhotos = mockPhotos.slice(start, end);

            return {
                photos: paginatedPhotos,
                pagination: {
                    total: mockPhotos.length,
                    page,
                    pageSize,
                    totalPages: Math.ceil(mockPhotos.length / pageSize),
                },
            };
        }

        const response = await apiClient.get(`${BASE_PATH}/${vehicleId}/photos/gallery`, {
            params: { page, pageSize },
        });
        return response.data;
    },

    uploadVehiclePhoto: async (vehicleId: string, payload: UploadVehiclePhotoPayload): Promise<UploadVehiclePhotoResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 800));
            return {
                photoId: `photo${Date.now()}`,
                uploadUrl: 'https://mock-upload-url.example.com',
            };
        }

        const response = await apiClient.post(`${BASE_PATH}/${vehicleId}/photos`, payload);
        return response.data;
    },

    deleteVehiclePhoto: async (vehicleId: string, photoId: string): Promise<void> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return;
        }

        await apiClient.delete(`${BASE_PATH}/${vehicleId}/photos/${photoId}`);
    },

    getVisits: async (vehicleId: string, page = 1, limit = 50): Promise<VehicleVisitsResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 400));
            return { visits: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: limit } };
        }

        const response = await apiClient.get<VehicleVisitsResponse>(
            `${BASE_PATH}/${vehicleId}/visits`,
            { params: { page, limit } }
        );
        return response.data;
    },

    getAppointments: async (vehicleId: string, page = 1, limit = 50): Promise<VehicleAppointmentsResponse> => {
        if (USE_MOCKS) {
            await new Promise(resolve => setTimeout(resolve, 400));
            return { appointments: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: limit } };
        }

        const response = await apiClient.get<VehicleAppointmentsResponse>(
            `${BASE_PATH}/${vehicleId}/appointments`,
            { params: { page, limit } }
        );
        return response.data;
    },
};
