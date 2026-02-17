import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';

export const useVehicleAppointments = (vehicleId: string, page = 1, limit = 50) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['vehicle', vehicleId, 'appointments', page],
        queryFn: () => vehicleApi.getAppointments(vehicleId, page, limit),
        enabled: !!vehicleId,
        staleTime: 60_000,
    });
    return {
        appointments: data?.appointments ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
    };
};
