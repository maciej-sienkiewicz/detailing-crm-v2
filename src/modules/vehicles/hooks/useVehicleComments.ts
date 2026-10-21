import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import { vehicleKeys } from '../api/vehicleKeys';

export const useVehicleComments = (vehicleId: string, page = 1, limit = 20) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: vehicleKeys.comments(vehicleId, page, limit),
        queryFn: () => vehicleApi.getComments(vehicleId, page, limit),
        enabled: !!vehicleId,
    });
    return {
        comments: data?.comments ?? [],
        pagination: data?.pagination,
        isLoading,
        isError,
    };
};
