import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';

export const useVehicleVisits = (vehicleId: string, page = 1, limit = 50) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'visits', page],
        queryFn: () => vehicleApi.getVisits(vehicleId, page, limit),
        enabled: !!vehicleId,
        staleTime: 60_000,
    });
    return {
        visits: data?.visits ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
    };
};
