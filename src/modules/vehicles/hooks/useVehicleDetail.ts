import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const vehicleDetailQueryKey = vehicleKeys.detail;

export const useVehicleDetail = (vehicleId: string) => {
    const query = useQuery({
        queryKey: vehicleDetailQueryKey(vehicleId),
        queryFn: () => vehicleApi.getVehicleDetail(vehicleId),
        enabled: !!vehicleId,
    });

    return {
        vehicleDetail: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
};