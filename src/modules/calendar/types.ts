// src/modules/calendar/types.ts

import { EventInput } from '@fullcalendar/core';

export type CalendarEventType = 'APPOINTMENT' | 'VISIT';

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

/**
 * Base calendar event data structure
 */
export interface CalendarEventData {
    id: string;
    type: CalendarEventType;
    customerName: string;
    customerPhone?: string;
    vehicleInfo: string;
    status?: string;
    totalPrice?: number;
    currency?: string;
    colorHex: string;
}

/**
 * Appointment data for calendar display
 */
export interface AppointmentEventData extends CalendarEventData {
    type: 'APPOINTMENT';
    appointmentTitle?: string;
    serviceNames: string[];
    isAllDay: boolean;
}

/**
 * Visit data for calendar display
 */
export interface VisitEventData extends CalendarEventData {
    type: 'VISIT';
    visitNumber: string;
    status: 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED';
    licensePlate: string;
}

/**
 * Raw appointment response from API
 */
export interface AppointmentResponse {
    id: string;
    appointmentTitle?: string | null;
    customer: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    vehicle?: {
        brand: string;
        model: string;
        year?: number;
        licensePlate?: string;
    };
    services: Array<{
        id: string;
        serviceId: string;
        serviceName: string;
        basePriceNet: number;
        vatRate: number;
        finalPriceNet: number;
        finalPriceGross: number;
    }>;
    schedule: {
        isAllDay: boolean;
        startDateTime: string;
        endDateTime: string;
    };
    appointmentColor: {
        id: string;
        name: string;
        hexColor: string;
    };
    status: string;
    totalNet: number;
    totalGross: number;
    totalVat: number;
}

/**
 * Raw visit response from API
 */
export interface VisitResponse {
    id: string;
    visitNumber: string;
    status: 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED';
    scheduledDate: string;
    customer: {
        firstName: string;
        lastName: string;
        phone: string;
        companyName?: string | null;
    };
    vehicle: {
        licensePlate: string;
        brand: string;
        model: string;
        yearOfProduction?: number;
    };
    appointmentColor?: {
        id: string;
        name: string;
        hexColor: string;
    } | null;
    totalNet: number;
    totalGross: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Unified calendar event for FullCalendar
 */
export interface CalendarEvent extends EventInput {
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay?: boolean;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    extendedProps: AppointmentEventData | VisitEventData;
}

/**
 * Date range for fetching events
 */
export interface DateRange {
    start: string;
    end: string;
}

/**
 * Event creation data from click/drag interaction
 */
export interface EventCreationData {
    start: Date;
    end: Date;
    allDay: boolean;
}
