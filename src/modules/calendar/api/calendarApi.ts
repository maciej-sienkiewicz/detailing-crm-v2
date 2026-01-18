// src/modules/calendar/api/calendarApi.ts

import { apiClient } from '@/core';
import type {
    CalendarEvent,
    DateRange,
    AppointmentResponse,
    VisitResponse,
    AppointmentEventData,
    VisitEventData,
} from '../types';

const USE_MOCKS = false;

/**
 * Calculate text color (black or white) based on background luminance
 * Uses WCAG formula for relative luminance
 */
const getContrastingTextColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    // Calculate relative luminance
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Mock data for development
const mockAppointments: AppointmentResponse[] = [
    {
        id: 'appt_1',
        appointmentTitle: 'Oklejanie PPF',
        customer: {
            firstName: 'Jan',
            lastName: 'Kowalski',
            phone: '+48 123 456 789',
            email: 'jan@example.com',
        },
        vehicle: {
            brand: 'BMW',
            model: 'X5',
        },
        services: [
            {
                id: '1',
                serviceId: 's1',
                serviceName: 'Oklejanie PPF - cały przód',
                basePriceNet: 400000,
                vatRate: 23,
                finalPriceNet: 400000,
                finalPriceGross: 492000,
            },
            {
                id: '2',
                serviceId: 's2',
                serviceName: 'Powłoka ceramiczna',
                basePriceNet: 95000,
                vatRate: 23,
                finalPriceNet: 95000,
                finalPriceGross: 116850,
            },
        ],
        schedule: {
            isAllDay: false,
            startDateTime: '2026-01-20T09:00:00Z',
            endDateTime: '2026-01-20T15:00:00Z',
        },
        appointmentColor: {
            id: 'c1',
            name: 'Red',
            hexColor: '#ef4444',
        },
        totalNet: 495000,
        totalGross: 608850,
        totalVat: 113850,
        status: 'CONFIRMED',
    },
    {
        id: 'appt_2',
        appointmentTitle: 'Przegląd okresowy',
        customer: {
            firstName: 'Anna',
            lastName: 'Nowak',
            phone: '+48 987 654 321',
            email: 'anna@example.com',
        },
        vehicle: {
            brand: 'Audi',
            model: 'A4',
        },
        services: [
            {
                id: '3',
                serviceId: 's3',
                serviceName: 'Przegląd okresowy',
                basePriceNet: 25000,
                vatRate: 23,
                finalPriceNet: 25000,
                finalPriceGross: 30750,
            },
        ],
        schedule: {
            isAllDay: false,
            startDateTime: '2026-01-22T10:00:00Z',
            endDateTime: '2026-01-22T12:00:00Z',
        },
        appointmentColor: {
            id: 'c2',
            name: 'Green',
            hexColor: '#22c55e',
        },
        totalNet: 25000,
        totalGross: 30750,
        totalVat: 5750,
        status: 'CONFIRMED',
    },
];

const mockVisits: VisitResponse[] = [
    {
        id: 'visit_1',
        visitNumber: 'VIS-2026-00042',
        status: 'in_progress',
        scheduledDate: '2026-01-21T08:00:00Z',
        customer: {
            firstName: 'Piotr',
            lastName: 'Wiśniewski',
            phone: '+48 555 666 777',
        },
        vehicle: {
            licensePlate: 'WA 12345',
            brand: 'Volkswagen',
            model: 'Golf',
        },
        totalCost: {
            netAmount: 180000,
            grossAmount: 221400,
            currency: 'PLN',
        },
    },
];

/**
 * Transform appointment data to calendar event format
 */
const transformAppointment = (appointment: AppointmentResponse): CalendarEvent => {
    const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
    const vehicleInfo = appointment.vehicle
        ? `${appointment.vehicle.brand} ${appointment.vehicle.model}`
        : 'Brak pojazdu';
    const serviceNames = appointment.services.map(s => s.serviceName);

    // Fallback color if appointmentColor is missing
    const colorHex = appointment.appointmentColor?.hexColor || '#94a3b8';
    const textColor = getContrastingTextColor(colorHex);

    const eventData: AppointmentEventData = {
        id: appointment.id,
        type: 'APPOINTMENT',
        customerName,
        customerPhone: appointment.customer.phone,
        vehicleInfo,
        colorHex,
        appointmentTitle: appointment.appointmentTitle || undefined,
        serviceNames,
        isAllDay: appointment.schedule.isAllDay,
        totalPrice: appointment.totalGross || undefined,
        currency: 'PLN',
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
    };
};

