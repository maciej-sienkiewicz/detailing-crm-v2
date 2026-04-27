import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { VehicleVisit, VehicleAppointment } from '../types';

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

function mapVisit(v: VehicleVisit): VehicleHistoryEvent {
    return {
        id: v.id,
        type: 'VISIT',
        date: v.date,
        title: v.description || 'Wizyta',
        customerName: v.customerName,
        status: v.status,
        grossAmount: v.totalCost.grossAmount,
        currency: 'PLN',
    };
}

function mapAppointment(a: VehicleAppointment): VehicleHistoryEvent {
    return {
        id: a.id,
        type: 'APPOINTMENT',
        date: a.startDateTime,
        title: a.title || 'Rezerwacja',
        customerName: a.customerName,
        status: a.status,
        grossAmount: a.totalCost.grossAmount,
        currency: 'PLN',
    };
}

export const useVehicleHistory = (vehicleId: string) => {
    const { data: visitsData, isLoading: visitsLoading, isError: visitsError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'visits'],
        queryFn: () => vehicleApi.getVisits(vehicleId),
        enabled: !!vehicleId,
        staleTime: 60_000,
    });

    const { data: appointmentsData, isLoading: appointmentsLoading, isError: appointmentsError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'appointments'],
        queryFn: () => vehicleApi.getAppointments(vehicleId),
        enabled: !!vehicleId,
        staleTime: 60_000,
    });

    const visits = (visitsData?.visits ?? []).map(mapVisit);
    const appointments = (appointmentsData?.appointments ?? []).map(mapAppointment);

    const events: VehicleHistoryEvent[] = [...visits, ...appointments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
        events,
        isLoading: visitsLoading || appointmentsLoading,
        isError: visitsError || appointmentsError,
    };
};
