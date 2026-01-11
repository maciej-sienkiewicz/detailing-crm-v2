// src/modules/operations/api/operationApi.ts

import { apiClient } from '@/core';
import type { OperationListResponse, OperationFilters } from '../types';

const USE_MOCKS = true;

const BASE_PATH = '/api/operations';

const mockOperations: OperationListResponse = {
    data: [
        {
            id: '1',
            type: 'VISIT',
            customerFirstName: 'Jan',
            customerLastName: 'Kowalski',
            customerPhone: '+48 123 456 789',
            status: 'IN_PROGRESS',
            vehicle: {
                brand: 'BMW',
                model: 'X5',
                licensePlate: 'WA 12345',
            },
            startDateTime: '2026-01-11T09:00:00Z',
            endDateTime: '2026-01-11T12:00:00Z',
            financials: {
                netAmount: 2032.52,
                grossAmount: 2500.00,
                currency: 'PLN',
            },
            lastModification: {
                timestamp: '2026-01-11T10:30:00Z',
                performedBy: {
                    firstName: 'Anna',
                    lastName: 'Mechanik',
                },
            },
        },
        {
            id: '2',
            type: 'RESERVATION',
            customerFirstName: 'Anna',
            customerLastName: 'Nowak',
            customerPhone: '+48 987 654 321',
            status: 'SCHEDULED',
            vehicle: {
                brand: 'Audi',
                model: 'A4',
                licensePlate: 'KR 67890',
            },
            startDateTime: '2026-01-12T14:00:00Z',
            endDateTime: '2026-01-12T16:00:00Z',
            financials: {
                netAmount: 1463.41,
                grossAmount: 1800.00,
                currency: 'PLN',
            },
            lastModification: {
                timestamp: '2026-01-10T15:45:00Z',
                performedBy: {
                    firstName: 'Piotr',
                    lastName: 'Kowalczyk',
                },
            },
        },
        {
            id: '3',
            type: 'VISIT',
            customerFirstName: 'Piotr',
            customerLastName: 'Wiśniewski',
            customerPhone: '+48 555 123 456',
            status: 'READY_FOR_PICKUP',
            vehicle: {
                brand: 'Mercedes',
                model: 'C-Class',
                licensePlate: 'GD 11111',
            },
            startDateTime: '2026-01-10T10:00:00Z',
            endDateTime: '2026-01-10T13:00:00Z',
            financials: {
                netAmount: 2601.63,
                grossAmount: 3200.00,
                currency: 'PLN',
            },
            lastModification: {
                timestamp: '2026-01-10T12:15:00Z',
                performedBy: {
                    firstName: 'Marek',
                    lastName: 'Serwisant',
                },
            },
        },
        {
            id: '4',
            type: 'VISIT',
            customerFirstName: 'Katarzyna',
            customerLastName: 'Zielińska',
            customerPhone: '+48 666 777 888',
            status: 'COMPLETED',
            vehicle: {
                brand: 'Toyota',
                model: 'Corolla',
                licensePlate: 'PO 22222',
            },
            startDateTime: '2026-01-09T08:00:00Z',
            endDateTime: '2026-01-09T11:00:00Z',
            financials: {
                netAmount: 812.20,
                grossAmount: 999.00,
                currency: 'PLN',
            },
            lastModification: {
                timestamp: '2026-01-09T11:30:00Z',
                performedBy: {
                    firstName: 'Anna',
                    lastName: 'Mechanik',
                },
            },
        },
        {
            id: '5',
            type: 'RESERVATION',
            customerFirstName: 'Tomasz',
            customerLastName: 'Lewandowski',
            customerPhone: '+48 777 888 999',
            status: 'CANCELLED',
            vehicle: {
                brand: 'Volkswagen',
                model: 'Golf',
                licensePlate: 'WR 33333',
            },
            startDateTime: '2026-01-15T10:00:00Z',
            endDateTime: '2026-01-15T12:00:00Z',
            financials: {
                netAmount: 0,
                grossAmount: 0,
                currency: 'PLN',
            },
            lastModification: {
                timestamp: '2026-01-08T14:20:00Z',
                performedBy: {
                    firstName: 'Piotr',
                    lastName: 'Kowalczyk',
                },
            },
        },
        {
            id: '6',
            type: 'RESERVATION',
            customerFirstName: 'Magdalena',
            customerLastName: 'Krawczyk',
            customerPhone: '+48 888 999 000',
            status: 'SCHEDULED',
            vehicle: {
                brand: 'Ford',
                model: 'Focus',
                licensePlate: 'GD 44444',
            },
            startDateTime: '2026-01-14T09:00:00Z',
            endDateTime: '2026-01-14T11:00:00Z',
            financials: {
                netAmount: 1219.51,
                grossAmount: 1500.00,
                currency: 'PLN',
            },
            lastModification: {
                timestamp: '2026-01-11T08:00:00Z',
                performedBy: {
                    firstName: 'Anna',
                    lastName: 'Mechanik',
                },
            },
        },
    ],
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 6,
        itemsPerPage: 20,
    },
};

const mockGetOperations = async (filters: OperationFilters): Promise<OperationListResponse> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    let filteredData = [...mockOperations.data];

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(op =>
            op.customerLastName.toLowerCase().includes(searchLower) ||
            op.customerPhone.includes(filters.search) ||
            op.vehicle.licensePlate.toLowerCase().includes(searchLower)
        );
    }

    if (filters.type) {
        filteredData = filteredData.filter(op => op.type === filters.type);
    }

    if (filters.status) {
        filteredData = filteredData.filter(op => op.status === filters.status);
    }

    return {
        data: filteredData,
        pagination: {
            ...mockOperations.pagination,
            totalItems: filteredData.length,
        },
    };
};

const mockDeleteOperation = async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Soft delete operation: ${id}`);
};

export const operationApi = {
    getOperations: async (filters: OperationFilters): Promise<OperationListResponse> => {
        if (USE_MOCKS) {
            return mockGetOperations(filters);
        }

        const params = new URLSearchParams({
            search: filters.search,
            page: filters.page.toString(),
            limit: filters.limit.toString(),
            ...(filters.type && { type: filters.type }),
            ...(filters.status && { status: filters.status }),
            ...(filters.sortBy && { sortBy: filters.sortBy }),
            ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
        });

        const response = await apiClient.get<OperationListResponse>(
            `${BASE_PATH}?${params.toString()}`
        );
        return response.data;
    },

    deleteOperation: async (id: string): Promise<void> => {
        if (USE_MOCKS) {
            return mockDeleteOperation(id);
        }

        await apiClient.delete(`${BASE_PATH}/${id}`);
    },
};