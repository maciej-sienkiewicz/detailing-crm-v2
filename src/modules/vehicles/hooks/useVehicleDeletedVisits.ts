import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { VehicleHistoryEvent } from './useVehicleHistory';

export const useVehicleDeletedVisits = (vehicleId: string, enabled: boolean) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'deleted-visits'],
        queryFn: () => vehicleApi.getDeletedVisits(vehicleId),
        enabled: !!vehicleId && enabled,
    });

    const events: (VehicleHistoryEvent & { deletedAt: string })[] = (data?.visits ?? []).map(v => ({
        id: v.id,
        type: 'VISIT' as const,
        date: v.scheduledDate,
        title: v.title || v.visitNumber,
        customerName: v.customerName ?? `${v.customer?.firstName ?? ''} ${v.customer?.lastName ?? ''}`.trim(),
        status: v.status,
        grossAmount: (v.totalGross ?? 0) / 100,
        currency: 'PLN',
        deletedAt: v.deletedAt,
    }));

    return { events, isLoading, isError };
};
