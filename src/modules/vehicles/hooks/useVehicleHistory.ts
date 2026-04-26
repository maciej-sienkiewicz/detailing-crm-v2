import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { VisitResponse, AppointmentResponse } from '@/modules/calendar/types';

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

function mapVisit(v: VisitResponse): VehicleHistoryEvent {
    return {
        id: v.id,
        type: 'VISIT',
        date: v.scheduledDate,
        title: v.title || v.visitNumber || 'Wizyta',
        customerName: [v.customer.firstName, v.customer.lastName].filter(Boolean).join(' '),
        status: v.status,
        grossAmount: v.totalGross,
        currency: 'PLN',
    };
}

function mapAppointment(a: AppointmentResponse): VehicleHistoryEvent {
    const title = a.appointmentTitle
        || a.services.map(s => s.serviceName).join(', ')
        || 'Rezerwacja';
    return {
        id: a.id,
        type: 'APPOINTMENT',
        date: a.schedule.startDateTime,
        title,
        customerName: [a.customer.firstName, a.customer.lastName].filter(Boolean).join(' '),
        status: a.status,
        grossAmount: a.totalGross,
        currency: 'PLN',
    };
}

export const useVehicleHistory = (vehicleId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'history'],
        queryFn: () => vehicleApi.getCalendarEvents(vehicleId),
        enabled: !!vehicleId,
        staleTime: 60_000,
    });

    const visits = (data?.visits ?? []).map(mapVisit);
    const appointments = (data?.appointments ?? []).map(mapAppointment);

    const events: VehicleHistoryEvent[] = [...visits, ...appointments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return { events, isLoading, isError };
};
