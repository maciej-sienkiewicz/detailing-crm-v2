// src/modules/calendar/api/calendarApi.ts

import { apiClient } from '@/core';
import type {
    CalendarEvent,
    CalendarEventsResponse,
    DateRange,
    AppointmentResponse,
    VisitResponse,
    AppointmentEventData,
    VisitEventData,
    VisitStatus,
    AppointmentStatus,
} from '../types';

/**
 * When true: single GET /v1/calendar/events request (new backend endpoint).
 * When false: legacy N-requests-per-status pattern.
 * Flip to true once the backend deploys the unified endpoint.
 */
const USE_UNIFIED_CALENDAR_API = true;

const USE_MOCKS = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getContrastingTextColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.5 ? '#000000' : '#ffffff';
};

const isVisitOverdue = (status: VisitResponse['status'], estimatedCompletionDate: string): boolean => {
    if (status !== 'IN_PROGRESS') return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const completionDate = new Date(estimatedCompletionDate);
    completionDate.setHours(0, 0, 0, 0);
    return todayStart > completionDate;
};

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

const transformAppointment = (appointment: AppointmentResponse): CalendarEvent => {
    const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
    const vehicleInfo = appointment.vehicle
        ? `${appointment.vehicle.brand} ${appointment.vehicle.model}`
        : 'Brak pojazdu';
    const serviceNames = appointment.services.map(s => s.serviceName);

    const isCancelled = appointment.status === 'ABANDONED' || appointment.status === 'CANCELLED';
    const colorHex = isCancelled ? '#111827' : (appointment.appointmentColor?.hexColor || '#94a3b8');
    const textColor = getContrastingTextColor(colorHex);

    const eventData: AppointmentEventData = {
        id: appointment.id,
        type: 'APPOINTMENT',
        customerId: appointment.customerId,
        customerName,
        customerPhone: appointment.customer.phone,
        customerEmail: appointment.customer.email,
        vehicleId: appointment.vehicleId ?? undefined,
        vehicleInfo,
        colorHex,
        appointmentTitle: appointment.appointmentTitle || undefined,
        serviceNames,
        isAllDay: appointment.schedule.isAllDay,
        totalPrice: appointment.totalGross || undefined,
        totalNet: appointment.totalNet || undefined,
        currency: 'PLN',
        status: appointment.status,
        note: appointment.note,
    };

    return {
        id: appointment.id,
        title: appointment.appointmentTitle || `${customerName} | ${vehicleInfo}`,
        start: appointment.schedule.startDateTime,
        end: appointment.schedule.endDateTime,
        allDay: appointment.schedule.isAllDay,
        backgroundColor: colorHex,
        borderColor: 'transparent',
        textColor,
        extendedProps: eventData,
        classNames: appointment.status === 'ABANDONED'
            ? ['fc-event-abandoned']
            : appointment.status === 'CANCELLED'
                ? ['fc-event-cancelled']
                : [],
        order: 2,
    };
};