/**
 * Transform visit data to calendar event format
 */
const transformVisit = (visit: VisitResponse): CalendarEvent => {
    const customerName = `${visit.customer.firstName} ${visit.customer.lastName}`;
    const vehicleInfo = `${visit.vehicle.brand} ${visit.vehicle.model}`;

    // Map backend status to frontend status
    const statusMap: Record<string, VisitEventData['status']> = {
        'in_progress': 'IN_PROGRESS',
        'ready_for_pickup': 'READY_FOR_PICKUP',
        'completed': 'COMPLETED',
        'rejected': 'REJECTED',
        'archived': 'ARCHIVED',
    };

    const status = statusMap[visit.status] || 'IN_PROGRESS';

    // Status-based colors
    const statusColors: Record<VisitEventData['status'], string> = {
        'IN_PROGRESS': '#f59e0b',
        'READY_FOR_PICKUP': '#10b981',
        'COMPLETED': '#6366f1',
        'REJECTED': '#ef4444',
        'ARCHIVED': '#9ca3af',
    };

    const eventData: VisitEventData = {
        id: visit.id,
        type: 'VISIT',
        customerName,
        customerPhone: visit.customer.phone,
        vehicleInfo,
        visitNumber: visit.visitNumber,
        status,
        licensePlate: visit.vehicle.licensePlate,
        colorHex: statusColors[status],
        totalPrice: visit.totalCost.grossAmount,
        currency: visit.totalCost.currency,
    };

    // Visits are typically all-day events
    return {
        id: visit.id,
        title: `🔧 ${visit.visitNumber} | ${customerName}`,
        start: visit.scheduledDate,
        allDay: true,
        backgroundColor: statusColors[status],
        borderColor: 'transparent',
        textColor: '#ffffff',
        extendedProps: eventData,
    };
};

/**
 * Fetch appointments for a given date range
 */
const fetchAppointments = async (dateRange: DateRange): Promise<AppointmentResponse[]> => {
    if (USE_MOCKS) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockAppointments;
    }

    const response = await apiClient.get<{ appointments: AppointmentResponse[] }>(
        '/v1/appointments',
        {
            params: {
                startDate: dateRange.start,
                endDate: dateRange.end,
            },
        }
    );

    return response.data.appointments || [];
};

/**
 * Fetch visits for a given date range
 */
const fetchVisits = async (dateRange: DateRange): Promise<VisitResponse[]> => {
    if (USE_MOCKS) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockVisits;
    }

    const response = await apiClient.get<{ visits: VisitResponse[] }>(
        '/visits',
        {
            params: {
                startDate: dateRange.start,
                endDate: dateRange.end,
            },
        }
    );

    return response.data.visits || [];
};

export const calendarApi = {
    /**
     * Fetch and merge all calendar events (appointments + visits) for a date range
     */
    getCalendarEvents: async (dateRange: DateRange): Promise<CalendarEvent[]> => {
        try {
            console.log('[CalendarAPI] Fetching events for range:', dateRange);

            // Fetch both appointments and visits in parallel
            const [appointments, visits] = await Promise.all([
                fetchAppointments(dateRange),
                fetchVisits(dateRange),
            ]);

            console.log('[CalendarAPI] Fetched appointments:', appointments);
            console.log('[CalendarAPI] Fetched visits:', visits);

            // Transform and merge events
            const appointmentEvents = appointments.map(transformAppointment);
            const visitEvents = visits.map(transformVisit);

            console.log('[CalendarAPI] Transformed appointment events:', appointmentEvents);
            console.log('[CalendarAPI] Transformed visit events:', visitEvents);

            const allEvents = [...appointmentEvents, ...visitEvents];
            console.log('[CalendarAPI] All calendar events:', allEvents);

            return allEvents;
        } catch (error) {
            console.error('[CalendarAPI] Error fetching calendar events:', error);
            throw error;
        }
    },
};
