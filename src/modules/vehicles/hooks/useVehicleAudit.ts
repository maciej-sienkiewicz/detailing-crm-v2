// src/modules/vehicles/hooks/useVehicleAudit.ts

import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';

export const vehicleAuditQueryKey = (vehicleId: string, page: number) =>
    ['vehicle', vehicleId, 'audit', page] as const;

export const useVehicleAudit = (vehicleId: string, page = 1, size = 50) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: vehicleAuditQueryKey(vehicleId, page),
        queryFn: () => vehicleApi.getAuditLog(vehicleId, page, size),
        enabled: !!vehicleId,
        staleTime: 30_000,
    });

    return {
        items: data?.items ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
        refetch,
    };
};
