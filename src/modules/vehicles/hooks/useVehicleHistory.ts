import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { AppointmentResponse, VisitResponse } from '@/modules/calendar/types';

export interface VehicleHistoryEvent {
    id: string;
    type: 'VISIT' | 'APPOINTMENT';
    date: string;
    title: string;
    customerName: string;
    status: string;
    /** null bez prawa do cen - kalendarz nie wysyła wtedy kwot (nie „0 zł"). */
    grossAmount: number | null;
    currency: string;
}

// Bez prawa do danych osobowych kalendarz nie wysyła klienta wcale (customer = null).
const nameOf = (c: { firstName?: string | null; lastName?: string | null } | null | undefined): string =>
    c ? [c.firstName, c.lastName].filter(Boolean).join(' ') : '';

function mapAppointment(a: AppointmentResponse): VehicleHistoryEvent {
    return {
        id: a.id,
        type: 'APPOINTMENT',
        date: a.schedule.startDateTime,
        title: a.appointmentTitle || a.services.map(s => s.serviceName).join(', ') || 'Rezerwacja',
        customerName: nameOf(a.customer),
        status: a.status,
        grossAmount: a.totalGross == null ? null : a.totalGross / 100,
        currency: 'PLN',
    };
}

function mapVisit(v: VisitResponse): VehicleHistoryEvent {
    return {
        id: v.id,
        type: 'VISIT',
        date: v.scheduledDate,
        title: v.title || v.visitNumber,
        customerName: nameOf(v.customer),
        status: v.status,
        grossAmount: v.totalGross == null ? null : v.totalGross / 100,
        currency: 'PLN',
    };
}

export const useVehicleHistory = (vehicleId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'history-events'],
        queryFn: () => vehicleApi.getCalendarEvents(vehicleId),
        enabled: !!vehicleId,
    });

    const events: VehicleHistoryEvent[] = [
        ...(data?.appointments ?? []).map(mapAppointment),
        ...(data?.visits ?? []).map(mapVisit),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { events, isLoading, isError };
};
