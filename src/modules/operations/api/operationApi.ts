// src/modules/operations/api/operationApi.ts

import { apiClient } from '@/core';
import type { OperationListResponse, OperationFilters, Operation, AppointmentStatus, VisitStatus } from '../types';
import type { RecurrenceEditScope } from '@/modules/appointments/types';


const BASE_PATH = '/operations';

// Typ dla odpowiedzi z backendu - Rezerwacje
interface AppointmentResponse {
    id: string;
    appointmentTitle?: string;
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
    recurrenceInfo?: {
        seriesId: string;
        recurrenceIndex: number;
        totalInSeries: number;
        isDetached: boolean;
    } | null;
    smsInfo?: {
        confirmationSms: { status: 'SENT' | 'FAILED'; sentAt: string } | null;
        reminderSms: { requested: boolean; status: string | null; sentAt: string | null; editable: boolean };
    };
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        notes?: string | null;
    } | null;
}

interface AppointmentsListResponse {
    appointments: AppointmentResponse[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
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
    title?: string;
    visitNumber: string;
    customerId: string;
    vehicleId: string;
    customer: VisitCustomerInfo;
    vehicle: VisitVehicleInfo;
    status: string; // ACCEPTED, IN_PROGRESS, READY, COMPLETED, CANCELLED
    scheduledDate: string;
    estimatedCompletionDate: string | null;
    totalNet: number; // w groszach
    totalGross: number; // w groszach
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        status: string;
    } | null;
}

/** GET /v1/operations: wizyty i rezerwacje w kształcie ich własnych list. */
interface CombinedOperationsResponse {
    items: Array<{ type: 'VISIT' | 'RESERVATION'; visit?: VisitResponse; appointment?: AppointmentResponse }>;
    pagination: OperationListResponse['pagination'];
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
        title: appointment.appointmentTitle,
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
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
            netAmount: appointment.totalNet / 100,
            grossAmount: appointment.totalGross / 100,
            currency: 'PLN',
        },
        lastModification: {
            timestamp: appointment.updatedAt,
            performedBy: {
                firstName: 'System',
                lastName: '',
            },
        },
        recurrenceInfo: appointment.recurrenceInfo ?? null,
        smsInfo: appointment.smsInfo as Operation['smsInfo'],
        doorToDoor: appointment.doorToDoor ? {
            hasPickup: !!(appointment.doorToDoor.pickupCity || appointment.doorToDoor.pickupStreet),
            hasDelivery: !!(appointment.doorToDoor.deliveryCity || appointment.doorToDoor.deliveryStreet),
        } : null,
    };
};

// Funkcja mapująca dane z backendu na format frontend - Wizyty
const mapVisitToOperation = (visit: VisitResponse): Operation => {
    return {
        id: visit.id,
        type: 'VISIT',
        title: visit.title,
        customerId: visit.customerId,
        vehicleId: visit.vehicleId,
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
        endDateTime: visit.estimatedCompletionDate || visit.scheduledDate, // Użyj scheduledDate jako fallback
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
        deletedAt: visit.deletedAt ?? null,
        doorToDoor: visit.doorToDoor ? {
            hasPickup: !!(visit.doorToDoor.pickupCity || visit.doorToDoor.pickupStreet),
            hasDelivery: !!(visit.doorToDoor.deliveryCity || visit.doorToDoor.deliveryStreet),
        } : null,
    };
};

