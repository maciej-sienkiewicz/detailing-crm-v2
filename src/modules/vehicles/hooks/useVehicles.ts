import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';
import type { VehicleFilters } from '../types';

export const vehiclesQueryKey = vehicleKeys.list;

export const useVehicles = (filters: VehicleFilters) => {
    const query = useQuery({
        queryKey: vehiclesQueryKey(filters),
        queryFn: ({ signal }) => vehicleApi.getVehicles(filters, signal),
    });

    return {
        vehicles: query.data?.data ?? [],
        pagination: query.data?.pagination ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};