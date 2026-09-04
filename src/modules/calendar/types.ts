// src/modules/calendar/types.ts

import { EventInput } from '@fullcalendar/core';

export type SmsSendStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface CalendarConfirmationSms {
    status: 'SENT' | 'FAILED';
    sentAt: string;
}

export interface CalendarReminderSms {
    requested: boolean;
    status: SmsSendStatus | null;
    sentAt: string | null;
    editable: boolean;
}

export interface CalendarSmsInfo {
    confirmationSms: CalendarConfirmationSms | null;
    reminderSms: CalendarReminderSms;
}

export type CalendarEventType = 'APPOINTMENT' | 'VISIT' | 'STUDIO_EVENT';

/**
 * Wydarzenie studia - wpis w kalendarzu, który nie jest wizytą ani rezerwacją.
 * Zakres dni jest domknięty z obu stron: [endDate] to ostatni dzień trwania,
 * tak jak widzi to użytkownik (FullCalendar dostaje koniec przesunięty o dzień).
 */
export interface StudioCalendarEvent {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

export interface StudioCalendarEventPayload {
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
}

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agendaList';

export type VisitStatus = 'IN_PROGRESS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'REJECTED' | 'ARCHIVED';

export type AppointmentStatus = 'CREATED' | 'ABANDONED' | 'CANCELLED';

/**
 * Base calendar event data structure
 */
export interface CalendarEventData {
    id: string;
    type: CalendarEventType;
    title: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    vehicleId?: string;
    vehicleInfo: string;
    status?: string;
    totalPrice?: number; // gross (brutto) in minor units
    totalNet?: number; // net (netto) in minor units
    currency?: string;
    colorHex: string;
    colorId?: string;
    startTime: string;  // ISO 8601
    endTime: string;    // ISO 8601
}

/**
 * Appointment data for calendar display
 */
export interface AppointmentEventData extends CalendarEventData {
    type: 'APPOINTMENT';
    appointmentTitle?: string;
    serviceNames: string[];
    isAllDay: boolean;
    status?: string;
    note?: string;
    smsInfo?: CalendarSmsInfo;
    recurrenceInfo?: { seriesId: string; recurrenceIndex: number; totalInSeries: number; isDetached: boolean } | null;
}

/**
 * Visit data for calendar display
 */
export interface VisitEventData extends CalendarEventData {
    type: 'VISIT';
    visitNumber: string;
    status: VisitStatus;
    licensePlate: string;
    serviceNames: string[];
    technicalNotes?: string;
}

/**
 * Raw appointment response from API.
 *
 * customer fields and price totals are optional: when the caller lacks
 * CUSTOMERS_VIEW or VISITS_SERVICE_PRICES_VIEW respectively, the backend
 * omits those fields entirely from the response.
 */
export interface AppointmentResponse {
    id: string;
    appointmentTitle?: string | null;
    customerId?: string;
    vehicleId?: string | null;
    customer?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
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
    totalNet?: number;
    totalGross?: number;
    totalVat?: number;
    note?: string;
    smsInfo?: CalendarSmsInfo;
    recurrenceInfo?: { seriesId: string; recurrenceIndex: number; totalInSeries: number; isDetached: boolean } | null;
}

/**
 * Raw visit response from API.
 *
 * Same contract as AppointmentResponse: customer and price fields are absent
 * when the caller lacks the corresponding permissions.
 */
export interface VisitResponse {
    id: string;
    title: string | null;
    visitNumber: string;
    status: VisitStatus;
    scheduledDate: string;
    estimatedCompletionDate: string;
    customerId?: string;
    vehicleId?: string;
    customer?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
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
    services?: Array<{ serviceName: string }>;
    totalNet?: number;
    totalGross?: number;
    currency: string;
    technicalNotes?: string;
    description?: string | null;
    createdBy?: string | null;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Response from unified GET /v1/calendar/events endpoint
 */
export interface CalendarEventsResponse {
    appointments: AppointmentResponse[];
    visits: VisitResponse[];
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
 * Calendar filters for appointments and visits
 */
export interface CalendarFilters {
    appointmentStatuses: AppointmentStatus[];
    visitStatuses: VisitStatus[];
}

/**
 * Event creation data from click/drag interaction
 */
export interface EventCreationData {
    start: Date;
    end: Date;
    allDay: boolean;
}

/**
 * Pojedynczy wyjazd Door to Door w danym dniu (odbiór z rezerwacji lub dostawa z wizyty)
 */
export interface DoorToDoorCalendarEntry {
    id: string;
    direction: 'PICKUP' | 'DELIVERY';
    vehicle: string;
    customerLastName: string;
    /** Formatted "city, street" for the relevant trip leg; null when address is empty. */
    address: string | null;
}

/**
 * Dzienna pozycja kalendarza wyjazdów Door to Door (badge z ikoną samochodu)
 */
export interface DoorToDoorCalendarDay {
    date: string;
    count: number;
    entries: DoorToDoorCalendarEntry[];
}
