// src/modules/calendar/api/calendarApi.ts

import { apiClient } from '@/core';
import { joinPiiName } from '@/common/pii';
import { isStartedVisit } from '../utils/visitStatus';
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
    DoorToDoorCalendarDay,
} from '../types';

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
    // customer object is absent when the caller lacks CUSTOMERS_VIEW
    const customerName = appointment.customer
        ? (joinPiiName(appointment.customer.firstName, appointment.customer.lastName) ?? '')
        : '';
    const vehicleInfo = appointment.vehicle
        ? `${appointment.vehicle.brand} ${appointment.vehicle.model}`
        : 'Brak pojazdu';
    const serviceNames = appointment.services.map(s => s.serviceName);

    const isCancelled = appointment.status === 'ABANDONED' || appointment.status === 'CANCELLED';
    const colorHex = isCancelled ? '#111827' : (appointment.appointmentColor?.hexColor || '#94a3b8');
    const textColor = getContrastingTextColor(colorHex);

    // Build title without customer name when PII is not available so the
    // calendar tile never shows a blank " | BMW X5" label.
    const eventTitle = appointment.appointmentTitle ||
        [customerName, vehicleInfo].filter(Boolean).join(' | ') ||
        vehicleInfo;

    const eventData: AppointmentEventData = {
        id: appointment.id,
        type: 'APPOINTMENT',
        title: eventTitle,
        customerId: appointment.customerId,
        customerName,
        customerPhone: appointment.customer?.phone,
        vehicleId: appointment.vehicleId ?? undefined,
        vehicleInfo,
        colorHex,
        colorId: appointment.appointmentColor?.id,
        appointmentTitle: appointment.appointmentTitle || undefined,
        serviceNames,
        isAllDay: appointment.schedule.isAllDay,
        // totalGross / totalNet are absent from the API response when the
        // caller lacks VISITS_SERVICE_PRICES_VIEW; coerce to undefined so
        // the existing `!== undefined` guards in the UI work correctly.
        totalPrice: appointment.totalGross ?? undefined,
        totalNet: appointment.totalNet ?? undefined,
        currency: 'PLN',
        status: appointment.status,
        note: appointment.note,
        smsInfo: appointment.smsInfo,
        recurrenceInfo: appointment.recurrenceInfo ?? null,
        startTime: appointment.schedule.startDateTime,
        endTime: appointment.schedule.endDateTime,
    };

    return {
        id: appointment.id,
        title: eventTitle,
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
    const customerName = visit.customer
        ? (joinPiiName(visit.customer.firstName, visit.customer.lastName) ?? '')
        : '';
    const vehicleInfo = `${visit.vehicle.brand} ${visit.vehicle.model}`;
    const serviceNames = (visit.services ?? []).map(s => s.serviceName);
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

    /*
     * Wizyta bez własnego tytułu: pojazd na początku, nie numer wizyty.
     *
     * Kafelek miesiąca na telefonie ma jakieś 55 px szerokości i mieści ~12 znaków.
     * „VIS-2026-00080 | Marek Sabo" zużywało je w całości na numer, którego nikt nie
     * rozpoznaje wzrokiem, i ucinało nazwisko. Auto to jedyna rzecz, po której obsługa
     * poznaje wizytę z drugiego końca warsztatu - numer i tak jest w podglądzie
     * wydarzenia i w szczegółach.
     */
    const visitTitle = visit.title ||
        [vehicleInfo, customerName].filter(Boolean).join(' | ') ||
        visit.visitNumber;

    const eventData: VisitEventData = {
        id: visit.id,
        type: 'VISIT',
        title: visitTitle,
        customerId: visit.customerId,
        customerName,
        customerPhone: visit.customer?.phone,
        vehicleId: visit.vehicleId,
        vehicleInfo,
        visitNumber: visit.visitNumber,
        status,
        licensePlate: visit.vehicle.licensePlate,
        serviceNames,
        colorHex,
        colorId: visit.appointmentColor?.id,
        totalPrice: visit.totalGross ?? undefined,
        totalNet: visit.totalNet ?? undefined,
        currency: 'PLN',
        technicalNotes: visit.technicalNotes,
        startTime: visit.scheduledDate,
        endTime: visit.estimatedCompletionDate,
    };

    return {
        id: visit.id,
        title: visitTitle,
        start: visit.scheduledDate,
        end: visit.estimatedCompletionDate,
        allDay: false,
        backgroundColor: colorHex,
        borderColor: 'transparent',
        textColor,
        extendedProps: eventData,
        classNames: [
            ...(overdue ? ['fc-event-overdue'] : []),
            ...(status === 'COMPLETED' ? ['fc-event-completed'] : []),
            // Rozpoczęta wizyta stoi w kalendarzu lżej niż rezerwacja: auto już jest
            // w studiu, więc kafelek nie musi walczyć o uwagę z tym, co dopiero przyjedzie.
            ...(isStartedVisit(status) ? ['fc-event-in-progress'] : []),
        ],
        order: status === 'IN_PROGRESS' ? 1 : status === 'COMPLETED' ? 3 : 2,
    };
};

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
    colorIds: string[],
    signal?: AbortSignal,
): Promise<CalendarEventsResponse> => {
    const params: Record<string, string> = {
        from: dateRange.start,
        to: dateRange.end,
    };

    if (appointmentStatuses.length > 0) {
        params.appointmentStatuses = appointmentStatuses.join(',');
    }
    if (visitStatuses.length > 0) {
        params.visitStatuses = visitStatuses.join(',');
    }
    if (colorIds.length > 0) {
        params.colorIds = colorIds.join(',');
    }

    const response = await apiClient.get<CalendarEventsResponse>('/v1/calendar/events', { params, signal });
    return response.data;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Ile trafień zwraca wyszukiwarka kalendarza. */
export const CALENDAR_SEARCH_LIMIT = 50;

export const calendarApi = {
    getCalendarEvents: async (
        dateRange: DateRange,
        appointmentStatuses: AppointmentStatus[] = [],
        visitStatuses: VisitStatus[] = [],
        colorIds: string[] = [],
        /** Anuluje pobranie, gdy użytkownik przewinie kalendarz dalej, zanim przyszła odpowiedź. */
        signal?: AbortSignal,
    ): Promise<CalendarEvent[]> => {
        if (appointmentStatuses.length === 0 && visitStatuses.length === 0) {
            return [];
        }

        const { appointments, visits } = await fetchUnified(dateRange, appointmentStatuses, visitStatuses, colorIds, signal);

        return [
            ...appointments.map(transformAppointment),
            ...visits.map(transformVisit),
        ];
    },

    /**
     * Wyszukiwarka kalendarza po stronie serwera: najbliższe trafienia frazy (każde słowo
     * w którymś polu - klient, auto, tablica, tytuł, numer, usługi). Dawniej okno pobierało
     * kalendarz z czterech lat i filtrowało go w przeglądarce.
     */
    searchCalendarEvents: async (phrase: string, signal?: AbortSignal): Promise<CalendarEvent[]> => {
        const { data } = await apiClient.get<CalendarEventsResponse>('/v1/calendar/search', {
            params: { q: phrase, limit: CALENDAR_SEARCH_LIMIT },
            signal,
        });
        return [...data.appointments.map(transformAppointment), ...data.visits.map(transformVisit)];
    },

    /** Dzienna liczba wyjazdów Door to Door w zakresie dat (dla badge'a w widoku kalendarza). */
    getDoorToDoorCalendar: async (from: string, to: string, signal?: AbortSignal): Promise<DoorToDoorCalendarDay[]> => {
        const response = await apiClient.get<DoorToDoorCalendarDay[]>('/v1/calendar/door-to-door', {
            params: { from, to },
            signal,
        });
        return response.data;
    },
};