export const operationApi = {
    getOperations: async (filters: OperationFilters, signal?: AbortSignal): Promise<OperationListResponse> => {
        // Usunięte wizyty - osobny endpoint
        if (filters.deleted) {
            const params = new URLSearchParams({
                page: filters.page.toString(),
                size: filters.limit.toString(),
            });
            if (filters.search) params.append('search', filters.search);
            if (filters.scheduledDate) params.append('scheduledDate', filters.scheduledDate);

            const response = await apiClient.get<VisitsListResponse>(
                `/visits/deleted?${params.toString()}`
            );

            const p = response.data.pagination as any;
            const mappedData = response.data.visits.map(v =>
                mapVisitToOperation({ ...v, deletedAt: (v as any).deletedAt ?? null })
            );

            return {
                data: mappedData,
                pagination: {
                    currentPage: p.page ?? p.currentPage ?? 1,
                    totalPages: p.totalPages ?? 1,
                    totalItems: p.total ?? p.totalItems ?? mappedData.length,
                    itemsPerPage: p.pageSize ?? p.itemsPerPage ?? filters.limit,
                },
            };
        }

        // Jeśli filtrujemy tylko wizyty - pobierz z /api/visits
        if (filters.type === 'VISIT') {
            const params = new URLSearchParams({
                page: filters.page.toString(),
                size: filters.limit.toString(),
            });

            if (filters.status) params.append('status', filters.status);
            if (filters.search?.trim()) params.append('search', filters.search.trim());
            if (filters.scheduledDate) params.append('scheduledDate', filters.scheduledDate);
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.minAmount != null) params.append('minAmount', filters.minAmount.toString());
            if (filters.maxAmount != null) params.append('maxAmount', filters.maxAmount.toString());
            if (filters.serviceCountMin != null) params.append('serviceCountMin', filters.serviceCountMin.toString());
            if (filters.serviceCountMax != null) params.append('serviceCountMax', filters.serviceCountMax.toString());
            if (filters.vehicleBrand) params.append('vehicleBrand', filters.vehicleBrand);
            if (filters.vehicleModel) params.append('vehicleModel', filters.vehicleModel);
            if (filters.serviceIds?.length) filters.serviceIds.forEach(id => params.append('serviceIds', id));

            const response = await apiClient.get<VisitsListResponse>(
                `/visits?${params.toString()}`
            );

            // Mapuj dane z backendu na format frontend
            const mappedData = response.data.visits.map(mapVisitToOperation);

            // Wyszukiwanie robi serwer (parametr `search`). Dawniej filtrowano tu lokalnie
            // tylko bieżącą stronę - wizyta z drugiej strony była „nie do znalezienia",
            // a „Jan Kowalski" nie pasował, bo imię i nazwisko porównywano osobno.
            return {
                data: mappedData,
                pagination: {
                    currentPage: response.data.pagination.page,
                    totalPages: response.data.pagination.totalPages,
                    totalItems: response.data.pagination.total,
                    itemsPerPage: response.data.pagination.pageSize,
                },
            };
        }

        // Jeśli filtrujemy tylko rezerwacje - pobierz z /api/v1/appointments
        // Zakładka "Rezerwacje" pokazuje wyłącznie zaplanowane rezerwacje (CREATED)
        if (filters.type === 'RESERVATION') {
            // Fetch only CREATED appointments for the Reservations tab
            const createdResponse = await apiClient.get<AppointmentsListResponse>(`/v1/appointments`, {
                params: {
                    ...(filters.search?.trim() && { search: filters.search.trim() }),
                    page: filters.page.toString(),
                    limit: filters.limit.toString(),
                    status: 'CREATED',
                    ...(filters.scheduledDate && { scheduledDate: filters.scheduledDate }),
                    ...(filters.sortBy && { sortBy: filters.sortBy }),
                    ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
                }
            });

            const mappedData = (createdResponse.data.appointments || []).map(mapAppointmentToOperation);
            // Paginacja z serwera: na sztywno „1 strona" ukrywała rezerwacje spoza pierwszej strony.
            const p = createdResponse.data.pagination;

            return {
                data: mappedData,
                pagination: {
                    currentPage: p?.currentPage ?? filters.page,
                    totalPages: p?.totalPages ?? 1,
                    totalItems: p?.totalItems ?? mappedData.length,
                    itemsPerPage: p?.itemsPerPage ?? filters.limit,
                },
            };
        }

        // „Wszystkie" i „Odrzucone": wizyty i rezerwacje razem, scalone i stronicowane przez
        // serwer (GET /v1/operations). Dawniej cztery zapytania na stronę sklejane tutaj:
        // strona miała do czterech razy więcej wierszy niż limit, kolejność między stronami
        // była zła, a „Odrzucone" brały wizyty bez filtra i filtrowały jedną stronę lokalnie.
        // Porzucone (ABANDONED) i anulowane (CANCELLED) rezerwacje stoją razem z odrzuconymi
        // wizytami (REJECTED).
        const rejected = filters.status === 'REJECTED';
        const params = new URLSearchParams({
            page: filters.page.toString(),
            limit: filters.limit.toString(),
            appointmentStatuses: (rejected ? ['ABANDONED', 'CANCELLED'] : ['CREATED', 'ABANDONED', 'CANCELLED']).join(','),
        });
        if (filters.status) params.append('visitStatus', filters.status);
        if (filters.search?.trim()) params.append('search', filters.search.trim());
        if (filters.scheduledDate) params.append('scheduledDate', filters.scheduledDate);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.minAmount != null) params.append('minAmount', filters.minAmount.toString());
        if (filters.maxAmount != null) params.append('maxAmount', filters.maxAmount.toString());
        if (filters.serviceCountMin != null) params.append('serviceCountMin', filters.serviceCountMin.toString());
        if (filters.serviceCountMax != null) params.append('serviceCountMax', filters.serviceCountMax.toString());
        if (filters.vehicleBrand) params.append('vehicleBrand', filters.vehicleBrand);
        if (filters.vehicleModel) params.append('vehicleModel', filters.vehicleModel);
        if (filters.serviceIds?.length) filters.serviceIds.forEach(id => params.append('serviceIds', id));

        const response = await apiClient.get<CombinedOperationsResponse>(`/v1/operations?${params}`, { signal });
        return {
            data: response.data.items.map(item =>
                item.visit ? mapVisitToOperation(item.visit) : mapAppointmentToOperation(item.appointment!)),
            pagination: response.data.pagination,
        };
    },

    deleteOperation: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${id}`);
    },

    deleteVisit: async (visitId: string): Promise<void> => {
        await apiClient.delete(`/visits/${visitId}`);
    },

    updateReservationDate: async (
        reservationId: string,
        startDateTime: string,
        endDateTime: string
    ): Promise<void> => {
        // Własne wejście na termin: PATCH /appointments/{id} umie tylko anulować i na termin
        // odpowiadał 400, więc „Zmień datę" na liście nie działało nigdy.
        await apiClient.patch(`/v1/appointments/${reservationId}/schedule`, {
            startDateTime,
            endDateTime,
        });
    },

    cancelReservation: async (reservationId: string): Promise<void> => {
        await apiClient.patch(`/v1/appointments/${reservationId}`, {
            status: 'CANCELLED',
        });
    },

    restoreAppointment: async (appointmentId: string): Promise<void> => {
        await apiClient.post(`/v1/appointments/${appointmentId}/restore`);
    },

    deleteAppointment: async (appointmentId: string): Promise<void> => {
        await apiClient.delete(`/v1/appointments/${appointmentId}`);
    },

    deleteAppointmentWithScope: async (
        appointmentId: string,
        scope: RecurrenceEditScope
    ): Promise<void> => {
        await apiClient.delete(`/v1/appointments/${appointmentId}?scope=${scope}`);
    },
};