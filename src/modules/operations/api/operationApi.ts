// src/modules/operations/api/operationApi.ts

import { apiClient } from '@/core';
import type { OperationListResponse, OperationFilters, Operation, AppointmentStatus, VisitStatus } from '../types';

const USE_MOCKS_FOR_VISITS = false; // Wizyty nadal zamockowane
const USE_MOCKS_FOR_RESERVATIONS = false; // Rezerwacje z serwera

const BASE_PATH = '/operations';

// Typ dla odpowiedzi z backendu - Rezerwacje
interface AppointmentResponse {
    id: string;
    customerId: string;
    vehicleId: string | null;
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
    } | null;
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

// Typ dla odpowiedzi z backendu - Wizyty
interface VisitCustomerInfo {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    companyName: string | null;
}

interface VisitVehicleInfo {
    brand: string;
    model: string;
    licensePlate: string;
    yearOfProduction: number;
}

interface VisitResponse {
    id: string;
    visitNumber: string;
    customerId: string;
    vehicleId: string;
    customer: VisitCustomerInfo;
    vehicle: VisitVehicleInfo;
    status: string; // ACCEPTED, IN_PROGRESS, READY, COMPLETED, CANCELLED
    scheduledDate: string;
    completedDate: string | null;
    totalNet: number; // w groszach
    totalGross: number; // w groszach
    createdAt: string;
    updatedAt: string;
}

interface VisitsListResponse {
    visits: VisitResponse[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

// Funkcja mapująca dane z backendu na format frontend - Rezerwacje
const mapAppointmentToOperation = (appointment: AppointmentResponse): Operation => {
    return {
        id: appointment.id,
        type: 'RESERVATION',
        customerFirstName: appointment.customer.firstName,
        customerLastName: appointment.customer.lastName,
        customerPhone: appointment.customer.phone,
        status: appointment.status.toUpperCase() as AppointmentStatus,
        vehicle: appointment.vehicle ? {
            brand: appointment.vehicle.brand,
            model: appointment.vehicle.model,
            licensePlate: appointment.vehicle.licensePlate,
        } : null,
        startDateTime: appointment.schedule.startDateTime,
        endDateTime: appointment.schedule.endDateTime,
        financials: {
            netAmount: appointment.totalNet / 100, // Konwersja z groszy na złotówki
            grossAmount: appointment.totalGross / 100, // Konwersja z groszy na złotówki
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

// Funkcja mapująca dane z backendu na format frontend - Wizyty
const mapVisitToOperation = (visit: VisitResponse): Operation => {
    return {
        id: visit.id,
        type: 'VISIT',
        customerFirstName: visit.customer.firstName,
        customerLastName: visit.customer.lastName,
        customerPhone: visit.customer.phone,
        status: visit.status.toUpperCase() as VisitStatus,
        vehicle: {
            brand: visit.vehicle.brand,
            model: visit.vehicle.model,
            licensePlate: visit.vehicle.licensePlate,
        },
        startDateTime: visit.scheduledDate,
        endDateTime: visit.completedDate || visit.scheduledDate, // Użyj scheduledDate jako fallback
        financials: {
            netAmount: visit.totalNet / 100, // Konwersja z groszy na złotówki
            grossAmount: visit.totalGross / 100, // Konwersja z groszy na złotówki
            currency: 'PLN',
        },
        lastModification: {
            timestamp: visit.updatedAt,
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
            (op.vehicle?.licensePlate?.toLowerCase().includes(searchLower) ?? false)
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
        // Jeśli filtrujemy tylko wizyty - pobierz z /api/visits
        if (filters.type === 'VISIT') {
            if (USE_MOCKS_FOR_VISITS) {
                return mockGetVisits(filters);
            }

            const params = new URLSearchParams({
                page: filters.page.toString(),
                size: filters.limit.toString(),
            });

            if (filters.status) {
                params.append('status', filters.status);
            }

            const response = await apiClient.get<VisitsListResponse>(
                `/visits?${params.toString()}`
            );

            // Mapuj dane z backendu na format frontend
            const mappedData = response.data.visits.map(mapVisitToOperation);

            // Filtruj po wyszukiwaniu lokalnie (backend nie wspiera tego parametru)
            let filteredData = mappedData;
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filteredData = mappedData.filter(op =>
                    op.customerLastName.toLowerCase().includes(searchLower) ||
                    op.customerFirstName.toLowerCase().includes(searchLower) ||
                    op.customerPhone.includes(filters.search) ||
                    (op.vehicle?.licensePlate?.toLowerCase().includes(searchLower) ?? false)
                );
            }

            return {
                data: filteredData,
                pagination: {
                    currentPage: response.data.pagination.page,
                    totalPages: response.data.pagination.totalPages,
                    totalItems: response.data.pagination.total,
                    itemsPerPage: response.data.pagination.pageSize,
                },
            };
        }

        // Jeśli filtrujemy tylko rezerwacje - pobierz z /api/v1/appointments
        if (filters.type === 'RESERVATION') {
            if (USE_MOCKS_FOR_RESERVATIONS) {
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
                `/v1/appointments?${params.toString()}`
            );

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
        const fetchVisits = async (): Promise<OperationListResponse> => {
            if (USE_MOCKS_FOR_VISITS) {
                return mockGetVisits(filters);
            }

            const params = new URLSearchParams({
                page: filters.page.toString(),
                size: filters.limit.toString(),
            });

            const response = await apiClient.get<VisitsListResponse>(
                `/visits?${params.toString()}`
            );

            const mappedData = response.data.visits.map(mapVisitToOperation);

            return {
                data: mappedData,
                pagination: {
                    currentPage: response.data.pagination.page,
                    totalPages: response.data.pagination.totalPages,
                    totalItems: response.data.pagination.total,
                    itemsPerPage: response.data.pagination.pageSize,
                },
            };
        };

        const fetchReservations = async (): Promise<OperationListResponse> => {
            if (USE_MOCKS_FOR_RESERVATIONS) {
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
                `/v1/appointments?${params.toString()}`
            );

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
        };

        const [visitsResult, reservationsResult] = await Promise.all([
            fetchVisits(),
            fetchReservations()
        ]);

        // Połącz dane i posortuj po dacie
        let combinedData = [...visitsResult.data, ...reservationsResult.data];

        // Filtruj po wyszukiwaniu
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            combinedData = combinedData.filter(op =>
                op.customerLastName.toLowerCase().includes(searchLower) ||
                op.customerFirstName.toLowerCase().includes(searchLower) ||
                op.customerPhone.includes(filters.search) ||
                (op.vehicle?.licensePlate?.toLowerCase().includes(searchLower) ?? false)
            );
        }

        // Filtruj po statusie
        if (filters.status) {
            combinedData = combinedData.filter(op => op.status === filters.status);
        }

        // Sortuj po dacie
        combinedData.sort((a, b) => {
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

    updateReservationDate: async (
        reservationId: string,
        startDateTime: string,
        endDateTime: string
    ): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${reservationId}`, {
            schedule: {
                startDateTime,
                endDateTime,
            },
        });
    },

    cancelReservation: async (reservationId: string): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${reservationId}`, {
            status: 'CANCELLED',
        });
    },
};