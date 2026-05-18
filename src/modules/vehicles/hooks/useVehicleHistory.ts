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
    grossAmount: number;
    currency: string;
}

function mapAppointment(a: AppointmentResponse): VehicleHistoryEvent {
    return {
        id: a.id,
        type: 'APPOINTMENT',
        date: a.schedule.startDateTime,
        title: a.appointmentTitle || a.services.map(s => s.serviceName).join(', ') || 'Rezerwacja',
        customerName: `${a.customer.firstName} ${a.customer.lastName}`,
        status: a.status,
        grossAmount: (a.totalGross ?? 0) / 100,
        currency: 'PLN',
    };
}

function mapVisit(v: VisitResponse): VehicleHistoryEvent {
    return {
        id: v.id,
        type: 'VISIT',
        date: v.scheduledDate,
        title: v.title || v.visitNumber,
        customerName: `${v.customer.firstName} ${v.customer.lastName}`,
        status: v.status,
        grossAmount: (v.totalGross ?? 0) / 100,
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
