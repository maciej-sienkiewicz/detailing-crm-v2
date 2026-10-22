import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';
import type { VehicleHistoryEvent } from './useVehicleHistory';

export const useVehicleDeletedVisits = (vehicleId: string, enabled: boolean) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: vehicleKeys.deletedVisits(vehicleId),
        queryFn: () => vehicleApi.getDeletedVisits(vehicleId),
        enabled: !!vehicleId && enabled,
    });

    const events: (VehicleHistoryEvent & { deletedAt: string })[] = (data?.items ?? []).map(v => ({
        id: v.id,
        type: 'VISIT' as const,
        date: v.date,
        title: v.title || v.description || 'Wizyta',
        customerName: v.customerName,
        status: v.status,
        grossAmount: v.totalCost ? v.totalCost.grossAmount / 100 : null,
        currency: v.totalCost?.currency ?? 'PLN',
        deletedAt: v.deletedAt ?? v.date,
    }));

    return { events, isLoading, isError };
};
