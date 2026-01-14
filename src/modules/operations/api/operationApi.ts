// src/modules/operations/api/operationApi.ts

import { apiClient } from '@/core';
import type { OperationListResponse, OperationFilters, Operation } from '../types';

const USE_MOCKS_FOR_VISITS = true; // Wizyty nadal zamockowane
const USE_MOCKS_FOR_RESERVATIONS = false; // Rezerwacje z serwera

const BASE_PATH = '/api/operations';

// Typ dla odpowiedzi z backendu
interface AppointmentResponse {
    id: string;
    customerId: string;
    vehicleId: string;
    customer: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    vehicle: {
        brand: string;
        model: string;
        year: number;
        licensePlate: string;
    };
    schedule: {
        isAllDay: boolean;
        startDateTime: string;
        endDateTime: string;
    };
    status: string;
    totalNet: number;
    totalGross: number;
    totalVat: number;
    createdAt: string;
    updatedAt: string;
}

interface AppointmentsListResponse {
    appointments: AppointmentResponse[];
}

// Funkcja mapująca dane z backendu na format frontend
const mapAppointmentToOperation = (appointment: AppointmentResponse): Operation => {
    // Mapowanie statusu z backendu na frontend
    const mapStatus = (backendStatus: string) => {
        switch (backendStatus) {
            case 'CREATED':
                return 'SCHEDULED';
            case 'IN_PROGRESS':
                return 'IN_PROGRESS';
            case 'READY_FOR_PICKUP':
                return 'READY_FOR_PICKUP';
            case 'COMPLETED':
                return 'COMPLETED';
            case 'CANCELLED':
                return 'CANCELLED';
            default:
                return 'SCHEDULED';
        }
    };

    return {
        id: appointment.id,
        type: 'RESERVATION',
        customerFirstName: appointment.customer.firstName,
        customerLastName: appointment.customer.lastName,
        customerPhone: appointment.customer.phone,
        status: mapStatus(appointment.status),
        vehicle: {
            brand: appointment.vehicle.brand,
            model: appointment.vehicle.model,
            licensePlate: appointment.vehicle.licensePlate,
        },
        startDateTime: appointment.schedule.startDateTime,
        endDateTime: appointment.schedule.endDateTime,
        financials: {
            netAmount: appointment.totalNet,
            grossAmount: appointment.totalGross,
            currency: 'PLN',
        },
        lastModification: {
            timestamp: appointment.updatedAt,
            performedBy: {
                firstName: 'System', // Backend nie zwraca tej informacji
                lastName: '',
            },
        },
    };
};

// Mock data tylko dla wizyt
const mockVisits = [
    {
        id: '1',
        type: 'VISIT' as const,
        customerFirstName: 'Jan',
        customerLastName: 'Kowalski',
        customerPhone: '+48 123 456 789',
        status: 'IN_PROGRESS' as const,
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
        id: '3',
        type: 'VISIT' as const,
        customerFirstName: 'Piotr',
        customerLastName: 'Wiśniewski',
        customerPhone: '+48 555 123 456',
        status: 'READY_FOR_PICKUP' as const,
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
        type: 'VISIT' as const,
        customerFirstName: 'Katarzyna',
        customerLastName: 'Zielińska',
        customerPhone: '+48 666 777 888',
        status: 'COMPLETED' as const,
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
];

const mockGetVisits = async (filters: OperationFilters): Promise<OperationListResponse> => {
    await new Promise(resolve => setTimeout(resolve, 400));

    let filteredData = [...mockVisits];

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(op =>
            op.customerLastName.toLowerCase().includes(searchLower) ||
            op.customerPhone.includes(filters.search) ||
            op.vehicle.licensePlate.toLowerCase().includes(searchLower)
        );
    }

    if (filters.status) {
        filteredData = filteredData.filter(op => op.status === filters.status);
    }

    return {
        data: filteredData,
        pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: filteredData.length,
            itemsPerPage: 20,
        },
    };
};

const mockDeleteOperation = async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Soft delete operation: ${id}`);
};

export const operationApi = {
    getOperations: async (filters: OperationFilters): Promise<OperationListResponse> => {
        // Jeśli filtrujemy tylko wizyty - zwróć mocki
        if (filters.type === 'VISIT') {
            if (USE_MOCKS_FOR_VISITS) {
                return mockGetVisits(filters);
            }
        }

        // Jeśli filtrujemy tylko rezerwacje - pobierz z serwera
        if (filters.type === 'RESERVATION') {
            if (USE_MOCKS_FOR_RESERVATIONS) {
                // Teoretycznie można by tu dodać mocki dla rezerwacji
                return { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 } };
            }

            const params = new URLSearchParams({
                ...(filters.search && { search: filters.search }),
                page: filters.page.toString(),
                limit: filters.limit.toString(),
                ...(filters.status && { status: filters.status }),
                ...(filters.sortBy && { sortBy: filters.sortBy }),
                ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
            });

            const response = await apiClient.get<AppointmentsListResponse>(
                `/api/v1/appointments?${params.toString()}`
            );

            // Mapuj dane z backendu na format frontend
            const mappedData = response.data.appointments.map(mapAppointmentToOperation);

            return {
                data: mappedData,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: mappedData.length,
                    itemsPerPage: 20,
                },
            };
        }

        // Jeśli brak filtru typu - pobierz oba źródła i połącz
        const visitsPromise = USE_MOCKS_FOR_VISITS ? mockGetVisits(filters) : Promise.resolve({ data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 } });

        const reservationsPromise = USE_MOCKS_FOR_RESERVATIONS
            ? Promise.resolve({ data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 } })
            : (async () => {
                const params = new URLSearchParams({
                    ...(filters.search && { search: filters.search }),
                    page: filters.page.toString(),
                    limit: filters.limit.toString(),
                    ...(filters.status && { status: filters.status }),
                    ...(filters.sortBy && { sortBy: filters.sortBy }),
                    ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
                });

                const response = await apiClient.get<AppointmentsListResponse>(
                    `/api/v1/appointments?${params.toString()}`
                );

                // Mapuj dane z backendu na format frontend
                const mappedData = response.data.appointments.map(mapAppointmentToOperation);

                return {
                    data: mappedData,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalItems: mappedData.length,
                        itemsPerPage: 20,
                    },
                };
            })();

        const [visitsResult, reservationsResult] = await Promise.all([visitsPromise, reservationsPromise]);

        // Połącz dane i posortuj po dacie
        const combinedData = [...visitsResult.data, ...reservationsResult.data].sort((a, b) => {
            return new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime();
        });

        return {
            data: combinedData,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: combinedData.length,
                itemsPerPage: 20,
            },
        };
    },

    deleteOperation: async (id: string): Promise<void> => {
        if (USE_MOCKS_FOR_VISITS) {
            return mockDeleteOperation(id);
        }

        await apiClient.delete(`${BASE_PATH}/${id}`);
    },
};