const transformVisit = (visit: VisitResponse): CalendarEvent => {
    const customerName = `${visit.customer.firstName} ${visit.customer.lastName}`;
    const vehicleInfo = `${visit.vehicle.brand} ${visit.vehicle.model}`;
    const status = visit.status;

    const statusColors: Record<VisitEventData['status'], string> = {
        'IN_PROGRESS': '#f59e0b',
        'READY_FOR_PICKUP': '#10b981',
        'COMPLETED': '#6366f1',
        'REJECTED': '#ef4444',
        'ARCHIVED': '#9ca3af',
    };

    const colorHex = visit.appointmentColor?.hexColor || statusColors[status];
    const textColor = getContrastingTextColor(colorHex);
    const overdue = isVisitOverdue(status, visit.estimatedCompletionDate);

    const eventData: VisitEventData = {
        id: visit.id,
        type: 'VISIT',
        customerId: visit.customerId,
        customerName,
        customerPhone: visit.customer.phone,
        vehicleId: visit.vehicleId,
        vehicleInfo,
        visitNumber: visit.visitNumber,
        status,
        licensePlate: visit.vehicle.licensePlate,
        colorHex,
        totalPrice: visit.totalGross,
        totalNet: visit.totalNet,
        currency: 'PLN',
        technicalNotes: visit.technicalNotes,
    };

    return {
        id: visit.id,
        title: visit.title || `${visit.visitNumber} | ${customerName}`,
        start: visit.scheduledDate,
        end: visit.estimatedCompletionDate,
        allDay: false,
        backgroundColor: colorHex,
        borderColor: 'transparent',
        textColor,
        extendedProps: eventData,
        classNames: overdue ? ['fc-event-overdue'] : status === 'COMPLETED' ? ['fc-event-completed'] : [],
        order: status === 'IN_PROGRESS' ? 1 : status === 'COMPLETED' ? 3 : 2,
    };
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockAppointments: AppointmentResponse[] = [
    {
        id: 'appt_1',
        appointmentTitle: 'Oklejanie PPF',
        customer: { firstName: 'Jan', lastName: 'Kowalski', phone: '+48 123 456 789', email: 'jan@example.com' },
        vehicle: { brand: 'BMW', model: 'X5' },
        services: [
            { id: '1', serviceId: 's1', serviceName: 'Oklejanie PPF - cały przód', basePriceNet: 400000, vatRate: 23, finalPriceNet: 400000, finalPriceGross: 492000 },
            { id: '2', serviceId: 's2', serviceName: 'Powłoka ceramiczna', basePriceNet: 95000, vatRate: 23, finalPriceNet: 95000, finalPriceGross: 116850 },
        ],
        schedule: { isAllDay: false, startDateTime: '2026-01-20T09:00:00Z', endDateTime: '2026-01-20T15:00:00Z' },
        appointmentColor: { id: 'c1', name: 'Red', hexColor: '#ef4444' },
        totalNet: 495000, totalGross: 608850, totalVat: 113850, status: 'CONFIRMED',
    },
];

const mockVisits: VisitResponse[] = [];

// ---------------------------------------------------------------------------
// Fetch strategies
// ---------------------------------------------------------------------------

/**
 * New unified strategy: single request to GET /v1/calendar/events.
 * Accepts comma-separated status lists; omitting a param means "all statuses".
 */
const fetchUnified = async (
    dateRange: DateRange,
    appointmentStatuses: AppointmentStatus[],
    visitStatuses: VisitStatus[],
): Promise<CalendarEventsResponse> => {
    if (USE_MOCKS) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { appointments: mockAppointments, visits: mockVisits };
    }

    const params: Record<string, string> = {
        startDate: dateRange.start,
        endDate: dateRange.end,
    };

    if (appointmentStatuses.length > 0) {
        params.appointmentStatuses = appointmentStatuses.join(',');
    }
    if (visitStatuses.length > 0) {
        params.visitStatuses = visitStatuses.join(',');
    }

    const response = await apiClient.get<CalendarEventsResponse>('/v1/calendar/events', { params });
    return response.data;
};

/**
 * Legacy strategy: one request per status value.
 * Kept as fallback during backend migration.
 */
const fetchLegacy = async (
    dateRange: DateRange,
    appointmentStatuses: AppointmentStatus[],
    visitStatuses: VisitStatus[],
): Promise<{ appointments: AppointmentResponse[]; visits: VisitResponse[] }> => {
    if (USE_MOCKS) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { appointments: mockAppointments, visits: mockVisits };
    }

    const appointmentRequests = appointmentStatuses.map(status =>
        apiClient.get<{ appointments: AppointmentResponse[] }>('/v1/appointments', {
            params: { startDate: dateRange.start, endDate: dateRange.end, status },
        })
    );

    const visitRequests = visitStatuses.map(status =>
        apiClient.get<{ visits: VisitResponse[] }>('/visits', {
            params: { startDate: dateRange.start, endDate: dateRange.end, status },
        })
    );

    const [appointmentResponses, visitResponses] = await Promise.all([
        Promise.all(appointmentRequests),
        Promise.all(visitRequests).catch(() => []),
    ]);

    return {
        appointments: appointmentResponses.flatMap(r => r.data.appointments || []),
        visits: (visitResponses as Awaited<typeof visitRequests>).flatMap(r => r.data.visits || []),
    };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const calendarApi = {
    getCalendarEvents: async (
        dateRange: DateRange,
        appointmentStatuses: AppointmentStatus[] = [],
        visitStatuses: VisitStatus[] = [],
    ): Promise<CalendarEvent[]> => {
        if (appointmentStatuses.length === 0 && visitStatuses.length === 0) {
            return [];
        }

        const { appointments, visits } = USE_UNIFIED_CALENDAR_API
            ? await fetchUnified(dateRange, appointmentStatuses, visitStatuses)
            : await fetchLegacy(dateRange, appointmentStatuses, visitStatuses);

        return [
            ...appointments.map(transformAppointment),
            ...visits.map(transformVisit),
        ];
    },
};
