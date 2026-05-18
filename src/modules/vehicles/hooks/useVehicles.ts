import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { VehicleFilters } from '../types';

export const vehiclesQueryKey = (filters: VehicleFilters) => ['vehicles', filters];

export const useVehicles = (filters: VehicleFilters) => {
    const query = useQuery({
        queryKey: vehiclesQueryKey(filters),
        queryFn: () => vehicleApi.getVehicles(filters),
    });

    return {
        vehicles: query.data?.data ?? [],
        pagination: query.data?.pagination ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};